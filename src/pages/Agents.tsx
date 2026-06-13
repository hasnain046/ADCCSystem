import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystem, Agent } from '../contexts/SystemContext';
import PageContainer from '../components/PageContainer';
import SectionHeader from '../components/SectionHeader';
import { 
  Cpu, 
  Terminal, 
  ChevronRight, 
  Clock,
  ShieldCheck,
  Send
} from 'lucide-react';

export const Agents: React.FC = () => {
  const { agents, sendAgentCommand } = useSystem();
  const [selectedAgentId, setSelectedAgentId] = useState<string>('a-1');
  const [commandText, setCommandText] = useState<string>('');

  const selectedAgent = agents.find(a => a.id === selectedAgentId) || agents[0];

  const handleSendCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandText.trim()) return;
    sendAgentCommand(selectedAgent.id, commandText.trim());
    setCommandText('');
  };

  const getAgentStatusStyles = (status: string) => {
    switch (status) {
      case 'processing':
        return {
          color: 'text-adcc-accent',
          border: 'border-adcc-accent/30',
          bg: 'bg-adcc-accentGlow/5',
          badge: 'text-adcc-accent border-adcc-accent/30 bg-adcc-accentGlow/10'
        };
      case 'success':
        return {
          color: 'text-adcc-success',
          border: 'border-adcc-success/35',
          bg: 'bg-adcc-success/5',
          badge: 'text-adcc-success border-adcc-success/30 bg-adcc-success/10'
        };
      case 'alert':
        return {
          color: 'text-adcc-danger',
          border: 'border-adcc-danger/35',
          bg: 'bg-adcc-danger/5',
          badge: 'text-adcc-danger border-adcc-danger/30 bg-adcc-danger/10'
        };
      default:
        return {
          color: 'text-adcc-textMuted',
          border: 'border-gray-800',
          bg: 'bg-gray-800/10',
          badge: 'text-adcc-textMuted border-gray-750 bg-gray-800/20'
        };
    }
  };

  // LangGraph Pipeline Order: data collection -> verification -> severity -> allocation -> shelter -> replanning
  const pipelineOrder = ['a-1', 'a-2', 'a-3', 'a-4', 'a-5', 'a-6'];
  const pipelineAgents = pipelineOrder.map(id => agents.find(a => a.id === id)).filter(Boolean) as Agent[];

  return (
    <PageContainer>
      <SectionHeader 
        title="Multi-Agent Operations Room" 
        description="Monitor LangGraph AI pipeline orchestrations, telemetry hooks, and execute manual overrides."
      />

      {/* Pipeline Workflow Visualization */}
      <div className="glass-panel border border-gray-800 rounded-xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <h3 className="font-bold text-sm tracking-wider font-mono uppercase text-adcc-textPrimary flex items-center gap-2">
            <Cpu size={16} className="text-adcc-accent" />
            Active Agent Orchestration Graph (LangGraph)
          </h3>
          <span className="text-[10px] font-mono text-adcc-accent uppercase">Dynamic State Machine</span>
        </div>

        {/* Pipeline Nodes Layout */}
        <div className="flex flex-col xl:flex-row items-center justify-between gap-3 p-4 bg-adcc-secondary/40 border border-gray-800/80 rounded-xl overflow-x-auto">
          {pipelineAgents.map((agent, index) => {
            const styles = getAgentStatusStyles(agent.status);
            const isSelected = selectedAgentId === agent.id;

            return (
              <React.Fragment key={agent.id}>
                {/* Agent Node */}
                <button
                  onClick={() => setSelectedAgentId(agent.id)}
                  className={`flex flex-col gap-2 p-4 min-w-[200px] w-full xl:w-auto glass-panel border rounded-xl text-left transition-all duration-200 cursor-pointer ${
                    isSelected ? 'ring-2 ring-adcc-accent border-adcc-accent/40 shadow-glow' : 'border-gray-850 hover:border-gray-700'
                  } ${styles.bg}`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-mono text-adcc-textMuted uppercase font-bold">Node 0{index + 1}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono uppercase font-bold tracking-wider border ${styles.badge}`}>
                      {agent.status}
                    </span>
                  </div>
                  
                  <div className="flex flex-col mt-1">
                    <span className="text-xs font-bold text-adcc-textPrimary font-mono group-hover:text-adcc-accent">
                      {agent.name.split(' Agent')[0]}
                    </span>
                    <span className="text-[9px] text-adcc-textMuted mt-1 truncate max-w-[180px]">
                      {agent.currentTask}
                    </span>
                  </div>
                </button>

                {/* Arrow Connector */}
                {index < pipelineAgents.length - 1 && (
                  <div className="hidden xl:flex items-center text-adcc-accent/40 shrink-0">
                    <ChevronRight size={18} className="animate-pulse" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Side: Agent Telemetry Specs (1 Col) */}
        <div className="glass-panel border border-gray-800 rounded-xl p-5 flex flex-col gap-4 bg-adcc-secondary/20">
          <div className="border-b border-gray-800 pb-3">
            <h3 className="font-bold text-sm tracking-wider font-mono uppercase text-adcc-textPrimary">
              Selected Agent Telemetry
            </h3>
          </div>

          <div className="flex flex-col gap-4 font-mono text-xs">
            <div className="flex flex-col gap-1.5">
              <span className="text-adcc-textMuted text-[9px] uppercase">AGENT IDENTITY</span>
              <span className="text-sm font-bold text-adcc-textPrimary">{selectedAgent.name}</span>
            </div>

            <div className="flex flex-col gap-1.5 pt-2 border-t border-gray-800/40">
              <span className="text-adcc-textMuted text-[9px] uppercase">PRIMARY RESPONSIBILITY</span>
              <p className="text-xs text-adcc-textMuted font-sans leading-relaxed">
                {selectedAgent.role}
              </p>
            </div>

            <div className="flex flex-col gap-1.5 pt-2 border-t border-gray-800/40">
              <span className="text-adcc-textMuted text-[9px] uppercase">CURRENT EXECUTING THREAD</span>
              <span className="text-adcc-accent text-[11px] font-bold">
                {selectedAgent.currentTask}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-800/40 text-[10px]">
              <div className="flex flex-col gap-1 bg-adcc-secondary p-2.5 border border-gray-800 rounded-lg">
                <span className="text-adcc-textMuted uppercase">HEARTBEAT</span>
                <span className="text-adcc-success font-bold flex items-center gap-1">
                  <ShieldCheck size={11} /> NOMINAL
                </span>
              </div>
              <div className="flex flex-col gap-1 bg-adcc-secondary p-2.5 border border-gray-800 rounded-lg">
                <span className="text-adcc-textMuted uppercase">LAST CALL</span>
                <span className="text-adcc-textPrimary font-bold flex items-center gap-1">
                  <Clock size={11} /> {selectedAgent.lastActive}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Command shell / Terminal Logs (2 Cols) */}
        <div className="xl:col-span-2 glass-panel border border-gray-800 rounded-xl p-5 flex flex-col gap-4 bg-[#090E1A]">
          <div className="flex items-center justify-between border-b border-gray-850 pb-3">
            <h3 className="font-bold text-sm tracking-wider font-mono uppercase text-adcc-textPrimary flex items-center gap-2">
              <Terminal size={16} className="text-adcc-accent" />
              Diagnostics Terminal // {selectedAgent.name.toUpperCase()}
            </h3>
            <span className="text-[9px] font-mono text-adcc-danger uppercase animate-pulse">Stream Online</span>
          </div>

          {/* Terminal Console Output */}
          <div className="flex-1 bg-[#050811] border border-gray-850 rounded-lg p-4 font-mono text-xs text-[#34D399] overflow-y-auto min-h-[280px] max-h-[350px] flex flex-col-reverse gap-2 shadow-inner">
            <AnimatePresence mode="popLayout">
              {selectedAgent.logs.map((log, index) => (
                <motion.div
                  key={`${selectedAgent.id}-log-${index}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15 }}
                  className="leading-relaxed whitespace-pre-wrap break-all"
                >
                  {log}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Terminal Input override */}
          <form onSubmit={handleSendCommand} className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-2.5 font-mono text-xs text-adcc-accent">operator@adcc:~$&nbsp;</span>
              <input
                type="text"
                value={commandText}
                onChange={(e) => setCommandText(e.target.value)}
                placeholder="Enter bypass command override (e.g., re-assess sector 9, audit logs)..."
                className="w-full bg-[#050811] border border-gray-850 text-adcc-textPrimary font-mono text-xs rounded-lg pl-36 pr-4 py-2.5 outline-none focus:border-adcc-accent"
              />
            </div>
            <button
              type="submit"
              className="p-2.5 bg-adcc-accent border border-adcc-accent hover:shadow-glow text-adcc-bg rounded-lg flex items-center justify-center transition-all duration-200"
            >
              <Send size={15} />
            </button>
          </form>
        </div>

      </div>
    </PageContainer>
  );
};
export default Agents;
