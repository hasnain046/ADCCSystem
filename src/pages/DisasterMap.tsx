import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import apiService, { 
  BackendDisaster, 
  BackendHospital, 
  BackendShelter, 
  BackendResource 
} from '../services/api';
import PageContainer from '../components/PageContainer';
import SectionHeader from '../components/SectionHeader';
import { 
  Compass, 
  MapPin, 
  Flame, 
  Wind, 
  Droplets, 
  Activity, 
  Filter,
  HeartPulse,
  Home,
  Boxes,
  Map
} from 'lucide-react';

type MapEntity = 
  | { type: 'disaster'; data: BackendDisaster }
  | { type: 'hospital'; data: BackendHospital }
  | { type: 'shelter'; data: BackendShelter }
  | { type: 'resource'; data: BackendResource };

export const DisasterMap: React.FC = () => {
  const [selectedEntity, setSelectedEntity] = useState<MapEntity | null>(null);
  
  // Layer toggles
  const [showDisasters, setShowDisasters] = useState(true);
  const [showHospitals, setShowHospitals] = useState(true);
  const [showShelters, setShowShelters] = useState(true);
  const [showResources, setShowResources] = useState(true);

  // Filters
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');

  // Fetch live layers
  const { data: disasters = [] } = useQuery({ queryKey: ['disasters'], queryFn: apiService.getDisasters });
  const { data: hospitals = [] } = useQuery({ queryKey: ['hospitals'], queryFn: apiService.getHospitals });
  const { data: shelters = [] } = useQuery({ queryKey: ['shelters'], queryFn: apiService.getShelters });
  const { data: resources = [] } = useQuery({ queryKey: ['resources'], queryFn: apiService.getResources });

  // Filter disasters
  const filteredDisasters = disasters.filter(d => {
    const matchesType = filterType === 'all' || d.disaster_type.toLowerCase() === filterType.toLowerCase();
    const matchesSeverity = filterSeverity === 'all' || d.severity.toLowerCase() === filterSeverity.toLowerCase();
    return matchesType && matchesSeverity;
  });

  const getDisasterIcon = (type: string, size = 16) => {
    switch (type.toLowerCase()) {
      case 'wildfire': return <Flame size={size} className="text-[#F97316]" />;
      case 'cyclone': return <Wind size={size} className="text-[#EF4444]" />;
      case 'flood': return <Droplets size={size} className="text-[#00E5FF]" />;
      default: return <Activity size={size} className="text-[#A78BFA]" />;
    }
  };

  const getSeverityBorderColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'border-adcc-danger text-adcc-danger';
      case 'high': return 'border-[#F97316] text-[#F97316]';
      case 'medium': return 'border-adcc-warning text-adcc-warning';
      default: return 'border-adcc-success text-adcc-success';
    }
  };

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'bg-[#EF4444] text-white';
      case 'high': return 'bg-[#F97316] text-white';
      case 'medium': return 'bg-[#F59E0B] text-adcc-bg';
      default: return 'bg-[#10B981] text-white';
    }
  };

  // Dynamically calculate coordinate bounds of all items to scale them onto the SVG map
  const getMapBounds = () => {
    const points: Array<{ lat: number; lng: number }> = [];

    if (showDisasters) {
      filteredDisasters.forEach(d => points.push({ lat: d.latitude, lng: d.longitude }));
    }
    if (showHospitals) {
      hospitals.forEach(h => points.push({ lat: h.latitude, lng: h.longitude }));
    }
    if (showShelters) {
      shelters.forEach(s => points.push({ lat: s.latitude, lng: s.longitude }));
    }
    if (showResources) {
      resources.forEach(r => {
        if (r.latitude && r.longitude) points.push({ lat: r.latitude, lng: r.longitude });
      });
    }

    if (points.length === 0) {
      // broad default India bounds enclosing Mumbai/Guwahati
      return { minLat: 15.0, maxLat: 28.0, minLng: 70.0, maxLng: 95.0 };
    }

    const lats = points.map(p => p.lat);
    const lngs = points.map(p => p.lng);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    // Add padding (at least 1.0 degree to avoid div by zero)
    const latDiff = Math.max(1.5, maxLat - minLat);
    const lngDiff = Math.max(1.5, maxLng - minLng);

    return {
      minLat: minLat - latDiff * 0.15,
      maxLat: maxLat + latDiff * 0.15,
      minLng: minLng - lngDiff * 0.15,
      maxLng: maxLng + lngDiff * 0.15,
    };
  };

  const bounds = getMapBounds();

  // Convert lat/lng to percentage X/Y
  const getMapCoords = (lat: number, lng: number) => {
    const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100;
    const y = 100 - ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * 100;
    return { x: Math.max(8, Math.min(92, x)), y: Math.max(8, Math.min(92, y)) };
  };

  return (
    <PageContainer>
      <SectionHeader 
        title="Tactical Incident Map" 
        description="Geospatial overlay of live disasters, hospitals, shelters, and resource allocations."
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-210px)] min-h-[550px]">
        
        {/* Map Interface Area */}
        <div className="lg:col-span-3 glass-panel border border-gray-800 rounded-xl relative overflow-hidden flex flex-col bg-adcc-secondary/40">
          
          {/* Map Top Bar (Filters & Layers) */}
          <div className="p-3 border-b border-gray-800 bg-adcc-secondary flex flex-wrap items-center justify-between gap-3 z-10">
            <div className="flex items-center gap-2 text-xs font-mono">
              <Filter size={14} className="text-adcc-accent" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-adcc-bg border border-gray-850 text-adcc-textPrimary text-xs rounded px-2.5 py-1 font-mono outline-none focus:border-adcc-accent"
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
                className="bg-adcc-bg border border-gray-850 text-adcc-textPrimary text-xs rounded px-2.5 py-1 font-mono outline-none focus:border-adcc-accent"
              >
                <option value="all">ALL SEVERITY</option>
                <option value="critical">CRITICAL</option>
                <option value="high">HIGH</option>
                <option value="medium">MEDIUM</option>
                <option value="low">LOW</option>
              </select>
            </div>

            {/* Layer Toggles */}
            <div className="flex flex-wrap gap-3 text-[10px] font-mono select-none">
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={showDisasters} onChange={() => setShowDisasters(!showDisasters)} className="rounded text-adcc-accent bg-adcc-bg border-gray-850" />
                <span className="text-adcc-danger">HAZARDS</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={showHospitals} onChange={() => setShowHospitals(!showHospitals)} className="rounded text-adcc-accent bg-adcc-bg border-gray-850" />
                <span className="text-[#00E5FF]">HOSPITALS</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={showShelters} onChange={() => setShowShelters(!showShelters)} className="rounded text-adcc-accent bg-adcc-bg border-gray-850" />
                <span className="text-purple-400">SHELTERS</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={showResources} onChange={() => setShowResources(!showResources)} className="rounded text-adcc-accent bg-adcc-bg border-gray-850" />
                <span className="text-green-400">RESOURCES</span>
              </label>
            </div>
          </div>

          {/* Interactive Map Visual */}
          <div className="flex-1 relative bg-[#060A13] overflow-hidden select-none">
            {/* Grid Overlay */}
            <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />

            {/* Tactical Compass Overlay */}
            <div className="absolute bottom-6 right-6 flex flex-col items-center gap-1 bg-adcc-bg/85 border border-gray-800/80 p-2.5 rounded-lg z-10 pointer-events-none">
              <Compass className="text-adcc-accent animate-[spin_30s_linear_infinite]" size={24} />
              <span className="text-[8px] font-mono text-adcc-textMuted uppercase tracking-widest">TACTICAL GRID</span>
            </div>

            {/* Top-Left Telemetry Coordinates */}
            <div className="absolute top-4 left-4 bg-adcc-bg/85 border border-gray-800/80 p-3 rounded-lg z-10 pointer-events-none font-mono text-[9px] text-adcc-textMuted flex flex-col gap-0.5">
              <span className="text-adcc-accent font-bold uppercase tracking-wider">MAP VIEW TELEMETRY</span>
              <span>BOUNDS: [{bounds.minLat.toFixed(2)}N, {bounds.minLng.toFixed(2)}E] TO [{bounds.maxLat.toFixed(2)}N, {bounds.maxLng.toFixed(2)}E]</span>
              <span>Ingested: {disasters.length} records</span>
            </div>

            {/* SVG Geographical outlines & radar sweeps */}
            <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50%" cy="50%" r="180" fill="none" stroke="rgba(0, 229, 255, 0.03)" strokeWidth="1" strokeDasharray="4 4" />
              <circle cx="50%" cy="50%" r="300" fill="none" stroke="rgba(0, 229, 255, 0.02)" strokeWidth="1" />
              <line x1="50%" y1="0" x2="50%" y2="100%" stroke="rgba(0, 229, 255, 0.02)" strokeWidth="0.5" />
              <line x1="0" y1="50%" x2="100%" y2="50%" stroke="rgba(0, 229, 255, 0.02)" strokeWidth="0.5" />
              
              {/* Topological outlines */}
              <path d="M 50 150 Q 250 50, 450 180 T 800 100" fill="none" stroke="rgba(255,255,255,0.015)" strokeWidth="1" />
              <path d="M 100 450 Q 300 300, 600 500 T 1100 400" fill="none" stroke="rgba(255,255,255,0.01)" strokeWidth="1" />
            </svg>

            {/* Render Disaster Pins */}
            {showDisasters && filteredDisasters.map((d) => {
              const coords = getMapCoords(d.latitude, d.longitude);
              const isSelected = selectedEntity?.type === 'disaster' && selectedEntity.data.id === d.id;
              
              const getPinColor = () => {
                switch (d.severity.toLowerCase()) {
                  case 'critical': return 'bg-[#EF4444]'; // Red
                  case 'high': return 'bg-[#F97316]';     // Orange
                  case 'medium': return 'bg-[#F59E0B]';   // Yellow
                  default: return 'bg-[#10B981]';         // Green
                }
              };

              return (
                <button
                  key={d.id}
                  onClick={() => setSelectedEntity({ type: 'disaster', data: d })}
                  className={`absolute -ml-3 -mt-3 p-1 rounded-full cursor-pointer transition-all duration-200 hover:scale-125 z-25 ${
                    isSelected ? 'ring-4 ring-adcc-accent shadow-glow' : 'ring-2 ring-transparent'
                  }`}
                  style={{ left: `${coords.x}%`, top: `${coords.y}%` }}
                >
                  <div className="relative">
                    {d.status === 'Active' && (
                      <span className={`absolute -inset-1.5 rounded-full opacity-65 animate-ping ${getPinColor()}`} />
                    )}
                    <div className={`w-4 h-4 rounded-full border border-adcc-bg ${getPinColor()} flex items-center justify-center relative z-10`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-white block" />
                    </div>
                  </div>
                </button>
              );
            })}

            {/* Render Hospital Pins */}
            {showHospitals && hospitals.map((h) => {
              const coords = getMapCoords(h.latitude, h.longitude);
              const isSelected = selectedEntity?.type === 'hospital' && selectedEntity.data.id === h.id;
              return (
                <button
                  key={h.id}
                  onClick={() => setSelectedEntity({ type: 'hospital', data: h })}
                  className={`absolute -ml-3 -mt-3 p-1 rounded bg-[#00E5FF]/10 border border-[#00E5FF]/30 cursor-pointer transition-all duration-200 hover:scale-125 z-20 ${
                    isSelected ? 'ring-2 ring-white shadow-glow' : ''
                  }`}
                  style={{ left: `${coords.x}%`, top: `${coords.y}%` }}
                >
                  <HeartPulse size={12} className="text-[#00E5FF]" />
                </button>
              );
            })}

            {/* Render Shelter Pins */}
            {showShelters && shelters.map((s) => {
              const coords = getMapCoords(s.latitude, s.longitude);
              const isSelected = selectedEntity?.type === 'shelter' && selectedEntity.data.id === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedEntity({ type: 'shelter', data: s })}
                  className={`absolute -ml-3 -mt-3 p-1 bg-purple-900/20 border border-purple-500/35 rounded-full cursor-pointer transition-all duration-200 hover:scale-125 z-20 ${
                    isSelected ? 'ring-2 ring-white' : ''
                  }`}
                  style={{ left: `${coords.x}%`, top: `${coords.y}%` }}
                >
                  <Home size={12} className="text-purple-400" />
                </button>
              );
            })}

            {/* Render Resource Pins */}
            {showResources && resources.map((r) => {
              if (!r.latitude || !r.longitude) return null;
              const coords = getMapCoords(r.latitude, r.longitude);
              const isSelected = selectedEntity?.type === 'resource' && selectedEntity.data.id === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedEntity({ type: 'resource', data: r })}
                  className={`absolute -ml-2 -mt-2 p-0.5 bg-green-950/20 border border-green-500/35 rounded cursor-pointer transition-all duration-200 hover:scale-125 z-20 ${
                    isSelected ? 'ring-1 ring-white' : ''
                  }`}
                  style={{ left: `${coords.x}%`, top: `${coords.y}%` }}
                >
                  <Boxes size={10} className="text-green-400" />
                </button>
              );
            })}

          </div>
        </div>

        {/* Selected Entity Details Panel */}
        <div className="glass-panel border border-gray-800 rounded-xl p-5 flex flex-col gap-4 bg-adcc-secondary/20">
          <div className="border-b border-gray-800 pb-3">
            <h3 className="font-bold text-sm tracking-wider font-mono uppercase text-adcc-textPrimary flex items-center gap-1.5">
              <Map size={15} className="text-adcc-accent" />
              GIS Tactical Layer
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto pr-1">
            <AnimatePresence mode="wait">
              {selectedEntity ? (
                <motion.div
                  key={selectedEntity.data.id}
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-4 font-mono text-xs"
                >
                  {/* Category Badge */}
                  <span className={`px-2 py-0.5 self-start text-[9px] uppercase font-bold border rounded tracking-wider ${
                    selectedEntity.type === 'disaster' ? getSeverityBorderColor((selectedEntity.data as BackendDisaster).severity) :
                    selectedEntity.type === 'hospital' ? 'border-[#00E5FF] text-[#00E5FF]' :
                    selectedEntity.type === 'shelter' ? 'border-purple-500 text-purple-400' :
                    'border-green-500 text-green-400'
                  }`}>
                    {selectedEntity.type.toUpperCase()}
                  </span>

                  {/* Title / Name */}
                  <h4 className="text-sm font-bold text-adcc-textPrimary flex items-center gap-1.5">
                    {selectedEntity.type === 'disaster' && getDisasterIcon((selectedEntity.data as BackendDisaster).disaster_type)}
                    {selectedEntity.type === 'hospital' && <HeartPulse size={15} className="text-[#00E5FF]" />}
                    {selectedEntity.type === 'shelter' && <Home size={15} className="text-purple-400" />}
                    {selectedEntity.type === 'resource' && <Boxes size={15} className="text-green-400" />}
                    {selectedEntity.type === 'disaster' ? (selectedEntity.data as BackendDisaster).title :
                     selectedEntity.type === 'hospital' ? (selectedEntity.data as BackendHospital).name :
                     selectedEntity.type === 'shelter' ? (selectedEntity.data as BackendShelter).name :
                     (selectedEntity.data as BackendResource).resource_name}
                  </h4>

                  {/* Coordinates Info */}
                  <div className="grid grid-cols-2 gap-2 bg-adcc-secondary border border-gray-850 p-2.5 rounded-lg text-[10px]">
                    <div className="flex flex-col">
                      <span className="text-adcc-textMuted uppercase text-[8px]">LATITUDE</span>
                      <span className="text-adcc-textPrimary font-semibold">{selectedEntity.data.latitude?.toFixed(4) ?? '--'}° N</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-adcc-textMuted uppercase text-[8px]">LONGITUDE</span>
                      <span className="text-adcc-textPrimary font-semibold">{selectedEntity.data.longitude?.toFixed(4) ?? '--'}° E</span>
                    </div>
                  </div>

                  {/* Detailed Specs based on category */}
                  {selectedEntity.type === 'disaster' && (
                    <div className="space-y-2.5 mt-2">
                      <div className="flex justify-between border-b border-gray-850 pb-1.5">
                        <span className="text-adcc-textMuted">Hazard Type:</span>
                        <span className="font-semibold text-adcc-textPrimary">{(selectedEntity.data as BackendDisaster).disaster_type}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-850 pb-1.5">
                        <span className="text-adcc-textMuted">Severity:</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${getSeverityBadgeColor((selectedEntity.data as BackendDisaster).severity)}`}>
                          {(selectedEntity.data as BackendDisaster).severity}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-gray-850 pb-1.5">
                        <span className="text-adcc-textMuted">Affected Citizens:</span>
                        <span className="font-bold text-adcc-textPrimary">{(selectedEntity.data as BackendDisaster).affected_population?.toLocaleString() ?? 'Unknown'}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-850 pb-1.5">
                        <span className="text-adcc-textMuted">Confidence Rating:</span>
                        <span className="text-adcc-accent">{(selectedEntity.data as BackendDisaster).confidence_score ? `${Math.round((selectedEntity.data as BackendDisaster).confidence_score! * 100)}%` : '--'}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-850 pb-1.5">
                        <span className="text-adcc-textMuted">Verification Status:</span>
                        <span className="text-adcc-success">{(selectedEntity.data as BackendDisaster).verification_status}</span>
                      </div>
                    </div>
                  )}

                  {selectedEntity.type === 'hospital' && (
                    <div className="space-y-2.5 mt-2">
                      <div className="flex justify-between border-b border-gray-850 pb-1.5">
                        <span className="text-adcc-textMuted">City Location:</span>
                        <span className="font-semibold text-adcc-textPrimary">{(selectedEntity.data as BackendHospital).city}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-850 pb-1.5">
                        <span className="text-adcc-textMuted">Available Beds:</span>
                        <span className="font-bold text-adcc-success">{(selectedEntity.data as BackendHospital).available_beds} slots</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-850 pb-1.5">
                        <span className="text-adcc-textMuted">Total Bed Capacity:</span>
                        <span className="text-adcc-textPrimary">{(selectedEntity.data as BackendHospital).total_beds} slots</span>
                      </div>
                    </div>
                  )}

                  {selectedEntity.type === 'shelter' && (
                    <div className="space-y-2.5 mt-2">
                      <div className="flex justify-between border-b border-gray-850 pb-1.5">
                        <span className="text-adcc-textMuted">City Location:</span>
                        <span className="font-semibold text-adcc-textPrimary">{(selectedEntity.data as BackendShelter).city}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-850 pb-1.5">
                        <span className="text-adcc-textMuted">Occupied Slots:</span>
                        <span className="font-bold text-adcc-warning">{(selectedEntity.data as BackendShelter).occupied} citizens</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-850 pb-1.5">
                        <span className="text-adcc-textMuted">Vacant Capacity:</span>
                        <span className="font-bold text-adcc-success">
                          {Math.max(0, (selectedEntity.data as BackendShelter).capacity - (selectedEntity.data as BackendShelter).occupied)} slots
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-gray-850 pb-1.5">
                        <span className="text-adcc-textMuted">Total Volume:</span>
                        <span className="text-adcc-textPrimary">{(selectedEntity.data as BackendShelter).capacity} slots</span>
                      </div>
                    </div>
                  )}

                  {selectedEntity.type === 'resource' && (
                    <div className="space-y-2.5 mt-2">
                      <div className="flex justify-between border-b border-gray-850 pb-1.5">
                        <span className="text-adcc-textMuted">Equipment Type:</span>
                        <span className="font-semibold text-adcc-textPrimary">{(selectedEntity.data as BackendResource).resource_type.replace('_', ' ')}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-850 pb-1.5">
                        <span className="text-adcc-textMuted">Current Status:</span>
                        <span className={`font-bold ${
                          (selectedEntity.data as BackendResource).status === 'Available' ? 'text-adcc-success' : 'text-adcc-warning'
                        }`}>
                          {(selectedEntity.data as BackendResource).status}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-gray-850 pb-1.5">
                        <span className="text-adcc-textMuted">Reserves Quantity:</span>
                        <span className="font-bold text-adcc-textPrimary">{(selectedEntity.data as BackendResource).quantity} units</span>
                      </div>
                    </div>
                  )}

                </motion.div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center gap-2 border border-dashed border-gray-800 rounded-lg text-xs font-mono text-adcc-textMuted p-4 text-center">
                  <MapPin size={24} className="text-adcc-accent animate-pulse" />
                  <span>SELECT PIN ON TACTICAL GRID FOR SATELLITE DIAGNOSTICS OVERLAYS</span>
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
