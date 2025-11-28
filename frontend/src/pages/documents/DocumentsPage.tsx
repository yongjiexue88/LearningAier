import CloudUploadIcon from "@mui/icons-material/CloudUploadRounded";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DeleteIcon from "@mui/icons-material/DeleteOutlineRounded";
import DescriptionIcon from "@mui/icons-material/DescriptionRounded";
import OpenInNewIcon from "@mui/icons-material/OpenInNewRounded";
import ChatIcon from "@mui/icons-material/ChatRounded";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Paper,
  Stack,
  TextField,
  Typography,
  CircularProgress,
  Alert,
  LinearProgress,
  IconButton,
  Chip,
} from "@mui/material";
import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useStartConversation } from "../../hooks/useChat";
import { useAuth } from "../../providers/AuthProvider";
import { firebaseAuth, firebaseStorage, firebaseDb } from "../../lib/firebaseClient";
import { ref, uploadBytesResumable } from "firebase/storage";
import { collection, setDoc, serverTimestamp, query, where, orderBy, getDocs, deleteDoc, doc } from "firebase/firestore";
import { useProcessDocument } from "../../services/hooks/useDocuments";

type UploadStatus = "idle" | "uploading" | "processing" | "success" | "error";

interface DocumentRecord {
  id: string;
  user_id: string;
  title: string;
  file_name: string;
  file_size: number;
  status: string;
  note_id?: string;
  created_at: any;
  updated_at: any;
  storage_path?: string;
}

