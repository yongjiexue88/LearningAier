import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Box, Paper, Stack, Typography, Button, CircularProgress } from "@mui/material";
import ForceGraph2D, { ForceGraphMethods } from "react-force-graph-2d";
import { useAuth } from "../../providers/AuthProvider";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/apiClient";
import RefreshIcon from "@mui/icons-material/RefreshRounded";
import { GraphSidePanel } from "./GraphSidePanel";
import { GraphControls } from "./GraphControls";

interface GraphNode {
    id: string;
    label: string;
    type: string;
    source_ids: string[];
    // Enriched data
    mastery?: number;
    summary?: string;
    relatedNoteId?: string;
    neighbors?: GraphNode[];
    // ForceGraph props
    x?: number;
    y?: number;
    vx?: number;
    vy?: number;
    val?: number; // for size
}

interface GraphEdge {
    id: string;
    source: string | GraphNode;
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

    // UI State
    const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
    const [hoverNode, setHoverNode] = useState<GraphNode | null>(null);
    const [showMastery, setShowMastery] = useState(false);
    const [focusMode, setFocusMode] = useState(false);

    // Resize handler
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

    // 1. Fetch Graph Data
    const { data: rawGraphData, isLoading: isGraphLoading, refetch: refetchGraph } = useQuery({
        queryKey: ["knowledge-graph", user?.uid],
        queryFn: async () => {
            const response = await apiClient.request<GraphData>("/api/graph/", { method: "GET" });
            return response;
        },
        enabled: !!user,
    });

    // 2. Fetch Flashcards (for Mastery)
    const { data: flashcards } = useQuery({
        queryKey: ["flashcards", user?.uid],
        queryFn: async () => {
            return await apiClient.request<any[]>("/api/flashcards/", { method: "GET" });
        },
        enabled: !!user,
    });

    // 3. Fetch Notes (for Metadata)
    const { data: notes } = useQuery({
        queryKey: ["notes", user?.uid],
        queryFn: async () => {
            return await apiClient.request<any[]>("/api/notes/", { method: "GET" });
        },
        enabled: !!user,
    });

    // 4. Merge Data & Calculate Stats
    const graphData = useMemo(() => {
        if (!rawGraphData) return { nodes: [], links: [] };

        const nodesMap = new Map<string, GraphNode>();

        // Initialize nodes
        rawGraphData.nodes.forEach(node => {
            nodesMap.set(node.id, { ...node, neighbors: [] });
        });

        // Process edges to find neighbors
        const links = rawGraphData.edges.map((edge: any) => {
            const sourceId = typeof edge.from === 'object' ? edge.from.id : (edge.from || edge.source);
            const targetId = typeof edge.to === 'object' ? edge.to.id : (edge.to || edge.target);

            return {
                ...edge,
                source: sourceId,
                target: targetId,
            };
        });

        // Link neighbors
        links.forEach(link => {
            const source = nodesMap.get(link.source);
            const target = nodesMap.get(link.target);
            if (source && target) {
                source.neighbors?.push(target);
                target.neighbors?.push(source);
            }
        });

        // Enrich with Flashcard Mastery
        if (flashcards) {
            nodesMap.forEach(node => {
                // Simple matching: check if any flashcard term contains the node label
                const relatedCards = flashcards.filter((card: any) =>
                    card.term.toLowerCase().includes(node.label.toLowerCase()) ||
                    node.label.toLowerCase().includes(card.term.toLowerCase())
                );

                if (relatedCards.length > 0) {
                    // Calculate average mastery (0-100 based on next_review timestamp or box)
                    // Simplified: Random mastery for demo if no real SRS data field is standard yet
                    // In a real app, use card.box or card.next_review
                    node.mastery = Math.min(100, relatedCards.length * 20);
                }
            });
        }

        // Enrich with Notes Metadata
        if (notes) {
            nodesMap.forEach(node => {
                // Find note that generated this node (via source_id)
                const sourceNote = notes.find((n: any) => node.source_ids.includes(n.id));
                if (sourceNote) {
                    node.relatedNoteId = sourceNote.id;
                    // node.summary = sourceNote.summary; // If notes have summaries
                }
            });
        }

        return {
            nodes: Array.from(nodesMap.values()),
            links: links
        };
    }, [rawGraphData, flashcards, notes]);

