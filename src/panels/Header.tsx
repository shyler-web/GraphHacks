import { Network, Database, Terminal, BrainCircuit, Sliders } from 'lucide-react';
import { getFirstNodeId } from '../data';

export default function Header(props: any) {
  const { tenants, activeTenantKey, setActiveTenantKey, setSelectedNodeId, activeTab, setActiveTab, currentTenant } = props;

  return (
    <header className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 px-4 py-3">
      <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Network className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white">GraphSync</h1>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                FalkorDB Track 02 • Agent Memory & Coordination
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Solving Cognitive Debt via 17 Domain Lenses × 6 Builder Maturity Levels (L0 Vibe Coder → L5 Principal)
            </p>
          </div>
        </div>

        {/* Multi-Tenant Graph Switcher (Requirement #5) */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5">
            <Database className="w-4 h-4 text-pink-400" />
            <span className="text-xs text-slate-400">FalkorDB Tenant:</span>
            <select
              value={activeTenantKey}
              onChange={(e) => {
                setActiveTenantKey(e.target.value);
                setSelectedNodeId(getFirstNodeId(tenants, e.target.value));
              }}
              className="bg-transparent text-xs font-mono text-white focus:outline-none cursor-pointer"
            >
              {Object.entries(tenants).map(([key, t]: [string, any]) => (
                <option key={key} value={key} className="bg-slate-900 text-white">
                  {t.name} ({key})
                </option>
              ))}
            </select>
          </div>

          {/* View Switcher Tabs */}
          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveTab('cockpit')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5 ${
                activeTab === 'cockpit'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              2D Graph Cockpit
            </button>
            <button
              onClick={() => setActiveTab('memory')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5 ${
                activeTab === 'memory'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BrainCircuit className="w-3.5 h-3.5" />
              3-Tier Agent Memory ({currentTenant.episodes.length + currentTenant.playbooks.length})
            </button>
            <button
              onClick={() => setActiveTab('backend')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5 ${
                activeTab === 'backend'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              FalkorDB + Python Code
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
