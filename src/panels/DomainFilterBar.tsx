import { DOMAIN_LENSES } from '../graph/domainLenses';

export default function DomainFilterBar(props: any) {
  const { selectedDomain, setSelectedDomain, currentTenant } = props;

  return (
    <div className="bg-slate-950 border-b border-slate-800/60 px-4 py-2 overflow-x-auto">
      <div className="max-w-[1600px] mx-auto flex items-center gap-1.5 min-w-max">
        <button
          onClick={() => setSelectedDomain('ALL')}
          className={`px-2.5 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
            selectedDomain === 'ALL'
              ? 'bg-white text-slate-950 font-semibold'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          All 17 Domains ({currentTenant.nodes.length})
        </button>
        {DOMAIN_LENSES.map((lens) => {
          const count = currentTenant.nodes.filter((n) => n.domain === lens.id).length;
          return (
            <button
              key={lens.id}
              onClick={() => setSelectedDomain(lens.id)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition flex items-center gap-1.5 cursor-pointer ${
                selectedDomain === lens.id
                  ? 'bg-indigo-600 text-white font-semibold'
                  : count > 0
                  ? 'bg-slate-900 text-slate-200 hover:bg-slate-800 border border-slate-800'
                  : 'bg-slate-950 text-slate-500 hover:text-slate-300 border border-slate-900'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: lens.color }}
              />
              {lens.label}
              {count > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
