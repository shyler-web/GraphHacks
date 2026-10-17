import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { loadTenants, DEFAULT_TENANT_KEY } from './data';
import type { TenantMap } from './data';
import { PERSONA_LEVELS } from './graph/personaLevels';
import { getVisibleNodes, getBubbleUpRisks, getSelectedNode } from './graph/selectors';
import { buildLiveCypherQuery } from './graph/cypher';
import type { DeclutterMode } from './graph/layout';
import {
  moveNode,
  declutterTenant,
  applySeniorFix,
  addFeatureStack,
  applySeniorFixAndPersist,
  addFeatureStackAndPersist
} from './data/mutations';
import { callGeminiWithBackoff } from './orchestration/gemini';
import { buildCoachPayload, buildFeaturePayload } from './orchestration/prompts';
import {
  fetchRepos,
  loadRepo,
  fetchResearch,
  type RepoSummary
} from './data/remote';
import Header from './panels/Header';
import ControlPanel from './panels/ControlPanel';
import DomainFilterBar from './panels/DomainFilterBar';
import Banners from './panels/Banners';
import GraphCanvas from './panels/GraphCanvas';
import NodeInspector from './panels/NodeInspector';
import HandoffLedger from './panels/HandoffLedger';
import MemoryTiers from './panels/MemoryTiers';
import BackendTab from './panels/BackendTab';
import RepoGraphCanvas from './panels/RepoGraphCanvas';
import Track01Studio from './panels/Track01Studio';
import Track03Brain from './panels/Track03Brain';
import { LoadingScreen, ErrorScreen } from './panels/DataStates';

type LoadState = 'loading' | 'ready' | 'error';

