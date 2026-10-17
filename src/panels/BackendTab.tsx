import { Server } from 'lucide-react';

export default function BackendTab(props: any) {
  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 max-w-4xl mx-auto space-y-4">
      <h2 className="text-lg font-bold text-white flex items-center gap-2">
        <Server className="w-5 h-5 text-indigo-400" />
        Run GraphSync Locally with FalkorDB Docker + FastAPI
      </h2>
      <p className="text-xs text-slate-300 leading-relaxed">
        The complete backend implementation (`docker-compose.yml`, `database.py`, `seed_graph.py`, `agents.py`, and `main.py`) has also been added to your <strong>Hackathon Modular Execution Plan</strong> document so you can copy-paste each module directly into your repository.
      </p>
      <div className="space-y-2">
        <div className="text-xs font-mono text-indigo-300">1. Start FalkorDB (Port 6379 + Browser UI on Port 3000):</div>
        <pre className="text-xs font-mono bg-slate-950 text-emerald-300 p-3 rounded-xl border border-slate-800 overflow-x-auto">
{`docker run -p 6379:6379 -p 3000:3000 -it --rm falkordb/falkordb:latest`}
        </pre>
      </div>
      <div className="space-y-2">
        <div className="text-xs font-mono text-indigo-300">2. Install Python Backend Dependencies & Seed the 17×6 Graph:</div>
        <pre className="text-xs font-mono bg-slate-950 text-cyan-300 p-3 rounded-xl border border-slate-800 overflow-x-auto">
{`pip install falkordb fastapi uvicorn pydantic litellm
python seed_graph.py
uvicorn main:app --reload --port 8000`}
        </pre>
      </div>
    </div>
  );
}
