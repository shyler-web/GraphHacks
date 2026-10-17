import { useCallback, useEffect, useMemo, useState } from 'react';
import { Crosshair, Network, RefreshCw } from 'lucide-react';
import {
  fetchTrack01BlastRadius,
  fetchTrack01Graph,
  type RepoGraphNode,
  type RepoGraphView,
  type Track01BlastRadius
} from '../data/remote';

/** Deterministic per-file hue so each source file gets its own colour. */
function fileHue(file: string): number {
  let h = 0;
  for (let i = 0; i < file.length; i++) h = (h * 31 + file.charCodeAt(i)) % 360;
  return h;
}

interface Placed {
  node: RepoGraphNode;
  x: number;
  y: number;
  hue: number;
}

/**
 * Repo graph (Track 01) rendered in the 2D cockpit — the loaded repo's OWN code
 * graph (`code:<repo>`): top-PageRank symbols grouped into columns by source
 * file, connected by CALLS edges. Click a node to run blast-radius on it.
 * Every pixel comes from FalkorDB; stop the graph and this errors (rule 3).
 */
export default function RepoGraphCanvas({ repo = 'graphhacks' }: { repo?: string }) {
  const [view, setView] = useState<RepoGraphView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [blast, setBlast] = useState<Track01BlastRadius | null>(null);
  const [blasting, setBlasting] = useState(false);
  const [limit, setLimit] = useState(40);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await fetchTrack01Graph(repo, limit);
      setView(next);
      setSelected(null);
      setBlast(null);
    } catch (err) {
      setError((err as Error).message || String(err));
    } finally {
      setLoading(false);
    }
  }, [repo, limit]);

  useEffect(() => {
    void load();
  }, [load]);

  const runBlast = useCallback(
    async (symbolId: string) => {
      setBlasting(true);
      try {
        setBlast(await fetchTrack01BlastRadius(symbolId, 2, repo));
      } catch (err) {
        setError((err as Error).message || String(err));
      } finally {
        setBlasting(false);
      }
    },
    [repo]
  );

  const { placed, width, height, files } = useMemo(() => {
    const byFile = new Map<string, RepoGraphNode[]>();
    for (const n of view?.nodes ?? []) {
      const f = n.file || '(external)';
      if (!byFile.has(f)) byFile.set(f, []);
      byFile.get(f)!.push(n);
    }
    const fileList = [...byFile.keys()].sort();
    const colW = 240;
    const rowH = 62;
    const padX = 130;
    const padY = 80;
    const out: Placed[] = [];
    let maxRows = 0;
    fileList.forEach((f, ci) => {
      const list = byFile.get(f)!.slice().sort((a, b) => b.score - a.score);
      maxRows = Math.max(maxRows, list.length);
      list.forEach((n, ri) => {
        out.push({ node: n, x: padX + ci * colW, y: padY + ri * rowH, hue: fileHue(f) });
      });
    });
    return {
      placed: out,
      width: padX * 2 + Math.max(fileList.length - 1, 0) * colW,
      height: padY + maxRows * rowH + 40,
      files: fileList
    };
  }, [view]);

  const byId = useMemo(() => new Map(placed.map((p) => [p.node.id, p])), [placed]);
  const affected = useMemo(
    () => new Set(blast?.hops.flatMap((h) => h.ids) ?? []),
    [blast]
  );
  const hotspotScore = view?.nodes[0]?.score ?? 0;
  const selectedNode = selected ? byId.get(selected)?.node ?? null : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
      <div className="lg:col-span-8 bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Network className="w-4 h-4 text-cyan-400" />
            Repo Graph
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
              code:{repo}
            </span>
          </h2>
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            {view && (
              <span className="font-mono">
                {view.counts.nodes} symbols · {view.counts.edges} calls · {view.elapsed_ms} ms
              </span>
            )}
            <label className="font-mono">top</label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-slate-200"
            >
              {[20, 40, 60, 80].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <button
              onClick={() => void load()}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              Reload
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-2 text-[11px] font-mono text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg px-2 py-1.5">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-auto rounded-xl bg-slate-950/60 border border-slate-800">
          {loading && !view ? (
            <div className="text-xs text-slate-500 p-6">Loading repo graph…</div>
          ) : view && view.nodes.length === 0 ? (
            <div className="text-xs text-slate-500 p-6">
              No code graph for <span className="font-mono">{repo}</span> — load a repo above.
            </div>
          ) : (
            <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="block">
              {/* CALLS edges */}
              {view?.edges.map((e, i) => {
                const a = byId.get(e.source);
                const b = byId.get(e.target);
                if (!a || !b) return null;
                const dim = selected && !(e.source === selected || e.target === selected);
                const midX = (a.x + b.x) / 2;
                const hot = affected.has(e.source) && affected.has(e.target);
                return (
                  <path
                    key={`e${i}`}
                    d={`M ${a.x + 26} ${a.y} C ${midX} ${a.y}, ${midX} ${b.y}, ${b.x - 26} ${b.y}`}
                    fill="none"
                    stroke={hot ? '#f59e0b' : '#334155'}
                    strokeWidth={hot ? 1.6 : 1}
                    opacity={dim ? 0.25 : 0.9}
                  />
                );
              })}
              {/* nodes */}
              {placed.map(({ node, x, y, hue }) => {
                const isHot = hotspotScore > 0 && node.score >= hotspotScore * 0.9;
                const isSel = node.id === selected;
                const isAff = affected.has(node.id);
                const r = 14 + Math.min(node.score * 900, 22);
                return (
                  <g
                    key={node.id}
                    transform={`translate(${x},${y})`}
                    className="cursor-pointer"
                    onClick={() => {
                      setSelected(node.id);
                      void runBlast(node.id);
                    }}
                  >
                    <circle
                      r={r}
                      fill={isSel ? '#e2e8f0' : `hsl(${hue} 65% ${isHot ? 62 : 48}%)`}
                      stroke={isAff ? '#f59e0b' : isSel ? '#22d3ee' : 'transparent'}
                      strokeWidth={isAff || isSel ? 2.5 : 0}
                      opacity={node.is_test ? 0.6 : 1}
                    />
                    <text
                      x={r + 6}
                      y={4}
                      className="fill-slate-200"
                      style={{ fontSize: 11, fontFamily: 'monospace' }}
                    >
                      {node.label}
                      {node.is_test ? ' ·test' : ''}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}
        </div>
        <div className="mt-2 text-[10px] font-mono text-slate-500 flex flex-wrap gap-3">
          <span>columns = source files ({files.length})</span>
          <span className="text-slate-400">node size = PageRank</span>
          <span className="text-amber-400">amber ring = blast-affected</span>
          <span>click a node → blast radius</span>
        </div>
      </div>

      {/* Side panel */}
      <div className="lg:col-span-4 flex flex-col gap-4">
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-2">
            <Crosshair className="w-4 h-4 text-amber-400" />
            Blast radius
          </h3>
          {selectedNode ? (
            <>
              <div className="text-xs font-semibold text-white truncate">{selectedNode.label}</div>
              <div className="text-[11px] font-mono text-slate-400 truncate mb-2">
                {selectedNode.file}
              </div>
              {blasting ? (
                <div className="text-[11px] text-slate-500">running…</div>
              ) : blast ? (
                <div className="space-y-1.5 text-[11px]">
                  <div className="text-slate-300">
                    <strong className="text-white">{blast.trace.row_count}</strong> affected
                    {blast.tests.length > 0 && (
                      <span className="text-slate-400"> · {blast.tests.length} tests</span>
                    )}
                  </div>
                  {blast.hops.map((h) => (
                    <div key={h.hop}>
                      <span className="font-mono text-amber-300">hop {h.hop}</span>
                      <div className="font-mono text-cyan-300 truncate">
                        {h.ids.slice(0, 5).join(', ')}
                        {h.ids.length > 5 ? ` …+${h.ids.length - 5}` : ''}
                      </div>
                    </div>
                  ))}
                  {blast.hops.length === 0 && (
                    <div className="text-slate-500">No CALLS-reachable symbols.</div>
                  )}
                </div>
              ) : null}
            </>
          ) : (
            <div className="text-[11px] text-slate-500">
              Click a node in the graph to see what transitively calls it.
            </div>
          )}
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
            Files ({files.length})
          </h3>
          <div className="space-y-1 max-h-[320px] overflow-y-auto pr-1">
            {files.map((f) => (
              <div key={f} className="text-[11px] font-mono text-slate-300 flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: `hsl(${fileHue(f)} 65% 55%)` }}
                />
                <span className="truncate">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