export function DocumentsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [summaryZh, setSummaryZh] = useState("");
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [noteId, setNoteId] = useState<string | null>(null);

  const processDocumentMutation = useProcessDocument();
  const startConversation = useStartConversation();

  const documentsQuery = useQuery({
    enabled: Boolean(user?.uid),
    queryKey: ["documents", user?.uid],
    queryFn: async (): Promise<DocumentRecord[]> => {
      if (!user?.uid) return [];

      const baseQuery = query(
        collection(firebaseDb, "documents"),
        where("user_id", "==", user.uid)
      );

      try {
        // Try with orderBy first
        const qWithOrder = query(baseQuery, orderBy("created_at", "desc"));
        const snapshot = await getDocs(qWithOrder);
        console.log("[DocumentsPage] Fetched documents:", snapshot.docs.length);
        return snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as DocumentRecord[];
      } catch (error: any) {
        // Fallback without orderBy if index is missing
        if (error?.code === "failed-precondition") {
          console.warn("[DocumentsPage] Missing index, falling back to client-side sort");
          const snapshot = await getDocs(baseQuery);
          const docs = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          })) as DocumentRecord[];

          // Sort on client side
          return docs.sort((a, b) => {
            const aTime = a.created_at?.toMillis?.() ?? 0;
            const bTime = b.created_at?.toMillis?.() ?? 0;
            return bTime - aTime;
          });
        }
        console.error("[DocumentsPage] Error fetching documents:", error);
        throw error;
      }
    },
  });

  const documents = documentsQuery.data ?? [];

  console.log("[DocumentsPage] Documents:", documents, "Loading:", documentsQuery.isLoading, "Error:", documentsQuery.error);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setSelectedFile(file);
      setUploadStatus("idle");
      setErrorMessage("");
      setSummaryZh("");
    } else {
      setErrorMessage("Please select a PDF file");
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type === "application/pdf") {
      setSelectedFile(file);
      setUploadStatus("idle");
      setErrorMessage("");
      setSummaryZh("");
    } else {
      setErrorMessage("Please drop a PDF file");
    }
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) return;

    const user = firebaseAuth.currentUser;
    if (!user) {
      setErrorMessage("You must be logged in to upload documents");
      return;
    }

    try {
      setUploadStatus("uploading");
      setErrorMessage("");
      setUploadProgress(0);

      // 1. Create document metadata in Firestore first
      const docRef = doc(collection(firebaseDb, "documents"));

      await setDoc(docRef, {
        user_id: user.uid,
        title: selectedFile.name.replace(".pdf", ""),
        file_name: selectedFile.name,
        file_size: selectedFile.size,
        status: "uploading",
        storage_path: `documents/${user.uid}/${docRef.id}/${selectedFile.name}`,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });

      setDocumentId(docRef.id);

      // 2. Upload to Firebase Storage
      const storagePath = `documents/${user.uid}/${docRef.id}/${selectedFile.name}`;
      const storageRef = ref(firebaseStorage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, selectedFile);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          console.error("Upload error:", error);
          setErrorMessage(`Upload failed: ${error.message}`);
          setUploadStatus("error");
        },
        async () => {
          // 3. Upload complete, now call backend to process the document
          setUploadStatus("processing");

          processDocumentMutation.mutate(
            {
              document_id: docRef.id,
              file_path: storagePath,
              chunk_size: 500,
            },
            {
              onSuccess: (data) => {
                setUploadStatus("success");
                setNoteId(data.note_id);

                // Set the text preview as summary
                // In a real implementation, you'd call a separate summarization endpoint
                setSummaryZh(data.text_preview);
              },
              onError: (error) => {
                setErrorMessage(`Processing failed: ${error.message}`);
                setUploadStatus("error");
              },
            }
          );
        }
      );
    } catch (error) {
      console.error("Upload error:", error);
      setErrorMessage(`Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      setUploadStatus("error");
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setUploadStatus("idle");
    setErrorMessage("");
    setSummaryZh("");
    setDocumentId(null);
    setNoteId(null);
    setUploadProgress(0);
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm("Delete this document? This action cannot be undone.")) {
      return;
    }
    try {
      await deleteDoc(doc(firebaseDb, "documents", documentId));
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      setErrorMessage("");
    } catch (error) {
      console.error("Delete error:", error);
      setErrorMessage(`Failed to delete document: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" fontWeight={700}>
          Document Import
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Upload PDFs to Firebase Storage, extract text, and generate bilingual notes automatically.
        </Typography>
      </Box>

      {errorMessage && (
        <Alert severity="error" onClose={() => setErrorMessage("")}>
          {errorMessage}
        </Alert>
      )}

      <Paper
        sx={{
          p: 4,
          border: "2px dashed",
          borderColor: uploadStatus === "success" ? "success.main" : "primary.light",
          textAlign: "center",
          backgroundColor: "background.paper",
        }}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {uploadStatus === "idle" || uploadStatus === "error" ? (
          <>
            <CloudUploadIcon color="primary" sx={{ fontSize: 48 }} />
            <Typography variant="h6">
              {selectedFile ? selectedFile.name : "Drag & drop PDF here"}
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Upload to Firebase Storage → Extract text → Create note → Index embeddings
            </Typography>
            <input
              type="file"
              accept="application/pdf"
              style={{ display: "none" }}
              id="file-upload"
              onChange={handleFileSelect}
            />
            <Stack direction="row" spacing={2} justifyContent="center">
              <label htmlFor="file-upload">
                <Button variant="outlined" component="span">
                  Select File
                </Button>
              </label>
              {selectedFile && (
                <Button variant="contained" onClick={handleUpload}>
                  Upload & Process
                </Button>
              )}
            </Stack>
          </>
        ) : uploadStatus === "uploading" ? (
          <>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography variant="h6" mb={1}>
              Uploading to Firebase Storage...
            </Typography>
            <Box sx={{ width: "100%", maxWidth: 400, mx: "auto" }}>
              <LinearProgress variant="determinate" value={uploadProgress} />
              <Typography variant="body2" color="text.secondary" mt={1}>
                {Math.round(uploadProgress)}%
              </Typography>
            </Box>
          </>
        ) : uploadStatus === "processing" ? (
          <>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography variant="h6">Processing PDF...</Typography>
            <Typography variant="body2" color="text.secondary">
              Extracting text, chunking, generating embeddings, and indexing to Pinecone
            </Typography>
          </>
        ) : uploadStatus === "success" ? (
          <>
            <CheckCircleIcon color="success" sx={{ fontSize: 48 }} />
            <Typography variant="h6">Document processed successfully!</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Note created with ID: {noteId}
            </Typography>
            <Button variant="outlined" onClick={handleReset}>
              Upload Another
            </Button>
          </>
        ) : null}
      </Paper>

      {(uploadStatus === "success" || uploadStatus === "processing") && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
            gap: 3,
          }}
        >
          <Box>
            <Paper sx={{ p: 3, height: "100%" }}>
              <Typography variant="subtitle1" fontWeight={600}>
                Extracted Text Preview
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                First 500 characters from the PDF
              </Typography>
              <TextField
                multiline
                placeholder="Text preview..."
                minRows={10}
                fullWidth
                value={summaryZh}
                onChange={(e) => setSummaryZh(e.target.value)}
                disabled={uploadStatus === "processing"}
              />
            </Paper>
          </Box>
          <Box>
            <Paper sx={{ p: 3, height: "100%" }}>
              <Typography variant="subtitle1" fontWeight={600}>
                Note Details
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Document metadata and processing results
              </Typography>
              <Stack spacing={2}>
                <TextField
                  label="Document ID"
                  size="small"
                  value={documentId || ""}
                  InputProps={{ readOnly: true }}
                  fullWidth
                />
                <TextField
                  label="Note ID"
                  size="small"
                  value={noteId || "Processing..."}
                  InputProps={{ readOnly: true }}
                  fullWidth
                />
                <TextField
                  label="Status"
                  size="small"
                  value={uploadStatus}
                  InputProps={{ readOnly: true }}
                  fullWidth
                />
                {uploadStatus === "success" && noteId && (
                  <Button
                    variant="contained"
                    fullWidth
                    href={`/notes/${noteId}`}
                  >
                    View Note
                  </Button>
                )}
              </Stack>
            </Paper>
          </Box>
        </Box>
      )}

      {/* Document List Section */}
      <Box>
        <Typography variant="h5" fontWeight={700} mb={2}>
          Your Documents
        </Typography>
        {documentsQuery.isLoading ? (
          <Stack alignItems="center" justifyContent="center" sx={{ py: 6 }}>
            <CircularProgress size={32} />
            <Typography variant="body2" color="text.secondary" mt={2}>
              Loading documents...
            </Typography>
          </Stack>
        ) : documents.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: "center" }}>
            <DescriptionIcon sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              No documents yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Upload your first PDF to get started
            </Typography>
          </Paper>
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                md: "repeat(3, 1fr)",
              },
              gap: 3,
            }}
          >
            {documents.map((document) => (
              <Card
                key={document.id}
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: 4,
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                    <DescriptionIcon color="primary" />
                    <Typography variant="h6" component="div" noWrap>
                      {document.title}
                    </Typography>
                  </Stack>
                  <Stack spacing={0.5}>
                    <Typography variant="body2" color="text.secondary">
                      📅 {formatDate(document.created_at)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      📁 {formatFileSize(document.file_size)}
                    </Typography>
                    <Box mt={1}>
                      <Chip
                        label={document.status || "unknown"}
                        size="small"
                        color={
                          document.status === "completed"
                            ? "success"
                            : document.status === "processing"
                              ? "warning"
                              : "default"
                        }
                      />
                    </Box>
                  </Stack>
                </CardContent>
                <CardActions sx={{ justifyContent: "space-between", px: 2, pb: 2 }}>
                  <Stack direction="row" spacing={1}>
                    {document.note_id ? (
                      <>
                        <Button
                          size="small"
                          variant="contained"
                          href={`/notes`}
                          startIcon={<OpenInNewIcon />}
                        >
                          View Note
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<ChatIcon />}
                          onClick={async () => {
                            try {
                              const result = await startConversation.mutateAsync({
                                scope: { type: "doc", ids: [document.note_id!] },
                                title: `Chat about ${document.title}`
                              });
                              navigate(`/chat/${result.conversation_id}`);
                            } catch (error) {
                              setErrorMessage("Failed to start conversation");
                            }
                          }}
                          disabled={startConversation.isPending}
                        >
                          Chat
                        </Button>
                      </>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        No note yet
                      </Typography>
                    )}
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    {document.storage_path && (
                      <IconButton
                        size="small"
                        color="primary"
                        title="Download PDF"
                        onClick={async () => {
                          try {
                            const { getDownloadURL, ref } = await import("firebase/storage");
                            const url = await getDownloadURL(ref(firebaseStorage, document.storage_path));
                            window.open(url, "_blank");
                          } catch (error) {
                            console.error("Download error:", error);
                            setErrorMessage("Failed to download file");
                          }
                        }}
                      >
                        <CloudUploadIcon sx={{ transform: "rotate(180deg)" }} />
                      </IconButton>
                    )}
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteDocument(document.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Stack>
                </CardActions>
              </Card>
            ))}
          </Box>
        )}
      </Box>
    </Stack >
  );
}
