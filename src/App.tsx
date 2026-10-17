import React, { useState, useMemo } from 'react';
import { getInitialTenants, DEFAULT_TENANT_KEY } from './data';
import { PERSONA_LEVELS } from './graph/personaLevels';
import { getVisibleNodes, getBubbleUpRisks, getSelectedNode } from './graph/selectors';
import { buildLiveCypherQuery } from './graph/cypher';
import type { DeclutterMode } from './graph/layout';
import { moveNode, declutterTenant, applySeniorFix, addFeatureStack } from './data/mutations';
import { callGeminiWithBackoff } from './orchestration/gemini';
import { buildCoachPayload, buildResearchPayload, buildFeaturePayload } from './orchestration/prompts';
import Header from './panels/Header';
import ControlPanel from './panels/ControlPanel';
import DomainFilterBar from './panels/DomainFilterBar';
import Banners from './panels/Banners';
import GraphCanvas from './panels/GraphCanvas';
import NodeInspector from './panels/NodeInspector';
import HandoffLedger from './panels/HandoffLedger';
import MemoryTiers from './panels/MemoryTiers';
import BackendTab from './panels/BackendTab';

export default function App() {
  const [activeTenantKey, setActiveTenantKey] = useState(DEFAULT_TENANT_KEY);
  const [tenants, setTenants] = useState(getInitialTenants);
  const [maturityLevel, setMaturityLevel] = useState(0); // Default L0 Vibe Coder!
  const [selectedDomain, setSelectedDomain] = useState('ALL');
  const [selectedNodeId, setSelectedNodeId] = useState('node_vibe_avatar_l0');
  const [activeTab, setActiveTab] = useState('cockpit'); // 'cockpit' | 'memory' | 'backend'
  const [promptInput, setPromptInput] = useState('');
  const [isRunningAgents, setIsRunningAgents] = useState(false);
  const [agentStepText, setAgentStepText] = useState('');
  const [lastBuildBanner, setLastBuildBanner] = useState(null);
  const [copiedCypher, setCopiedCypher] = useState(false);

  const [useLiveGemini, setUseLiveGemini] = useState(true);
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachOutputs, setCoachOutputs] = useState({});
  const [groundingLoading, setGroundingLoading] = useState(false);
  const [groundingOutputs, setGroundingOutputs] = useState({});
  const [llmErrorBanner, setLlmErrorBanner] = useState(null);

  const svgRef = React.useRef(null);
  const [draggingNodeId, setDraggingNodeId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [viewTransform, setViewTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [compactNodes, setCompactNodes] = useState(false);

  const currentTenant = tenants[activeTenantKey];

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
    () => getVisibleNodes(currentTenant, maturityLevel, selectedDomain),
    [currentTenant, maturityLevel, selectedDomain]
  );

  // Identify any L4 CRITICAL risks that endanger L0 nodes (Bubble-Up Alerting!)
  const bubbleUpRisks = useMemo(() => getBubbleUpRisks(currentTenant), [currentTenant]);

  const selectedNode = useMemo(
    () => getSelectedNode(currentTenant, selectedNodeId, visibleNodes),
    [currentTenant, selectedNodeId, visibleNodes]
  );

  // Dynamic Cypher query preview reflecting current UI state
  const liveCypherQuery = useMemo(
    () => buildLiveCypherQuery(activeTenantKey, maturityLevel, selectedDomain),
    [activeTenantKey, maturityLevel, selectedDomain]
  );


  const handleApplySeniorFix = (riskNode, targetL0Node) => {
    setTenants((prev) => applySeniorFix(prev, activeTenantKey, riskNode, targetL0Node));
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
      setLlmErrorBanner('Gemini Learning Coach encountered a temporary issue. Showing cached graph guidance.');
    } finally {
      setCoachLoading(false);
    }
  };

  const handleGroundedResearch = async (node) => {
    if (!node || groundingLoading) return;
    setGroundingLoading(true);
    setLlmErrorBanner(null);

    try {
      const result = await callGeminiWithBackoff(buildResearchPayload(node));

      const candidate = result?.candidates?.[0];
      const text = candidate?.content?.parts?.[0]?.text || 'No grounded summary returned.';
      let sources = [];
      const groundingMetadata = candidate?.groundingMetadata;
      if (groundingMetadata?.groundingAttributions) {
        sources = groundingMetadata.groundingAttributions
          .map((attr) => ({
            uri: attr.web?.uri,
            title: attr.web?.title
          }))
          .filter((s) => s.uri && s.title);
      }

      setGroundingOutputs((prev) => ({
        ...prev,
        [node.id]: { text, sources }
      }));
    } catch (err) {
      setLlmErrorBanner('Google Search Grounding call failed or timed out. Please try again.');
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
        setAgentStepText(`Gemini 3 Flash: Reading ${tenantSnapshot.playbooks.length} :Playbook rules & ${tenantSnapshot.episodes.length} :Episodes from FalkorDB...`);

        setAgentStepText('Gemini 3 Flash: Synthesizing L0->L5 Semantic Nodes & Cypher contracts...');
        const result = await callGeminiWithBackoff(buildFeaturePayload(tenantSnapshot, textToRun, hasRateLimitPlaybook));
        const jsonText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (jsonText) {
          aiGeneratedSpec = JSON.parse(jsonText);
        }
      } catch (e) {
        setLlmErrorBanner('Gemini API call fell back to deterministic graph synthesizer.');
      }
    } else {
      setAgentStepText(`Agent 1–4: Simulating multi-agent graph build for "${textToRun}"...`);
      await new Promise((r) => setTimeout(r, 800));
    }

    // Determine domain based on prompt keywords for fallback
    const lower = textToRun.toLowerCase();
    const detectedDomain = lower.includes('stripe') || lower.includes('pay')
      ? 'ExternalAPIs'
      : lower.includes('auth') || lower.includes('login')
      ? 'Security'
      : lower.includes('db') || lower.includes('graph')
      ? 'Database'
      : 'AIModelsPrompts';

    setTenants((prev) => {
      const result = addFeatureStack(prev, {
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
      });
      setLastBuildBanner(result.banner);
      return result.tenants;
    });

    setSelectedNodeId(newL0Id);
    setPromptInput('');
    setIsRunningAgents(false);
    setAgentStepText('');
  };

  const currentPersonaObj = PERSONA_LEVELS[maturityLevel];

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

        {}
        {activeTab === 'backend' && (
          <BackendTab />
        )}
      </main>
    </div>
  );
}