export default function App() {
  const [activeTenantKey, setActiveTenantKey] = useState(DEFAULT_TENANT_KEY);
  const [tenants, setTenants] = useState<TenantMap>({});
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [maturityLevel, setMaturityLevel] = useState(0); // Default L0 Vibe Coder!
  const [selectedDomain, setSelectedDomain] = useState('ALL');
  const [selectedNodeId, setSelectedNodeId] = useState('node_vibe_avatar_l0');
  const [activeTab, setActiveTab] = useState('cockpit'); // 'cockpit' | 'memory' | 'backend'
  const [cockpitLens, setCockpitLens] = useState<'memory' | 'repo'>('memory');
  const [promptInput, setPromptInput] = useState('');
  const [isRunningAgents, setIsRunningAgents] = useState(false);
  const [agentStepText, setAgentStepText] = useState('');
  const [lastBuildBanner, setLastBuildBanner] = useState(null);
  const [copiedCypher, setCopiedCypher] = useState(false);

  // Live mode goes through the server-side proxy (`/api/gemini/generate`); no
  // API key is ever shipped to the browser bundle.
  const [useLiveGemini, setUseLiveGemini] = useState(false);
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachOutputs, setCoachOutputs] = useState({});
  const [groundingLoading, setGroundingLoading] = useState(false);
  const [groundingOutputs, setGroundingOutputs] = useState({});
  const [llmErrorBanner, setLlmErrorBanner] = useState(null);

  // Active repo for Track 01/03 (D10). Defaults to the bundled `graphhacks`
  // demo; pasting a GitHub URL loads a new one and switches here.
  const [activeRepoId, setActiveRepoId] = useState('graphhacks');
  const [repos, setRepos] = useState<RepoSummary[]>([]);
  const [repoLoading, setRepoLoading] = useState(false);
  const [repoError, setRepoError] = useState<string | null>(null);
  const [repoNote, setRepoNote] = useState<string | null>(null);

  const svgRef = React.useRef(null);
  const [draggingNodeId, setDraggingNodeId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [viewTransform, setViewTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [compactNodes, setCompactNodes] = useState(false);

  const currentTenant = tenants[activeTenantKey];

  // Load the real tenant graphs from FalkorDB (via the FastAPI backend). No
  // fallback to seed data: a failure sets `loadState` to `error` (rule 3).
  const load = useCallback(async () => {
    setLoadState('loading');
    setLoadError(null);
    try {
      const map = await loadTenants();
      const keys = Object.keys(map);
      if (keys.length === 0) {
        throw new Error('FalkorDB returned no tenants (is the cockpit seeded?)');
      }
      setTenants(map);
      const nextKey = map[activeTenantKey] ? activeTenantKey : keys[0];
      setActiveTenantKey(nextKey);
      setSelectedNodeId(map[nextKey]?.nodes[0]?.id ?? '');
      setLoadState('ready');
    } catch (err) {
      setLoadError((err as Error).message || String(err));
      setLoadState('error');
    }
    // Run once on mount; retry calls `load` explicitly with the current key.
  }, [activeTenantKey]);

  useEffect(() => {
    void load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load the repo registry (best-effort: the demo repo `graphhacks` is always
  // the default, so a missing `/api/repos` route must not block the cockpit).
  useEffect(() => {
    fetchRepos()
      .then(setRepos)
      .catch((err) => setRepoError((err as Error).message || String(err)));
  }, []);

  // Paste-a-GitHub-URL flow: load the repo, then re-read the registry and
  // switch the active repo to the returned slug.
  const handleLoadRepo = useCallback(async (url: string) => {
    setRepoLoading(true);
    setRepoError(null);
    setRepoNote(null);
    try {
      const result = await loadRepo(url);
      setActiveRepoId(result.repo_id);
      setRepoNote(
        `Loaded ${result.name}: ${result.files} files · ${result.symbols} symbols · ` +
          `${result.commits} commits · ${result.owners} owner(s) → now in Track 01/03`
      );
      setActiveTab('track01');
      const list = await fetchRepos();
      setRepos(list);
    } catch (err) {
      setRepoError((err as Error).message || String(err));
    } finally {
      setRepoLoading(false);
    }
  }, []);

  // Convert screen mouse/touch coordinates to SVG canvas coordinates
  const getSvgCoords = (clientX, clientY) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const viewBoxWidth = 1000;
    const viewBoxHeight = 520;
    const rawX = ((clientX - rect.left) / rect.width) * viewBoxWidth;
    const rawY = ((clientY - rect.top) / rect.height) * viewBoxHeight;
    return {
      x: (rawX - viewTransform.x) / viewTransform.scale,
      y: (rawY - viewTransform.y) / viewTransform.scale,
      rawX,
      rawY
    };
  };

  const handleNodePointerDown = (e, node) => {
    e.stopPropagation();
    setSelectedNodeId(node.id);
    const pt = getSvgCoords(e.clientX, e.clientY);
    setDraggingNodeId(node.id);
    setDragOffset({ x: pt.x - node.x, y: pt.y - node.y });
  };

  const handleCanvasPointerDown = (e) => {
    if (draggingNodeId) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const rawX = ((e.clientX - rect.left) / rect.width) * 1000;
    const rawY = ((e.clientY - rect.top) / rect.height) * 520;
    setIsPanning(true);
    setPanStart({ x: rawX - viewTransform.x, y: rawY - viewTransform.y });
  };

  const handleCanvasPointerMove = (e) => {
    if (draggingNodeId) {
      const pt = getSvgCoords(e.clientX, e.clientY);
      const nextX = Math.round(pt.x - dragOffset.x);
      const nextY = Math.round(pt.y - dragOffset.y);
      setTenants((prev) => moveNode(prev, activeTenantKey, draggingNodeId, nextX, nextY));
    } else if (isPanning && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const rawX = ((e.clientX - rect.left) / rect.width) * 1000;
      const rawY = ((e.clientY - rect.top) / rect.height) * 520;
      setViewTransform((prev) => ({
        ...prev,
        x: rawX - panStart.x,
        y: rawY - panStart.y
      }));
    }
  };

  const handleCanvasPointerUp = () => {
    setDraggingNodeId(null);
    setIsPanning(false);
  };

  const handleAutoDeclutter = (mode: DeclutterMode = 'hierarchy') => {
    setTenants((prev) => declutterTenant(prev, activeTenantKey, mode));

    // Reset camera so all neatly organized nodes are framed
    if (mode !== 'repel') {
      setViewTransform({ x: 0, y: 0, scale: 1 });
    }
  };

  // Filter nodes based on the Builder Maturity Dial (L0 -> L5) and Domain filter
  const visibleNodes = useMemo(
    () => (currentTenant ? getVisibleNodes(currentTenant, maturityLevel, selectedDomain) : []),
    [currentTenant, maturityLevel, selectedDomain]
  );

  // Identify any L4 CRITICAL risks that endanger L0 nodes (Bubble-Up Alerting!)
  const bubbleUpRisks = useMemo(
    () => (currentTenant ? getBubbleUpRisks(currentTenant) : {}),
    [currentTenant]
  );

  const selectedNode = useMemo(
    () => (currentTenant ? getSelectedNode(currentTenant, selectedNodeId, visibleNodes) : undefined),
    [currentTenant, selectedNodeId, visibleNodes]
  );

  // Dynamic Cypher query preview reflecting current UI state
  const liveCypherQuery = useMemo(
    () => buildLiveCypherQuery(activeTenantKey, maturityLevel, selectedDomain),
    [activeTenantKey, maturityLevel, selectedDomain]
  );


  const handleApplySeniorFix = async (riskNode, targetL0Node) => {
    // Optimistic paint, then replace with a fresh FalkorDB read on success. If
    // the write fails the banner says this is a local preview, not persistence.
    setTenants(applySeniorFix(tenants, activeTenantKey, riskNode, targetL0Node));
    try {
      const fresh = await applySeniorFixAndPersist(
        tenants,
        activeTenantKey,
        riskNode,
        targetL0Node
      );
      setTenants(fresh);
    } catch (err) {
      setLlmErrorBanner(
        `Senior fix was not persisted to FalkorDB (${(err as Error).message}); showing a local preview only.`
      );
    }
  };

  const handleAskGeminiCoach = async (node) => {
    if (!node || coachLoading) return;
    setCoachLoading(true);
    setLlmErrorBanner(null);

    const persona = PERSONA_LEVELS[maturityLevel];
    const playbooksText = currentTenant.playbooks.map((p) => p.rule_name).join('; ') || 'None yet';

    try {
      const result = await callGeminiWithBackoff(
        buildCoachPayload(maturityLevel, persona, playbooksText, node)
      );

      const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        const parsed = JSON.parse(rawText);
        setCoachOutputs((prev) => ({
          ...prev,
          [`${node.id}_L${maturityLevel}`]: parsed
        }));
      }
    } catch (err) {
      setLlmErrorBanner('Nebius Learning Coach encountered a temporary issue. Showing cached graph guidance.');
    } finally {
      setCoachLoading(false);
    }
  };

  const handleGroundedResearch = async (node) => {
    if (!node || groundingLoading) return;
    setGroundingLoading(true);
    setLlmErrorBanner(null);

    try {
      const result = await fetchResearch(`${node.title} ${node.summary}`);

      const sources = (result.sources ?? [])
        .map((s) => ({ uri: s.uri, title: s.title }))
        .filter((s) => s.uri);
      const text =
        (result.sources ?? [])
          .map((s) => `${s.title}${s.title && s.content ? ': ' : ''}${s.content}`.trim())
          .filter(Boolean)
          .join('\n\n') || 'No prior-art sources returned.';

      setGroundingOutputs((prev) => ({
        ...prev,
        [node.id]: { text, sources }
      }));
    } catch (err) {
      setLlmErrorBanner('Tavily prior-art search failed or timed out. Please try again.');
    } finally {
      setGroundingLoading(false);
    }
  };

  const handleRunMultiAgentPrompt = async (customPrompt) => {
    const rawPrompt = typeof customPrompt === 'string' ? customPrompt : promptInput;
    const textToRun = (rawPrompt && rawPrompt.trim()) || 'Add AI Voice Cloning Preview API using ElevenLabs';
    if (isRunningAgents) return;

    const targetTenantKey = activeTenantKey;
    const ts = Date.now();
    const newL0Id = `node_vibe_${ts}`;
    const newL1Id = `node_cost_${ts}`;
    const newL2Id = `node_wire_${ts}`;
    const newL3Id = `node_code_${ts}`;
    const newL4Id = `node_audit_${ts}`;
    const newL5Id = `node_math_${ts}`;

    setIsRunningAgents(true);
    setLlmErrorBanner(null);
    setSelectedDomain('ALL');
    setActiveTab('cockpit');

    const tenantSnapshot = tenants[targetTenantKey];
    const hasRateLimitPlaybook = tenantSnapshot.playbooks.some((p) =>
      p.rule_name.toLowerCase().includes('rate-limit')
    );

    let aiGeneratedSpec = null;

    if (useLiveGemini) {
      try {
        setAgentStepText(`Nebius: Reading ${tenantSnapshot.playbooks.length} :Playbook rules & ${tenantSnapshot.episodes.length} :Episodes from FalkorDB...`);

        setAgentStepText('Nebius: Synthesizing L0->L5 Semantic Nodes & Cypher contracts...');
        const result = await callGeminiWithBackoff(buildFeaturePayload(tenantSnapshot, textToRun, hasRateLimitPlaybook));
        const jsonText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (jsonText) {
          aiGeneratedSpec = JSON.parse(jsonText);
        }
      } catch (e) {
        setLlmErrorBanner('LLM call fell back to deterministic graph synthesizer.');
      }
    } else {
      setAgentStepText(`Agent 1–4: Simulating multi-agent graph build for "${textToRun}"...`);
      await new Promise((r) => setTimeout(r, 800));
    }

    // Determine the L0 domain from prompt keywords (fallback when the LLM is off).
    const lower = textToRun.toLowerCase();
    const domainSignals: [string, string[]][] = [
      ['Security', ['auth', 'login', 'token', 'jwt', 'oauth', 'password', 'permission', 'rbac', 'encrypt', 'csrf', 'xss', 'vulnerab', 'secret']],
      ['ExternalAPIs', ['stripe', 'payment', 'pay', 'checkout', 'billing', 'webhook', 'elevenlabs', 'openai', 'twilio', 'sendgrid', 'integration', 'sdk', 'third-party']],
      ['Database', ['db', 'database', 'graph', 'cypher', 'falkordb', 'postgres', 'sql', 'query', 'index', 'schema', 'migration', 'cache', 'redis']],
      ['InfraDevOps', ['deploy', 'docker', 'kubernetes', 'k8s', 'ci/cd', 'pipeline', 'infra', 'terraform', 'aws', 'monitoring', 'scaling', 'load balanc']],
      ['TestingObservability', ['test', 'spec', 'lint', 'observability', 'logging', 'trace', 'metric', 'coverage']],
      ['Frontend', ['ui', 'frontend', 'button', 'component', 'page', 'layout', 'css', 'tailwind', 'react', 'form', 'dashboard', 'canvas']],
      ['Backend', ['backend', 'endpoint', 'route', 'server', 'handler', 'service', 'websocket', 'queue', 'worker', 'job']],
      ['Mathematics', ['math', 'complexity', 'big-o', 'algorithm', 'graphblas', 'probability', 'queueing', 'linear algebra']],
      ['Research', ['research', 'paper', 'benchmark', 'prior art', 'survey']],
      ['BusinessCost', ['cost', 'pricing', 'subscription', 'revenue', 'margin', 'quota', 'business', 'plan']],
      ['AIModelsPrompts', ['ai', 'llm', 'model', 'prompt', 'embedding', 'rag', 'voice', 'avatar', 'image', 'generat', 'agent', 'gpt', 'claude', 'chat']]
    ];
    let detectedDomain = 'AIModelsPrompts';
    for (const [domain, keywords] of domainSignals) {
      if (keywords.some((k) => lower.includes(k))) {
        detectedDomain = domain;
        break;
      }
    }

    const stackInput = {
      targetTenantKey,
      ts,
      textToRun,
      detectedDomain,
      hasRateLimitPlaybook,
      aiGeneratedSpec,
      newL0Id,
      newL1Id,
      newL2Id,
      newL3Id,
      newL4Id,
      newL5Id
    };

    try {
      // Write the six ConceptNodes + edges, the Episode (:Turn) and the Handoff
      // to FalkorDB, then use the reloaded projection as the source of truth.
      const result = await addFeatureStackAndPersist(tenants, stackInput);
      setTenants(result.tenants);
      setLastBuildBanner(result.banner);
    } catch (err) {
      const local = addFeatureStack(tenants, stackInput);
      setTenants(local.tenants);
      setLastBuildBanner({ ...local.banner, persisted: false });
      setLlmErrorBanner(
        `Graph write failed (${(err as Error).message}); showing a local preview only.`
      );
    }

    setSelectedNodeId(newL0Id);
    setPromptInput('');
    setIsRunningAgents(false);
    setAgentStepText('');
  };

  const currentPersonaObj = PERSONA_LEVELS[maturityLevel];

  // Gate every panel on a real backend read (F3 / rule 3). No seed fallback.
  if (loadState === 'loading') {
    return <LoadingScreen />;
  }
  if (loadState === 'error') {
    return (
      <ErrorScreen
        message={loadError}
        onRetry={() => {
          void load();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {}
      <Header
        tenants={tenants}
        activeTenantKey={activeTenantKey}
        setActiveTenantKey={setActiveTenantKey}
        setSelectedNodeId={setSelectedNodeId}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentTenant={currentTenant}
      />

      {}
      <ControlPanel
        visibleNodes={visibleNodes}
        currentTenant={currentTenant}
        maturityLevel={maturityLevel}
        setMaturityLevel={setMaturityLevel}
        promptInput={promptInput}
        setPromptInput={setPromptInput}
        useLiveGemini={useLiveGemini}
        setUseLiveGemini={setUseLiveGemini}
        isRunningAgents={isRunningAgents}
        agentStepText={agentStepText}
        handleRunMultiAgentPrompt={handleRunMultiAgentPrompt}
        tenants={tenants}
        activeTenantKey={activeTenantKey}
        setActiveTenantKey={setActiveTenantKey}
        setSelectedNodeId={setSelectedNodeId}
        repos={repos}
        activeRepoId={activeRepoId}
        setActiveRepoId={setActiveRepoId}
        repoLoading={repoLoading}
        repoError={repoError}
        repoNote={repoNote}
        onLoadRepo={handleLoadRepo}
      />

      {/* 17 DOMAIN LENS FILTER BAR */}
      <DomainFilterBar
        selectedDomain={selectedDomain}
        setSelectedDomain={setSelectedDomain}
        currentTenant={currentTenant}
      />

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4">
        <Banners
          llmErrorBanner={llmErrorBanner}
          setLlmErrorBanner={setLlmErrorBanner}
          lastBuildBanner={lastBuildBanner}
          setLastBuildBanner={setLastBuildBanner}
        />
        {activeTab === 'cockpit' && (
          <>
            <div className="mb-3 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-400">Cockpit lens:</span>
              <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button
                  onClick={() => setCockpitLens('memory')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                    cockpitLens === 'memory' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Agent Memory (Track 02)
                </button>
                <button
                  onClick={() => setCockpitLens('repo')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                    cockpitLens === 'repo' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Repo Graph (code:{activeRepoId})
                </button>
              </div>
            </div>
            {cockpitLens === 'repo' ? (
              <RepoGraphCanvas repo={activeRepoId} />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
            {/* Center-Left Interactive 2D FalkorDB Graph Canvas (7 cols) */}
            <GraphCanvas
              currentTenant={currentTenant}
              visibleNodes={visibleNodes}
              selectedNode={selectedNode}
              bubbleUpRisks={bubbleUpRisks}
              maturityLevel={maturityLevel}
              currentPersonaObj={currentPersonaObj}
              compactNodes={compactNodes}
              setCompactNodes={setCompactNodes}
              handleAutoDeclutter={handleAutoDeclutter}
              viewTransform={viewTransform}
              setViewTransform={setViewTransform}
              svgRef={svgRef}
              handleCanvasPointerDown={handleCanvasPointerDown}
              handleCanvasPointerMove={handleCanvasPointerMove}
              handleCanvasPointerUp={handleCanvasPointerUp}
              draggingNodeId={draggingNodeId}
              isPanning={isPanning}
              handleNodePointerDown={handleNodePointerDown}
              liveCypherQuery={liveCypherQuery}
              copiedCypher={copiedCypher}
              setCopiedCypher={setCopiedCypher}
            />

            {/* Right Sidebar: Node Inspector + Bubble-Up Guardian + Multi-Agent Handoffs (5 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              {/* Selected Node Inspector */}
              <NodeInspector
                selectedNode={selectedNode}
                maturityLevel={maturityLevel}
                setMaturityLevel={setMaturityLevel}
                coachLoading={coachLoading}
                handleAskGeminiCoach={handleAskGeminiCoach}
                groundingLoading={groundingLoading}
                handleGroundedResearch={handleGroundedResearch}
                coachOutputs={coachOutputs}
                currentPersonaObj={currentPersonaObj}
                groundingOutputs={groundingOutputs}
                bubbleUpRisks={bubbleUpRisks}
                handleApplySeniorFix={handleApplySeniorFix}
                setSelectedNodeId={setSelectedNodeId}
              />

              {/* Live 4-Agent Shared Graph Coordination Ledger */}
              <HandoffLedger
                currentTenant={currentTenant}
                setActiveTab={setActiveTab}
              />
            </div>
          </div>
            )}
          </>
        )}

        {}
        {activeTab === 'memory' && (
          <MemoryTiers
            currentTenant={currentTenant}
            maturityLevel={maturityLevel}
            setMaturityLevel={setMaturityLevel}
            setSelectedNodeId={setSelectedNodeId}
            setActiveTab={setActiveTab}
          />
        )}

        {/* Track 01 — read-only action studio over the real tenant graph (F4) */}
        {activeTab === 'track01' && (
          <Track01Studio
            repo={activeRepoId}
            currentTenant={currentTenant}
            setSelectedNodeId={setSelectedNodeId}
            setActiveTab={setActiveTab}
          />
        )}

        {/* Track 03 — read-only company brain over the real tenant graph (F4) */}
        {activeTab === 'track03' && (
          <Track03Brain
            repo={activeRepoId}
            currentTenant={currentTenant}
            setSelectedNodeId={setSelectedNodeId}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'backend' && (
          <BackendTab />
        )}
      </main>
    </div>
  );
}