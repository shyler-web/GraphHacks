import { ShieldAlert, Layers, MessageSquare } from 'lucide-react';

export default function MemoryTiers(props: any) {
  const { currentTenant, maturityLevel, setMaturityLevel, setSelectedNodeId, setActiveTab } = props;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Tier 1: Episodic Memory */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-pink-400" />
            1. Episodic Memory (:Episode)
          </h3>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-pink-500/20 text-pink-300">
            {currentTenant.episodes.length} Sessions
          </span>
        </div>
        <p className="text-xs text-slate-400 mb-3">
          Persistent conversation history linked via <code className="text-pink-300">[:MODIFIED]</code> edges to the exact ConceptNodes created or changed.
        </p>
        <div className="space-y-3 flex-1">
          {currentTenant.episodes.map((ep) => (
            <div key={ep.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                <span>{ep.session}</span>
                <span>{ep.timestamp}</span>
              </div>
              <div className="text-xs font-semibold text-white mb-1">
                Prompt: “{ep.prompt}”
              </div>
              <div className="text-xs text-slate-300 leading-relaxed">{ep.summary}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tier 2: Semantic Memory */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            2. Semantic Memory (:ConceptNode)
          </h3>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
            {currentTenant.nodes.length} Nodes
          </span>
        </div>
        <p className="text-xs text-slate-400 mb-3">
          Structured architectural knowledge indexed across 17 Domain Lenses × 6 Builder Persona Levels (<code className="text-cyan-300">L0 → L5</code>).
        </p>
        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
          {currentTenant.nodes.map((n) => (
            <div
              key={n.id}
              onClick={() => {
                setMaturityLevel(Math.max(maturityLevel, n.persona_level));
                setSelectedNodeId(n.id);
                setActiveTab('cockpit');
              }}
              className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500/50 cursor-pointer transition"
            >
              <div className="flex items-center justify-between text-[11px] font-mono mb-0.5">
                <span className="text-indigo-400">
                  L{n.persona_level} • {n.domain}
                </span>
                <span
                  className={
                    n.status === 'CRITICAL'
                      ? 'text-rose-400 font-bold'
                      : n.status === 'FIXED'
                      ? 'text-emerald-400 font-bold'
                      : 'text-slate-400'
                  }
                >
                  {n.status}
                </span>
              </div>
              <div className="text-xs font-semibold text-white">{n.title}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tier 3: Procedural Memory */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-emerald-400" />
            3. Procedural Memory (:Playbook)
          </h3>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
            {currentTenant.playbooks.length} Rules Learned
          </span>
        </div>
        <p className="text-xs text-slate-400 mb-3">
          Learned engineering guardrails. Whenever you click <strong>“Apply Senior Fix”</strong>, Agent 3 writes a <code className="text-emerald-300">:Playbook</code> node so future agents never repeat the mistake!
        </p>
        <div className="space-y-3 flex-1">
          {currentTenant.playbooks.map((pb) => (
            <div
              key={pb.id}
              className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40"
            >
              <div className="text-xs font-bold text-emerald-300 mb-1">{pb.rule_name}</div>
              <div className="text-[11px] font-mono text-slate-400 mb-1">
                Trigger Domain: {pb.trigger_domain}
              </div>
              <div className="text-xs text-slate-200 mb-1.5">{pb.enforced_action}</div>
              <div className="text-[10px] font-mono text-emerald-400">
                Source: {pb.learned_from}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
