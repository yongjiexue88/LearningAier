from pydantic import BaseModel, Field
from typing import List, Optional

class GraphNode(BaseModel):
    id: str
    label: str
    type: str = "concept"
    source_ids: List[str] = []

class GraphEdge(BaseModel):
    id: str
    from_node: str = Field(alias="from")
    to_node: str = Field(alias="to")
    relation: str
    source_id: str

    class Config:
        populate_by_name = True


class GraphData(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]

class ExtractGraphRequest(BaseModel):
    text: str
    source_id: str

class ExtractGraphResponse(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]
