import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';

/** Full-screen state shown while the real graphs load from FalkorDB. */
export function LoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center gap-4 font-sans">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
        <Loader2 className="w-6 h-6 text-white animate-spin" />
      </div>
      <div className="text-center">
        <div className="text-sm font-semibold text-white">Reading tenant graphs from FalkorDB…</div>
        <div className="text-xs text-slate-400 mt-1 font-mono">
          GET /api/tenants → /api/graph/nodes
        </div>
      </div>
    </div>
  );
}

/**
 * Full-screen error state. Shown when the backend/FalkorDB is unreachable —
 * the cockpit must NOT fall back to seed data (rule 3).
 */
export function ErrorScreen({
  message,
  onRetry
}: {
  message: string | null;
  onRetry: () => void;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center gap-5 px-6 font-sans">
      <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/40 flex items-center justify-center">
        <AlertTriangle className="w-7 h-7 text-rose-400" />
      </div>
      <div className="text-center max-w-lg">
        <h1 className="text-lg font-bold text-white">FalkorDB is unavailable</h1>
        <p className="text-sm text-slate-400 mt-2">
          The cockpit reads its graphs from FalkorDB through the Python backend. Start
          FalkorDB (<code className="text-slate-200">docker start falkordb</code>) and retry.
        </p>
        <pre className="mt-3 text-xs font-mono text-rose-300 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 overflow-x-auto whitespace-pre-wrap">
          {message ?? 'Unknown error'}
        </pre>
      </div>
      <button
        onClick={onRetry}
        className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-semibold flex items-center gap-2 shadow cursor-pointer"
      >
        <RefreshCw className="w-4 h-4" />
        Retry
      </button>
    </div>
  );
}
