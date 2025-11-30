import json
import re
from typing import List, Dict, Any
from firebase_admin import firestore
from app.core.firebase import get_firebase_app
from app.models.graph import GraphNode, GraphEdge, GraphData
from app.services.llm_service import LLMService

class GraphService:
    def __init__(self):
        self.db = firestore.client(app=get_firebase_app())
        self.llm_service = LLMService()
        from app.services.user_service import UserService
        self.user_service = UserService()

    def _slugify(self, text: str) -> str:
        return re.sub(r'[^a-z0-9]+', '-', text.lower()).strip('-')

    async def extract_graph_from_text(self, text: str, source_id: str, user_id: str) -> GraphData:
        # Get user's preferred model
        model_name = await self.user_service.get_preferred_model(user_id)
        
        # Limit text length to avoid token limits
        text_snippet = text[:4000]
        
        prompt = f"""
        Analyze the following text and extract key concepts and their relationships to build a knowledge graph.
        
        Text:
        {text_snippet}

        Output a JSON object with "nodes" and "edges".
        Ensure node labels are concise and consistent.
        """
        
        messages = [{"role": "user", "content": prompt}]

        schema = {
            "type": "OBJECT",
            "properties": {
                "nodes": {
                    "type": "ARRAY",
                    "items": {
                        "type": "OBJECT",
                        "properties": {
                            "label": {"type": "STRING"},
                            "type": {"type": "STRING"}
                        },
                        "required": ["label", "type"]
                    }
                },
                "edges": {
                    "type": "ARRAY",
                    "items": {
                        "type": "OBJECT",
                        "properties": {
                            "from": {"type": "STRING"},
                            "to": {"type": "STRING"},
                            "relation": {"type": "STRING"}
                        },
                        "required": ["from", "to", "relation"]
                    }
                }
            },
            "required": ["nodes", "edges"]
        }
        
        try:
            print(f"[GraphService] Extracting graph with model: {model_name}")
            response_text = await self.llm_service.generate_chat_completion(
                messages,
                response_format=schema,
                model_name=model_name,
                max_tokens=8000  # Increase limit for complex graphs
            )
            
            print(f"[GraphService] LLM Response length: {len(response_text)} chars")
            print(f"[GraphService] LLM Response: {response_text[:500]}...")
            
            data = json.loads(response_text)
            
            print(f"[GraphService] Parsed JSON - nodes: {len(data.get('nodes', []))}, edges: {len(data.get('edges', []))}")
                
            nodes = []
            edges = []
            
            for n in data.get("nodes", []):
                label = n.get("label")
                if label:
                    nodes.append(GraphNode(
                        id=self._slugify(label),
                        label=label,
                        type=n.get("type", "concept"),
                        source_ids=[source_id]
                    ))
            
            for e in data.get("edges", []):
                from_label = e.get("from")
                to_label = e.get("to")
                relation = e.get("relation")
                
                if from_label and to_label and relation:
                    from_id = self._slugify(from_label)
                    to_id = self._slugify(to_label)
                    edge_id = f"{from_id}__{self._slugify(relation)}__{to_id}"
                    
                    edges.append(GraphEdge(
                        id=edge_id,
                        from_node=from_id,
                        to_node=to_id,
                        relation=relation,
                        source_id=source_id
                    ))
            
            print(f"[GraphService] Created {len(nodes)} nodes and {len(edges)} edges")
            return GraphData(nodes=nodes, edges=edges)

        except Exception as e:
            print(f"[GraphService] Error extracting graph: {e}")
            import traceback
            traceback.print_exc()
            return GraphData(nodes=[], edges=[])

    async def upsert_graph(self, user_id: str, graph_data: GraphData):
        batch = self.db.batch()
        
        nodes_ref = self.db.collection("users").document(user_id).collection("kg_nodes")
        edges_ref = self.db.collection("users").document(user_id).collection("kg_edges")
        
        for node in graph_data.nodes:
            doc_ref = nodes_ref.document(node.id)
            batch.set(doc_ref, {
                "label": node.label,
                "type": node.type,
                "source_ids": firestore.ArrayUnion(node.source_ids)
            }, merge=True)
            
        for edge in graph_data.edges:
            doc_ref = edges_ref.document(edge.id)
            batch.set(doc_ref, {
                "from": edge.from_node,
                "to": edge.to_node,
                "relation": edge.relation,
                "source_id": edge.source_id
            }, merge=True)
            
        batch.commit()

    async def get_graph(self, user_id: str) -> GraphData:
        nodes_ref = self.db.collection("users").document(user_id).collection("kg_nodes")
        edges_ref = self.db.collection("users").document(user_id).collection("kg_edges")
        
        nodes_snap = nodes_ref.stream()
        edges_snap = edges_ref.stream()
        
        nodes = []
        for doc in nodes_snap:
            data = doc.to_dict()
            nodes.append(GraphNode(
                id=doc.id,
                label=data.get("label", ""),
                type=data.get("type", "concept"),
                source_ids=data.get("source_ids", [])
            ))
            
        edges = []
        for doc in edges_snap:
            data = doc.to_dict()
            edges.append(GraphEdge(
                id=doc.id,
                from_node=data.get("from", ""),
                to_node=data.get("to", ""),
                relation=data.get("relation", ""),
                source_id=data.get("source_id", "")
            ))
            
        return GraphData(nodes=nodes, edges=edges)
