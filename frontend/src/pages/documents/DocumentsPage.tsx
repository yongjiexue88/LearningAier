import CloudUploadIcon from "@mui/icons-material/CloudUploadRounded";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import {
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
  CircularProgress,
  Alert,
  LinearProgress,
} from "@mui/material";
import { useState, useCallback } from "react";
import { firebaseAuth, firebaseStorage, firebaseDb } from "../../lib/firebaseClient";
import { ref, uploadBytesResumable } from "firebase/storage";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useProcessDocument } from "../../services/hooks/useDocuments";

type UploadStatus = "idle" | "uploading" | "processing" | "success" | "error";

export function DocumentsPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [summaryZh, setSummaryZh] = useState("");
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [noteId, setNoteId] = useState<string | null>(null);

  const processDocumentMutation = useProcessDocument();

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
      const docRef = await addDoc(collection(firebaseDb, "documents"), {
        user_id: user.uid,
        title: selectedFile.name.replace(".pdf", ""),
        file_name: selectedFile.name,
        file_size: selectedFile.size,
        status: "uploading",
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
    </Stack>
  );
}
