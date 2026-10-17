import { Sparkles, Cpu, Play, RefreshCw, Check } from 'lucide-react';
import { PERSONA_LEVELS } from '../graph/personaLevels';

export default function ControlPanel(props: any) {
  const { visibleNodes, currentTenant, maturityLevel, setMaturityLevel, promptInput, setPromptInput, useLiveGemini, setUseLiveGemini, isRunningAgents, agentStepText, handleRunMultiAgentPrompt } = props;

  return (
    <section className="bg-slate-900/50 border-b border-slate-800/80 px-4 py-3">
      <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* The 6-Level Dial */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Builder Maturity Dial (Progressive Depth Control)
            </span>
            <span className="text-xs text-slate-400">
              Showing <strong className="text-white">{visibleNodes.length}</strong> of{' '}
              <strong className="text-white">{currentTenant.nodes.length}</strong> Semantic Graph Nodes (L0 → L{maturityLevel})
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
            {PERSONA_LEVELS.map((p) => {
              const isActive = maturityLevel === p.level;
              const isIncluded = p.level <= maturityLevel;
              return (
                <button
                  key={p.level}
                  onClick={() => setMaturityLevel(p.level)}
                  className={`text-left p-2.5 rounded-xl border transition-all relative overflow-hidden ${
                    isActive
                      ? 'border-white/40 bg-slate-800/90 shadow-lg ring-2 ring-indigo-500/50'
                      : isIncluded
                      ? 'border-slate-700/80 bg-slate-900/70 hover:bg-slate-800/60'
                      : 'border-slate-800/50 bg-slate-950/60 opacity-55 hover:opacity-90'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-md bg-gradient-to-r ${p.color} text-white`}
                    >
                      {p.short}
                    </span>
                    {isIncluded && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </div>
                  <div className="text-xs font-semibold text-white truncate">{p.name}</div>
                  <div className="text-[10px] text-slate-400 truncate">{p.tagline}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Multi-Agent Prompt Bar */}
        <div className="lg:w-[460px] flex flex-col justify-between bg-slate-950/90 border border-slate-800 rounded-xl p-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleRunMultiAgentPrompt(promptInput);
            }}
          >
            <div className="text-[11px] font-medium text-slate-400 mb-1.5 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-indigo-300 font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Gemini 3 Flash 4-Agent Squad:
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setUseLiveGemini(!useLiveGemini)}
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border cursor-pointer transition ${
                    useLiveGemini
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {useLiveGemini ? '✨ Live Gemini API: ON' : '⚡ Fast Sim: ON'}
                </button>
                <span className="text-[10px] text-emerald-400 font-mono">
                  {currentTenant.playbooks.length} :Playbooks
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder="Ask Gemini Squad to build a feature (e.g., Add Stripe Checkout)..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={isRunningAgents}
                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow disabled:opacity-50 cursor-pointer"
              >
                {isRunningAgents ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                Build
              </button>
            </div>
          </form>
          {isRunningAgents ? (
            <div className="mt-2 text-[11px] text-amber-300 font-mono flex items-center gap-1.5 animate-pulse">
              <Cpu className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{agentStepText}</span>
            </div>
          ) : (
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
              <span>1-Click Gemini Prompts:</span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    handleRunMultiAgentPrompt('Add ElevenLabs AI Voice Cloning Endpoint')
                  }
                  className="text-indigo-300 hover:text-white bg-indigo-950/60 hover:bg-indigo-900/70 px-2 py-0.5 rounded border border-indigo-500/30 cursor-pointer transition"
                >
                  + ElevenLabs Voice API
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleRunMultiAgentPrompt('Add Real-Time Collaborative Cursor Sync via WebSockets')
                  }
                  className="text-emerald-300 hover:text-white bg-emerald-950/50 hover:bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-500/30 cursor-pointer transition"
                >
                  + WebSocket Sync
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
