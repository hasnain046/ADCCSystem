import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiService, { OrchestrationResult, ChatMessage } from '../services/api';
import PageContainer from '../components/PageContainer';
import SectionHeader from '../components/SectionHeader';
import AgentTimeline from '../components/AgentTimeline';
import ResourceAllocationView from '../components/ResourceAllocationView';
import ShelterAssignmentView from '../components/ShelterAssignmentView';
import ReplanningActivityView from '../components/ReplanningActivityView';
import { 
  Terminal, 
  Play, 
  ShieldAlert, 
  Activity, 
  MapPin, 
  Radio, 
  Globe, 
  CheckCircle,
  Eye,
  EyeOff,
  Sparkles,
  MessageSquare,
  Send,
  RefreshCw
} from 'lucide-react';

export const AICommandCenter: React.FC = () => {
  const queryClient = useQueryClient();
  
  // Grid Presets
  const gridPresets = [
    { label: 'Guwahati Brahmaputra Inundation', lat: 26.1445, lng: 91.7362, country: 'India' },
    { label: 'Mumbai Coastal Storm Surge', lat: 19.0760, lng: 72.8777, country: 'India' },
    { label: 'Pune Fault Line Aftershock', lat: 18.5204, lng: 73.8567, country: 'India' },
    { label: 'Nagpur Subsector Heatwave', lat: 21.1458, lng: 79.0882, country: 'India' }
  ];

  // Selected Target state
  const [selectedGrid, setSelectedGrid] = useState(gridPresets[0]);
  const [customLat, setCustomLat] = useState<string>('');
  const [customLng, setCustomLng] = useState<string>('');
  const [customLabel, setCustomLabel] = useState<string>('');
  
  const [showJsonTerminal, setShowJsonTerminal] = useState<boolean>(false);
  const [orchestratorResult, setOrchestratorResult] = useState<OrchestrationResult | null>(null);

  // Tab State
  const [activeTab, setActiveTab] = useState<'plan' | 'chat'>('plan');

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', content: "### 🛰️ ADCC Cognitive Assistant Link Operational\n\nI am Antigravity, the ADCC AI Director. Ask me any natural language questions about active hazard zones, allocations, shelter capacities, or What-If simulation results." }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Character-by-character typing print effect handler
  const triggerChat = async (messageText: string) => {
    if (!messageText.trim()) return;
    const newMsg: ChatMessage = { role: 'user', content: messageText };
    const updatedMessages = [...messages, newMsg];
    setMessages(updatedMessages);
    setInputValue('');
    setIsChatLoading(true);
    
    try {
      const reply = await apiService.sendChatMessage(messageText, updatedMessages);
      
      setIsChatLoading(false);
      const botMsg: ChatMessage = { role: 'model', content: '' };
      setMessages(prev => [...prev, botMsg]);
      
      let index = 0;
      const speed = 6; // ms typing speed
      const interval = setInterval(() => {
        if (index < reply.length) {
          botMsg.content += reply[index];
          setMessages(prev => {
            const list = [...prev];
            list[list.length - 1] = { ...botMsg };
            return list;
          });
          index++;
        } else {
          clearInterval(interval);
        }
      }, speed);
    } catch (err: any) {
      setIsChatLoading(false);
      setMessages(prev => [...prev, { role: 'model', content: `❌ **Failed to retrieve cognitive response:** ${err.message}` }]);
    }
  };

  // Simple Markdown parser for chatbot interface rendering
  const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      if (line.startsWith('### ')) {
        return <h3 key={idx} className="text-xs font-mono font-bold uppercase tracking-wider text-adcc-accent mt-3 mb-1.5">{line.substring(4)}</h3>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={idx} className="text-sm font-mono font-bold uppercase tracking-wider text-adcc-accent mt-4 mb-2">{line.substring(3)}</h2>;
      }
      if (line.startsWith('# ')) {
        return <h1 key={idx} className="text-base font-mono font-bold uppercase tracking-wider text-adcc-accent mt-4 mb-2">{line.substring(2)}</h1>;
      }
      if (line.startsWith('* ') || line.startsWith('- ')) {
        return <div key={idx} className="pl-4 py-0.5 text-[11px] leading-relaxed text-adcc-textMuted flex items-start gap-1.5 font-sans"><span>•</span><span>{line.substring(2)}</span></div>;
      }
      if (line.startsWith('> ')) {
        return <div key={idx} className="border-l-2 border-adcc-accent/40 bg-adcc-accent/5 p-2 rounded text-[10.5px] italic text-adcc-textPrimary my-2 font-sans">{line.substring(2)}</div>;
      }
      const parts = line.split('**');
      if (parts.length > 1) {
        return (
          <p key={idx} className="text-[11px] leading-relaxed text-adcc-textPrimary font-sans my-1">
            {parts.map((p, i) => i % 2 === 1 ? <strong key={i} className="text-adcc-accent font-bold">{p}</strong> : p)}
          </p>
        );
      }
      return <p key={idx} className="text-[11px] leading-relaxed text-adcc-textMuted font-sans my-1">{line}</p>;
    });
  };

  // Mutation to trigger LangGraph workflow
  const orchestrateMutation = useMutation({
    mutationFn: async (payload: { latitude: number; longitude: number; location_label: string; country: string }) => {
      return apiService.runOrchestration(payload);
    },
    onSuccess: (data) => {
      setOrchestratorResult(data);
      // Invalidate queries so dashboard/map load updated records
      queryClient.invalidateQueries({ queryKey: ['disasters'] });
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['verificationLogs'] });
      queryClient.invalidateQueries({ queryKey: ['allocations'] });
    }
  });

  const handleRunOrchestration = () => {
    let lat = selectedGrid.lat;
    let lng = selectedGrid.lng;
    let label = selectedGrid.label;
    
    if (customLat && customLng) {
      lat = parseFloat(customLat) || lat;
      lng = parseFloat(customLng) || lng;
      label = customLabel || 'Manual Coordinate Trigger';
    }

    orchestrateMutation.mutate({
      latitude: lat,
      longitude: lng,
      location_label: label,
      country: selectedGrid.country
    });
  };

  const isExecuting = orchestrateMutation.isPending;
  const trace = orchestratorResult?.node_trace || [];
  const state = orchestratorResult?.state || null;
  const verReports = state?.verified_reports || [];
  const severityLevel = orchestratorResult?.severity || 'Low';
  const confidence = orchestratorResult?.confidence || 0;
  const allocPlan = state?.allocation_plan || null;
  const shelterPlan = state?.shelter_plan || null;
  const replanningActions = orchestratorResult?.replanning_actions || [];

  return (
    <PageContainer>
      <SectionHeader 
        title="Command Center & Cognitive Orchestrator" 
        description="Ingest coordinates, trigger compiled LangGraph pipelines, and analyze consolidated active dispatch sheets."
      />

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* Left Side: Coordinate Ingestion Panel (1 Col) */}
        <div className="flex flex-col gap-5">
          <div className="glass-panel border border-gray-800 rounded-xl p-5 bg-[#090E1A]/60 flex flex-col gap-4 font-mono text-xs">
            <div className="border-b border-gray-850 pb-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-adcc-textPrimary flex items-center gap-1.5">
                <Globe size={14} className="text-adcc-accent" />
                GIS Grid Ingestion
              </h3>
            </div>

            {/* Presets */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] text-adcc-textMuted uppercase font-semibold">Incident Grid Presets</label>
              <div className="flex flex-col gap-2">
                {gridPresets.map((grid, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={isExecuting}
                    onClick={() => {
                      setSelectedGrid(grid);
                      setCustomLat('');
                      setCustomLng('');
                      setCustomLabel('');
                    }}
                    className={`p-2.5 text-left border rounded text-[11px] transition-all duration-150 ${
                      selectedGrid.label === grid.label && !customLat
                        ? 'border-adcc-accent bg-adcc-accent/5 text-adcc-textPrimary' 
                        : 'border-gray-850 bg-adcc-secondary/20 text-adcc-textMuted hover:border-gray-800'
                    }`}
                  >
                    <span className="font-bold text-adcc-textPrimary flex items-center gap-1.5">
                      <MapPin size={10} className="text-adcc-accent" />
                      {grid.label}
                    </span>
                    <span className="text-[9px] text-adcc-textMuted mt-1 block">Coords: ({grid.lat.toFixed(4)}N, {grid.lng.toFixed(4)}E)</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-850/60 my-1 pt-3 flex flex-col gap-3">
              <label className="text-[10px] text-adcc-textMuted uppercase font-semibold">Manual Overrides</label>
              
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="flex flex-col gap-1">
                  <span>LATITUDE</span>
                  <input
                    type="text"
                    disabled={isExecuting}
                    value={customLat}
                    onChange={(e) => setCustomLat(e.target.value)}
                    placeholder="e.g. 19.076"
                    className="bg-adcc-bg border border-gray-850 text-adcc-textPrimary rounded p-2 outline-none focus:border-adcc-accent text-[11px]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span>LONGITUDE</span>
                  <input
                    type="text"
                    disabled={isExecuting}
                    value={customLng}
                    onChange={(e) => setCustomLng(e.target.value)}
                    placeholder="e.g. 72.877"
                    className="bg-adcc-bg border border-gray-850 text-adcc-textPrimary rounded p-2 outline-none focus:border-adcc-accent text-[11px]"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1 text-[10px]">
                <span>LOCATION LABEL</span>
                <input
                  type="text"
                  disabled={isExecuting}
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  placeholder="e.g. Metro Sector A"
                  className="bg-adcc-bg border border-gray-850 text-adcc-textPrimary rounded p-2 outline-none focus:border-adcc-accent text-[11px] font-sans"
                />
              </div>
            </div>

            <button
              onClick={handleRunOrchestration}
              disabled={isExecuting}
              className="w-full flex items-center justify-center gap-1.5 py-3 mt-3 bg-adcc-accent text-adcc-bg border border-adcc-accent hover:shadow-glow text-xs font-bold uppercase rounded-lg transition-all duration-200 disabled:opacity-50"
            >
              <Play size={13} fill="currentColor" /> Initialize Command Ingestion
            </button>
          </div>

          {/* Timeline Node progression */}
          {orchestratorResult && (
            <AgentTimeline 
              trace={trace} 
              severityLevel={severityLevel} 
              replanningActions={replanningActions} 
            />
          )}
        </div>

        {/* Right Side: EOC Live Orchestration Output / Chat Tab Interface (3 Cols) */}
        <div className="xl:col-span-3 flex flex-col gap-5">
          
          {/* Tab Selection Switcher */}
          <div className="flex gap-2 border-b border-gray-800 pb-1 font-mono text-[11px] uppercase tracking-wider">
            <button
              onClick={() => setActiveTab('plan')}
              className={`px-4 py-2 border-b-2 font-bold transition-all duration-150 cursor-pointer ${
                activeTab === 'plan' ? 'border-adcc-accent text-adcc-accent' : 'border-transparent text-adcc-textMuted hover:text-adcc-textPrimary'
              }`}
            >
              System Command Plan
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-4 py-2 border-b-2 font-bold transition-all duration-150 flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'chat' ? 'border-adcc-accent text-adcc-accent' : 'border-transparent text-adcc-textMuted hover:text-adcc-textPrimary'
              }`}
            >
              <Sparkles size={12} className="text-adcc-accent animate-pulse" />
              Cognitive Assistant Chat
            </button>
          </div>

          {activeTab === 'plan' ? (
            /* =========================================================================
               TAB 1: SYSTEM COMMAND PLAN (Existing View)
               ========================================================================= */
            isExecuting ? (
              /* Loading Telemetry Node */
              <div className="glass-panel border border-gray-800 rounded-xl p-8 bg-[#090E1A]/40 flex flex-col items-center justify-center gap-4 text-center min-h-[450px]">
                <div className="relative h-16 w-16 flex items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-adcc-accent/20 opacity-75" />
                  <Activity size={32} className="text-adcc-accent animate-pulse" />
                </div>
                <div className="font-mono text-xs text-adcc-textMuted space-y-1 mt-2">
                  <div className="text-adcc-accent font-bold uppercase tracking-wider animate-pulse">INGESTING COGNITIVE NODES...</div>
                  <div>Triggering StateGraph compile trace. Ingesting tools metrics.</div>
                  <div className="text-[10px] text-gray-500 font-mono mt-1">Status: collect_data_node → verification_node → severity_node</div>
                </div>
              </div>
            ) : orchestratorResult ? (
              /* Successful Execution View */
              <div className="flex flex-col gap-6">
                
                {/* EOC Header Summary */}
                <div className="glass-panel border border-gray-800 rounded-xl p-4 bg-[#090E1A]/80 flex flex-wrap justify-between items-center gap-4 font-mono text-xs">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-adcc-accent/10 rounded-lg border border-adcc-accent/20">
                      <Radio size={20} className="text-adcc-accent animate-pulse" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] text-adcc-textMuted uppercase">ORCHESTRATION SESSION ACTIVE</span>
                      <span className="text-sm font-bold text-adcc-textPrimary">Session ID: {orchestratorResult.session_id.slice(0, 8)}...</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-adcc-textMuted uppercase">SEVERITY LEVEL</span>
                      <span className={`font-bold uppercase ${
                        severityLevel === 'Critical' ? 'text-adcc-danger animate-pulse' : 'text-adcc-warning'
                      }`}>{severityLevel}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] text-adcc-textMuted uppercase">CONFIDENCE SCORE</span>
                      <span className="font-bold text-adcc-accent">{confidence}%</span>
                    </div>
                  </div>
                </div>

                {/* SECTION 1: Verified Incidents */}
                <div className="glass-panel border border-gray-800 rounded-xl p-5 bg-[#090E1A]/60 flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-gray-850 pb-2">
                    <h3 className="font-bold text-xs font-mono uppercase tracking-wider text-adcc-textPrimary flex items-center gap-1.5">
                      <CheckCircle size={14} className="text-adcc-success" />
                      Section 1: Verified Incident Ingestion
                    </h3>
                  </div>
                  
                  <div className="space-y-3 font-mono text-xs">
                    {verReports.length === 0 ? (
                      <div className="p-3 bg-adcc-warning/5 border border-adcc-warning/20 rounded text-adcc-warning">
                        VERIFICATION LOG EMPTY: Input coordinate event not found in global alert logs. Safe meteorological warning initialized.
                      </div>
                    ) : (
                      verReports.map((rep: any, idx: number) => (
                        <div key={idx} className="bg-adcc-secondary/20 border border-gray-850 p-3.5 rounded-lg flex flex-col gap-2">
                          <div className="flex justify-between items-center">
                            <span className="text-adcc-textPrimary font-bold text-[12px]">{rep.disaster_title}</span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold text-adcc-success border border-adcc-success/35 bg-adcc-success/5 uppercase">
                              {rep.verification_result}
                            </span>
                          </div>
                          <p className="text-[11px] leading-relaxed text-adcc-textMuted font-sans my-0.5">{rep.verification_notes}</p>
                          <div className="flex justify-between items-center text-[9.5px] text-adcc-textMuted border-t border-gray-900/30 pt-1.5">
                            <span>SOURCES: {rep.sources_checked?.join(', ')}</span>
                            <span className="text-adcc-accent">Confidence: {Math.round(rep.consensus_confidence * 100)}%</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* SECTION 2: Severity Assessment */}
                <div className="glass-panel border border-gray-800 rounded-xl p-5 bg-[#090E1A]/60 flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-gray-850 pb-2">
                    <h3 className="font-bold text-xs font-mono uppercase tracking-wider text-adcc-textPrimary flex items-center gap-1.5">
                      <ShieldAlert size={14} className="text-adcc-warning" />
                      Section 2: Disaster Severity Assessment
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 font-mono text-center text-xs">
                    <div className="bg-adcc-secondary/20 border border-gray-850 p-3 rounded-lg flex flex-col gap-0.5">
                      <span className="text-[9px] text-adcc-textMuted uppercase">Population Impact</span>
                      <span className="text-sm font-bold text-adcc-textPrimary">{state?.severity_score !== undefined ? `${Math.round(state.severity_score * 40)}/40` : '--'}</span>
                    </div>
                    <div className="bg-adcc-secondary/20 border border-gray-850 p-3 rounded-lg flex flex-col gap-0.5">
                      <span className="text-[9px] text-adcc-textMuted uppercase">Weather Threat Risk</span>
                      <span className="text-sm font-bold text-adcc-textPrimary">{(state?.weather_data?.rainfall_mm > 0) ? '25/25' : '10/25'}</span>
                    </div>
                    <div className="bg-adcc-secondary/20 border border-gray-850 p-3 rounded-lg flex flex-col gap-0.5">
                      <span className="text-[9px] text-adcc-textMuted uppercase">Magnitude Matrix</span>
                      <span className="text-sm font-bold text-adcc-textPrimary">{state?.earthquake_events?.length > 0 ? '20/20' : '5/20'}</span>
                    </div>
                    <div className="bg-adcc-secondary/20 border border-gray-850 p-3 rounded-lg flex flex-col gap-0.5">
                      <span className="text-[9px] text-adcc-textMuted uppercase">Allocated Buffer Stress</span>
                      <span className="text-sm font-bold text-adcc-textPrimary">{state?.resources ? '12/15' : '5/15'}</span>
                    </div>
                  </div>
                </div>

                {/* SECTION 3: Resource Allocation Plan */}
                <ResourceAllocationView allocationPlan={allocPlan} />

                {/* SECTION 4: Shelter Assignment Plan */}
                <ShelterAssignmentView shelterPlan={shelterPlan} />

                {/* SECTION 5: Replanning Actions */}
                <ReplanningActivityView actions={replanningActions} />

                {/* COLLAPSIBLE RAW JSON TERMINAL */}
                <div className="glass-panel border border-gray-800 rounded-xl overflow-hidden bg-[#050811] flex flex-col">
                  <button
                    onClick={() => setShowJsonTerminal(!showJsonTerminal)}
                    className="w-full p-4 flex items-center justify-between font-mono text-xs text-adcc-textPrimary hover:bg-adcc-secondary/25 border-b border-gray-850 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <Terminal size={14} className="text-adcc-accent" />
                      INSPECT RAW LANGGRAPH WORKFLOW PAYLOAD STATE
                    </span>
                    <span className="text-adcc-textMuted text-[10px] uppercase flex items-center gap-1">
                      {showJsonTerminal ? <><EyeOff size={12} /> Hide Output</> : <><Eye size={12} /> Show Output</>}
                    </span>
                  </button>

                  <AnimatePresence>
                    {showJsonTerminal && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        className="overflow-hidden"
                      >
                        <pre className="p-4 font-mono text-[10px] text-adcc-success overflow-auto max-h-[300px] leading-relaxed select-text whitespace-pre-wrap break-all bg-black/60 shadow-inner">
                          {JSON.stringify(state, null, 2)}
                        </pre>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

              </div>
            ) : (
              /* Standby State */
              <div className="glass-panel border border-gray-800 rounded-xl p-8 bg-[#090E1A]/40 flex flex-col items-center justify-center gap-2 text-center min-h-[450px]">
                <Terminal size={32} className="text-adcc-textMuted animate-pulse mb-1" />
                <div className="font-mono text-xs text-adcc-textPrimary uppercase tracking-wider font-bold">TACTICAL STREAM STANDBY</div>
                <p className="text-[11px] text-adcc-textMuted leading-relaxed max-w-sm font-sans mt-1">
                  Select an incident grid profile from the side panel and click "Initialize Command Ingestion" to run the live multi-agent cognitive orchestration graph.
                </p>
              </div>
            )
          ) : (
            /* =========================================================================
               TAB 2: COGNITIVE ASSISTANT CHAT (Gemini Agent Interface)
               ========================================================================= */
            <div className="flex flex-col gap-5">
              <div className="glass-panel border border-gray-800 rounded-xl p-5 bg-[#090E1A]/60 flex flex-col gap-4">
                <div className="border-b border-gray-850 pb-3 font-mono">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-adcc-textPrimary flex items-center gap-1.5">
                    <MessageSquare size={14} className="text-adcc-accent" />
                    Cognitive Director Chatbot
                  </h3>
                </div>

                {/* Chat Message feed */}
                <div className="flex flex-col gap-4 overflow-y-auto max-h-[360px] min-h-[260px] pr-1 font-sans">
                  {messages.map((msg, idx) => {
                    const isUser = msg.role === 'user';
                    return (
                      <div 
                        key={idx}
                        className={`flex gap-3 max-w-[85%] ${isUser ? 'self-end flex-row-reverse' : 'self-start'}`}
                      >
                        {/* Avatar representation */}
                        <div className={`h-7 w-7 rounded-full border flex items-center justify-center font-mono text-[9px] font-bold shrink-0 ${
                          isUser ? 'bg-adcc-accent/25 border-adcc-accent/40 text-adcc-accent' : 'bg-adcc-warning/20 border-adcc-warning/35 text-adcc-warning'
                        }`}>
                          {isUser ? 'OP' : 'AI'}
                        </div>

                        {/* Speech Bubble */}
                        <div className={`p-3.5 rounded-lg border text-xs leading-relaxed ${
                          isUser ? 'bg-adcc-accent/5 border-adcc-accent/25 text-adcc-textPrimary' : 'bg-adcc-secondary/20 border-gray-850 text-adcc-textMuted'
                        }`}>
                          {isUser ? <p className="font-sans text-[11.5px]">{msg.content}</p> : renderMarkdown(msg.content)}
                        </div>
                      </div>
                    );
                  })}

                  {/* Loading visual */}
                  {isChatLoading && (
                    <div className="flex gap-3 self-start items-center">
                      <div className="h-7 w-7 rounded-full border bg-adcc-warning/20 border-adcc-warning/35 text-adcc-warning flex items-center justify-center font-bold text-[9px] animate-pulse">
                        AI
                      </div>
                      <div className="flex gap-1.5 items-center p-2.5 bg-adcc-secondary/20 border border-gray-855 rounded-lg text-[10px] font-mono text-adcc-textMuted uppercase">
                        <RefreshCw size={11} className="animate-spin text-adcc-warning" />
                        Querying Gemini Cognitive RAG Database...
                      </div>
                    </div>
                  )}
                </div>

                {/* Suggested Prompts */}
                <div className="border-t border-gray-900 pt-3 flex flex-col gap-2">
                  <span className="text-[9px] font-mono text-adcc-textMuted uppercase font-bold tracking-wider">Suggested Queries</span>
                  <div className="flex flex-wrap gap-2 text-[10px] font-mono">
                    {[
                      "What is happening right now?",
                      "Explain the current response plan.",
                      "Why were these resources allocated?",
                      "Show evacuation risks.",
                      "Predict next 24 hours."
                    ].map((q, idx) => (
                      <button
                        key={idx}
                        type="button"
                        disabled={isChatLoading}
                        onClick={() => triggerChat(q)}
                        className="px-3 py-1.5 border border-gray-850 hover:border-adcc-accent bg-adcc-secondary/25 hover:bg-adcc-accent/5 text-adcc-textMuted hover:text-adcc-accent transition-colors rounded-full cursor-pointer text-left"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Input box form */}
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    triggerChat(inputValue);
                  }}
                  className="flex gap-2.5 mt-1"
                >
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    disabled={isChatLoading}
                    placeholder="Ask Antigravity about active disasters, allocations, or simulations..."
                    className="flex-1 bg-adcc-bg border border-gray-850 text-adcc-textPrimary text-xs rounded-lg px-4 py-3 outline-none focus:border-adcc-accent font-sans"
                  />
                  <button
                    type="submit"
                    disabled={isChatLoading || !inputValue.trim()}
                    className="px-4 bg-adcc-accent text-adcc-bg border border-adcc-accent hover:shadow-glow rounded-lg flex items-center justify-center transition-all duration-200 disabled:opacity-40 cursor-pointer"
                  >
                    <Send size={14} />
                  </button>
                </form>

              </div>
            </div>
          )}

        </div>

      </div>
    </PageContainer>
  );
};
export default AICommandCenter;
