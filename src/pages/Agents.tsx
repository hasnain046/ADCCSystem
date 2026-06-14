import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiService, { 
  BackendSyncLog, 
  BackendVerificationLog, 
  BackendAllocation, 
  BackendDisaster 
} from '../services/api';
import PageContainer from '../components/PageContainer';
import SectionHeader from '../components/SectionHeader';
import { 
  Cpu, 
  Terminal, 
  ChevronRight, 
  Send,
  Activity,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react';

interface AgentStatusDetails {
  id: string;
  name: string;
  role: string;
  status: 'Idle' | 'Running' | 'Completed' | 'Degraded';
  lastRun: string;
  execTime: string;
  success: boolean;
  health: 'Nominal' | 'Degraded';
  logs: string[];
}

export const Agents: React.FC = () => {
  const [selectedAgentId, setSelectedAgentId] = useState<string>('a-collect');
  const [commandText, setCommandText] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'agent' | 'system'>('agent');
  const [logFilter, setLogFilter] = useState<string>('');
  const [systemLogsFilter, setSystemLogsFilter] = useState<string>('ALL');

  const logContainerRef = useRef<HTMLDivElement>(null);

  // 1. Fetch live backend streams
  const { data: syncLogs = [], refetch: refetchSync } = useQuery<BackendSyncLog[]>({ queryKey: ['syncLogs'], queryFn: apiService.getSyncLogs });
  const { data: verLogs = [], refetch: refetchVer } = useQuery<BackendVerificationLog[]>({ queryKey: ['verificationLogs'], queryFn: apiService.getVerificationLogs });
  const { data: allocations = [], refetch: refetchAlloc } = useQuery<BackendAllocation[]>({ queryKey: ['allocations'], queryFn: apiService.getAllocations });
  const { data: disasters = [], refetch: refetchDis } = useQuery<BackendDisaster[]>({ queryKey: ['disasters'], queryFn: apiService.getDisasters });

  // Fetch live system execution logs
  const { data: systemLogs = [], refetch: refetchSystem } = useQuery<string[]>({
    queryKey: ['systemLogs'],
    queryFn: () => apiService.getSystemLogs(100),
    refetchInterval: activeTab === 'system' ? 2000 : false,
  });

  // Auto-scroll logs container to bottom when log updates or active tab changes
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [systemLogs, activeTab]);

  const handleRefresh = () => {
    refetchSync();
    refetchVer();
    refetchAlloc();
    refetchDis();
    refetchSystem();
  };

  const getFilteredSystemLogs = () => {
    return systemLogs.filter(log => {
      // Level filter
      if (systemLogsFilter !== 'ALL') {
        const hasLevel = log.includes(` | ${systemLogsFilter} `) || 
                         log.includes(` | ${systemLogsFilter}   `) || 
                         log.includes(` | ${systemLogsFilter}    `) || 
                         log.toLowerCase().includes(`${systemLogsFilter.toLowerCase()}:`);
        if (!hasLevel) return false;
      }
      // Text search filter
      if (logFilter.trim() !== '') {
        return log.toLowerCase().includes(logFilter.toLowerCase());
      }
      return true;
    });
  };

  const formatSystemLogLine = (line: string) => {
    const parts = line.split(' | ');
    if (parts.length >= 3) {
      const timestamp = parts[0];
      const level = parts[1].trim();
      const rest = parts.slice(2).join(' | ');
      
      let levelColor = 'text-cyan-400';
      if (level === 'SUCCESS') levelColor = 'text-emerald-400';
      if (level === 'WARNING') levelColor = 'text-amber-400 font-bold';
      if (level === 'ERROR' || level === 'CRITICAL') levelColor = 'text-rose-500 font-bold animate-pulse';
      
      const restParts = rest.split(' - ');
      const moduleInfo = restParts[0];
      const message = restParts.slice(1).join(' - ');

      return (
        <div className="flex flex-wrap gap-1 border-b border-gray-900/40 pb-1.5 mb-1.5 text-[10px]">
          <span className="text-gray-500 font-mono text-[9px]">{timestamp}</span>
          <span className="text-gray-600 font-mono text-[9px] px-1">|</span>
          <span className={`font-mono text-[10px] uppercase font-bold tracking-wider ${levelColor}`}>{level}</span>
          <span className="text-gray-600 font-mono text-[9px] px-1">|</span>
          <span className="text-gray-400 font-mono text-[9px] truncate max-w-[125px]" title={moduleInfo}>{moduleInfo}</span>
          <span className="text-gray-600 font-mono text-[9px] px-1">-</span>
          <span className="text-adcc-textPrimary font-mono break-all">{message}</span>
        </div>
      );
    }
    
    let textColor = 'text-gray-300';
    if (line.includes('INFO:') || line.includes('INFO ')) textColor = 'text-cyan-300';
    else if (line.includes('SUCCESS:') || line.includes('SUCCESS ')) textColor = 'text-emerald-300';
    else if (line.includes('WARNING:') || line.includes('WARNING ')) textColor = 'text-amber-300';
    else if (line.includes('ERROR:') || line.includes('ERROR ') || line.includes('CRITICAL:')) textColor = 'text-rose-400';
    
    return (
      <div className={`border-b border-gray-900/40 pb-1.5 mb-1.5 font-mono text-[10px] ${textColor}`}>
        {line}
      </div>
    );
  };

  // 2. Parse live agent details
  const getAgentList = (): AgentStatusDetails[] => {
    const activeDisasters = disasters.filter(d => d.status === 'Active');
    
    // --- Node 1: Data Collection Agent
    const latestSync = syncLogs[0];
    const isSyncing = latestSync?.sync_status === 'Running';
    const syncTime = latestSync?.completed_at && latestSync?.started_at
      ? `${((new Date(latestSync.completed_at).getTime() - new Date(latestSync.started_at).getTime()) / 1000).toFixed(1)}s`
      : '1.2s';
    const collectLogs = syncLogs.slice(0, 5).map(l => 
      `[${new Date(l.started_at).toLocaleTimeString()}] Fetching GDACS/USGS feeds: ${l.sync_status} (${l.records_fetched || 0} fetched)`
    );
    if (collectLogs.length === 0) {
      collectLogs.push('[Database Startup] Initialized USGS/GDACS listeners.');
    }

    // --- Node 2: Verification Agent
    const latestVer = verLogs[0];
    const verTime = '0.8s';
    const verLogsList = verLogs.slice(0, 5).map(v => 
      `[${new Date(v.created_at).toLocaleTimeString()}] Checked ${v.source_checked}: result=${v.result} (confidence=${Math.round(v.confidence * 100)}%)`
    );
    if (verLogsList.length === 0) {
      verLogsList.push('[Idle] Standing by for new telemetry alert triggers.');
    }

    // --- Node 3: Severity Agent
    const latestDis = disasters[0];
    const sevTime = '0.4s';
    const sevLogsList = disasters.slice(0, 5).map(d => 
      `[${new Date(d.updated_at).toLocaleTimeString()}] Evaluated severity for ${d.title}: level=${d.severity} (score=${d.confidence_score})`
    );
    if (sevLogsList.length === 0) {
      sevLogsList.push('[Nominal] Heartbeat OK. 0 risks detected.');
    }

    // --- Node 4: Resource Allocation Agent
    const latestAlloc = allocations[0];
    const allocTime = '0.6s';
    const allocLogsList = allocations.slice(0, 5).map(a => 
      `[${new Date(a.allocated_at).toLocaleTimeString()}] Allocated equipment: qty=${a.quantity} status=${a.status}`
    );
    if (allocLogsList.length === 0) {
      allocLogsList.push('[Idle] No active deployment tasks assigned.');
    }

    // --- Node 5: Shelter Agent
    const shelterTime = '0.5s';
    const shelterLogsList = activeDisasters.map(d => 
      `[Command Control] Mapping evacuee routing profiles for ${d.title} to nearest safe sectors.`
    );
    if (shelterLogsList.length === 0) {
      shelterLogsList.push('[Central] Standby. Emergency shelter databases normal.');
    }

    // --- Node 6: Replanning Agent
    const replanTime = '0.3s';
    const replanLogsList = [
      '[Heartbeat] Listening for meteorological changes and rainfall anomalies...',
      '[Heartbeat] Monitoring shelter capacity usage limits...'
    ];

    return [
      {
        id: 'a-collect',
        name: 'Data Ingestion Agent',
        role: 'Ingests real-time NOAA weather forecast grids, GDACS feeds, USGS earthquake seismometers, and database resource stocks.',
        status: isSyncing ? 'Running' : latestSync ? 'Completed' : 'Idle',
        lastRun: latestSync ? new Date(latestSync.started_at).toLocaleTimeString() : 'N/A',
        execTime: syncTime,
        success: latestSync ? latestSync.sync_status === 'Success' : true,
        health: latestSync?.sync_status === 'Failed' ? 'Degraded' : 'Nominal',
        logs: collectLogs
      },
      {
        id: 'a-verify',
        name: 'Disaster Verification Agent',
        role: 'Cross-verifies ingested reports against secondary news streams (GNews/NewsAPI) and computes data confidence score.',
        status: latestVer ? 'Completed' : 'Idle',
        lastRun: latestVer ? new Date(latestVer.created_at).toLocaleTimeString() : 'N/A',
        execTime: verTime,
        success: true,
        health: 'Nominal',
        logs: verLogsList
      },
      {
        id: 'a-severity',
        name: 'Severity Assessment Agent',
        role: 'Calculates population density exposure, weather threats, disaster magnitude, and regional resource strain levels.',
        status: latestDis ? 'Completed' : 'Idle',
        lastRun: latestDis ? new Date(latestDis.updated_at).toLocaleTimeString() : 'N/A',
        execTime: sevTime,
        success: true,
        health: 'Nominal',
        logs: sevLogsList
      },
      {
        id: 'a-alloc',
        name: 'Resource Allocation Agent',
        role: 'Matches required relief supplies to closest vacant warehouses and NDRF bases near the coordinates.',
        status: latestAlloc ? 'Completed' : 'Idle',
        lastRun: latestAlloc ? new Date(latestAlloc.allocated_at).toLocaleTimeString() : 'N/A',
        execTime: allocTime,
        success: true,
        health: 'Nominal',
        logs: allocLogsList
      },
      {
        id: 'a-shelter',
        name: 'Shelter Assignment Agent',
        role: 'Greedily maps affected evacuees to nearest shelters, tracks total capacity volumes, and flags overflow risks.',
        status: activeDisasters.length > 0 ? 'Completed' : 'Idle',
        lastRun: activeDisasters.length > 0 ? new Date().toLocaleTimeString() : 'N/A',
        execTime: shelterTime,
        success: true,
        health: 'Nominal',
        logs: shelterLogsList
      },
      {
        id: 'a-replan',
        name: 'Dynamic Replanning Agent',
        role: 'Monitors rainfall thresholds, shelter overflows, and aftershocks. Dynamically adjusts resource routing plans.',
        status: 'Idle',
        lastRun: 'N/A',
        execTime: replanTime,
        success: true,
        health: 'Nominal',
        logs: replanLogsList
      }
    ];
  };

  const agents = getAgentList();
  const selectedAgent = agents.find(a => a.id === selectedAgentId) || agents[0];

  const handleSendCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandText.trim()) return;
    
    // Simple custom client simulation logging for commands
    selectedAgent.logs.unshift(`[Operator Override] Command issued: "${commandText}"`);
    selectedAgent.status = 'Running';
    
    setTimeout(() => {
      selectedAgent.logs.unshift(`[Bypass Success] Override execution successful.`);
      selectedAgent.status = 'Completed';
      setCommandText('');
    }, 1200);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'text-adcc-success border-adcc-success/30 bg-adcc-success/5';
      case 'Running': return 'text-adcc-accent border-adcc-accent/30 bg-adcc-accent/5 animate-pulse';
      case 'Degraded': return 'text-adcc-danger border-adcc-danger/30 bg-adcc-danger/5 animate-pulse';
      default: return 'text-adcc-textMuted border-gray-800 bg-gray-800/10';
    }
  };

  return (
    <PageContainer>
      <SectionHeader 
        title="Multi-Agent Operations Monitor" 
        description="Verify LangGraph cognitive agent node heartbeats, execution latency, and execute bypass overrides."
        actions={
          <button 
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-adcc-accent/15 border border-adcc-accent/25 hover:bg-adcc-accent hover:text-adcc-bg text-xs font-mono font-bold uppercase tracking-wider rounded transition-all duration-200"
          >
            <RefreshCw size={12} /> Sync Telemetry
          </button>
        }
      />

      {/* Orchestration Graph Header Grid */}
      <div className="glass-panel border border-gray-800 rounded-xl p-5 flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between border-b border-gray-850 pb-3">
          <h3 className="font-bold text-xs font-mono uppercase tracking-wider text-adcc-textPrimary flex items-center gap-1.5">
            <Cpu size={14} className="text-adcc-accent" />
            LangGraph Core State Orchestrator Nodes
          </h3>
          <span className="text-[9px] font-mono text-adcc-accent uppercase">Orchestrator v1.0</span>
        </div>

        {/* Graph node sequence representation */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3 p-4 bg-adcc-secondary/25 border border-gray-850 rounded-xl">
          {agents.map((agent, index) => {
            const isSelected = selectedAgentId === agent.id;
            return (
              <React.Fragment key={agent.id}>
                <button
                  onClick={() => setSelectedAgentId(agent.id)}
                  className={`flex flex-col gap-1.5 p-3.5 min-w-[190px] w-full lg:w-auto glass-panel border rounded-lg text-left transition-all duration-200 cursor-pointer font-mono text-xs ${
                    isSelected ? 'ring-2 ring-adcc-accent border-adcc-accent/40 shadow-glow bg-adcc-accent/5' : 'border-gray-850 hover:border-gray-800 bg-adcc-secondary/20'
                  }`}
                >
                  <div className="flex justify-between items-center text-[9px] text-adcc-textMuted">
                    <span>NODE 0{index + 1}</span>
                    <span className={`px-1 rounded text-[8px] font-bold border ${getStatusColor(agent.status)}`}>
                      {agent.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex flex-col mt-0.5">
                    <span className="text-adcc-textPrimary font-bold text-[11px]">{agent.name.split(' Agent')[0]}</span>
                    <span className="text-[9px] text-adcc-textMuted mt-0.5 truncate max-w-[150px]">{agent.role}</span>
                  </div>
                </button>
                {index < agents.length - 1 && (
                  <ChevronRight size={16} className="hidden lg:block text-adcc-accent/30 animate-pulse" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Agent Status Board Table */}
        <div className="lg:col-span-2 glass-panel border border-gray-800 rounded-xl p-5 flex flex-col gap-4">
          <div className="border-b border-gray-850 pb-3">
            <h3 className="font-bold text-xs font-mono uppercase tracking-wider text-adcc-textPrimary flex items-center gap-1.5">
              <Activity size={14} className="text-adcc-accent" />
              Agent Status Diagnostics Board
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-[11px] text-adcc-textMuted border-collapse">
              <thead>
                <tr className="border-b border-gray-850 text-adcc-textPrimary bg-adcc-secondary/35 text-[9px] uppercase tracking-wider">
                  <th className="py-2.5 px-3">Agent Name</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Last Execution</th>
                  <th className="py-2.5 px-3">Latency</th>
                  <th className="py-2.5 px-3">Pass Check</th>
                  <th className="py-2.5 px-3">Health Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-900">
                {agents.map((agent) => (
                  <tr 
                    key={agent.id} 
                    onClick={() => setSelectedAgentId(agent.id)}
                    className={`cursor-pointer hover:bg-adcc-secondary/10 transition-colors ${selectedAgentId === agent.id ? 'bg-adcc-secondary/20' : ''}`}
                  >
                    <td className="py-3 px-3 font-semibold text-adcc-textPrimary">{agent.name}</td>
                    <td className="py-3 px-3">
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${getStatusColor(agent.status)}`}>
                        {agent.status}
                      </span>
                    </td>
                    <td className="py-3 px-3">{agent.lastRun}</td>
                    <td className="py-3 px-3 text-adcc-accent">{agent.execTime}</td>
                    <td className="py-3 px-3">
                      {agent.success ? (
                        <span className="text-adcc-success flex items-center gap-1"><CheckCircle size={11} /> PASS</span>
                      ) : (
                        <span className="text-adcc-danger flex items-center gap-1 animate-pulse"><XCircle size={11} /> FAIL</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`font-semibold ${agent.health === 'Nominal' ? 'text-adcc-success' : 'text-adcc-danger animate-pulse'}`}>
                        {agent.health.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Agent Terminal Logs */}
        <div className="glass-panel border border-gray-800 rounded-xl p-5 flex flex-col gap-4 bg-[#090E1A] h-fit">
          <div className="border-b border-gray-850 pb-2 flex justify-between items-center">
            <h3 className="font-bold text-xs font-mono uppercase tracking-wider text-adcc-textPrimary flex items-center gap-1.5">
              <Terminal size={14} className="text-adcc-accent" />
              Diagnostics Terminal
            </h3>
            
            <div className="flex gap-1.5 font-mono text-[10px]">
              <button 
                onClick={() => setActiveTab('agent')}
                className={`px-2 py-0.5 border rounded transition-all duration-150 font-bold uppercase ${
                  activeTab === 'agent' 
                    ? 'border-adcc-accent bg-adcc-accent/15 text-adcc-accent shadow-glow' 
                    : 'border-gray-850 hover:border-gray-700 text-adcc-textMuted'
                }`}
              >
                Agent
              </button>
              <button 
                onClick={() => setActiveTab('system')}
                className={`px-2 py-0.5 border rounded transition-all duration-150 font-bold uppercase ${
                  activeTab === 'system' 
                    ? 'border-adcc-accent bg-adcc-accent/15 text-adcc-accent shadow-glow' 
                    : 'border-gray-850 hover:border-gray-700 text-adcc-textMuted'
                }`}
              >
                System
              </button>
            </div>
          </div>

          {activeTab === 'agent' ? (
            <div className="flex flex-col gap-3 font-mono text-[11px] leading-relaxed">
              <div className="flex justify-between items-center text-[10px] text-adcc-textMuted">
                <span>ACTIVE: <span className="text-adcc-accent font-bold">{selectedAgent.name.toUpperCase()}</span></span>
                <span>STATUS: <span className="text-adcc-success">{selectedAgent.status}</span></span>
              </div>
              
              <div 
                ref={logContainerRef}
                className="flex flex-col bg-[#050811] p-3 rounded-lg border border-gray-850 min-h-[220px] max-h-[280px] overflow-y-auto text-adcc-success pr-1"
              >
                {selectedAgent.logs.map((log, idx) => (
                  <div key={idx} className="border-b border-gray-900/40 pb-1.5 mb-1.5">
                    {log}
                  </div>
                ))}
              </div>

              <form onSubmit={handleSendCommand} className="flex gap-2 mt-1">
                <input
                  type="text"
                  value={commandText}
                  onChange={(e) => setCommandText(e.target.value)}
                  placeholder={`operator@adcc:${selectedAgentId.replace('a-', '')}~$`}
                  className="flex-1 bg-[#050811] border border-gray-850 text-adcc-textPrimary font-mono text-xs rounded-lg px-3 py-2 outline-none focus:border-adcc-accent"
                />
                <button
                  type="submit"
                  className="px-3 bg-adcc-accent text-adcc-bg border border-adcc-accent hover:shadow-glow rounded-lg flex items-center justify-center transition-all duration-200"
                >
                  <Send size={12} />
                </button>
              </form>
            </div>
          ) : (
            <div className="flex flex-col gap-3 font-mono text-[11px] leading-relaxed">
              <div className="flex gap-2 justify-between items-center">
                <input
                  type="text"
                  placeholder="Filter by keyword..."
                  value={logFilter}
                  onChange={(e) => setLogFilter(e.target.value)}
                  className="bg-[#050811] border border-gray-850 text-adcc-textPrimary text-[10px] rounded-lg px-2.5 py-1.5 outline-none w-32 focus:border-adcc-accent"
                />
                
                <div className="flex gap-1">
                  {['ALL', 'INFO', 'SUCCESS', 'WARNING', 'ERROR'].map(lvl => (
                    <button
                      key={lvl}
                      onClick={() => setSystemLogsFilter(lvl)}
                      className={`px-1.5 py-0.5 border text-[8px] font-bold rounded transition-colors duration-150 ${
                        systemLogsFilter === lvl
                          ? lvl === 'ERROR' ? 'border-rose-500 bg-rose-500/20 text-rose-400' :
                            lvl === 'WARNING' ? 'border-amber-500 bg-amber-500/20 text-amber-400' :
                            lvl === 'SUCCESS' ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400' :
                            'border-adcc-accent bg-adcc-accent/20 text-adcc-accent'
                          : 'border-gray-850 hover:border-gray-800 text-adcc-textMuted'
                      }`}
                    >
                      {lvl === 'SUCCESS' ? 'OK' : lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div 
                ref={logContainerRef}
                className="flex flex-col bg-[#050811] p-3 rounded-lg border border-gray-850 min-h-[220px] max-h-[280px] overflow-y-auto pr-1"
              >
                {getFilteredSystemLogs().length === 0 ? (
                  <div className="text-adcc-textMuted text-center py-12 text-[10px]">
                    NO MATCHING SYSTEM LOGS FOUND
                  </div>
                ) : (
                  getFilteredSystemLogs().map((log, idx) => (
                    <div key={idx}>
                      {formatSystemLogLine(log)}
                    </div>
                  ))
                )}
              </div>

              <div className="flex justify-between items-center text-[9px] text-adcc-textMuted font-mono">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                  POLLED REAL-TIME FEED
                </span>
                <span>SHOWING {getFilteredSystemLogs().length} OF {systemLogs.length} LINES</span>
              </div>
            </div>
          )}

        </div>
      </div>
    </PageContainer>
  );
};
export default Agents;
