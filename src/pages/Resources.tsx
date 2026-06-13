import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useSystem, ResourceStatus } from '../contexts/SystemContext';
import PageContainer from '../components/PageContainer';
import SectionHeader from '../components/SectionHeader';
import { 
  Boxes, 
  Truck, 
  Plus, 
  Minus, 
  ShieldAlert, 
  Navigation,
  Warehouse,
  Hospital,
  PlaneTakeoff
} from 'lucide-react';

export const Resources: React.FC = () => {
  const { resources, dispatchResources, replenishResources } = useSystem();
  
  // Local states for dispatch inputs
  const [dispatchTarget, setDispatchTarget] = useState<keyof ResourceStatus>('personnel');
  const [dispatchCount, setDispatchCount] = useState<number>(10);
  const restockCount = 50;

  const handleDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (dispatchCount <= 0) return;
    dispatchResources(dispatchTarget, dispatchCount);
  };

  const handleRestock = (resourceKey: keyof ResourceStatus) => {
    if (restockCount <= 0) return;
    replenishResources(resourceKey, restockCount);
  };

  const getResourceIcon = (key: string) => {
    switch (key) {
      case 'personnel': return <Truck className="text-adcc-accent" size={20} />;
      case 'medicalDrones': return <PlaneTakeoff className="text-[#A78BFA]" size={20} />;
      case 'shelters': return <Warehouse className="text-adcc-success" size={20} />;
      case 'vehicles': return <Navigation className="text-adcc-warning" size={20} />;
      default: return <Boxes className="text-adcc-danger" size={20} />;
    }
  };

  const getProgressColor = (percent: number) => {
    if (percent < 30) return 'bg-adcc-danger';
    if (percent < 60) return 'bg-adcc-warning';
    return 'bg-adcc-success';
  };

  // Depots data
  const depots = [
    { id: 'dep-1', name: 'NDRF Base 1 - East Command', type: 'military', personnel: '150 active', status: 'optimal' },
    { id: 'dep-2', name: 'District General Trauma Hospital', type: 'medical', personnel: '82 medical staff', status: 'high load' },
    { id: 'dep-3', name: 'Central Drone Port & Logistics Hub', type: 'drones', personnel: '14 technicians', status: 'optimal' },
    { id: 'dep-4', name: 'Salt Lake Stadium Emergency Shelter', type: 'shelter', personnel: '35 disaster volunteers', status: 'crowded' }
  ];

  return (
    <PageContainer>
      <SectionHeader 
        title="Resource Allocation & Inventory" 
        description="Monitor logistical networks, hospital capacities, and dispatch emergency relief agents."
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Side: Inventory Trackers (2 Cols) */}
        <div className="xl:col-span-2 flex flex-col gap-6">
          
          {/* Inventory Levels Card */}
          <div className="glass-panel border border-gray-800 rounded-xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="font-bold text-sm tracking-wider font-mono uppercase text-adcc-textPrimary flex items-center gap-2">
                <Boxes size={16} className="text-adcc-accent" />
                Live Resource Stock Levels
              </h3>
              <span className="text-[10px] font-mono text-adcc-accent uppercase">Auto Telemetry</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.keys(resources).map((key) => {
                const res = resources[key as keyof ResourceStatus];
                const percent = Math.round((res.available / res.total) * 100);
                
                return (
                  <div key={key} className="bg-adcc-secondary/40 border border-gray-800/80 p-4 rounded-lg flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded bg-adcc-bg border border-gray-800">
                          {getResourceIcon(key)}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-adcc-textPrimary font-sans">{res.name}</span>
                          <span className="text-[10px] text-adcc-textMuted font-mono uppercase">{res.unit}</span>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold text-adcc-accent">
                        {res.available} / {res.total}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="flex flex-col gap-1 mt-1">
                      <div className="w-full bg-adcc-bg h-2 rounded-full overflow-hidden border border-gray-800">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${percent}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className={`h-full ${getProgressColor(percent)}`} 
                        />
                      </div>
                      <div className="flex justify-between text-[9px] font-mono text-adcc-textMuted">
                        <span>STOCK STATUS</span>
                        <span className={percent < 30 ? 'text-adcc-danger font-bold animate-pulse' : ''}>
                          {percent}% AVAILABILITY
                        </span>
                      </div>
                    </div>

                    {/* Quick Restock Action */}
                    <div className="flex justify-end gap-2 mt-1 pt-2 border-t border-gray-800/40">
                      <button
                        onClick={() => handleRestock(key as keyof ResourceStatus)}
                        className="flex items-center gap-1 px-2 py-0.5 border border-adcc-accent/20 bg-adcc-accent/5 hover:bg-adcc-accent hover:text-adcc-bg text-[9px] font-mono font-bold uppercase rounded transition-colors duration-150"
                      >
                        <Plus size={10} /> Restock {restockCount}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Logistics Depots & Camps */}
          <div className="glass-panel border border-gray-800 rounded-xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="font-bold text-sm tracking-wider font-mono uppercase text-adcc-textPrimary flex items-center gap-2">
                <Warehouse size={16} className="text-adcc-accent" />
                Active Deployment Bases & Depots
              </h3>
              <span className="text-[10px] font-mono text-adcc-success uppercase">4 Nodes Sync</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {depots.map((dep) => (
                <div key={dep.id} className="p-3 bg-adcc-secondary/30 border border-gray-800/60 rounded-lg flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {dep.type === 'medical' ? (
                      <Hospital className="text-adcc-danger shrink-0" size={24} />
                    ) : dep.type === 'drones' ? (
                      <PlaneTakeoff className="text-adcc-accent shrink-0" size={24} />
                    ) : (
                      <Warehouse className="text-adcc-success shrink-0" size={24} />
                    )}
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-adcc-textPrimary truncate">{dep.name}</span>
                      <span className="text-[10px] font-mono text-adcc-textMuted uppercase mt-0.5">{dep.personnel}</span>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 text-[9px] font-mono font-semibold uppercase rounded tracking-wider ${
                    dep.status === 'optimal' ? 'text-adcc-success bg-adcc-success/10 border border-adcc-success/25' : 'text-adcc-warning bg-adcc-warning/10 border border-adcc-warning/25'
                  }`}>
                    {dep.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Side: Interactive Dispatch Command Panel (1 Col) */}
        <div className="flex flex-col gap-6">
          
          <div className="glass-panel border border-gray-800 rounded-xl p-5 flex flex-col gap-4 bg-adcc-secondary/20 h-full">
            <div className="border-b border-gray-800 pb-3">
              <h3 className="font-bold text-sm tracking-wider font-mono uppercase text-adcc-textPrimary flex items-center gap-1.5">
                <Truck size={15} className="text-adcc-accent" />
                Dispatch Control Console
              </h3>
            </div>

            <form onSubmit={handleDispatch} className="flex-1 flex flex-col gap-5 justify-between">
              
              <div className="flex flex-col gap-4">
                {/* Resource Selector */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-mono text-adcc-textMuted uppercase tracking-wider">Select Supply Unit</label>
                  <select
                    value={dispatchTarget}
                    onChange={(e) => setDispatchTarget(e.target.value as keyof ResourceStatus)}
                    className="w-full bg-adcc-bg border border-gray-800 text-adcc-textPrimary text-xs rounded-lg p-2.5 font-mono outline-none focus:border-adcc-accent"
                  >
                    <option value="personnel">RESCUE SPECIALISTS (NDRF)</option>
                    <option value="medicalDrones">EMERGENCY MEDICAL DRONES</option>
                    <option value="shelters">RELIEF SHELTERS CAMPS</option>
                    <option value="vehicles">AMPHIBIOUS VEHICLES</option>
                    <option value="rations">FOOD & MEDICAL RATIONS</option>
                  </select>
                </div>

                {/* Dispatch Quantity Input */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-mono text-adcc-textMuted uppercase tracking-wider">Deploy Quantity</label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setDispatchCount(prev => Math.max(1, prev - 5))}
                      className="p-2 border border-gray-800 bg-adcc-bg rounded hover:bg-gray-800 text-adcc-accent transition-colors"
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      type="number"
                      value={dispatchCount}
                      onChange={(e) => setDispatchCount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="flex-1 text-center bg-adcc-bg border border-gray-800 text-adcc-textPrimary font-mono text-sm py-2 rounded-lg outline-none focus:border-adcc-accent"
                    />
                    <button
                      type="button"
                      onClick={() => setDispatchCount(prev => prev + 5)}
                      className="p-2 border border-gray-800 bg-adcc-bg rounded hover:bg-gray-800 text-adcc-accent transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {/* Current Selected Stock Indicator */}
                <div className="p-3 bg-adcc-bg border border-gray-800 rounded-lg flex justify-between items-center text-xs font-mono">
                  <span className="text-adcc-textMuted uppercase">CURRENT RESERVES</span>
                  <span className="font-bold text-adcc-accent">
                    {resources[dispatchTarget].available} {resources[dispatchTarget].unit}
                  </span>
                </div>
              </div>

              {/* Action Submit */}
              <div className="flex flex-col gap-3">
                {resources[dispatchTarget].available < dispatchCount && (
                  <div className="flex items-start gap-2 bg-adcc-danger/10 border border-adcc-danger/20 p-2.5 rounded text-[10px] text-adcc-danger font-mono">
                    <ShieldAlert size={14} className="shrink-0" />
                    <span>LOGISTICS FAIL: INSIGNIFICANT STOCK AVAILABLE TO DEPLOY. REDUCE COUNT.</span>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={resources[dispatchTarget].available < dispatchCount}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-adcc-accent/15 border border-adcc-accent/30 hover:bg-adcc-accent hover:text-adcc-bg text-xs font-mono font-bold uppercase tracking-wider rounded-lg transition-all duration-200 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-adcc-accent"
                >
                  <Navigation size={14} /> Dispatch Relief Force
                </button>
              </div>

            </form>
          </div>

        </div>

      </div>
    </PageContainer>
  );
};
export default Resources;
