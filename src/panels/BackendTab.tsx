import { Server } from 'lucide-react';

export default function BackendTab(_props: any) {
  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 max-w-4xl mx-auto space-y-4">
      <h2 className="text-lg font-bold text-white flex items-center gap-2">
        <Server className="w-5 h-5 text-indigo-400" />
        Run GraphSync Locally with FalkorDB Docker + FastAPI
      </h2>
      <p className="text-xs text-slate-300 leading-relaxed">
        The real backend lives in <code className="text-indigo-300">backend/</code>{' '}
        (FastAPI + <code className="text-indigo-300">falkordb</code>, managed with{' '}
        <code className="text-indigo-300">uv</code>). The cockpit reads and writes
        through it — there is no seed fallback (rule 3).
      </p>
      <div className="space-y-2">
        <div className="text-xs font-mono text-indigo-300">
          1. Start FalkorDB (Redis on 6379, Browser UI on 3000):
        </div>
        <pre className="text-xs font-mono bg-slate-950 text-emerald-300 p-3 rounded-xl border border-slate-800 overflow-x-auto">
{`docker run -p 6379:6379 -p 3000:3000 -it --rm falkordb/falkordb:latest`}
        </pre>
      </div>
      <div className="space-y-2">
        <div className="text-xs font-mono text-indigo-300">
          2. Seed the cockpit projection (idempotent):
        </div>
        <pre className="text-xs font-mono bg-slate-950 text-cyan-300 p-3 rounded-xl border border-slate-800 overflow-x-auto">
{`cd backend
uv sync
uv run python scripts/seed_cockpit.py`}
        </pre>
      </div>
      <div className="space-y-2">
        <div className="text-xs font-mono text-indigo-300">
          3. Run the FastAPI backend (the Vite dev server proxies /api → :8000):
        </div>
        <pre className="text-xs font-mono bg-slate-950 text-cyan-300 p-3 rounded-xl border border-slate-800 overflow-x-auto">
{`cd backend
uv run uvicorn app.main:app --reload --port 8000`}
        </pre>
      </div>
      <div className="space-y-2">
        <div className="text-xs font-mono text-indigo-300">
          4. Or run the full stack (FalkorDB + backend + cockpit on :5173):
        </div>
        <pre className="text-xs font-mono bg-slate-950 text-emerald-300 p-3 rounded-xl border border-slate-800 overflow-x-auto">
{`docker compose up --build`}
        </pre>
      </div>
    </div>
  );
}
