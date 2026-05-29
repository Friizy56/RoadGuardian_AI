import React, { useEffect, useRef, useState } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Map, Filter, AlertTriangle, ShieldCheck, RefreshCw, Compass, RotateCw, Loader2 } from 'lucide-react';
import { api } from '@/services/api';

export const Heatmap = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('maplibre-gl').Map | null>(null);
  const [selectedHazard, setSelectedHazard] = useState<any | null>(null);
  const [isRotating, setIsRotating] = useState(false);
  const rotationIntervalRef = useRef<any>(null);
  const markerCleanupRef = useRef<(() => void)[]>([]);
  const [hazards, setHazards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    const fetchHazards = async () => {
      try {
        const response = await api.get('/hazards/public/active');
        setHazards(response.data);
      } catch (error) {
        console.error("Failed to fetch active hazards", error);
      } finally {
        setLoading(false);
      }
    };
    fetchHazards();
  }, []);

  // 1. Initialize Map immediately (decoupled from data loading)
  useEffect(() => {
    let disposed = false;

    const initializeMap = async () => {
      if (!mapContainerRef.current) return;

      const maplibregl = await import('maplibre-gl');
      if (disposed || !mapContainerRef.current) return;

      // Initialize MapLibre GL map with a realistic, detailed style (Voyager)
      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
        center: [79.0, 22.0], // Center of India [lng, lat]
        zoom: 4.5,
        pitch: 45, // Tilt the map for a gorgeous 3D view
        bearing: -10, // Slight rotation for realistic angle
      });

      mapRef.current = map;
      map.addControl(new maplibregl.NavigationControl(), 'top-left');

      map.on('load', () => {
        if (!disposed) setMapLoaded(true);
      });
    };

    void initializeMap();

    return () => {
      disposed = true;
      markerCleanupRef.current.forEach((cleanup) => cleanup());
      markerCleanupRef.current = [];
      if (rotationIntervalRef.current) clearInterval(rotationIntervalRef.current);
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // 2. Add custom styled markers once map and data are ready
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || loading) return;

    let disposed = false;
    
    const updateMarkers = async () => {
      const maplibregl = await import('maplibre-gl');
      if (disposed || !mapRef.current) return;
      
      const map = mapRef.current;
      
      // Cleanup old markers
      markerCleanupRef.current.forEach((cleanup) => cleanup());
      markerCleanupRef.current = [];

      // Add custom styled markers for each real hazard
      hazards.forEach((hazard) => {
        // Create HTML element for the custom marker
        const el = document.createElement('div');
        el.className = 'custom-marker';
        el.style.width = '18px';
        el.style.height = '18px';
        el.style.borderRadius = '50%';
        el.style.border = '2px solid white';
        el.style.cursor = 'pointer';
        el.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
      
        // Dynamic color based on severity
        if (hazard.severity_score >= 8) {
          el.style.backgroundColor = '#ef4444'; // Red
          el.style.boxShadow = '0 0 12px #ef4444';
        } else if (hazard.severity_score >= 5) {
          el.style.backgroundColor = '#f59e0b'; // Orange
          el.style.boxShadow = '0 0 12px #f59e0b';
        } else {
          el.style.backgroundColor = '#10b981'; // Green
          el.style.boxShadow = '0 0 12px #10b981';
        }

        // Create popups
        const popupHTML = `
        <div style="font-family: monospace; font-size: 11px; width: 220px; color: #f8fafc; border-radius: 4px; overflow: hidden; border: 1px solid #334155;">
          <div style="background-color: #000080; padding: 6px 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; display: flex; justify-content: space-between; align-items: center; color: white;">
            <span>${hazard.hazard_type.replace('_', ' ')}</span>
            <span style="opacity: 0.7; font-size: 9px;">HZ-${hazard.id}</span>
          </div>
          <div style="padding: 10px; background-color: #090d16;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #1e293b;">
                <td style="padding: 4px 0; color: #94a3b8; font-weight: bold; text-transform: uppercase;">Severity</td>
                <td style="padding: 4px 0; font-weight: 900; text-align: right; color: #ef4444;">${hazard.severity_score.toFixed(1)}/10</td>
              </tr>
              <tr style="border-bottom: 1px solid #1e293b;">
                <td style="padding: 4px 0; color: #94a3b8; font-weight: bold; text-transform: uppercase;">Status</td>
                <td style="padding: 4px 0; font-weight: bold; text-align: right; color: #f8fafc;">${hazard.status}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #94a3b8; font-weight: bold; text-transform: uppercase;">Log Date</td>
                <td style="padding: 4px 0; text-align: right; color: #cbd5e1;">${new Date(hazard.created_at).toLocaleDateString()}</td>
              </tr>
            </table>
          </div>
        </div>
      `;

        const popup = new maplibregl.Popup({ offset: 25 })
          .setHTML(popupHTML);

        // Add to map
        const marker = new maplibregl.Marker(el)
          .setLngLat([hazard.longitude, hazard.latitude])
          .setPopup(popup)
          .addTo(map);

        // Add click listener
        const handleClick = () => {
          map.flyTo({
            center: [hazard.longitude, hazard.latitude],
            zoom: 15,
            speed: 0.8
          });
          setSelectedHazard(hazard);
        };
        el.addEventListener('click', handleClick);
        markerCleanupRef.current.push(() => {
          el.removeEventListener('click', handleClick);
          marker.remove();
        });
      });
    };
    
    void updateMarkers();

    return () => {
      disposed = true;
    };
  }, [loading, hazards, mapLoaded]);

  // Cinematic 3D camera rotation sweep
  const toggleCinematicRotation = () => {
    const map = mapRef.current;
    if (!map) return;

    if (isRotating) {
      if (rotationIntervalRef.current) {
        clearInterval(rotationIntervalRef.current);
        rotationIntervalRef.current = null;
      }
      setIsRotating(false);
    } else {
      setIsRotating(true);
      rotationIntervalRef.current = setInterval(() => {
        const currentBearing = map.getBearing();
        map.setBearing((currentBearing + 0.25) % 360);
      }, 30);
    }
  };

  const handleRecenter = () => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({
      center: [79.0, 22.0],
      zoom: 4.5,
      pitch: 45,
      bearing: -10,
      speed: 1
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b-2 border-[#138808] pb-4 shrink-0">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-[#000080] dark:text-foreground">
            Live Vector Telemetry Map (MapLibre Vector GL)
          </h1>
          <p className="text-muted-foreground font-bold text-xs uppercase tracking-wider mt-1">
            Real-time geospatial vector plotting of active hazard reports.
          </p>
        </div>
        <div className="flex items-center text-[10px] font-mono bg-slate-50 dark:bg-muted border border-border px-3 py-1 text-muted-foreground shadow-sm">
          <Map className="w-3 h-3 mr-2" /> SECTOR: NATIONAL (INDIA)
        </div>
      </div>

      <div className="flex-1 w-full relative border-t-4 border-t-[#000080] dark:border-t-primary rounded-sm overflow-hidden border-x border-b border-border shadow-sm bg-white dark:bg-card">
        
        {/* Map Header Band */}
        <div className="absolute top-0 left-0 w-full z-10 pointer-events-none">
          <div className="bg-[#000080] dark:bg-slate-900 text-white py-1.5 px-4 flex justify-between items-center border-b border-border/50 shadow-sm pointer-events-auto w-full">
            <h2 className="font-black uppercase text-[10px] tracking-widest flex items-center">
              <Filter className="w-3.5 h-3.5 mr-2 text-[#FF9933]" /> Geographic Filter Controls
            </h2>
            <span className="text-[10px] font-mono font-bold text-success flex items-center">
              <ShieldCheck className="w-3 h-3 mr-1 animate-pulse" /> SYSTEM ONLINE
            </span>
          </div>
        </div>

        {/* 3D Camera Controls Overlay */}
        <div className="absolute bottom-6 left-4 z-10 bg-slate-950/90 backdrop-blur-md p-2.5 rounded border border-slate-800 flex items-center gap-2 shadow-lg">
          <button
            onClick={handleRecenter}
            className="flex items-center gap-1.5 bg-slate-850 hover:bg-slate-800 text-slate-200 text-2xs font-bold uppercase tracking-wider px-2.5 py-1.5 rounded transition"
          >
            <Compass className="w-3.5 h-3.5" /> Recenter 3D
          </button>
          <button
            onClick={toggleCinematicRotation}
            className={`flex items-center gap-1.5 text-2xs font-bold uppercase tracking-wider px-2.5 py-1.5 rounded transition shadow ${
              isRotating 
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white animate-pulse' 
                : 'bg-slate-800 hover:bg-slate-750 text-slate-200'
            }`}
          >
            <RotateCw className="w-3.5 h-3.5" />
            {isRotating ? 'Rotating 3D...' : 'Cinematic 3D Sweep'}
          </button>
        </div>

        {/* Floating Filter Panel */}
        <div className="absolute top-12 right-4 z-10 bg-white/95 dark:bg-card/95 backdrop-blur-md p-4 rounded border border-border w-72 space-y-4 hidden md:block shadow-2xl">
          <div className="border-b border-border pb-2 flex justify-between items-center">
             <h3 className="font-black text-xs uppercase tracking-wider text-[#000080] dark:text-primary">Data Overlays</h3>
             <span className="text-[9px] font-mono text-muted-foreground bg-slate-100 dark:bg-muted px-1.5 py-0.5 border border-border">FLT-01</span>
          </div>
          
          <div className="space-y-2">
             <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex justify-between">Severity Threshold <span>0-10</span></label>
             <input type="range" min="0" max="10" className="w-full accent-[#000080] dark:accent-primary cursor-pointer" />
          </div>
          <div className="space-y-2 pt-2">
             <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Incident Status</label>
             <select className="w-full bg-slate-50 dark:bg-background border border-border rounded px-3 py-2 text-xs font-bold uppercase text-foreground focus:outline-none focus:ring-1 focus:ring-[#000080] cursor-pointer">
               <option>All Active Reports</option>
               <option>Pending Dispatch</option>
               <option>Repairs In Progress</option>
               <option>Resolved Incidents</option>
             </select>
          </div>
          
          <div className="bg-[#fdf2e9] dark:bg-yellow-950/20 p-2 border border-[#FF9933]/30 mt-4">
             <p className="text-[9px] text-[#b45309] dark:text-yellow-500 font-bold uppercase tracking-wider flex items-start gap-1 leading-relaxed">
               <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
               High-severity zones automatically escalate to municipal priority.
             </p>
          </div>
        </div>

        {/* Map Container - MapLibre Canvas target */}
        <div ref={mapContainerRef} className="w-full h-full" />
      </div>
    </div>
  );
};

