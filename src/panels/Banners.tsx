import { CheckCircle2 } from 'lucide-react';

export default function Banners(props: any) {
  const { llmErrorBanner, setLlmErrorBanner, lastBuildBanner, setLastBuildBanner } = props;

  return (
<>
    {llmErrorBanner && (
      <div className="mb-3 px-4 py-2 rounded-xl bg-amber-950/70 border border-amber-500/40 flex items-center justify-between text-xs text-amber-200">
        <span>{llmErrorBanner}</span>
        <button
          onClick={() => setLlmErrorBanner(null)}
          className="text-amber-300 hover:text-white cursor-pointer"
        >
          ✕
        </button>
      </div>
    )}
    {lastBuildBanner && (
      <div className="mb-3 px-4 py-2.5 rounded-xl bg-indigo-950/70 border border-indigo-500/40 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-indigo-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong>{lastBuildBanner.usedGemini ? 'Gemini 3 Flash 4-Agent Synthesis' : '4-Agent Build'} Complete:</strong> Added{' '}
            <strong>{lastBuildBanner.nodeCount} linked nodes (L0→L5)</strong> for{' '}
            <span className="text-white font-semibold">“{lastBuildBanner.prompt}”</span> into FalkorDB!{' '}
            {lastBuildBanner.protectedByPlaybook ? (
              <span className="text-emerald-300 font-semibold">
                (Auto-protected by your learned :Playbook guardrail!)
              </span>
            ) : (
              <span className="text-rose-300 font-semibold">
                (L4 Senior Auditor raised a bubble-up alert on your new L0 node!)
              </span>
            )}
          </span>
        </div>
        <button
          onClick={() => setLastBuildBanner(null)}
          className="text-xs text-slate-400 hover:text-white cursor-pointer"
        >
          Dismiss ✕
        </button>
      </div>
    )}
    </>
  );
}