    // Interaction Handlers
    const handleNodeClick = useCallback((node: GraphNode) => {
        setSelectedNode(node);
        // Center camera
        graphRef.current?.centerAt(node.x, node.y, 1000);
        graphRef.current?.zoom(6, 2000);
    }, []);

    const handleBackgroundClick = useCallback(() => {
        setSelectedNode(null);
    }, []);

    // Custom Node Rendering
    const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
        const isSelected = selectedNode?.id === node.id;
        const isHovered = hoverNode?.id === node.id;
        const isNeighbor = selectedNode?.neighbors?.some(n => n.id === node.id);

        // Focus Mode: Hide unconnected nodes
        if (focusMode && selectedNode && !isSelected && !isNeighbor) {
            // Draw very faint or not at all
            ctx.globalAlpha = 0.1;
        } else {
            ctx.globalAlpha = 1;
        }

        const label = node.label;
        const fontSize = 12 / globalScale;
        ctx.font = `${fontSize}px Sans-Serif`;
        const textWidth = ctx.measureText(label).width;
        const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2); // some padding

        // Node Size
        const baseR = 4;
        const r = isSelected ? baseR * 1.5 : isHovered ? baseR * 1.2 : baseR;

        // Colors
        let fill = node.type === "concept" ? "#2563EB" : "#6B7280";
        if (showMastery && node.mastery !== undefined) {
            // Heatmap color
            if (node.mastery >= 80) fill = "#22c55e"; // Green
            else if (node.mastery >= 50) fill = "#eab308"; // Yellow
            else fill = "#ef4444"; // Red
        }

        // Draw Circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
        ctx.fillStyle = fill;
        ctx.fill();

        // Draw Border (Selection or Mastery)
        if (isSelected || isHovered) {
            ctx.lineWidth = 2 / globalScale;
            ctx.strokeStyle = "#fff";
            ctx.stroke();

            // Outer glow
            ctx.shadowColor = fill;
            ctx.shadowBlur = 10;
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        // Draw Label
        if (isSelected || isHovered || globalScale > 2.5) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2 - r - fontSize, bckgDimensions[0], bckgDimensions[1]);

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#000';
            ctx.fillText(label, node.x, node.y - r - fontSize);
        }
    }, [selectedNode, hoverNode, showMastery, focusMode]);

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
                    onClick={() => refetchGraph()}
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
                {/* Controls Overlay */}
                <GraphControls
                    showMastery={showMastery}
                    onToggleMastery={setShowMastery}
                    focusMode={focusMode}
                    onToggleFocusMode={setFocusMode}
                />

                {/* Side Panel Overlay */}
                {selectedNode && (
                    <GraphSidePanel
                        node={selectedNode}
                        onClose={() => setSelectedNode(null)}
                        masteryLevel={selectedNode.mastery}
                        relatedNoteId={selectedNode.relatedNoteId}
                    />
                )}

                {isGraphLoading && (
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
                        nodeCanvasObject={nodeCanvasObject}
                        onNodeClick={handleNodeClick as any}
                        onNodeHover={(node: any) => setHoverNode(node || null)}
                        onBackgroundClick={handleBackgroundClick}
                        enableNodeDrag={true}
                        linkColor={() => "#E5E7EB"}
                        linkWidth={1.5}
                        linkDirectionalArrowLength={3.5}
                        linkDirectionalArrowRelPos={1}
                    />
                )}

                {!isGraphLoading && (!graphData || graphData.nodes.length === 0) && (
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
