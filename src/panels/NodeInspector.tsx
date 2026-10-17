import { ShieldAlert, Sparkles, BookOpen, CheckCircle2, RefreshCw, Search, ExternalLink } from 'lucide-react';
import { PERSONA_LEVELS } from '../graph/personaLevels';

export default function NodeInspector(props: any) {
  const { selectedNode, maturityLevel, setMaturityLevel, coachLoading, handleAskGeminiCoach, groundingLoading, handleGroundedResearch, coachOutputs, currentPersonaObj, groundingOutputs, bubbleUpRisks, handleApplySeniorFix, setSelectedNodeId } = props;

  return (
    <>
    {selectedNode && (
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                L{selectedNode.persona_level} ({PERSONA_LEVELS[selectedNode.persona_level].name})
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                Domain: {selectedNode.domain}
              </span>
            </div>
            <h2 className="text-base font-bold text-white">{selectedNode.title}</h2>
          </div>
          <span
            className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full ${
              selectedNode.status === 'CRITICAL'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : selectedNode.status === 'FIXED'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-slate-800 text-slate-300'
            }`}
          >
            {selectedNode.status}
          </span>
        </div>

        {/* Vibe Coder Plain-English Translation Card */}
        <div className="p-3 rounded-xl bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-indigo-500/10 border border-pink-500/30">
          <div className="text-[11px] font-semibold text-pink-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            L0 Vibe Coder Translation (Zero Jargon):
          </div>
          <p className="text-xs text-slate-100 leading-relaxed">
            “{selectedNode.vibe_translation}”
          </p>
        </div>

        {/* Technical Summary */}
        <div>
          <div className="text-xs font-semibold text-slate-400 mb-1">
            Architectural Context (Created by {selectedNode.created_by_agent}):
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">{selectedNode.summary}</p>
        </div>

        {/* Code or Mathematical Proof Box */}
        <div>
          <div className="text-xs font-semibold text-slate-400 mb-1 flex items-center justify-between">
            <span>Code Contract / Mathematical Proof (L3–L5):</span>
            {maturityLevel === 0 && (
              <button
                onClick={() => setMaturityLevel(3)}
                className="text-[11px] text-indigo-400 hover:underline cursor-pointer"
              >
                Turn Dial to L3 to expand all code →
              </button>
            )}
          </div>
          <pre className="text-[11px] font-mono bg-slate-950 text-cyan-300 p-3 rounded-xl border border-slate-800 overflow-x-auto whitespace-pre-wrap">
            {selectedNode.code_or_math}
          </pre>
        </div>

        {}
        <div className="pt-2 border-t border-slate-800/80 flex flex-col gap-2.5">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleAskGeminiCoach(selectedNode)}
              disabled={coachLoading}
              className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-200 border border-amber-500/40 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition disabled:opacity-50"
            >
              {coachLoading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-300" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              )}
              ✨ Ask Nebius Coach (Explain at L{maturityLevel})
            </button>

            <button
              type="button"
              onClick={() => handleGroundedResearch(selectedNode)}
              disabled={groundingLoading}
              className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 text-cyan-200 border border-cyan-500/40 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition disabled:opacity-50"
            >
              {groundingLoading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-300" />
              ) : (
                <Search className="w-3.5 h-3.5 text-cyan-300" />
              )}
              🌐 Tavily Prior Art
            </button>
          </div>

          {/* Nebius Level-Calibrated Learning Coach Output */}
          {coachOutputs[`${selectedNode.id}_L${maturityLevel}`] && (
            <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/40 space-y-2 text-xs">
              <div className="font-bold text-amber-300 flex items-center justify-between">
                <span>🎓 Nebius Learning Bridge (Calibrated for L{maturityLevel} {currentPersonaObj.name})</span>
                <span className="text-[10px] font-mono text-amber-400/80">Lens #4: Learning</span>
              </div>
              <p className="text-slate-200">
                <strong className="text-amber-200">Mental Model:</strong>{' '}
                {coachOutputs[`${selectedNode.id}_L${maturityLevel}`].analogy}
              </p>
              <p className="text-slate-300">
                <strong className="text-amber-200">Cognitive Debt Impact:</strong>{' '}
                {coachOutputs[`${selectedNode.id}_L${maturityLevel}`].cognitiveDebtImpact}
              </p>
              <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 font-mono text-[11px] text-emerald-300">
                Action / Prompt: {coachOutputs[`${selectedNode.id}_L${maturityLevel}`].safeRepromptOrCommand}
              </div>
              <p className="text-[11px] text-indigo-300 italic">
                🚀 Level-Up Question (→ L{Math.min(5, maturityLevel + 1)}):{' '}
                {coachOutputs[`${selectedNode.id}_L${maturityLevel}`].levelUpChallenge}
              </p>
            </div>
          )}

          {/* Tavily Prior-Art Grounding Output */}
          {groundingOutputs[selectedNode.id] && (
            <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/40 space-y-2 text-xs">
              <div className="font-bold text-cyan-300 flex items-center justify-between">
                <span>🌐 Live Web-Grounded Engineering Brief</span>
                <span className="text-[10px] font-mono text-cyan-400/80">Lens #5 & #6: Research</span>
              </div>
              <div className="text-slate-200 whitespace-pre-line leading-relaxed">
                {groundingOutputs[selectedNode.id].text}
              </div>
              {groundingOutputs[selectedNode.id].sources?.length > 0 && (
                <div className="pt-1.5 border-t border-cyan-500/20">
                  <div className="text-[10px] font-mono text-cyan-400 mb-1">
                    Verified Web Citations:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {groundingOutputs[selectedNode.id].sources.slice(0, 4).map((src, i) => (
                      <a
                        key={i}
                        href={src.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-cyan-300 hover:underline border border-slate-700 flex items-center gap-1"
                      >
                        <ExternalLink className="w-2.5 h-2.5" />
                        {src.title.slice(0, 28)}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* THE KILLER DEMO LOOP: Bubble-Up Senior Guardian Alert & 1-Click Fix */}
        {(bubbleUpRisks[selectedNode.id] || selectedNode.status === 'CRITICAL') && (
          <div className="p-3.5 rounded-xl bg-rose-950/50 border-2 border-rose-500/60 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-400 animate-bounce" />
                L4 Senior Auditor Bubble-Up Alert ([:ENDANGERS])
              </span>
              <span className="text-[10px] font-mono bg-rose-500/30 text-rose-200 px-2 py-0.5 rounded">
                SEVERITY: CRITICAL
              </span>
            </div>
            <p className="text-xs text-rose-100">
              {bubbleUpRisks[selectedNode.id]
                ? bubbleUpRisks[selectedNode.id].summary
                : selectedNode.summary}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={() =>
                  handleApplySeniorFix(
                    bubbleUpRisks[selectedNode.id] || selectedNode,
                    selectedNode
                  )
                }
                className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg cursor-pointer transition"
              >
                <CheckCircle2 className="w-4 h-4" />
                Apply 1-Click Senior Fix + Save to :Playbook Memory
              </button>
              <button
                onClick={() => {
                  setMaturityLevel(Math.max(maturityLevel, 2));
                  setSelectedNodeId('node_learning_bridge_l2');
                }}
                className="py-2 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center gap-1 cursor-pointer transition"
              >
                <BookOpen className="w-3.5 h-3.5" />
                Level Me Up (Why?)
              </button>
            </div>
          </div>
        )}
      </div>
    )}
    </>
  );
}
