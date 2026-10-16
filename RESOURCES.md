# Graph Hacks Track 02 Resources

Curated, high-trust sources for building and understanding a FalkorDB-backed multi-agent memory system. Lessons draw their claims from here, not from parametric memory.

## Knowledge — Official FalkorDB

- [Docs: Getting started with FalkorDB](https://docs.falkordb.com/getting-started/)
  First page. Use for: install, connect, first query.
- [Docs: Run FalkorDB with Docker](https://docs.falkordb.com/operations/docker)
  Use for: standing up the instance the submission runs on.
- [Docs: The Cypher query language](https://docs.falkordb.com/cypher/)
  Use for: every query in the project; the language the README must show.
- [Docs: Graph algorithms](https://docs.falkordb.com/algorithms/)
  Use for: shortest path, centrality, community detection as agent tools.
- [Docs: Client libraries](https://docs.falkordb.com/getting-started/clients)
  Use for: Python / Node.js / etc. connection code.
- [Docs: Integrations](https://docs.falkordb.com/integration/)
  Use for: GraphRAG-SDK, Graphiti, Cognee, LangChain, LlamaIndex, MCP.
- [GitHub: FalkorDB GraphRAG-SDK](https://github.com/FalkorDB/GraphRAG-SDK)
  Use for: ontology-driven graph RAG pipelines.
- [FalkorDB Cloud](https://app.falkordb.cloud)
  Use for: zero-setup instance for a live deployment.

## Knowledge — Agent memory concepts

- [Blog: Graph Database AI Agents — GraphRAG & Memory Guide (FalkorDB)](https://www.falkordb.com/blog/graph-database-ai-agents)
  Canonical definition of **episodic / semantic / procedural memory** with Cypher examples. Use for: the three-tier model and write patterns.
- [Blog: Your Agent's Memory Problem Is a Retrieval Architecture Problem (FalkorDB)](https://www.falkordb.com/blog/)
  Use for: why vector-only memory fails; framing for the pitch.
- [DEV: LangChain + FalkorDB — Building AI Agents with Memory](https://dev.to/falkordb/langchain-falkordb-building-ai-agents-with-memory-191)
  Use for: framework integration and conversation-history persistence.
- [Video: Implementing Agentic Memory with Graphiti & FalkorDB](https://www.youtube.com/watch?v=XOP7bhAuhbk)
  Use for: temporal knowledge graph memory, a proven architecture.

## Knowledge — The event

- [Graph Hacks main page](https://www.wemakedevs.org/hackathons/falkordb)
  Use for: tracks, prizes, FAQ.
- [Graph Hacks rules](https://www.wemakedevs.org/hackathons/falkordb/rules)
  Use for: submission requirements, the "graph must do real work" rule.
- [Graph Hacks schedule](https://www.wemakedevs.org/hackathons/falkordb/schedule)
  Use for: deadlines.
- [Graph Hacks resources](https://www.wemakedevs.org/hackathons/falkordb/resources)
  Use for: starter guides and videos.
- [WeMakeDevs blog: How to build an agent that reasons over a graph](https://www.wemakedevs.org/blogs/how-to-build-an-agent-that-reasons-over-a-graph)
  Use for: the sponsor's own framing of success.

## Knowledge — Engineering judgment & working with AI

- [Article: "7+ Things Every Developer Gets Wrong About AI Agents in 2026" (10xdev.blog)](https://10xdev.blog/7-things-developers-get-wrong-about-ai-agents-2026/)
  Context engineering over prompting; spec cards and exit criteria; per-action verification; git as agent memory; autonomy tiers. Use for: the whole "The Engineer's Prompt" series.
- [Article: "Everything You Need to Know Before Building AI Agents" (bigdataboutique)](https://bigdataboutique.com/blog/everything-you-need-to-know-before-building-ai-agents)
  Agent building blocks (memory/planning/tools), levels of autonomy, pitfalls. Use for: scope and orchestration decisions.
- [Article: "Systems Thinking... Separates Senior Engineers from Juniors" (Paul Serban)](https://blog.paulserban.eu/post/systems-thinking-in-software-engineering-the-mental-model-that-separates-senior-engineers-from-juniors/)
  Boundaries, interfaces, feedback loops, failure-mode analysis. Use for: E2 and architecture prompts.
- [Article: "A Debugging Method That Beats Vibes" (maxtdesign)](https://maxtdesign.com/learn/developer-tools/systematic-debugging-method)
  Reproduce-first, three ranked hypotheses, cheapest discriminating test, regression test. Use for: E6.
- [Article: "Debugging as Scientific Reasoning" (siliconwit)](https://siliconwit.com/education/critical-thinking-engineers/debugging-as-reasoning/)
  The scientific loop, binary search, bug reports, when to ask for help. Use for: E6 and E10.
- [Book: _The Software Engineering Handbook_ (James C. Davis)](https://davisjam.github.io/model-based-agentic-software-engineering/book/se-handbook/software-engineering-handbook.pdf)
  Engineering judgment as the core skill when AI does routine work; reversible decisions; decomposability. Use for: E5 and E8.
- [Guide: Software Engineering Guide — Debugging and troubleshooting](https://software-engineering-guide.github.io/software-engineering-guide/chapters/02-15-debugging-and-troubleshooting/)
  Reproduce-first, binary-search isolation, failing test before the fix, git bisect. Use for: E6.

## Wisdom (Communities)

- [FalkorDB Discord](https://discord.com/invite/Y2mMT9VdMy)
  Official support + data-model help during the event. Use for: stuck queries, graph-model critique.
- [WeMakeDevs Discord](https://discord.com/invite/wemakedevs)
  Team-finding and build help. Use for: peer feedback on scope and demo.
- [FalkorDB GitHub Discussions](https://github.com/FalkorDB/FalkorDB/discussions)
  Use for: deeper technical questions from maintainers.

## Gaps

- **Documented GAP: shared multi-agent handoff patterns.** The WeMakeDevs "reasons over a graph" blog and the FalkorDB GraphRAG & Memory guide both cover single-agent memory (episodic/semantic/procedural) and per-tenant isolation, but neither specifies a **shared handoff / shared-state pattern over FalkorDB**. There is no trusted source to cite for it. Consequence: the handoff-ledger design in lesson 0007 (`[:HANDED_TO]` edge carrying reason/timestamp/artifact + `PRODUCED`/`READS` shared memory) is the learner's **own contribution**, to be framed as original work — not claimed as a standard. Look for: agent-coordination papers, FalkorDB community projects, Graphiti temporal patterns.
- No verified benchmark data on **high-concurrency write patterns** for this exact use case. Look for: FalkorDB docs on multi-graph topology and the competition latency charts.
