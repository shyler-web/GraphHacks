import { useCallback, useEffect, useState } from 'react';
import { BookOpen, Building2, GitPullRequestArrow, RefreshCw, Users } from 'lucide-react';
import {
  fetchTrack03Drift,
  fetchTrack03Trace,
  fetchTrack03WhoOwns,
  syncTrack03,
  type Track03Drift,
  type Track03Owner,
  type Track03Trace
} from '../data/remote';

// Preset path the panel answers from the real `company:brain` graph. A single
// text input (below) overrides this for both who-owns and trace.
const DEFAULT_TARGET = 'docs/decisions.md';

function formatEpoch(seconds: number | null | undefined): string {
  if (!seconds) return '—';
  return new Date(seconds * 1000).toLocaleString();
}

/**
 * Track 03 brain — drives the real `company:brain` engine over the API
 * (`/api/track3/*`): who owns a file, why a symbol/doc exists (cited), and the
 * drift report. Every row comes from FalkorDB; nothing is derived from the
 * tenant graph (F4 superseded). Stop FalkorDB → this panel errors (rule 3).
 */
export default function Track03Brain(props: any) {
  const { repo = 'graphhacks' } = props;

  const [target, setTarget] = useState(DEFAULT_TARGET);
  const [owners, setOwners] = useState<Track03Owner[]>([]);
  const [trace, setTrace] = useState<Track03Trace | null>(null);
  const [drift, setDrift] = useState<Track03Drift | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncNote, setSyncNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextOwners, nextTrace, nextDrift] = await Promise.all([
        fetchTrack03WhoOwns(target, 5, repo),
        fetchTrack03Trace(target),
        fetchTrack03Drift(repo)
      ]);
      setOwners(nextOwners);
      setTrace(nextTrace);
      setDrift(nextDrift);
    } catch (err) {
      setError((err as Error).message || String(err));
    } finally {
      setLoading(false);
    }
  }, [repo, target]);

  useEffect(() => {
    void load();
    // Run once on mount and when the active repo changes; a target edit is
    // applied explicitly via the "Run" button (not on every keystroke).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repo]);

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    setSyncNote(null);
    try {
      const stats = await syncTrack03();
      setSyncNote(
        `synced · people=${stats.people} commits=${stats.commits} files=${stats.files} ` +
          `symbols=${stats.symbols} docs=${stats.docs} edges=${stats.edges}`
      );
      await load();
    } catch (err) {
      setError((err as Error).message || String(err));
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-400" />
              Track 03 · Company Brain
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                company:brain
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-1.5">
              Who owns a file, why a document exists (with citations), and what drifted —
              all read live from the people/commits/docs graph.
            </p>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing…' : 'Sync data'}
          </button>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <label className="text-[11px] font-mono text-slate-400 shrink-0">target</label>
          <input
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void load();
            }}
            placeholder="file path or symbol, e.g. docs/decisions.md"
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
          />
          <button
            onClick={() => void load()}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold shrink-0"
          >
            {loading ? '…' : 'Run'}
          </button>
        </div>
        {syncNote && (
          <div className="mt-2 text-[11px] font-mono text-emerald-300">{syncNote}</div>
        )}
        {error && (
          <div className="mt-2 text-[11px] font-mono text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg px-2 py-1.5">
            {error}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-emerald-400" />
            Who owns it {loading ? '· loading…' : `(${owners.length})`}
          </h3>
          <div className="text-[11px] font-mono text-slate-500 mb-3">
            who-owns?repo={repo}&amp;target={target}
          </div>
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {owners.map((owner) => (
              <div
                key={owner.person_id}
                className="p-2.5 rounded-xl bg-slate-950 border border-slate-800"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-white truncate">
                    {owner.name || owner.person_id}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-emerald-300 shrink-0">
                    {owner.commits} commits
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-400 mt-0.5 truncate">
                  +{owner.insertions} / −{owner.deletions} · {formatEpoch(owner.last_touched)}
                </div>
                <div className="text-[10px] font-mono text-slate-600 mt-0.5 truncate">
                  {owner.person_id}
                </div>
              </div>
            ))}
            {!loading && owners.length === 0 && !error && (
              <div className="text-xs text-slate-500 py-4 text-center">
                No owners — click “Sync data” to ingest commits.
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-1">
            <BookOpen className="w-4 h-4 text-indigo-400" />
            Why it exists {trace ? `· ${trace.kind}` : ''}
          </h3>
          <div className="text-[11px] font-mono text-slate-500 mb-2 truncate">
            trace?target={target}
          </div>
          {trace && (
            <div className="text-[11px] font-mono text-slate-400 mb-2 truncate">
              {trace.target_id}
            </div>
          )}
          <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1.5">
            Sources ({trace?.sources.length ?? 0})
          </div>
          <div className="space-y-1.5 flex-1 max-h-[320px] overflow-y-auto pr-1">
            {trace?.sources.map((source, i) => (
              <div
                key={`${source.doc_id}-${source.commit_id}-${i}`}
                className="p-2 rounded-lg bg-slate-950 border border-slate-800"
              >
                <div className="text-[11px] text-slate-200 truncate">
                  {source.doc_title || source.doc_path}
                </div>
                <div className="text-[10px] font-mono text-slate-500 truncate">
                  {source.doc_path}
                </div>
                {(source.commit_id || source.person_id) && (
                  <div className="text-[10px] font-mono text-indigo-300 mt-0.5 truncate">
                    {source.person_name || source.person_id} · {source.subject || source.commit_id}
                  </div>
                )}
              </div>
            ))}
            {trace && trace.sources.length === 0 && (
              <div className="text-xs text-slate-500 py-2">No cited sources.</div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-3">
          <GitPullRequestArrow className="w-4 h-4 text-rose-400" />
          Drift {drift ? `· since ${formatEpoch(drift.since)}` : ''}
        </h3>
        {drift ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-slate-400 mb-1.5">
                Spec drift · {drift.spec_drift.length} changed, undocumented
              </div>
              <div className="space-y-1 max-h-[240px] overflow-y-auto pr-1">
                {drift.spec_drift.slice(0, 40).map((item) => (
                  <div key={`${item.kind}-${item.id}`} className="text-[11px] font-mono truncate">
                    <span className="text-rose-300">{item.kind}</span>{' '}
                    <span className="text-slate-300">{item.path_or_name}</span>
                  </div>
                ))}
                {drift.spec_drift.length === 0 && (
                  <div className="text-xs text-slate-500">Nothing undocumented in the window.</div>
                )}
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-slate-400 mb-1.5">
                Doc drift · {drift.doc_drift.length} removed symbols still mentioned
              </div>
              <div className="space-y-1 max-h-[240px] overflow-y-auto pr-1">
                {drift.doc_drift.slice(0, 40).map((item) => (
                  <div key={`${item.kind}-${item.id}`} className="text-[11px] font-mono truncate">
                    <span className="text-amber-300">{item.path_or_name}</span>{' '}
                    <span className="text-slate-500">← {item.doc_paths.join(', ')}</span>
                  </div>
                ))}
                {drift.doc_drift.length === 0 && (
                  <div className="text-xs text-slate-500">No removed symbols are still cited.</div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-500">{loading ? 'Loading…' : 'No drift data.'}</div>
        )}
      </div>
    </div>
  );
}
