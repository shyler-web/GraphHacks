import { BookOpen, Building2, Users } from 'lucide-react';
import { deriveTrack03Answer, deriveTrack03Entities } from '../data/trackViews';

export default function Track03Brain(props: any) {
  const { currentTenant, setSelectedNodeId, setActiveTab } = props;
  const entities = deriveTrack03Entities(currentTenant);
  const answer = deriveTrack03Answer(currentTenant);

  return (
    <div className="space-y-4">
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Building2 className="w-4 h-4 text-emerald-400" />
          Track 03 · Company Brain
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            borrowed schema · read-only projection of the real tenant graph
          </span>
        </h2>
        <p className="text-xs text-slate-400 mt-1.5">
          People, artifacts and their provenance, read live from FalkorDB. Stopping the graph stops this view.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-emerald-400" />
            Entities ({entities.length})
          </h3>
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {entities.map((entity) => (
              <div
                key={`${entity.kind}-${entity.id}`}
                className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white truncate">{entity.name}</div>
                  <div className="text-[11px] font-mono text-slate-400 truncate">{entity.detail}</div>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-emerald-300 shrink-0">
                  {entity.kind}
                  {entity.level !== null ? ` · L${entity.level}` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-indigo-400" />
            Cited answer
          </h3>
          <div className="text-xs font-semibold text-white mb-1">{answer.question}</div>
          <div className="text-xs text-slate-300 leading-relaxed mb-3">{answer.answer}</div>
          <div className="text-[11px] uppercase tracking-wider text-slate-400 mb-1.5">
            Sources ({answer.sources.length}) · {currentTenant.name}
          </div>
          <div className="space-y-1.5 flex-1 max-h-[260px] overflow-y-auto pr-1">
            {answer.sources.map((source) => (
              <div key={source.id} className="text-[11px] text-slate-300 flex items-start gap-2">
                <span className="text-indigo-400 font-mono shrink-0">{source.kind}</span>
                <span className="truncate">{source.label}</span>
              </div>
            ))}
          </div>
          {answer.path.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] font-mono text-slate-400 truncate">
              path: {answer.path.join(' → ')}
            </div>
          )}
          <button
            onClick={() => {
              setSelectedNodeId(answer.path[0]);
              setActiveTab('cockpit');
            }}
            className="mt-3 text-xs text-indigo-300 hover:underline cursor-pointer text-left"
          >
            Inspect the source node on the 2D cockpit →
          </button>
        </div>
      </div>
    </div>
  );
}
