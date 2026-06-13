import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  useSystem, 
  Disaster 
} from '../contexts/SystemContext';
import PageContainer from '../components/PageContainer';
import SectionHeader from '../components/SectionHeader';
import { 
  Compass, 
  Layers, 
  MapPin, 
  Users, 
  Radio, 
  Clock, 
  Flame, 
  Wind, 
  Droplets, 
  Activity, 
  CheckCircle,
  Filter
} from 'lucide-react';

export const DisasterMap: React.FC = () => {
  const { disasters, resolveDisaster } = useSystem();
  const [selectedDisaster, setSelectedDisaster] = useState<Disaster | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');

  // Filter disasters
  const activeDisasters = disasters.filter(d => {
    const matchesType = filterType === 'all' || d.type === filterType;
    const matchesSeverity = filterSeverity === 'all' || d.severity === filterSeverity;
    return matchesType && matchesSeverity;
  });

  const getDisasterIcon = (type: string, size = 16) => {
    switch (type) {
      case 'wildfire': return <Flame size={size} className="text-adcc-warning" />;
      case 'cyclone': return <Wind size={size} className="text-adcc-danger" />;
      case 'flood': return <Droplets size={size} className="text-adcc-accent" />;
      default: return <Activity size={size} className="text-[#A78BFA]" />;
    }
  };

  const getSeverityBorderColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-adcc-danger text-adcc-danger';
      case 'major': return 'border-adcc-warning text-adcc-warning';
      default: return 'border-adcc-success text-adcc-success';
    }
  };

  // Convert lat/lng to map coordinates (X: 10% - 90%, Y: 10% - 90%)
  // Bounds of Mock Map (Lat: 21.0 to 24.0, Lng: 86.5 to 89.5)
  const getMapCoords = (lat: number, lng: number) => {
    const minLat = 21.0;
    const maxLat = 24.0;
    const minLng = 86.5;
    const maxLng = 89.5;

    // percentage
    const x = ((lng - minLng) / (maxLng - minLng)) * 100;
    const y = 100 - ((lat - minLat) / (maxLat - minLat)) * 100; // Invert y since SVG top is 0

    return { x: Math.max(10, Math.min(90, x)), y: Math.max(10, Math.min(90, y)) };
  };

  return (
    <PageContainer>
      <SectionHeader 
        title="Tactical Disaster Map" 
        description="Geospatial overlay of real-time disaster alerts, weather layers, and active responders."
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-210px)] min-h-[550px]">
        
        {/* Map Interface Area */}
        <div className="lg:col-span-3 glass-panel border border-gray-800 rounded-xl relative overflow-hidden flex flex-col bg-adcc-secondary/40">
          
          {/* Map Top Bar (Filters & Controllers) */}
          <div className="p-3 border-b border-gray-800 bg-adcc-secondary flex flex-wrap items-center justify-between gap-3 z-10">
            <div className="flex items-center gap-2 text-xs font-mono">
              <Filter size={14} className="text-adcc-accent" />
              <span className="text-adcc-textMuted uppercase font-bold pr-2">GIS Filters:</span>
              
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-adcc-bg border border-gray-800 text-adcc-textPrimary text-xs rounded px-2.5 py-1 font-mono outline-none focus:border-adcc-accent"
              >
                <option value="all">ALL HAZARDS</option>
                <option value="cyclone">CYCLONES</option>
                <option value="wildfire">WILDFIRES</option>
                <option value="flood">FLOODS</option>
                <option value="earthquake">EARTHQUAKES</option>
              </select>

              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="bg-adcc-bg border border-gray-800 text-adcc-textPrimary text-xs rounded px-2.5 py-1 font-mono outline-none focus:border-adcc-accent"
              >
                <option value="all">ALL SEVERITY</option>
                <option value="critical">CRITICAL</option>
                <option value="major">MAJOR</option>
                <option value="minor">MINOR</option>
              </select>
            </div>

            <div className="flex items-center gap-4 text-[10px] font-mono text-adcc-textMuted">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 bg-adcc-danger rounded-full inline-block" /> Critical
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 bg-adcc-warning rounded-full inline-block" /> Major
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 bg-adcc-success rounded-full inline-block" /> Minor
              </span>
            </div>
          </div>

          {/* Interactive Map Visual */}
          <div className="flex-1 relative bg-[#090E1A] overflow-hidden select-none">
            
            {/* Grid Overlay */}
            <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />

            {/* Tactical Compass Overlay */}
            <div className="absolute bottom-6 right-6 flex flex-col items-center gap-1 bg-adcc-bg/85 border border-gray-800/80 p-2.5 rounded-lg z-10 pointer-events-none">
              <Compass className="text-adcc-accent animate-[spin_20s_linear_infinite]" size={28} />
              <span className="text-[9px] font-mono text-adcc-textMuted">SECTOR: EAST-1</span>
            </div>

            {/* Top-Left Telemetry Coordinates */}
            <div className="absolute top-4 left-4 bg-adcc-bg/85 border border-gray-800/80 p-3 rounded-lg z-10 pointer-events-none font-mono text-[9px] text-adcc-textMuted flex flex-col gap-1">
              <span className="text-adcc-accent font-bold">RADAR TELEMETRY // OVERVIEW</span>
              <span>GRID LIMIT: [21.0N, 86.5E] TO [24.0N, 89.5E]</span>
              <span>SATELLITE PASS: NOAA-19</span>
              <span>POLAR ORBIT: ACTIVE</span>
            </div>

            {/* Custom SVG Vector Map Layer */}
            <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
              {/* Radar sweep lines */}
              <circle cx="50%" cy="50%" r="200" fill="none" stroke="rgba(0, 229, 255, 0.04)" strokeWidth="1" strokeDasharray="5 5" />
              <circle cx="50%" cy="50%" r="350" fill="none" stroke="rgba(0, 229, 255, 0.03)" strokeWidth="1" />
              <line x1="50%" y1="0" x2="50%" y2="100%" stroke="rgba(0, 229, 255, 0.03)" strokeWidth="1" />
              <line x1="0" y1="50%" x2="100%" y2="50%" stroke="rgba(0, 229, 255, 0.03)" strokeWidth="1" />

              {/* Mock Geography outlines (Topological curves) */}
              <path d="M 100 150 Q 200 80, 350 200 T 600 120 T 900 160" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="2" />
              <path d="M 50 350 Q 300 450, 500 300 T 850 400" fill="none" stroke="rgba(255,255,255,0.015)" strokeWidth="1.5" />
              <path d="M 200 600 Q 400 500, 700 700 T 1000 550" fill="none" stroke="rgba(0,229,255,0.01)" strokeWidth="2" />

              {/* Coastal shore boundary */}
              <path d="M 0 450 Q 250 480, 400 600 T 800 650 T 1200 800" fill="none" stroke="rgba(0, 229, 255, 0.1)" strokeWidth="2.5" strokeDasharray="8 4" />
            </svg>

            {/* Glowing Scan Ring from the selected disaster */}
            {selectedDisaster && selectedDisaster.status === 'active' && (
              <div 
                className="absolute w-24 h-24 -ml-12 -mt-12 rounded-full border border-adcc-accent/40 bg-adcc-accent/5 pointer-events-none animate-ping"
                style={{
                  left: `${getMapCoords(selectedDisaster.lat, selectedDisaster.lng).x}%`,
                  top: `${getMapCoords(selectedDisaster.lat, selectedDisaster.lng).y}%`
                }}
              />
            )}

            {/* Disaster Pins Overlay */}
            {activeDisasters.map((d) => {
              const coords = getMapCoords(d.lat, d.lng);
              const isSelected = selectedDisaster?.id === d.id;
              
              const getPinColor = () => {
                if (d.status === 'resolved') return 'bg-adcc-success';
                switch (d.severity) {
                  case 'critical': return 'bg-adcc-danger';
                  case 'major': return 'bg-adcc-warning';
                  default: return 'bg-adcc-info';
                }
              };

              return (
                <button
                  key={d.id}
                  onClick={() => setSelectedDisaster(d)}
                  className={`absolute -ml-3 -mt-3 p-1 rounded-full cursor-pointer transition-all duration-300 hover:scale-125 z-20 ${
                    isSelected ? 'ring-4 ring-adcc-accent shadow-glow' : 'ring-2 ring-transparent'
                  }`}
                  style={{ left: `${coords.x}%`, top: `${coords.y}%` }}
                >
                  <div className="relative">
                    {/* Ring Pulse Overlay */}
                    {d.status === 'active' && (
                      <span className={`absolute -inset-1.5 rounded-full opacity-60 animate-ping ${
                        d.severity === 'critical' ? 'bg-adcc-danger' : d.severity === 'major' ? 'bg-adcc-warning' : 'bg-adcc-info'
                      }`} />
                    )}
                    {/* Dot pin */}
                    <div className={`w-4 h-4 rounded-full border border-adcc-bg ${getPinColor()} flex items-center justify-center relative z-10`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-white block" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Incident Telemetry / Details Panel */}
        <div className="glass-panel border border-gray-800 rounded-xl p-5 flex flex-col gap-4 bg-adcc-secondary/20">
          <div className="border-b border-gray-800 pb-3">
            <h3 className="font-bold text-sm tracking-wider font-mono uppercase text-adcc-textPrimary flex items-center gap-1.5">
              <Layers size={15} className="text-adcc-accent" />
              GIS Telemetry Node
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto pr-1">
            <AnimatePresence mode="wait">
              {selectedDisaster ? (
                <motion.div
                  key={selectedDisaster.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  className="flex flex-col gap-4"
                >
                  {/* Disaster Header */}
                  <div className="flex flex-col gap-2">
                    <span className={`px-2 py-0.5 self-start text-[9px] uppercase font-mono font-bold border rounded tracking-wider ${
                      getSeverityBorderColor(selectedDisaster.severity)
                    }`}>
                      {selectedDisaster.severity} // {selectedDisaster.status}
                    </span>
                    <h4 className="text-base font-bold text-adcc-textPrimary mt-1 flex items-center gap-2">
                      {getDisasterIcon(selectedDisaster.type, 18)}
                      {selectedDisaster.name}
                    </h4>
                  </div>

                  {/* Core Coordinates */}
                  <div className="grid grid-cols-2 gap-2 bg-adcc-secondary border border-gray-800/80 p-3 rounded-lg font-mono text-[11px]">
                    <div className="flex flex-col">
                      <span className="text-adcc-textMuted uppercase text-[9px]">LATITUDE</span>
                      <span className="text-adcc-textPrimary font-semibold">{selectedDisaster.lat.toFixed(4)}° N</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-adcc-textMuted uppercase text-[9px]">LONGITUDE</span>
                      <span className="text-adcc-textPrimary font-semibold">{selectedDisaster.lng.toFixed(4)}° E</span>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-mono text-adcc-textMuted uppercase tracking-wider">Telemetry Logs</span>
                    <p className="text-xs text-adcc-textMuted leading-relaxed bg-adcc-secondary/40 border border-gray-800/50 p-3 rounded-lg font-sans">
                      {selectedDisaster.description}
                    </p>
                  </div>

                  {/* Telemetry info fields */}
                  <div className="space-y-2.5 font-mono text-xs">
                    <div className="flex items-center justify-between border-b border-gray-800/50 pb-1.5">
                      <span className="text-adcc-textMuted flex items-center gap-1.5"><Users size={13} /> Exposure:</span>
                      <span className="font-bold text-adcc-textPrimary">{selectedDisaster.affectedPopulation.toLocaleString()} citizens</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-gray-800/50 pb-1.5">
                      <span className="text-adcc-textMuted flex items-center gap-1.5"><Radio size={13} /> Sensor Type:</span>
                      <span className="text-adcc-accent capitalize">{selectedDisaster.type} sensor</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-gray-800/50 pb-1.5">
                      <span className="text-adcc-textMuted flex items-center gap-1.5"><Clock size={13} /> Time:</span>
                      <span className="text-adcc-textPrimary">{selectedDisaster.timestamp}</span>
                    </div>
                  </div>

                  {/* Interactive Action Controls */}
                  {selectedDisaster.status === 'active' && (
                    <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-gray-800">
                      <button
                        onClick={() => {
                          resolveDisaster(selectedDisaster.id);
                          setSelectedDisaster(prev => prev ? { ...prev, status: 'resolved' } : null);
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-adcc-success/15 border border-adcc-success/30 hover:bg-adcc-success hover:text-adcc-bg text-xs font-mono font-bold uppercase tracking-wider rounded-lg transition-all duration-200"
                      >
                        <CheckCircle size={14} /> Resolve Incident
                      </button>
                    </div>
                  )}
                </motion.div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center gap-2 border border-dashed border-gray-800 rounded-lg text-xs font-mono text-adcc-textMuted p-4 text-center">
                  <MapPin size={24} className="text-adcc-accent animate-pulse" />
                  <span>SELECT PIN ON TACTICAL GRID FOR SATELLITE DETAILS</span>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>
    </PageContainer>
  );
};
export default DisasterMap;
