import React from 'react';
import { Territory } from '../../types/sales';

interface TerritoryMapProps {
  territory: Territory;
}

/**
 * TerritoryMap component displays a map visualization of a sales territory
 * Note: In a real app, this would integrate with a mapping library like Mapbox, Google Maps,
 * or Leaflet to show actual geographic regions. This is a simplified placeholder.
 */
const TerritoryMap: React.FC<TerritoryMapProps> = ({ territory }) => {
  // This is a placeholder for a real map implementation
  // In a real application, this would use a mapping library like Leaflet, Google Maps, or react-simple-maps
  
  // Generate a pseudo-random color based on territory name for the demo
  const getColor = (name: string) => {
    const hash = name.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    
    return `hsl(${Math.abs(hash) % 360}, 70%, 80%)`;
  };
  
  const mapColor = getColor(territory.name);
  
  return (
    <div className="border rounded-md overflow-hidden" style={{ height: '200px' }}>
      <div className="h-full w-full flex items-center justify-center bg-gray-100 relative">
        <div 
          className="absolute" 
          style={{ 
            top: '30px', 
            left: '50px', 
            right: '50px', 
            bottom: '30px',
            backgroundColor: mapColor,
            borderRadius: '12px',
            border: '2px solid rgba(0,0,0,0.1)',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center z-10">
            <div className="font-semibold text-gray-600">{territory.region}</div>
            <div className="text-sm text-gray-500">{territory.accounts} accounts</div>
          </div>
        </div>
        <div className="absolute bottom-2 right-2 text-xs text-gray-500">
          Mock map visualization
        </div>
      </div>
    </div>
  );
};

export default TerritoryMap; 