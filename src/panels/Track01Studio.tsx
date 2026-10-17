import { useCallback, useEffect, useState } from 'react';
import { Crosshair, GitBranch, Play, RefreshCw, Table2 } from 'lucide-react';
import {
  fetchTrack01BlastRadius,
  fetchTrack01Hotspots,
  syncTrack01,
  type Track01BlastRadius,
  type Track01Hotspot
} from '../data/remote';

/**
 * Track 01 studio — drives the real `code:graphhacks` action engine over the
 * API (`/api/track1/*`). Hotspots (PageRank) and a blast-radius run come from
 * FalkorDB, and the panel renders the DecisionTrace (Cypher + ms) verbatim.
 * Nothing here is derived from the tenant graph (F4 superseded): stopping
 * FalkorDB breaks this panel (rule 3).
 */
export default function Track01Studio(_props: any) {
  const [hotspots, setHotspots] = useState<Track01Hotspot[]>([]);
  const [symbol, setSymbol] = useState('');
  const [hops, setHops] = useState(2);
  const [blast, setBlast] = useState<Track01BlastRadius | null>(null);
  const [loading, setLoading] = useState(true);
  const [blasting, setBlasting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncNote, setSyncNote] = useState<string | null>(null);

  const runBlast = useCallback(async (target: string, depth: number) => {
    if (!target) return;
    setBlasting(true);
    setError(null);
    try {
      setBlast(await fetchTrack01BlastRadius(target, depth));
    } catch (err) {
      setBlast(null);
      setError((err as Error).message || String(err));
    } finally {
      setBlasting(false);
    }
  }, []);

  const loadHotspots = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchTrack01Hotspots(8);
      setHotspots(rows);
      const first = rows[0]?.id ?? '';
      setSymbol(first);
      if (first) await runBlast(first, hops);
    } catch (err) {
      setError((err as Error).message || String(err));
    } finally {
      setLoading(false);
    }
  }, [runBlast, hops]);

  useEffect(() => {
    void loadHotspots();
    // Load once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    setSyncNote(null);
    try {
      const stats = await syncTrack01();
      setSyncNote(
        `synced · files=${stats.files} symbols=${stats.symbols} tests=${stats.tests} ` +
          `calls=${stats.edges.CALLS ?? 0} nodes=${stats.nodes_total} (${stats.elapsed_ms}ms)`
      );
      await loadHotspots();
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
              <Crosshair className="w-4 h-4 text-cyan-400" />
              Track 01 · Connected-Data Action Engine
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                code:graphhacks
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-1.5">
              PageRank hotspots and a hop-bucketed blast radius over the real AST graph,
              each with the exact Cypher + query time it ran.
            </p>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing…' : 'Sync data'}
          </button>
        </div>
        {syncNote && (
          <div className="mt-2 text-[11px] font-mono text-cyan-300">{syncNote}</div>
        )}
        {error && (
          <div className="mt-2 text-[11px] font-mono text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg px-2 py-1.5">
            {error}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-3">
            <Table2 className="w-4 h-4 text-cyan-400" />
            Hotspots {loading ? '· loading…' : `(${hotspots.length})`}
            <span className="text-[10px] normal-case font-mono text-slate-500">
              algo.pageRank('Symbol','CALLS')
            </span>
          </h3>
          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {hotspots.map((spot) => (
              <div
                key={spot.id}
                onClick={() => {
                  setSymbol(spot.id);
                  void runBlast(spot.id, hops);
                }}
                className={`p-2.5 rounded-xl bg-slate-950 border cursor-pointer transition ${
                  symbol === spot.id
                    ? 'border-cyan-500/60'
                    : 'border-slate-800 hover:border-cyan-500/50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-white truncate">
                    {spot.label || spot.id}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 shrink-0">
                    {spot.score.toFixed(6)}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-400 mt-0.5 truncate">
                  {spot.file}
                </div>
                <div className="text-[10px] font-mono text-slate-600 mt-0.5 truncate">
                  {spot.id}
                </div>
              </div>
            ))}
            {!loading && hotspots.length === 0 && !error && (
              <div className="text-xs text-slate-500 py-4 text-center">
                No hotspots — click “Sync data” to load the AST graph.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-3">
              <Crosshair className="w-4 h-4 text-amber-400" />
              Blast radius
            </h3>
            <div className="text-[10px] font-mono text-slate-500 mb-1 truncate">
              {symbol || 'select a symbol'}
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-slate-400">hops</label>
              <input
                type="number"
                min={1}
                max={10}
                value={hops}
                onChange={(e) => setHops(Number(e.target.value))}
                className="w-16 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs font-mono text-white focus:outline-none"
              />
              <button
                onClick={() => void runBlast(symbol, hops)}
                disabled={!symbol || blasting}
                className="flex-1 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2"
              >
                <Play className="w-3.5 h-3.5" />
                {blasting ? 'Running…' : 'Run'}
              </button>
            </div>

            {blast && (
              <div className="mt-3 space-y-2">
                <div className="text-xs text-slate-300">
                  <strong className="text-white">
                    {blast.trace.row_count}
                  </strong>{' '}
                  affected symbols
                  {blast.tests.length > 0 && (
                    <span className="text-slate-400"> · {blast.tests.length} tests</span>
                  )}
                </div>
                <div className="space-y-1 max-h-[180px] overflow-y-auto">
                  {blast.hops.map((bucket) => (
                    <div key={bucket.hop} className="text-[11px]">
                      <span className="font-mono text-amber-300">hop {bucket.hop}</span>
                      <span className="text-slate-500"> · {bucket.ids.length}</span>
                      <div className="font-mono text-cyan-300 truncate">
                        {bucket.ids.slice(0, 6).join(', ')}
                        {bucket.ids.length > 6 ? ` …+${bucket.ids.length - 6}` : ''}
                      </div>
                    </div>
                  ))}
                  {blast.hops.length === 0 && (
                    <div className="text-[11px] text-slate-500">
                      No CALLS-reachable symbols within {hops} hops.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {blast && (
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Decision trace
              </h3>
              <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2 mb-2">
                <span className="text-emerald-300">{blast.trace.graph}</span>
                <span className="text-amber-300">{blast.trace.elapsed_ms} ms</span>
                <span>{blast.trace.edges.length} edges</span>
              </div>
              <pre className="text-[10px] font-mono text-slate-300 bg-slate-950 border border-slate-800 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap max-h-[220px]">
                {blast.trace.cypher}
              </pre>
            </div>
          )}
        </div>
      </div>

      {blast && blast.trace.edges.length > 0 && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-3">
            <GitBranch className="w-4 h-4 text-indigo-400" />
            Traversed CALLS edges ({blast.trace.edges.length})
          </h3>
          <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
            {blast.trace.edges.map((edge, i) => (
              <div
                key={`${edge.source}-${edge.target}-${i}`}
                className="text-[11px] font-mono text-slate-300 flex items-center gap-2"
              >
                <span className="text-slate-400 truncate">{edge.source}</span>
                <span className="text-amber-400 shrink-0">-[{edge.type}]→</span>
                <span className="text-slate-200 truncate">{edge.target}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
