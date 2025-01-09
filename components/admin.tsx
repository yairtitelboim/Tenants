import React, { useState, useRef, useEffect } from 'react';
import { Building2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';

interface AdminProps {
  totalBuildings: number;
  selectedBuildings: number;
  lastUpdate: string;
  buildingsList: Array<{
    name: string;
    rank: number;
    foottraffic: number;
    id: string;
    lng: number;
    lat: number;
  }>;
  onBuildingClick: (building: any) => void;
  highlightedBuilding?: string;
}

const Admin: React.FC<AdminProps> = ({ 
  totalBuildings, 
  selectedBuildings = 0,
  lastUpdate,
  buildingsList = [],
  onBuildingClick,
  highlightedBuilding
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const highlightedRef = useRef<HTMLDivElement>(null);
  
  // Auto-expand and scroll when a building is highlighted
  useEffect(() => {
    if (highlightedBuilding) {
      setIsExpanded(true);
      
      // Wait for the expansion animation to complete
      setTimeout(() => {
        highlightedRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }, 300); // Adjust timing based on your transition duration
    }
  }, [highlightedBuilding]);

  // Format date to show only MM/DD/YYYY
  const formattedDate = new Date(lastUpdate).toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  });

  // Sort buildings by foottraffic in descending order
  const sortedBuildings = [...buildingsList].sort((a, b) => 
    (b.foottraffic || 0) - (a.foottraffic || 0)
  );

  return (
    <div className={`transition-all duration-300 ease-in-out fixed left-6 top-6 z-[1001] ${
      isCollapsed 
        ? 'w-8 h-8 rounded-sm bg-black flex items-center justify-center cursor-pointer'
        : `w-[240px] bg-black rounded-sm ${isExpanded ? 'h-[400px]' : ''}`
    } border border-zinc-800 shadow-lg`}>
      
      {/* Collapse Toggle Button */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`absolute ${isCollapsed ? 'inset-0' : 'top-2 right-2'} 
          hover:text-green-400 transition-colors z-[1001] text-zinc-500
          ${isCollapsed ? 'w-full h-full flex items-center justify-center' : ''}`}
      >
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>

      {/* Main Content - Only show when not collapsed */}
      {!isCollapsed && (
        <div className="p-3 space-y-2">
          {/* Header */}
          <div className="flex items-center space-x-2 border-b border-zinc-800 pb-2">
            <Building2 className="w-4 h-4 text-green-400" />
            <h3 className="text-xs font-bold text-green-400 uppercase tracking-wider">System Status</h3>
          </div>

          {/* Stats */}
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between items-center">
              <span className="text-zinc-500 uppercase tracking-wider">Buildings.Total</span>
              <span className="text-green-400 font-bold">{totalBuildings}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-500 uppercase tracking-wider">Buildings.Selected</span>
              <span className="text-green-400 font-bold">{selectedBuildings}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-500 uppercase tracking-wider">Data.Update</span>
              <span className="text-green-400 font-bold">{formattedDate}</span>
            </div>
          </div>

          {/* Expand Toggle Button */}
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-center hover:text-green-400 
              transition-colors text-zinc-500 pt-2 border-t border-zinc-800"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {/* Buildings List - Using sorted buildings */}
          {isExpanded && (
            <div className="mt-2 space-y-1 max-h-[250px] overflow-y-auto scrollbar-thin 
              scrollbar-thumb-zinc-800 scrollbar-track-transparent">
              {sortedBuildings.map((building, index) => (
                <div 
                  key={`${building.id}-${index}`}
                  ref={building.name === highlightedBuilding ? highlightedRef : null}
                  className={`text-[11px] transition-colors cursor-pointer py-1 flex items-center justify-between
                    ${building.name === highlightedBuilding 
                      ? 'text-green-400 bg-green-400/10' 
                      : 'hover:text-green-400'}`}
                  onClick={() => onBuildingClick(building)}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-zinc-600 w-6">{index + 1}</span>
                    <span className={building.name === highlightedBuilding ? 'text-green-400' : 'text-zinc-500'}>
                      {building.name}
                    </span>
                  </div>
                  <span className="text-green-400 font-medium">
                    {building.foottraffic.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Admin; 