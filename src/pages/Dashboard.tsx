import React from 'react';
import { motion } from 'framer-motion';
import { 
  ShieldAlert, 
  Users, 
  MapPin, 
  Activity, 
  Boxes, 
  BellRing,
  FileDown
} from 'lucide-react';
import { useSystem } from '../contexts/SystemContext';
import PageContainer from '../components/PageContainer';
import SectionHeader from '../components/SectionHeader';
import StatCard from '../components/StatCard';
import AlertCard from '../components/AlertCard';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  BarChart, 
  Bar, 
  Legend 
} from 'recharts';

export const Dashboard: React.FC = () => {
  const { disasters, resources, notifications, systemStatus } = useSystem();

  // Calculate stats based on context
  const activeDisasters = disasters.filter(d => d.status === 'active');
  const criticalDisasters = activeDisasters.filter(d => d.severity === 'critical');
  const totalAffectedPop = activeDisasters.reduce((acc, curr) => acc + curr.affectedPopulation, 0);
  
  // Resources calculations
  const totalResources = Object.values(resources).reduce((acc, curr) => acc + curr.total, 0);
  const availableResources = Object.values(resources).reduce((acc, curr) => acc + curr.available, 0);
  const resourcePercent = Math.round((availableResources / totalResources) * 100);

  // Mock charts data
  const trendData = [
    { name: 'Jan', Cyclones: 1, Wildfires: 2, Floods: 4 },
    { name: 'Feb', Cyclones: 0, Wildfires: 3, Floods: 3 },
    { name: 'Mar', Cyclones: 2, Wildfires: 1, Floods: 5 },
    { name: 'Apr', Cyclones: 1, Wildfires: 4, Floods: 7 },
    { name: 'May', Cyclones: 3, Wildfires: 6, Floods: 9 },
    { name: 'Jun', Cyclones: activeDisasters.filter(d=>d.type==='cyclone').length + 2, Wildfires: activeDisasters.filter(d=>d.type==='wildfire').length + 4, Floods: activeDisasters.filter(d=>d.type==='flood').length + 6 }
  ];

  const resourceChartData = Object.keys(resources).map((key) => {
    const res = resources[key as keyof typeof resources];
    return {
      name: res.name.split(' (')[0].split(' ').slice(-1)[0], // last word for clean labels
      Available: res.available,
      Deployed: res.total - res.available
    };
  });

  // Export report dummy handler
  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8,ADCC REPORT - " + new Date().toISOString() + "\n" +
      "Active Disasters," + activeDisasters.length + "\n" +
      "Critical Regions," + criticalDisasters.length + "\n" +
      "Affected Population," + totalAffectedPop + "\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `adcc_operational_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Layout Framer Motion animations
  const containerVariants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } }
  };

  return (
    <PageContainer>
      <SectionHeader 
        title="Command Dashboard" 
        description="Real-time global hazard tracking and system orchestration."
        actions={
          <>
            <button 
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-1.5 bg-adcc-accent/15 border border-adcc-accent/25 hover:bg-adcc-accent hover:text-adcc-bg text-xs font-mono font-bold uppercase tracking-wider rounded transition-all duration-200"
            >
              <FileDown size={14} /> Export Report
            </button>
          </>
        }
      />

      {/* KPI Cards Grid */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4"
      >
        <motion.div variants={itemVariants}>
          <StatCard
            title="Active Disasters"
            value={activeDisasters.length}
            icon={<ShieldAlert size={20} />}
            trend={activeDisasters.length > 2 ? "+20%" : "0%"}
            trendDirection={activeDisasters.length > 2 ? "up" : "neutral"}
            statusText={systemStatus === 'alert' ? 'ACTIVE ALERT' : 'STABLE'}
            statusType={systemStatus === 'alert' ? 'danger' : 'success'}
            glow={systemStatus === 'alert'}
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <StatCard
            title="Critical Regions"
            value={criticalDisasters.length}
            icon={<MapPin size={20} />}
            trend={`${criticalDisasters.length} Sector`}
            trendDirection="neutral"
            statusText="URGENT RESCUE"
            statusType="danger"
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <StatCard
            title="Affected Population"
            value={totalAffectedPop.toLocaleString()}
            icon={<Users size={20} />}
            trend="+15k / hour"
            trendDirection="up"
            statusText="IMPACT MODEL"
            statusType="warning"
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <StatCard
            title="Resource Available"
            value={`${resourcePercent}%`}
            icon={<Boxes size={20} />}
            trend="-3.2% deploy"
            trendDirection="down"
            statusText="ADEQUATE"
            statusType="success"
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <StatCard
            title="Predicted Risks"
            value={criticalDisasters.length > 0 ? "78.4%" : "12.5%"}
            icon={<Activity size={20} />}
            trend="Surge Prob"
            trendDirection="neutral"
            statusText={criticalDisasters.length > 0 ? "HIGH RISK" : "NOMINAL"}
            statusType={criticalDisasters.length > 0 ? 'warning' : 'success'}
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <StatCard
            title="Active Alerts"
            value={notifications.filter(n => !n.read).length}
            icon={<BellRing size={20} />}
            trend="Unread Feed"
            trendDirection="neutral"
            statusText="LIVE STREAM"
            statusType="info"
          />
        </motion.div>
      </motion.div>

      {/* Visual Analytics / Main Panels Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Disaster Trend Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="xl:col-span-2 glass-panel border border-gray-800 rounded-xl p-5 flex flex-col gap-4"
        >
          <div className="flex items-center justify-between border-b border-gray-800 pb-3">
            <h3 className="font-bold text-sm tracking-wider font-mono uppercase text-adcc-textPrimary">
              Incident Frequency Trend (6-Month Projection)
            </h3>
            <span className="text-[10px] font-mono text-adcc-accent uppercase">Live GIS Ingestion</span>
          </div>
          
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCyclones" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorWildfires" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorFloods" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#00E5FF" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={11} tickLine={false} />
                <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111827', border: '1px solid rgba(0, 229, 255, 0.2)', borderRadius: '8px', color: '#F9FAFB', fontFamily: 'monospace' }}
                  itemStyle={{ fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', paddingTop: '10px' }} />
                <Area type="monotone" dataKey="Cyclones" stroke="#EF4444" fillOpacity={1} fill="url(#colorCyclones)" strokeWidth={2} />
                <Area type="monotone" dataKey="Wildfires" stroke="#F59E0B" fillOpacity={1} fill="url(#colorWildfires)" strokeWidth={2} />
                <Area type="monotone" dataKey="Floods" stroke="#00E5FF" fillOpacity={1} fill="url(#colorFloods)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Live Alerts Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="glass-panel border border-gray-800 rounded-xl p-5 flex flex-col gap-4 h-[400px]"
        >
          <div className="flex items-center justify-between border-b border-gray-800 pb-3">
            <h3 className="font-bold text-sm tracking-wider font-mono uppercase text-adcc-textPrimary">
              Active Operation Alerts
            </h3>
            <span className="flex h-2 w-2 rounded-full bg-adcc-danger status-pulse-dot" />
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {notifications.length === 0 ? (
              <div className="flex items-center justify-center h-full text-xs font-mono text-adcc-textMuted">
                NO EMERGENCY SIGNALS IN QUEUE
              </div>
            ) : (
              notifications.slice(0, 6).map((n) => (
                <AlertCard
                  key={n.id}
                  id={n.id}
                  title={n.title}
                  message={n.message}
                  severity={n.severity}
                  timestamp={n.timestamp}
                  source={n.source}
                  read={n.read}
                />
              ))
            )}
          </div>
        </motion.div>
      </div>

      {/* Second Row: Resource Utilization Chart */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Resource Allocation Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="xl:col-span-2 glass-panel border border-gray-800 rounded-xl p-5 flex flex-col gap-4"
        >
          <div className="flex items-center justify-between border-b border-gray-800 pb-3">
            <h3 className="font-bold text-sm tracking-wider font-mono uppercase text-adcc-textPrimary">
              Resource Distribution Telemetry
            </h3>
            <span className="text-[10px] font-mono text-adcc-accent uppercase">Supply Logistics Logs</span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={resourceChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={11} tickLine={false} />
                <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111827', border: '1px solid rgba(0, 229, 255, 0.2)', borderRadius: '8px', color: '#F9FAFB', fontFamily: 'monospace' }}
                  itemStyle={{ fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', paddingTop: '10px' }} />
                <Bar dataKey="Available" fill="#00E5FF" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Deployed" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Tactical Status Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="glass-panel border border-gray-800 rounded-xl p-5 flex flex-col gap-4"
        >
          <div className="flex items-center justify-between border-b border-gray-800 pb-3">
            <h3 className="font-bold text-sm tracking-wider font-mono uppercase text-adcc-textPrimary">
              Command Node Diagnostics
            </h3>
            <span className="text-[10px] font-mono text-adcc-success uppercase">Online</span>
          </div>

          <div className="flex-1 flex flex-col justify-center space-y-4">
            <div className="flex justify-between items-center bg-adcc-secondary/40 border border-gray-800/80 p-3 rounded-lg">
              <span className="text-xs text-adcc-textMuted font-mono uppercase">GIS Server Status</span>
              <span className="text-xs font-mono font-bold text-adcc-success">99.98% UPTIME</span>
            </div>

            <div className="flex justify-between items-center bg-adcc-secondary/40 border border-gray-800/80 p-3 rounded-lg">
              <span className="text-xs text-adcc-textMuted font-mono uppercase">Drone Relay Signal</span>
              <span className="text-xs font-mono font-bold text-adcc-accent">EXCELLENT (42/50db)</span>
            </div>

            <div className="flex justify-between items-center bg-adcc-secondary/40 border border-gray-800/80 p-3 rounded-lg">
              <span className="text-xs text-adcc-textMuted font-mono uppercase">Satellite Latency</span>
              <span className="text-xs font-mono font-bold text-adcc-warning">480ms (POLLING)</span>
            </div>

            <div className="flex justify-between items-center bg-adcc-secondary/40 border border-gray-800/80 p-3 rounded-lg">
              <span className="text-xs text-adcc-textMuted font-mono uppercase">Decentralized Storage</span>
              <span className="text-xs font-mono font-bold text-adcc-success">SYNCHRONIZED (IPFS)</span>
            </div>
          </div>
        </motion.div>
      </div>

    </PageContainer>
  );
};
export default Dashboard;
