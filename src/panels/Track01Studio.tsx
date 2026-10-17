import { useState } from 'react';
import { Crosshair, GitBranch, Table2 } from 'lucide-react';
import {
  deriveTrack01BlastRadius,
  deriveTrack01Tools,
  deriveTrack01Trace
} from '../data/trackViews';

export default function Track01Studio(props: any) {
  const { currentTenant, setSelectedNodeId, setActiveTab } = props;
  const tools = deriveTrack01Tools(currentTenant);
  const trace = deriveTrack01Trace(currentTenant);
  const [rootId, setRootId] = useState(tools[0]?.id ?? '');
  const radius = rootId ? deriveTrack01BlastRadius(currentTenant, rootId) : [];

  return (
    <div className="space-y-4">
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Crosshair className="w-4 h-4 text-cyan-400" />
          Track 01 · Connected-Data Action Engine
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
            borrowed schema · read-only projection of the real tenant graph
          </span>
        </h2>
        <p className="text-xs text-slate-400 mt-1.5">
          Every row below is read from FalkorDB over <code className="text-cyan-300">/api/graph/nodes</code> — no
          client-side algorithm, no seed fallback.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-3">
            <Table2 className="w-4 h-4 text-cyan-400" />
            Actionable symbols ({tools.length})
          </h3>
          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {tools.map((tool) => (
              <div
                key={tool.id}
                onClick={() => setSelectedNodeId(tool.id)}
                className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/50 cursor-pointer transition"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-white truncate">{tool.label}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 shrink-0">
                    L{tool.level} · {tool.status}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-400 mt-0.5 truncate">
                  {tool.file} · {tool.domain}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-3">
              <Crosshair className="w-4 h-4 text-amber-400" />
              Blast radius
            </h3>
            <select
              value={rootId}
              onChange={(e) => setRootId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs font-mono text-white focus:outline-none"
            >
              {tools.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
            <div className="mt-3 text-xs text-slate-300">
              <strong className="text-white">{radius.length}</strong> affected symbols reachable from the root.
            </div>
            <div className="mt-2 space-y-1 max-h-[150px] overflow-y-auto">
              {radius.map((n) => (
                <div key={n.id} className="text-[11px] font-mono text-cyan-300 truncate">
                  ← {n.id}
                </div>
              ))}
            </div>
            <button
              onClick={() => setActiveTab('cockpit')}
              className="mt-3 text-xs text-indigo-300 hover:underline cursor-pointer"
            >
              Inspect on the 2D cockpit →
            </button>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-3">
          <GitBranch className="w-4 h-4 text-indigo-400" />
          Decision trace · typed graph edges ({trace.length})
        </h3>
        <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
          {trace.map((step, i) => (
            <div
              key={`${step.from}-${step.to}-${step.type}-${i}`}
              className="text-[11px] font-mono text-slate-300 flex items-center gap-2"
            >
              <span className="text-slate-400 truncate">{step.from}</span>
              <span className="text-indigo-400 shrink-0">-[{step.type}]→</span>
              <span className="text-slate-200 truncate">{step.to}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
