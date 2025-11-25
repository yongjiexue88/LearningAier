import { useEffect, useRef, useState } from "react";
import { Box, Paper, Stack, Typography, Button, CircularProgress } from "@mui/material";
import ForceGraph2D, { ForceGraphMethods } from "react-force-graph-2d";
import { useAuth } from "../../providers/AuthProvider";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/apiClient";
import RefreshIcon from "@mui/icons-material/RefreshRounded";

interface GraphNode {
    id: string;
    label: string;
    type: string;
    source_ids: string[];
    // ForceGraph adds these
    x?: number;
    y?: number;
    vx?: number;
    vy?: number;
}

interface GraphEdge {
    id: string;
    source: string | GraphNode; // ID or object after parsing
    target: string | GraphNode;
    relation: string;
    source_id: string;
}

interface GraphData {
    nodes: GraphNode[];
    edges: GraphEdge[];
}

export function KnowledgeGraphPage() {
    const { user } = useAuth();
    const graphRef = useRef<ForceGraphMethods>();
    const [containerDimensions, setContainerDimensions] = useState({ width: 800, height: 600 });
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (containerRef.current) {
            setContainerDimensions({
                width: containerRef.current.clientWidth,
                height: containerRef.current.clientHeight,
            });
        }

        const handleResize = () => {
            if (containerRef.current) {
                setContainerDimensions({
                    width: containerRef.current.clientWidth,
                    height: containerRef.current.clientHeight,
                });
            }
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const { data: graphData, isLoading, refetch } = useQuery({
        queryKey: ["knowledge-graph", user?.uid],
        queryFn: async () => {
            const response = await apiClient.request<GraphData>("/api/graph/", { method: "GET" });
            // Transform for react-force-graph
            return {
                nodes: response.nodes,
                links: response.edges.map((edge: any) => ({
                    ...edge,
                    source: edge.from ?? edge.source,
                    target: edge.to ?? edge.target,
                })),
            };
        },
        enabled: !!user,
    });

    const handleNodeClick = (node: GraphNode) => {
        graphRef.current?.centerAt(node.x, node.y, 1000);
        graphRef.current?.zoom(8, 2000);
    };

    return (
        <Stack spacing={4} sx={{ height: { xs: 'calc(100vh - 120px)', md: 'calc(100vh - 100px)' }, width: '100%', maxWidth: '100vw', overflow: 'hidden' }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2 }}>
                <Box>
                    <Typography variant="h4" fontWeight={600} gutterBottom>
                        Knowledge Graph
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Explore connections between your concepts.
                    </Typography>
                </Box>
                <Button
                    startIcon={<RefreshIcon />}
                    onClick={() => refetch()}
                    variant="outlined"
                    size="small"
                >
                    Refresh
                </Button>
            </Box>

            <Paper
                ref={containerRef}
                sx={{
                    flexGrow: 1,
                    overflow: "hidden",
                    borderRadius: 3,
                    border: "1px solid",
                    borderColor: "divider",
                    position: "relative",
                    bgcolor: "background.paper",
                }}
            >
                {isLoading && (
                    <Box sx={{
                        position: "absolute",
                        top: 0, left: 0, right: 0, bottom: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        zIndex: 10, bgcolor: "rgba(255,255,255,0.9)"
                    }}>
                        <CircularProgress />
                    </Box>
                )}

                {graphData && (
                    <ForceGraph2D
                        ref={graphRef}
                        width={containerDimensions.width}
                        height={containerDimensions.height}
                        graphData={graphData}
                        nodeLabel="label"
                        nodeColor={(node: any) => node.type === "concept" ? "#2563EB" : "#6B7280"}
                        nodeRelSize={6}
                        linkColor={() => "#E5E7EB"}
                        linkWidth={1.5}
                        linkDirectionalArrowLength={3.5}
                        linkDirectionalArrowRelPos={1}
                        onNodeClick={handleNodeClick as any}
                        enableNodeDrag={true}
                    />
                )}

                {!isLoading && (!graphData || graphData.nodes.length === 0) && (
                    <Box sx={{
                        position: "absolute",
                        top: 0, left: 0, right: 0, bottom: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexDirection: "column", gap: 2
                    }}>
                        <Typography color="text.secondary">No graph data found.</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Generate a graph from your notes to see it here.
                        </Typography>
                    </Box>
                )}
            </Paper>
        </Stack>
    );
}
