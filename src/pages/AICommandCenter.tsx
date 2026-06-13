import React, { useState, useRef, useEffect } from 'react';
import { useSystem, ResourceStatus } from '../contexts/SystemContext';
import PageContainer from '../components/PageContainer';
import SectionHeader from '../components/SectionHeader';
import { 
  Terminal, 
  Send, 
  Bot, 
  User, 
  Check, 
  X, 
  Sparkles
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  blueprint?: {
    resourceName: keyof ResourceStatus;
    resourceLabel: string;
    count: number;
    destination: string;
    status: 'pending' | 'authorized' | 'declined';
  };
}

export const AICommandCenter: React.FC = () => {
  const { dispatchResources, triggerNotification } = useSystem();
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'ai',
      text: 'ADCC Command Orchestration Agent online. Standing by for incident response prompts or manual bypass commands.',
      timestamp: '12:35 PM'
    }
  ]);
  
  const [inputText, setInputText] = useState<string>('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');

    // Generate AI response
    setTimeout(() => {
      let responseText = '';
      let blueprint: ChatMessage['blueprint'] = undefined;

      const lowerText = textToSend.toLowerCase();

      if (lowerText.includes('drone') || lowerText.includes('medical')) {
        responseText = 'Based on the coastal storm surge in Sector 4-B, I have drafted an emergency logistics blueprint. It routes medical drones around storm cells to provide instant clinical rations to isolated relief camps.';
        blueprint = {
          resourceName: 'medicalDrones',
          resourceLabel: 'Emergency Medical Drones',
          count: 10,
          destination: 'Sector 4-B (East Bay Coast)',
          status: 'pending'
        };
      } else if (lowerText.includes('ndrf') || lowerText.includes('personnel') || lowerText.includes('specialist')) {
        responseText = 'Wildfire parameters in Sector 9-A are expanding. I recommend deploying NDRF Rescue Specialists to reinforce the northern containment line coordinates.';
        blueprint = {
          resourceName: 'personnel',
          resourceLabel: 'Rescue Specialists (NDRF)',
          count: 100,
          destination: 'Sector 9-A (North Ridge Forest)',
          status: 'pending'
        };
      } else if (lowerText.includes('ration') || lowerText.includes('food')) {
        responseText = 'Drafting a distribution order for supply depot food & medical kits. Relays will be routed via emergency amphibious vehicles.';
        blueprint = {
          resourceName: 'rations',
          resourceLabel: 'Food & Medical Rations',
          count: 500,
          destination: 'Metropolitan Sector 1 Relief Camp',
          status: 'pending'
        };
      } else {
        responseText = `Command query received: "${textToSend}". I have cross-referenced the operational databases. No active anomaly matching this request was detected. You can request resource dispatch recommendations by asking to "deploy drones", "send NDRF teams", or "distribute rations".`;
      }

      const aiMsg: ChatMessage = {
        id: `msg-ai-${Date.now()}`,
        sender: 'ai',
        text: responseText,
        timestamp: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
        blueprint
      };

      setMessages(prev => [...prev, aiMsg]);
    }, 1000);
  };

  const handleAuthorizeBlueprint = (messageId: string, blueprint: ChatMessage['blueprint']) => {
    if (!blueprint) return;
    
    // Attempt resource dispatch
    const success = dispatchResources(blueprint.resourceName, blueprint.count);

    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId && msg.blueprint) {
        return {
          ...msg,
          blueprint: {
            ...msg.blueprint,
            status: success ? 'authorized' : 'declined'
          }
        };
      }
      return msg;
    }));

    if (!success) {
      // Add error feedback chat message
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: `msg-ai-err-${Date.now()}`,
          sender: 'ai',
          text: `FAILED INVENTORY DISPATCH: Insufficient stock of ${blueprint.resourceLabel} in command reserves. Restock supplies in Resources tab first.`,
          timestamp: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
        }]);
      }, 500);
    }
  };

  const handleDeclineBlueprint = (messageId: string) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId && msg.blueprint) {
        return {
          ...msg,
          blueprint: {
            ...msg.blueprint,
            status: 'declined'
          }
        };
      }
      return msg;
    }));

    triggerNotification(
      'BLUEPRINT DECLINED',
      'Tactical action blueprint dismissed by Duty Commander.',
      'info',
      'AI Command Center'
    );
  };

  const suggestionChips = [
    { text: 'Deploy medical drones to Sector 4-B', prompt: 'Deploy medical drones to Sector 4-B' },
    { text: 'Send NDRF teams to Sector 9-A wildfire', prompt: 'Send 100 NDRF Rescue Specialists to Sector 9-A wildfire' },
    { text: 'Distribute food rations to metro shelters', prompt: 'Distribute rations to metro shelters' }
  ];

  return (
    <PageContainer>
      <SectionHeader 
        title="AI Command Center Console" 
        description="Interact with the ADCC emergency orchestration assistant. Generate action blueprints and deploy logistical overrides."
      />

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 h-[calc(100vh-210px)] min-h-[550px]">
        
        {/* Chat Interface Console (3 Cols) */}
        <div className="xl:col-span-3 glass-panel border border-gray-800 rounded-xl flex flex-col bg-[#090E1A] overflow-hidden">
          
          {/* Header */}
          <div className="p-3 border-b border-gray-800 bg-adcc-secondary flex items-center justify-between z-10">
            <div className="flex items-center gap-2 font-mono text-xs text-adcc-accent">
              <Bot size={16} />
              <span>COMM-NODE // ADCC-ORCHESTRATOR-v4</span>
            </div>
            <div className="flex items-center gap-1.5 text-[9px] font-mono text-adcc-success uppercase">
              <Sparkles size={11} className="animate-pulse" /> Cognitive Layer Sync
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {messages.map((msg) => (
              <div 
                key={msg.id}
                className={`flex gap-3 max-w-[80%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* Avatar */}
                <div className={`p-1.5 rounded-lg border h-fit shrink-0 ${
                  msg.sender === 'user' ? 'bg-adcc-accent/15 border-adcc-accent/35 text-adcc-accent' : 'bg-gray-800/80 border-gray-700 text-adcc-textMuted'
                }`}>
                  {msg.sender === 'user' ? <User size={14} /> : <Bot size={14} />}
                </div>

                <div className="flex flex-col gap-1.5">
                  {/* Message Bubble */}
                  <div className={`p-3 rounded-lg text-xs leading-relaxed font-sans ${
                    msg.sender === 'user'
                      ? 'bg-adcc-accent/10 border border-adcc-accent/20 text-adcc-textPrimary rounded-tr-none'
                      : 'bg-adcc-secondary/60 border border-gray-800/80 text-adcc-textMuted rounded-tl-none'
                  }`}>
                    {msg.text}
                  </div>

                  {/* Blueprint Card Attachment */}
                  {msg.blueprint && (
                    <div className="mt-2 glass-panel border border-adcc-accent/20 rounded-lg p-3.5 bg-adcc-secondary flex flex-col gap-3 font-mono text-[11px] max-w-md shadow-md">
                      <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                        <span className="text-adcc-accent font-bold uppercase tracking-wider flex items-center gap-1">
                          <Terminal size={12} /> ACTION BLUEPRINT
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${
                          msg.blueprint.status === 'pending' ? 'text-adcc-warning border-adcc-warning/30 bg-adcc-warning/5' :
                          msg.blueprint.status === 'authorized' ? 'text-adcc-success border-adcc-success/30 bg-adcc-success/5' :
                          'text-adcc-danger border-adcc-danger/30 bg-adcc-danger/5'
                        }`}>
                          {msg.blueprint.status}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-adcc-textMuted">RESOURCE:</span>
                          <span className="text-adcc-textPrimary font-bold">{msg.blueprint.resourceLabel}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-adcc-textMuted">QUANTITY:</span>
                          <span className="text-adcc-accent font-bold">{msg.blueprint.count} units</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-adcc-textMuted">DESTINATION:</span>
                          <span className="text-adcc-textPrimary font-semibold">{msg.blueprint.destination}</span>
                        </div>
                      </div>

                      {msg.blueprint.status === 'pending' && (
                        <div className="flex gap-2 mt-1 pt-3 border-t border-gray-850">
                          <button
                            onClick={() => handleAuthorizeBlueprint(msg.id, msg.blueprint)}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-adcc-success/15 border border-adcc-success/35 hover:bg-adcc-success hover:text-adcc-bg text-[10px] font-bold uppercase rounded transition-all duration-150"
                          >
                            <Check size={12} /> Authorize
                          </button>
                          <button
                            onClick={() => handleDeclineBlueprint(msg.id)}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-adcc-danger/10 border border-adcc-danger/30 hover:bg-adcc-danger hover:text-adcc-textPrimary text-[10px] font-bold uppercase rounded transition-all duration-150 text-adcc-textMuted"
                          >
                            <X size={12} /> Decline
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <span className={`text-[9px] font-mono text-adcc-textMuted mt-0.5 ${msg.sender === 'user' ? 'text-right' : ''}`}>
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Suggestions Chips */}
          <div className="px-4 py-2 border-t border-gray-850 bg-adcc-bg/40 flex flex-wrap gap-2">
            {suggestionChips.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(chip.prompt)}
                className="flex items-center gap-1 px-2.5 py-1 bg-adcc-secondary/80 border border-gray-800 hover:border-adcc-accent text-[10px] font-mono text-adcc-textMuted hover:text-adcc-textPrimary rounded-full transition-all duration-150"
              >
                <Sparkles size={10} className="text-adcc-accent" />
                {chip.text}
              </button>
            ))}
          </div>

          {/* Input Panel */}
          <div className="p-3 bg-adcc-secondary border-t border-gray-800 flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendMessage(inputText);
              }}
              placeholder="Ask AI to draft blueprints or dispatch resources (e.g., 'deploy medical drones')..."
              className="flex-1 bg-adcc-bg border border-gray-850 text-adcc-textPrimary text-xs rounded-lg px-4 py-3 outline-none focus:border-adcc-accent"
            />
            <button
              onClick={() => handleSendMessage(inputText)}
              className="p-3 bg-adcc-accent text-adcc-bg border border-adcc-accent hover:shadow-glow rounded-lg flex items-center justify-center transition-all duration-200"
            >
              <Send size={15} />
            </button>
          </div>

        </div>

        {/* System Activity Stream Sidebar (1 Col) */}
        <div className="glass-panel border border-gray-800 rounded-xl p-5 flex flex-col gap-4 bg-adcc-secondary/20 h-full">
          <div className="border-b border-gray-800 pb-3">
            <h3 className="font-bold text-sm tracking-wider font-mono uppercase text-adcc-textPrimary flex items-center gap-1.5">
              <Terminal size={15} className="text-adcc-accent" />
              Operational Log Node
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 font-mono text-[10px] text-adcc-textMuted pr-1">
            <div className="flex flex-col gap-1 border-b border-gray-800/30 pb-2">
              <span className="text-[#34D399]">[12:35:10] CENTRAL INGESTION ONLINE</span>
              <span>Subscribed to NOAA GIS alert satellite. Latency: 120ms.</span>
            </div>
            <div className="flex flex-col gap-1 border-b border-gray-800/30 pb-2">
              <span className="text-[#34D399]">[12:35:02] AGENT LAYER ACTIVE</span>
              <span>Loaded 6 cognitive models. Standing by for incident verification loops.</span>
            </div>
            <div className="flex flex-col gap-1 border-b border-gray-800/30 pb-2">
              <span className="text-adcc-warning">[12:34:10] CRITICAL: FLOOD STRESS</span>
              <span>Urban drainage drainage overflow Sector 1 water stabilizing.</span>
            </div>
            <div className="flex flex-col gap-1 border-b border-gray-800/30 pb-2">
              <span className="text-adcc-danger">[12:32:00] ALARM: CYCLONE COMPROMISE</span>
              <span>Coastal flood defenses in Sector 4-B reported breaches.</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-adcc-accent">[12:28:45] LEDGER SYNCHRONIZED</span>
              <span>Disaster Command inventory registry successfully locked in DB.</span>
            </div>
          </div>
        </div>

      </div>
    </PageContainer>
  );
};
export default AICommandCenter;
