import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystem } from '../contexts/SystemContext';
import PageContainer from '../components/PageContainer';
import SectionHeader from '../components/SectionHeader';
import { 
  Play, 
  Settings, 
  ShieldAlert, 
  Activity, 
  Users,
  Compass,
  Building
} from 'lucide-react';

export const Simulation: React.FC = () => {
  const { runSimulation } = useSystem();
  
  // Form parameters
  const [simType, setSimType] = useState<'earthquake' | 'wildfire' | 'flood' | 'cyclone'>('cyclone');
  const [intensity, setIntensity] = useState<number>(6.5);
  const [radius, setRadius] = useState<number>(15);
  const [targetSector, setTargetSector] = useState<string>('Sector 4-A Coastal Plains');
  
  // Execution states
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simStep, setSimStep] = useState<number>(0);
  const [simLogs, setSimLogs] = useState<string[]>([]);
  const [outcomeReport, setOutcomeReport] = useState<any | null>(null);

  const steps = [
    { title: 'Initializing Engine', detail: 'Parsing GIS spatial layers and infrastructure nodes...' },
    { title: 'Calculating Severity', detail: 'Triangulating density profiles and building codes...' },
    { title: 'Simulating Logistics', detail: 'Evaluating route blockages and shelter capacities...' },
    { title: 'Finalizing Assessment', detail: 'Generating multi-agent response commands...' }
  ];

  const handleStartSimulation = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSimulating(true);
    setSimStep(0);
    setSimLogs(['[SYSTEM] Initializing disaster simulation matrix...']);
    setOutcomeReport(null);

    // Dynamic execution step triggers (simulates progress logs)
    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      if (currentStep < steps.length) {
        setSimStep(currentStep);
        setSimLogs(prev => [
          `[OK] ${steps[currentStep - 1].title}: Done.`,
          `[RUNNING] ${steps[currentStep].title}... ${steps[currentStep].detail}`,
          ...prev
        ]);
      } else {
        clearInterval(interval);
        
        // Finalize simulation
        runSimulation(simType, intensity, radius, targetSector);
        
        // Compute outcome metrics
        const popMultiplier = simType === 'earthquake' ? 8500 : simType === 'flood' ? 3200 : simType === 'cyclone' ? 6200 : 1500;
        const popAffected = Math.round(intensity * radius * popMultiplier);
        const structureDamage = Math.round(intensity * radius * 12.5);
        const casualties = Math.round((popAffected * (intensity / 100)));

        setOutcomeReport({
          popAffected,
          structureDamage,
          casualties,
          responseConfidence: (98 - (intensity * 2.2) - (radius * 0.15)).toFixed(1),
          criticalNeeds: simType === 'flood' ? 'Rescue rafts, water purification kits' : simType === 'wildfire' ? 'Flame retardant, NDRF fire specialists' : simType === 'cyclone' ? 'Evacuation transit, generator kits' : 'Trauma kits, structural support struts'
        });

        setSimLogs(prev => [
          `[SUCCESS] Simulation complete. Incident registered.`,
          `[LOGS] Deployed diagnostic alerts across active dashboard nodes.`,
          ...prev
        ]);
        setIsSimulating(false);
      }
    }, 1500);
  };

  const getIntensityLabel = () => {
    switch (simType) {
      case 'earthquake': return 'Richter Magnitude';
      case 'cyclone': return 'Saffir-Simpson Class / Wind Index';
      case 'flood': return 'Water Level Rise (meters)';
      default: return 'Fire Canopy Burn Rate Index';
    }
  };

  return (
    <PageContainer>
      <SectionHeader 
        title="Disaster Simulation Engine" 
        description="Run predictive disaster scenario models to test system resilience, evacuation routes, and resource stress levels."
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Simulation Settings Console (1 Col) */}
        <div className="glass-panel border border-gray-800 rounded-xl p-5 flex flex-col gap-4 bg-adcc-secondary/20 h-fit">
          <div className="border-b border-gray-800 pb-3">
            <h3 className="font-bold text-sm tracking-wider font-mono uppercase text-adcc-textPrimary flex items-center gap-1.5">
              <Settings size={15} className="text-adcc-accent" />
              Scenario Configurator
            </h3>
          </div>

          <form onSubmit={handleStartSimulation} className="space-y-4">
            {/* Disaster Type */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-mono text-adcc-textMuted uppercase tracking-wider">Disaster Profile</label>
              <select
                value={simType}
                onChange={(e) => {
                  const type = e.target.value as any;
                  setSimType(type);
                  setIntensity(type === 'earthquake' ? 6.8 : type === 'flood' ? 3.5 : type === 'cyclone' ? 4.2 : 7.2);
                }}
                disabled={isSimulating}
                className="w-full bg-adcc-bg border border-gray-800 text-adcc-textPrimary text-xs rounded-lg p-2.5 font-mono outline-none focus:border-adcc-accent"
              >
                <option value="cyclone">CYCLONE / COASTAL STORM SURGE</option>
                <option value="wildfire">FOREST WILDFIRE CANOPY BLOWOUT</option>
                <option value="flood">URBAN RAMP WATER FLASH FLOOD</option>
                <option value="earthquake">SEISMIC FAULT LOAD RUPTURE</option>
              </select>
            </div>

            {/* Target Area Location */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-mono text-adcc-textMuted uppercase tracking-wider">Target Geo Sector</label>
              <input
                type="text"
                value={targetSector}
                onChange={(e) => setTargetSector(e.target.value)}
                disabled={isSimulating}
                className="w-full bg-adcc-bg border border-gray-800 text-adcc-textPrimary text-xs rounded-lg px-3 py-2.5 font-mono outline-none focus:border-adcc-accent"
                placeholder="Enter sector name..."
              />
            </div>

            {/* Slider: Intensity */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between font-mono text-[10px]">
                <span className="text-adcc-textMuted uppercase">{getIntensityLabel()}</span>
                <span className="text-adcc-accent font-bold">{intensity}</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="0.1"
                value={intensity}
                onChange={(e) => setIntensity(parseFloat(e.target.value))}
                disabled={isSimulating}
                className="w-full accent-adcc-accent cursor-pointer bg-gray-850 h-1.5 rounded-lg appearance-none"
              />
            </div>

            {/* Slider: Radius */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between font-mono text-[10px]">
                <span className="text-adcc-textMuted uppercase">Impact Radius (km)</span>
                <span className="text-adcc-accent font-bold">{radius} km</span>
              </div>
              <input
                type="range"
                min="1"
                max="50"
                step="1"
                value={radius}
                onChange={(e) => setRadius(parseInt(e.target.value))}
                disabled={isSimulating}
                className="w-full accent-adcc-accent cursor-pointer bg-gray-850 h-1.5 rounded-lg appearance-none"
              />
            </div>

            {/* Trigger Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSimulating || !targetSector.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 bg-adcc-warning/15 border border-adcc-warning/30 hover:bg-adcc-warning hover:text-adcc-bg text-xs font-mono font-bold uppercase tracking-wider rounded-lg transition-all duration-200 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-adcc-warning"
              >
                <Play size={14} /> Run Simulation Scenario
              </button>
            </div>
          </form>
        </div>

        {/* Live Simulation Output console / Outcomes report (2 Cols) */}
        <div className="xl:col-span-2 flex flex-col gap-6">
          
          {/* Execution Progress Terminal */}
          <div className="glass-panel border border-gray-800 rounded-xl p-5 flex flex-col gap-4 bg-[#090E1A]">
            <div className="flex items-center justify-between border-b border-gray-850 pb-3">
              <h3 className="font-bold text-sm tracking-wider font-mono uppercase text-adcc-textPrimary flex items-center gap-2">
                <Activity size={16} className="text-adcc-warning" />
                Simulation Terminal logs
              </h3>
              {isSimulating && <span className="text-[10px] font-mono text-adcc-warning uppercase animate-pulse">Running Calculations...</span>}
            </div>

            {/* Dynamic steps visual */}
            {isSimulating && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2 p-2 bg-adcc-secondary/30 border border-gray-850 rounded-lg">
                {steps.map((step, idx) => (
                  <div key={idx} className={`flex flex-col gap-1 p-2 rounded border font-mono text-[9px] ${
                    simStep >= idx ? 'bg-adcc-accentGlow/5 border-adcc-accent/30 text-adcc-accent' : 'bg-transparent border-transparent text-gray-650'
                  }`}>
                    <span className="font-bold">STEP 0{idx + 1}</span>
                    <span className="truncate">{step.title}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Logs box */}
            <div className="h-[180px] bg-[#050811] border border-gray-850 rounded-lg p-3.5 font-mono text-[11px] text-adcc-warning overflow-y-auto flex flex-col-reverse gap-1.5">
              {simLogs.length === 0 ? (
                <div className="flex items-center justify-center h-full text-xs text-adcc-textMuted uppercase">
                  SIMULATOR IDLE. LOAD SCENARIO IN CONFIGURATOR
                </div>
              ) : (
                simLogs.map((log, index) => (
                  <div key={index} className="leading-normal">{log}</div>
                ))
              )}
            </div>
          </div>

          {/* Outcome Simulation Report */}
          <AnimatePresence mode="wait">
            {outcomeReport && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="glass-panel border border-gray-800 rounded-xl p-5 flex flex-col gap-4 bg-adcc-secondary/20"
              >
                <div className="border-b border-gray-800 pb-3">
                  <h3 className="font-bold text-sm tracking-wider font-mono uppercase text-adcc-textPrimary flex items-center gap-1.5">
                    <ShieldAlert size={15} className="text-adcc-danger animate-pulse" />
                    Simulated Impact Assessment Report
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-mono">
                  
                  {/* Population Affected */}
                  <div className="flex flex-col gap-1 bg-[#090E1A] border border-gray-805 p-3 rounded-lg text-left">
                    <span className="text-adcc-textMuted text-[9px] uppercase flex items-center gap-1"><Users size={12} /> Citizens Exposed</span>
                    <span className="text-lg font-extrabold text-adcc-warning">{outcomeReport.popAffected.toLocaleString()}</span>
                  </div>

                  {/* Structural Damage */}
                  <div className="flex flex-col gap-1 bg-[#090E1A] border border-gray-805 p-3 rounded-lg text-left">
                    <span className="text-adcc-textMuted text-[9px] uppercase flex items-center gap-1"><Building size={12} /> Grid Damage Est</span>
                    <span className="text-lg font-extrabold text-adcc-danger">{outcomeReport.structureDamage} structures</span>
                  </div>

                  {/* Casualty estimate */}
                  <div className="flex flex-col gap-1 bg-[#090E1A] border border-gray-805 p-3 rounded-lg text-left">
                    <span className="text-adcc-textMuted text-[9px] uppercase flex items-center gap-1"><ShieldAlert size={12} /> Projected Injuries</span>
                    <span className="text-lg font-extrabold text-adcc-danger">{outcomeReport.casualties} civilians</span>
                  </div>

                  {/* Operational Confidence */}
                  <div className="flex flex-col gap-1 bg-[#090E1A] border border-gray-805 p-3 rounded-lg text-left">
                    <span className="text-adcc-textMuted text-[9px] uppercase flex items-center gap-1"><Compass size={12} /> Resp Success Prob</span>
                    <span className="text-lg font-extrabold text-adcc-success">{outcomeReport.responseConfidence}%</span>
                  </div>

                </div>

                <div className="p-3.5 bg-adcc-bg border border-gray-805 rounded-lg flex flex-col gap-1.5 text-xs font-sans">
                  <span className="text-[10px] font-mono text-adcc-accent font-bold uppercase tracking-wider">AI ALLOCATION RECOMMENDATION</span>
                  <p className="text-adcc-textMuted leading-relaxed">
                    Deploy: <span className="text-adcc-textPrimary font-mono font-semibold">{outcomeReport.criticalNeeds}</span>. Route evacuations toward sector perimeter shelter units. Establish emergency drone communication relays.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

      </div>
    </PageContainer>
  );
};
export default Simulation;
