"""Pydantic mirror of `docs/contracts/memory-service.types.ts` (T2.1 contract).

The contract is language-agnostic; these models are the Python side of it. Field
names are snake_case (Python idiom) while the JSON aliases are camelCase — the
same shape the Node reference produced and the frontend expects over HTTP.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

# Opaque tenant identifier. Maps to the FalkorDB graph key `tenant:<tenantId>`.
TenantId = str

# Role of the actor that produced a Turn.
TurnRole = Literal["user", "agent", "tool"]

# Lifecycle status of a recorded handoff.
HandoffStatus = Literal["PENDING", "COMPLETED", "ALERT_RAISED", "PLAYBOOK_ENFORCED"]

# Unix epoch seconds (FalkorDB convention).
EpochSeconds = int


class ContractModel(BaseModel):
    """Base model: snake_case attributes, camelCase JSON aliases."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    def to_contract_dict(self) -> dict[str, object]:
        """Serialise to the camelCase contract shape, dropping absent optionals."""
        return self.model_dump(by_alias=True, exclude_none=True)


# ---------------------------------------------------------------------------
# Shared node types
# ---------------------------------------------------------------------------


class Turn(ContractModel):
    """Episodic: a single message/event. The atomic episodic record."""

    id: str
    timestamp: EpochSeconds
    role: TurnRole
    text: str
    response_quality: float | None = None
    session_id: str | None = None
    user_id: str | None = None
    agent_id: str | None = None
    topic: str | None = None
    mentions: list[str] | None = None


class Entity(ContractModel):
    """Semantic: a durable domain object."""

    id: str
    name: str
    type: str
    embedding: list[float] | None = None


class Fact(ContractModel):
    """Semantic: a durable assertion about the domain."""

    id: str
    statement: str
    confidence: float
    entity_id: str | None = None
    source_turn: str | None = None


class Step(ContractModel):
    """Procedural: one action inside a workflow."""

    id: str
    order: int
    action: str
    expected_result: str | None = None


class Workflow(ContractModel):
    """Procedural: a reusable, re-executable sequence of steps."""

    id: str
    name: str
    trigger_domain: str
    learned_from: str | None = None
    steps: list[Step]
    tool_ids: list[str] | None = None


class Agent(ContractModel):
    """Coordination: one of the agent squad."""

    id: str
    name: str
    role: str
    persona_level: int


class Handoff(ContractModel):
    """Coordination: a recorded transfer of state and responsibility."""

    id: str
    created_at: EpochSeconds
    reason: str
    status: HandoffStatus
    from_agent_id: str
    to_agent_id: str
    target_entity_id: str | None = None


# ---------------------------------------------------------------------------
# Input / query shapes
# ---------------------------------------------------------------------------


class WriteTurnInput(ContractModel):
    id: str | None = None
    timestamp: EpochSeconds | None = None
    role: TurnRole
    text: str
    response_quality: float | None = None
    session_id: str | None = None
    user_id: str | None = None
    agent_id: str | None = None
    topic: str | None = None
    mentions: list[str] | None = None


class RecallTurnsQuery(ContractModel):
    user_id: str | None = None
    session_id: str | None = None
    topic: str | None = None
    limit: int | None = None
    order: Literal["asc", "desc"] = "desc"


class UpsertEntityInput(ContractModel):
    id: str | None = None
    name: str
    type: str
    embedding: list[float] | None = None


class UpsertFactInput(ContractModel):
    id: str | None = None
    statement: str
    confidence: float
    entity_id: str
    source_turn: str | None = None


class RecallFactsQuery(ContractModel):
    entity_id: str | None = None
    topic: str | None = None
    min_confidence: float | None = None
    limit: int | None = None


class QueryEntitiesQuery(ContractModel):
    name: str | None = None
    type: str | None = None
    limit: int | None = None


class StepInput(ContractModel):
    order: int
    action: str
    expected_result: str | None = None
    id: str | None = None


class SaveWorkflowInput(ContractModel):
    id: str | None = None
    name: str
    trigger_domain: str
    learned_from: str | None = None
    steps: list[StepInput]
    tool_ids: list[str] | None = None


class WorkflowReplay(ContractModel):
    workflow_id: str
    steps: list[Step]


class RecordHandoffInput(ContractModel):
    id: str | None = None
    created_at: EpochSeconds | None = None
    reason: str
    status: HandoffStatus | None = None
    from_agent_id: str
    to_agent_id: str
    target_entity_id: str | None = None


class ReadHandoffsQuery(ContractModel):
    agent_id: str | None = None
    status: HandoffStatus | None = None
    limit: int | None = None
