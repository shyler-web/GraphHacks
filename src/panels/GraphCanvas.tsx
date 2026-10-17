import { Terminal, Copy, Move, ZoomIn, ZoomOut, Maximize2, LayoutGrid } from 'lucide-react';
import { PERSONA_LEVELS } from '../graph/personaLevels';
import { DOMAIN_LENSES } from '../graph/domainLenses';

export default function GraphCanvas(props: any) {
  const { currentTenant, visibleNodes, selectedNode, bubbleUpRisks, maturityLevel, currentPersonaObj, compactNodes, setCompactNodes, handleAutoDeclutter, viewTransform, setViewTransform, svgRef, handleCanvasPointerDown, handleCanvasPointerMove, handleCanvasPointerUp, draggingNodeId, isPanning, handleNodePointerDown, liveCypherQuery, copiedCypher, setCopiedCypher } = props;

  return (
    <div className="lg:col-span-7 flex flex-col bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
      <div className="p-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-slate-900/90">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-md border ${currentPersonaObj.badge}`}>
            Viewing Mode: {currentPersonaObj.short} — {currentPersonaObj.name}
          </span>
          <span className="text-[11px] text-slate-400 hidden xl:inline">
            Drag any node to move • Drag background to pan
          </span>
        </div>

        {/* Declutter & Layout Toolbar */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleAutoDeclutter('hierarchy')}
            className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-200 border border-indigo-500/40 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition"
            title="Neatly align all nodes into non-overlapping columns & L0-L5 rows"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-indigo-400" />
            Auto-Declutter Grid
          </button>
          <button
            type="button"
            onClick={() => handleAutoDeclutter('repel')}
            className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-200 border border-emerald-500/40 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition"
            title="Push overlapping nodes apart using force repulsion"
          >
            <Move className="w-3.5 h-3.5 text-emerald-400" />
            Spread Overlaps
          </button>
          <button
            type="button"
            onClick={() => handleAutoDeclutter('domain')}
            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-medium cursor-pointer transition"
            title="Group columns by Domain Lens"
          >
            By Domain
          </button>
          <button
            type="button"
            onClick={() => setCompactNodes(!compactNodes)}
            className={`px-2 py-1 rounded-lg border text-[11px] font-medium cursor-pointer transition ${
              compactNodes
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {compactNodes ? 'Compact: ON' : 'Compact'}
          </button>
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() =>
                setViewTransform((v) => ({ ...v, scale: Math.max(0.5, +(v.scale - 0.15).toFixed(2)) }))
              }
              className="p-1 text-slate-400 hover:text-white cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono text-slate-400 px-1">
              {Math.round(viewTransform.scale * 100)}%
            </span>
            <button
              type="button"
              onClick={() =>
                setViewTransform((v) => ({ ...v, scale: Math.min(1.8, +(v.scale + 0.15).toFixed(2)) }))
              }
              className="p-1 text-slate-400 hover:text-white cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewTransform({ x: 0, y: 0, scale: 1 })}
              className="p-1 text-slate-400 hover:text-white cursor-pointer border-l border-slate-800"
              title="Reset Pan & Zoom"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Draggable & Pannable SVG Graph Canvas */}
      <div className="relative flex-1 min-h-[490px] bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] overflow-hidden select-none">
        <svg
          ref={svgRef}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={handleCanvasPointerUp}
          onPointerLeave={handleCanvasPointerUp}
          className={`w-full h-[490px] ${
            draggingNodeId
              ? 'cursor-grabbing'
              : isPanning
              ? 'cursor-grabbing'
              : 'cursor-grab'
          }`}
          viewBox="0 0 1000 520"
        >
          <defs>
            <marker
              id="arrow-normal"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#6366f1" />
            </marker>
            <marker
              id="arrow-danger"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#f43f5e" />
            </marker>
          </defs>

          <g
            transform={`translate(${viewTransform.x}, ${viewTransform.y}) scale(${viewTransform.scale})`}
          >
            {/* Horizontal Persona Depth Guides */}
            {[0, 1, 2, 3, 4, 5].map((lvl) => (
              <g key={lvl} opacity={lvl <= maturityLevel ? 0.35 : 0.1}>
                <line
                  x1="-400"
                  y1={65 + lvl * 74}
                  x2="2200"
                  y2={65 + lvl * 74}
                  stroke="#334155"
                  strokeDasharray="4 4"
                />
                <text
                  x="14"
                  y={58 + lvl * 74}
                  fill="#94a3b8"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  L{lvl}: {PERSONA_LEVELS[lvl].name}
                </text>
              </g>
            ))}

            {/* Render Smooth Curved Bezier Graph Edges */}
            {currentTenant.edges.map((edge, idx) => {
              const fromNode = currentTenant.nodes.find((n) => n.id === edge.from);
              const toNode = currentTenant.nodes.find((n) => n.id === edge.to);
              if (!fromNode || !toNode) return null;

              const bothVisible =
                visibleNodes.some((n) => n.id === fromNode.id) &&
                visibleNodes.some((n) => n.id === toNode.id);
              const isBubbleUpAlert =
                edge.type === 'ENDANGERS' && fromNode.status === 'CRITICAL';

              if (!bothVisible && !isBubbleUpAlert) return null;

              const midY = (fromNode.y + toNode.y) / 2;
              const curveOffset = edge.type === 'ENDANGERS' ? -45 : 0;
              const pathData = `M ${fromNode.x} ${fromNode.y} C ${fromNode.x + curveOffset} ${midY}, ${toNode.x + curveOffset} ${midY}, ${toNode.x} ${toNode.y}`;

              return (
                <g key={idx}>
                  <path
                    d={pathData}
                    fill="none"
                    stroke={
                      edge.type === 'ENDANGERS'
                        ? '#f43f5e'
                        : edge.type === 'LEARN_CONCEPT'
                        ? '#fbbf24'
                        : '#6366f1'
                    }
                    strokeWidth={edge.type === 'ENDANGERS' ? 2.5 : 1.8}
                    strokeDasharray={edge.type === 'ENDANGERS' ? '6 4' : undefined}
                    markerEnd={
                      edge.type === 'ENDANGERS'
                        ? 'url(#arrow-danger)'
                        : 'url(#arrow-normal)'
                    }
                  />
                  <text
                    x={(fromNode.x + toNode.x) / 2 + curveOffset * 0.6}
                    y={(fromNode.y + toNode.y) / 2 - 6}
                    fill={edge.type === 'ENDANGERS' ? '#fda4af' : '#94a3b8'}
                    fontSize="9"
                    textAnchor="middle"
                    fontFamily="monospace"
                  >
                    [:{edge.type}]
                  </text>
                </g>
              );
            })}

            {/* Render Freely Draggable Nodes */}
            {visibleNodes.map((node) => {
              const isSelected = selectedNode?.id === node.id;
              const isDraggingThis = draggingNodeId === node.id;
              const endangeredBy = bubbleUpRisks[node.id];
              const lensObj = DOMAIN_LENSES.find((d) => d.id === node.domain);
              const cardW = compactNodes ? 148 : 196;
              const cardH = compactNodes ? 40 : 52;

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onPointerDown={(e) => handleNodePointerDown(e, node)}
                  className="cursor-grab active:cursor-grabbing"
                >
                  {/* Pulsing Halo if Critical or Endangered at L0 */}
                  {(node.status === 'CRITICAL' || endangeredBy) && (
                    <circle
                      r={compactNodes ? '28' : '36'}
                      fill="none"
                      stroke="#f43f5e"
                      strokeWidth="2"
                      strokeDasharray="4 2"
                    />
                  )}

                  <rect
                    x={-cardW / 2}
                    y={-cardH / 2}
                    width={cardW}
                    height={cardH}
                    rx="12"
                    fill={isDraggingThis ? '#312e81' : isSelected ? '#1e1b4b' : '#0f172a'}
                    stroke={
                      node.status === 'CRITICAL' || endangeredBy
                        ? '#f43f5e'
                        : node.status === 'FIXED'
                        ? '#10b981'
                        : isSelected || isDraggingThis
                        ? '#818cf8'
                        : lensObj?.color || '#475569'
                    }
                    strokeWidth={isSelected || isDraggingThis ? '2.8' : '1.6'}
                  />

                  {/* Level & Domain Pill */}
                  <text
                    x={-cardW / 2 + 10}
                    y={-cardH / 2 + 15}
                    fill={lensObj?.color || '#38bdf8'}
                    fontSize="9"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    L{node.persona_level} • {node.domain.slice(0, compactNodes ? 8 : 16)}
                  </text>

                  {/* Status / Drag Grip Indicator */}
                  <text
                    x={cardW / 2 - 10}
                    y={-cardH / 2 + 15}
                    fill={
                      node.status === 'CRITICAL' || endangeredBy
                        ? '#fb7185'
                        : node.status === 'FIXED'
                        ? '#34d399'
                        : '#94a3b8'
                    }
                    fontSize="8"
                    fontWeight="bold"
                    textAnchor="end"
                    fontFamily="monospace"
                  >
                    {endangeredBy ? '🚨 ALERT' : `⠿ ${node.status}`}
                  </text>

                  {/* Node Title */}
                  <text
                    x="0"
                    y={compactNodes ? 10 : 12}
                    fill="#f8fafc"
                    fontSize={compactNodes ? '9' : '10'}
                    fontWeight="600"
                    textAnchor="middle"
                  >
                    {node.title.length > (compactNodes ? 20 : 26)
                      ? node.title.slice(0, compactNodes ? 18 : 24) + '…'
                      : node.title}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Floating Canvas Helper Pill */}
        <div className="absolute bottom-2.5 left-3 pointer-events-none flex items-center gap-2 bg-slate-950/85 border border-slate-800 px-2.5 py-1 rounded-full text-[10px] text-slate-400">
          <Move className="w-3 h-3 text-indigo-400" />
          <span>Tip: Drag any card to reposition • Click <strong>Auto-Declutter Grid</strong> or <strong>Spread Overlaps</strong> anytime</span>
        </div>
      </div>

      {/* Live Cypher Query Bar at Bottom of Graph */}
      <div className="p-3 bg-slate-950 border-t border-slate-800">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-mono text-indigo-400 flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5" />
            Live FalkorDB Cypher Traversal (Executed in O(1) Multigraph):
          </span>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(liveCypherQuery);
              setCopiedCypher(true);
              setTimeout(() => setCopiedCypher(false), 1500);
            }}
            className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
          >
            <Copy className="w-3 h-3" />
            {copiedCypher ? 'Copied!' : 'Copy Cypher'}
          </button>
        </div>
        <pre className="text-[11px] font-mono text-emerald-300 bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 overflow-x-auto">
          {liveCypherQuery}
        </pre>
      </div>
    </div>
  );
}
