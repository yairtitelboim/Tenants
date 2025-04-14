import React, { useRef, useEffect, useCallback } from 'react';
import * as d3 from 'd3';

interface BubbleChartProps {
  data: {
    name: string;
    value: number;
    color: string;
  }[];
  width: number;
  height: number;
  visibleTenants: Set<string>;
  onBubbleClick: (name: string) => void;
}

const BubbleChart: React.FC<BubbleChartProps> = ({
  data,
  width,
  height,
  visibleTenants,
  onBubbleClick
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // TOOLTIP POSITION ADJUSTMENT - Modify these values to adjust tooltip position
  // These values control where the tooltip appears relative to the cursor
  const TOOLTIP_HORIZONTAL_OFFSET = 10;  // Positive values move tooltip right, negative values move left
  const TOOLTIP_VERTICAL_OFFSET = -300;   // Negative values move tooltip up, positive values move down

  // Main chart creation function wrapped in useCallback
  const createChart = useCallback(() => {
    if (!svgRef.current || data.length === 0) return;

    // Filter data to only include visible tenants
    const filteredData = data.filter(d => visibleTenants.has(d.name));

    // Clear previous chart
    d3.select(svgRef.current).selectAll('*').remove();

    // Create the SVG container
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    // Create enhanced tooltip with better styling
    const tooltip = d3.select(tooltipRef.current)
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background-color', '#1F2937')
      .style('color', 'white')
      .style('padding', '10px')
      .style('border-radius', '6px')
      .style('border', '1px solid #4B5563')
      .style('box-shadow', '0 4px 12px rgba(0, 0, 0, 0.5)')
      .style('pointer-events', 'none')
      .style('z-index', '10')
      .style('font-size', '14px')
      .style('min-width', '180px')
      .style('backdrop-filter', 'blur(4px)')
      .style('transition', 'opacity 0.2s ease-in-out');

    // Create a scale for bubble size
    const maxValue = d3.max(filteredData, d => d.value) || 0;
    const minValue = d3.min(filteredData, d => d.value) || 0;

    // Size scale - make sure even small values have a visible size
    const minRadius = 40;  // Increased minimum size for better readability
    const maxRadius = 100; // Increased maximum size for more impact
    const sizeScale = d3.scaleSqrt()
      .domain([minValue, maxValue])
      .range([minRadius, maxRadius]);

    // Create simulation with gentler forces for smoother movement
    const simulation = d3.forceSimulation(filteredData as d3.SimulationNodeDatum[])
      // Reduced repulsion between nodes for less vibration
      .force('charge', d3.forceManyBody().strength(5).distanceMax(200))
      // Very weak center attraction to allow more free movement - shifted significantly to give more room on left and bottom
      .force('center', d3.forceCenter(width * 0.65, height * 0.4).strength(0.01))
      // Strong collision detection to ensure bubbles bounce off each other
      .force('collision', d3.forceCollide().radius((d: any) => sizeScale(d.value) + 2).strength(1).iterations(4))
      // Very weak x-axis force to allow more natural movement - shifted significantly to give more room on left
      .force('x', d3.forceX(width * 0.65).strength(0.01))
      // Very weak y-axis force to allow more natural movement - shifted significantly to give more room at bottom
      .force('y', d3.forceY(height * 0.4).strength(0.01))
      // Add gentle boundary forces to keep bubbles inside the container
      .force('boundaryX', () => {
        filteredData.forEach((d: any) => {
          const r = sizeScale(d.value);
          // Asymmetric padding to give more room on the left
          const leftPadding = 4; // More padding on the left
          const rightPadding = 2; // Standard padding on the right
          const dampening = 0.8; // Dampen velocity on bounce for more natural movement

          // Left boundary - gentle bounce
          if (d.x - r < leftPadding) {
            d.x = r + leftPadding;
            d.vx = Math.abs(d.vx) * dampening; // Bounce back with reduced velocity
          }

          // Right boundary - gentle bounce
          if (d.x + r > width - rightPadding) {
            d.x = width - r - rightPadding;
            d.vx = -Math.abs(d.vx) * dampening; // Bounce back with reduced velocity
          }
        });
      })
      .force('boundaryY', () => {
        filteredData.forEach((d: any) => {
          const r = sizeScale(d.value);
          // Asymmetric padding to give more room at the bottom
          const topPadding = 5; // Standard padding at the top
          const bottomPadding = -20; // More padding at the bottom
          const dampening = 0.8; // Dampen velocity on bounce for more natural movement

          // Top boundary - gentle bounce
          if (d.y - r < topPadding) {
            d.y = r + topPadding;
            d.vy = Math.abs(d.vy) * dampening; // Bounce back with reduced velocity
          }

          // Bottom boundary - gentle bounce
          if (d.y + r > height - bottomPadding) {
            d.y = height - r - bottomPadding;
            d.vy = -Math.abs(d.vy) * dampening; // Bounce back with reduced velocity
          }
        });
      })
      // Add very subtle jitter for natural movement
      .force('jitter', () => {
        // Apply almost imperceptible random forces extremely rarely
        if (Math.random() < 0.01) { // Only apply jitter 1% of the time
          filteredData.forEach((d: any) => {
            // Virtually no jitter - just enough to prevent complete stagnation
            d.vx = (d.vx || 0) + (Math.random() - 0.5) * 0.002;
            d.vy = (d.vy || 0) + (Math.random() - 0.5) * 0.002;
          });
        }
      })
      .velocityDecay(0.9) // Extremely high decay for almost static movement
      .alphaTarget(0.01)  // Minimal target for almost no activity after initial settling
      .alphaDecay(0.1)    // Very fast cooling to minimize initial movement
      .on('tick', ticked);

    // Initialize node positions and velocities for smooth start
    filteredData.forEach((d: any) => {
      // Set initial positions to be within the visible area
      const r = sizeScale(d.value);
      // We don't need this padding variable anymore as we use specific padding values below

      // Distribute bubbles more evenly across the container
      // Use golden ratio to avoid clustering
      const phi = (1 + Math.sqrt(5)) / 6;
      const idx = filteredData.indexOf(d);
      const angle = idx * phi * Math.PI * 2;
      // Reduced radius factor to keep bubbles more contained within the visible area
      const radius = Math.sqrt(idx / filteredData.length) * Math.min(width, height) * 0.35;

      // Calculate position based on spiral distribution - shifted significantly to give more room on left and bottom
      // Use a more extreme offset for initial positions
      let x = width * 0.15 + radius * Math.cos(angle);
      let y = height * 1.4 + radius * Math.sin(angle);

      // Ensure within boundaries - use asymmetric padding to allow more space on left and bottom
      const leftPadding = 40;   // Very small padding on the left to allow bubbles to go further left
      const rightPadding = 20; // Standard padding on the right
      const topPadding = 5;   // Standard padding at the top
      const bottomPadding = -20; // Negative padding at the bottom to allow bubbles to go further down

      // Apply asymmetric boundary constraints
      x = Math.max(r + leftPadding, Math.min(width - r - rightPadding, x));
      y = Math.max(r + topPadding, Math.min(height - r - bottomPadding, y));

      d.x = x;
      d.y = y;

      // Give each bubble an almost imperceptible initial velocity
      const speed = 0.005; // Nearly static initial speed
      const direction = Math.random() * Math.PI * 2;
      d.vx = Math.cos(direction) * speed;
      d.vy = Math.sin(direction) * speed;
    });

    // Create node elements
    const node = svg.selectAll('.node')
      .data(filteredData)
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', (d: any) => `translate(${d.x},${d.y})`) // Set initial positions
      .style('cursor', 'pointer')
      .on('click', (_event, d) => {
        onBubbleClick(d.name);
      })
      .on('mouseover', (event, d: any) => {
        // Calculate percentage for display
        const percentage = ((d.value / filteredData.reduce((sum, e) => sum + e.value, 0)) * 100).toFixed(1);

        // Use the global tooltip position adjustment parameters

        // Get tooltip dimensions to help with positioning
        const tooltipNode = tooltip.node();
        const tooltipWidth = tooltipNode ? tooltipNode.offsetWidth : 200;

        // Calculate tooltip position with manual offsets
        // This ensures the tooltip is visible and positioned according to preference
        const tooltipX = Math.min(event.pageX + TOOLTIP_HORIZONTAL_OFFSET, window.innerWidth - tooltipWidth - 20);
        const tooltipY = Math.max(event.pageY + TOOLTIP_VERTICAL_OFFSET, 10);

        tooltip
          .html(`
            <div style="display: flex; align-items: center; margin-bottom: 8px; border-bottom: 1px solid #4B5563; padding-bottom: 8px;">
              <div style="width: 14px; height: 14px; background-color: ${d.color}; margin-right: 10px; border-radius: 3px;"></div>
              <span style="font-weight: 600; font-size: 16px;">${d.name}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-weight: 500;">${d.value} events</span>
              <span style="background-color: ${d.color}40; color: white; padding: 2px 8px; border-radius: 12px; font-weight: 600;">${percentage}%</span>
            </div>
          `)
          .style('visibility', 'visible')
          .style('left', tooltipX + 'px')
          .style('top', tooltipY + 'px')
          // Add a subtle transition for smoother appearance
          .style('opacity', '0')
          .transition()
          .duration(150)
          .style('opacity', '1');
      })
      .on('mousemove', (event) => {
        // Use the same positioning logic as mouseover for consistency
        const tooltipNode = tooltip.node();
        const tooltipWidth = tooltipNode ? tooltipNode.offsetWidth : 200;

        // Calculate tooltip position with global offset parameters
        const tooltipX = Math.min(event.pageX + TOOLTIP_HORIZONTAL_OFFSET, window.innerWidth - tooltipWidth - 20);
        const tooltipY = Math.max(event.pageY + TOOLTIP_VERTICAL_OFFSET, 10);

        tooltip
          .style('left', tooltipX + 'px')
          .style('top', tooltipY + 'px');
      })
      .on('mouseout', () => {
        // Add a smooth fade-out effect
        tooltip
          .transition()
          .duration(200)
          .style('opacity', '0')
          .on('end', () => tooltip.style('visibility', 'hidden'));
      });

    // Add circles to nodes with inverted styling - transparent fill with colored stroke
    node.append('circle')
      .attr('r', (d) => sizeScale(d.value))
      .attr('fill', 'rgba(30, 41, 59, 0.7)') // Semi-transparent dark background
      .attr('stroke', (d) => d.color) // Colored stroke using the tenant's color
      .attr('stroke-width', 4) // Thick stroke
      .attr('stroke-opacity', 0.8) // Initial stroke opacity
      .attr('fill-opacity', 0.85)
      // Add subtle gradient effect
      .style('filter', 'url(#glow)');

    // Add enhanced glow filter for more vibrant appearance
    const defs = svg.append('defs');

    // Create a subtle radial gradient for the stroke of each bubble
    filteredData.forEach((d, i) => {
      const gradientId = `stroke-gradient-${i}`;
      const gradient = defs.append('radialGradient')
        .attr('id', gradientId)
        .attr('cx', '50%')
        .attr('cy', '50%')
        .attr('r', '50%')
        .attr('fx', '50%')
        .attr('fy', '50%');

      // Brighter color for the stroke gradient
      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', d3.color(d.color)?.brighter(0.9).toString() || d.color);

      // Original color at the edge
      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', d.color);

      // Update the circle stroke to use the gradient
      svg.selectAll('.node').filter((node: any) => node === d)
        .select('circle')
        .attr('stroke', `url(#${gradientId})`);
    });

    // Create enhanced glow filter for the strokes
    const filter = defs.append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');

    // Add a stronger blur for more pronounced glow
    filter.append('feGaussianBlur')
      .attr('stdDeviation', '2.5')
      .attr('result', 'coloredBlur');

    // Add a second blur for a more subtle inner glow
    filter.append('feGaussianBlur')
      .attr('in', 'SourceGraphic')
      .attr('stdDeviation', '1.5')
      .attr('result', 'innerGlow');

    // Merge the glow with the original graphic
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode')
      .attr('in', 'coloredBlur');
    feMerge.append('feMergeNode')
      .attr('in', 'SourceGraphic');

    // Calculate total for percentages
    const totalEvents = filteredData.reduce((sum, d) => sum + d.value, 0);

    // Add tenant name text labels to nodes with multi-line support for two-word names
    node.each(function(d: any) {
      const nodeGroup = d3.select(this);
      const words = d.name.split(' ');
      const hasMultipleWords = words.length > 1;

      // Calculate font size based on bubble size and name length
      const fontSize = Math.min(2 * sizeScale(d.value) / (d.name.length), 16);

      if (hasMultipleWords) {
        // First line (first word)
        nodeGroup.append('text')
          .text(words[0])
          .attr('text-anchor', 'middle')
          .attr('dy', '-1.2em')
          .attr('fill', 'white')
          .attr('font-size', fontSize)
          .attr('font-weight', 'bold')
          .style('pointer-events', 'none')
          .style('text-shadow', '0px 0px 3px rgba(0,0,0,0.9)');

        // Second line (remaining words)
        nodeGroup.append('text')
          .text(words.slice(1).join(' '))
          .attr('text-anchor', 'middle')
          .attr('dy', '-0.2em')
          .attr('fill', 'white')
          .attr('font-size', fontSize)
          .attr('font-weight', 'bold')
          .style('pointer-events', 'none')
          .style('text-shadow', '0px 0px 3px rgba(0,0,0,0.9)');
      } else {
        // Single line for single-word names
        nodeGroup.append('text')
          .text(d.name)
          .attr('text-anchor', 'middle')
          .attr('dy', '-0.5em')
          .attr('fill', 'white')
          .attr('font-size', fontSize)
          .attr('font-weight', 'bold')
          .style('pointer-events', 'none')
          .style('text-shadow', '0px 0px 3px rgba(0,0,0,0.9)');
      }
    });

    // Add event count text with adjusted position
    node.each(function(d: any) {
      const nodeGroup = d3.select(this);
      const words = d.name.split(' ');
      const hasMultipleWords = words.length > 1;

      // Calculate font size for count
      const countFontSize = Math.min(2 * sizeScale(d.value) / 5, 14);

      // Adjust vertical position based on whether name is multi-line
      const countPosition = hasMultipleWords ? '1.0em' : '0.7em';

      nodeGroup.append('text')
        .text(`${d.value}`)
        .attr('text-anchor', 'middle')
        .attr('dy', countPosition)
        .attr('fill', 'white')
        .attr('font-size', countFontSize)
        .attr('font-weight', 'bold')
        .style('pointer-events', 'none')
        .style('text-shadow', '0px 0px 3px rgba(0,0,0,0.9)');
    });

    // Add percentage text with adjusted position
    node.each(function(d: any) {
      const nodeGroup = d3.select(this);
      const words = d.name.split(' ');
      const hasMultipleWords = words.length > 1;

      // Calculate font size for percentage
      const percentFontSize = Math.min(2 * sizeScale(d.value) / 6, 13);

      // Adjust vertical position based on whether name is multi-line
      const percentPosition = hasMultipleWords ? '2.2em' : '1.9em';

      nodeGroup.append('text')
        .text(`${((d.value / totalEvents) * 100).toFixed(1)}%`)
        .attr('text-anchor', 'middle')
        .attr('dy', percentPosition)
        .attr('fill', 'white')
        .attr('font-size', percentFontSize)
        .attr('font-weight', 'bold')
        .style('pointer-events', 'none')
        .style('text-shadow', '0px 0px 3px rgba(0,0,0,0.9)');
    });

    // Add extremely subtle pulsating animation to the bubbles
    const pulseAnimation = () => {
      node.select('circle')
        .transition()
        .duration(4000 + Math.random() * 2000) // Longer, slower duration
        .attr('r', (d: any) => sizeScale(d.value) * (0.98 + Math.random() * 0.04)) // Extremely subtle size change
        .attr('stroke-width', 5) // Slightly thicker stroke at peak
        .attr('stroke-opacity', 0.9) // Slightly more opaque
        .transition()
        .duration(4000 + Math.random() * 2000) // Longer, slower duration
        .attr('r', (d: any) => sizeScale(d.value))
        .attr('stroke-width', 4) // Back to normal stroke width
        .attr('stroke-opacity', 0.8) // Back to normal opacity
        .on('end', pulseAnimation); // Loop the animation
    };

    // Start the pulsating animation
    pulseAnimation();

    // Tick function to update node positions and enforce boundaries with gentle bounces
    function ticked() {
      // Enforce boundaries during each tick with dampening for gentle bounces
      filteredData.forEach((d: any) => {
        const r = sizeScale(d.value);
        // Use the same asymmetric padding as in boundary forces
        const leftPadding = 0; // Very small padding on the left to allow bubbles to go further left
        const rightPadding = 0; // Standard padding on the right
        const topPadding = 5; // Standard padding at the top
        const bottomPadding = 2; // Negative padding at the bottom to allow bubbles to go further down
        const dampening = 2.8; // Same dampening factor as in boundary forces

        // Handle x-axis boundaries with gentle bounces
        if (d.x < r + leftPadding) {
          d.x = r + leftPadding;
          d.vx = Math.abs(d.vx) * dampening; // Gentle bounce from left wall
        } else if (d.x > width - r - rightPadding) {
          d.x = width - r - rightPadding;
          d.vx = -Math.abs(d.vx) * dampening; // Gentle bounce from right wall
        }

        // Handle y-axis boundaries with gentle bounces
        if (d.y < r + topPadding) {
          d.y = r + topPadding;
          d.vy = Math.abs(d.vy) * dampening; // Gentle bounce from top wall
        } else if (d.y > height - r - bottomPadding) {
          d.y = height - r - bottomPadding;
          d.vy = -Math.abs(d.vy) * dampening; // Gentle bounce from bottom wall
        }
      });

      // Update node positions
      node
        .attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    }

    // Cleanup function
    return () => {
      simulation.stop();
    };
  }, [data, width, height, visibleTenants, onBubbleClick]);

  // Call createChart when component mounts or when dependencies change
  useEffect(() => {
    createChart();
  }, [createChart]);

  // Add resize handler
  useEffect(() => {
    const handleResize = () => {
      // Redraw chart on window resize
      if (svgRef.current && data.length > 0) {
        createChart();
      }
    };

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [createChart, data.length]);

  return (
    <div className="relative">
      {/* SVG container with a visible border */}
      <svg
        ref={svgRef}
        style={{
          border: '3px solid rgba(75, 85, 99, 0.7)',
          borderRadius: '8px',
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(17, 24, 39, 0.7)' // Slightly lighter than the background for contrast
        }}
      ></svg>
      <div ref={tooltipRef}></div>
    </div>
  );
};

export default BubbleChart;
