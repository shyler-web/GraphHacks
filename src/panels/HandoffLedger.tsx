import { GitBranch, Users } from 'lucide-react';

export default function HandoffLedger(props: any) {
  const { currentTenant, setActiveTab } = props;

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex-1 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-indigo-400" />
            4-Agent Shared FalkorDB Handoff Ledger (:AgentTask)
          </h3>
          <span className="text-[11px] font-mono text-emerald-400">asyncio.gather()</span>
        </div>
        <div className="space-y-2 max-h-[210px] overflow-y-auto pr-1">
          {currentTenant.handoffs.map((h) => (
            <div
              key={h.id}
              className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/90 flex items-center justify-between gap-2 text-xs"
            >
              <div className="flex items-center gap-2">
                <GitBranch className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <div>
                  <div className="font-medium text-slate-200">
                    {h.from} <span className="text-slate-500">→</span> {h.to}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">
                    Target Node: {h.target}
                  </div>
                </div>
              </div>
              <span
                className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${
                  h.status === 'PLAYBOOK_ENFORCED'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : h.status === 'ALERT_RAISED'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'bg-indigo-500/20 text-indigo-300'
                }`}
              >
                {h.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Procedural Memory Quick Status */}
      <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
        <span className="text-slate-400">
          Learned <code className="text-amber-300">:Playbook</code> Guardrails in Graph:
        </span>
        <button
          onClick={() => setActiveTab('memory')}
          className="text-indigo-400 hover:underline font-medium flex items-center gap-1 cursor-pointer"
        >
          Inspect {currentTenant.playbooks.length} Rules & {currentTenant.episodes.length} Episodes →
        </button>
      </div>
    </div>
  );
}
