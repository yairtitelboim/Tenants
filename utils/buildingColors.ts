export const buildingColors = [
  '#3B82F6', // blue
  '#10B981', // emerald
  '#8B5CF6', // purple
  '#F43F5E', // rose
  '#F59E0B', // amber
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#84CC16', // lime
  '#6366F1', // indigo
  '#14B8A6', // teal
];

export const getBuildingColorIndex = (data: any[], buildingName: string) => {
  // Create a stable sorted array of unique building names using reduce
  const uniqueBuildings = data
    .reduce((acc: string[], item) => {
      if (!acc.includes(item.name)) {
        acc.push(item.name);
      }
      return acc;
    }, [])
    .sort();

  const index = uniqueBuildings.indexOf(buildingName);
  return index >= 0 ? index : 0;
};

export const getSelectedBuildingColor = (data: any[], selectedBuildingId: string | null): string => {
  if (!selectedBuildingId) return '#3B82F6'; // default blue
  
  const selectedBuilding = data.find(b => b.id === selectedBuildingId);
  if (!selectedBuilding) return '#3B82F6';
  
  const colorIndex = getBuildingColorIndex(data, selectedBuilding.name);
  return buildingColors[colorIndex % buildingColors.length];
}; 