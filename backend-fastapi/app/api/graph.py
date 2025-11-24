from fastapi import APIRouter, Depends, HTTPException
from app.core.auth import verify_firebase_token, AuthenticatedUser
from app.models.graph import ExtractGraphRequest, ExtractGraphResponse, GraphData
from app.services.graph_service import GraphService

router = APIRouter(prefix="/api/graph", tags=["graph"])

@router.post("/extract", response_model=ExtractGraphResponse)
async def extract_graph(
    request: ExtractGraphRequest,
    user: AuthenticatedUser = Depends(verify_firebase_token)
):
    """
    Extract graph data from text and update the user's knowledge graph.
    """
    try:
        graph_service = GraphService()
        graph_data = await graph_service.extract_graph_from_text(request.text, request.source_id, user.uid)
        await graph_service.upsert_graph(user.uid, graph_data)
        return ExtractGraphResponse(nodes=graph_data.nodes, edges=graph_data.edges)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=GraphData)
async def get_graph(
    user: AuthenticatedUser = Depends(verify_firebase_token)
):
    """
    Get the user's entire knowledge graph.
    """
    try:
        graph_service = GraphService()
        return await graph_service.get_graph(user.uid)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
