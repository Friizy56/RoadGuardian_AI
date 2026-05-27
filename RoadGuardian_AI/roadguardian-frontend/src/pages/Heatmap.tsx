import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon in leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const mockHazards = [
  { id: 1, lat: 13.0827, lng: 80.2707, type: 'Pothole', severity: 8, status: 'Pending', date: '2026-05-26' },
  { id: 2, lat: 13.0850, lng: 80.2750, type: 'Crack', severity: 5, status: 'In Progress', date: '2026-05-25' },
  { id: 3, lat: 13.0780, lng: 80.2650, type: 'Waterlogging', severity: 9, status: 'Pending', date: '2026-05-27' },
  { id: 4, lat: 13.0900, lng: 80.2800, type: 'Broken Divider', severity: 10, status: 'Pending', date: '2026-05-27' },
];

export const Heatmap = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Hazard Heatmap</h1>
      </div>
      <div className="h-[calc(100vh-12rem)] w-full relative rounded-xl overflow-hidden border">
        <div className="absolute top-4 right-4 z-[1000] bg-background/90 backdrop-blur p-4 rounded-lg shadow-lg border border-border w-64 space-y-4 hidden md:block">
          <h3 className="font-bold border-b pb-2">Map Filters</h3>
          <div className="space-y-2">
             <label className="text-sm font-medium text-muted-foreground flex justify-between">Severity <span>0-10</span></label>
             <input type="range" min="0" max="10" className="w-full accent-primary" />
          </div>
          <div className="space-y-2">
             <label className="text-sm font-medium text-muted-foreground">Status</label>
             <select className="w-full bg-card border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
               <option>All Reports</option>
               <option>Pending</option>
               <option>In Progress</option>
               <option>Resolved</option>
             </select>
          </div>
        </div>
        <MapContainer center={[13.0827, 80.2707]} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
          {mockHazards.map((hazard) => (
            <Marker key={hazard.id} position={[hazard.lat, hazard.lng]}>
              <Popup className="bg-background text-foreground custom-popup">
                <div className="p-1 space-y-2 text-foreground">
                  <h4 className="font-bold text-lg leading-none">{hazard.type}</h4>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${hazard.severity > 7 ? 'bg-destructive text-white' : 'bg-yellow-500/20 text-yellow-500'}`}>
                      Severity: {hazard.severity}/10
                    </span>
                    <span className="px-2 py-1 rounded text-xs font-bold bg-secondary text-white">
                      {hazard.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Reported: {hazard.date}</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
};
