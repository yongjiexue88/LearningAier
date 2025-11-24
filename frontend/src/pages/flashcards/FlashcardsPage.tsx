import AddIcon from "@mui/icons-material/AddRounded";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesomeRounded";
import DeleteIcon from "@mui/icons-material/DeleteOutlineRounded";
import RefreshIcon from "@mui/icons-material/RefreshRounded";
import ChatIcon from "@mui/icons-material/ChatRounded";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/EditRounded";
import { FirebaseError } from "firebase/app";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../providers/AuthProvider";
import { firebaseDb } from "../../lib/firebaseClient";
import { useGenerateFlashcards, useReviewFlashcard } from "../../services/hooks/useFlashcards";
import { useStartConversation } from "../../hooks/useChat";

dayjs.extend(relativeTime);

type FlashcardCategory = "vocabulary" | "concept" | "code" | "definition";

interface FolderRecord {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  user_id: string;
}

interface NoteListItem {
  id: string;
  title: string;
  folder_id: string;
  user_id: string;
  created_at?: string;
  updated_at?: string;
}

interface FlashcardRecord {
  id: string;
  user_id: string;
  note_id?: string | null;
  document_id?: string | null;
  set_id?: string | null;
  term?: string | null;
  definition: string;
  context?: string | null;
  category: FlashcardCategory;
  next_due_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface FlashcardReviewRecord {
  id: string;
  flashcard_id: string;
  user_id: string;
  response: "again" | "hard" | "good" | "easy";
  reviewed_at: string;
  next_due_at: string;
  interval_days: number;
}

interface SnackbarState {
  open: boolean;
  message: string;
  severity: "success" | "info" | "error";
}

function mapFolderDoc(docSnap: QueryDocumentSnapshot<DocumentData>): FolderRecord {
  const data = docSnap.data() as Omit<FolderRecord, "id">;
  return { id: docSnap.id, ...data };
}

function mapNoteDoc(docSnap: QueryDocumentSnapshot<DocumentData>): NoteListItem {
  const data = docSnap.data() as Omit<NoteListItem, "id">;
  return { id: docSnap.id, ...data };
}

function mapFlashcardDoc(
  docSnap: QueryDocumentSnapshot<DocumentData>
): FlashcardRecord {
  const data = docSnap.data() as Omit<FlashcardRecord, "id">;
  return { id: docSnap.id, ...data };
}

function mapReviewDoc(
  docSnap: QueryDocumentSnapshot<DocumentData>
): FlashcardReviewRecord {
  const data = docSnap.data() as Omit<FlashcardReviewRecord, "id">;
  return { id: docSnap.id, ...data };
}

function isMissingIndexError(error: unknown): error is FirebaseError {
  return error instanceof FirebaseError && error.code === "failed-precondition";
}

export function FlashcardsPage() {
  const { user } = useAuth();
  const userId = user?.uid ?? null;
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const startConversation = useStartConversation();

  const [selectedFolderId, setSelectedFolderId] = useState<string>("");
  const [selectedNoteId, setSelectedNoteId] = useState<string>("");
  const [dueOnly, setDueOnly] = useState<boolean>(true);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [showAnswerFor, setShowAnswerFor] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: "",
    severity: "success",
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingCard, setEditingCard] = useState<FlashcardRecord | null>(null);

  const [newFlashcard, setNewFlashcard] = useState<{
    term: string;
    definition: string;
    context: string;
    category: FlashcardCategory;
  }>({
    term: "",
    definition: "",
    context: "",
    category: "vocabulary",
  });

  const foldersQuery = useQuery({
    enabled: Boolean(userId),
    queryKey: ["flashcards", "folders", userId],
    queryFn: async (): Promise<FolderRecord[]> => {
      if (!userId) return [];
      const baseQuery = query(
        collection(firebaseDb, "folders"),
        where("user_id", "==", userId)
      );
      try {
        const snapshot = await getDocs(
          query(baseQuery, orderBy("sort_order", "asc"))
        );
        return snapshot.docs.map(mapFolderDoc);
      } catch (error) {
        if (isMissingIndexError(error)) {
          const snapshot = await getDocs(baseQuery);
          return snapshot.docs
            .map(mapFolderDoc)
            .sort((a, b) => a.sort_order - b.sort_order);
        }
        throw error;
      }
    },
  });

  const notesQuery = useQuery({
    enabled: Boolean(userId),
    queryKey: ["flashcards", "notes", userId],
    queryFn: async (): Promise<NoteListItem[]> => {
      if (!userId) return [];
      const baseQuery = query(
        collection(firebaseDb, "notes"),
        where("user_id", "==", userId)
      );
      try {
        const snapshot = await getDocs(
          query(baseQuery, orderBy("sort_order", "asc"))
        );
        return snapshot.docs.map(mapNoteDoc);
      } catch (error) {
        if (isMissingIndexError(error)) {
          const snapshot = await getDocs(baseQuery);
          return snapshot.docs
            .map(mapNoteDoc)
            .sort((a, b) => (a.title ?? "").localeCompare(b.title ?? ""));
        }
        throw error;
      }
    },
  });

  const flashcardsQuery = useQuery({
    enabled: Boolean(userId),
    queryKey: ["flashcards", "list", userId],
    queryFn: async (): Promise<FlashcardRecord[]> => {
      if (!userId) return [];
      const baseQuery = query(
        collection(firebaseDb, "flashcards"),
        where("user_id", "==", userId)
      );
      try {
        const snapshot = await getDocs(
          query(baseQuery, orderBy("next_due_at", "asc"))
        );
        return snapshot.docs.map(mapFlashcardDoc);
      } catch (error) {
        if (isMissingIndexError(error)) {
          const snapshot = await getDocs(baseQuery);
          return snapshot.docs.map(mapFlashcardDoc);
        }
        throw error;
      }
    },
  });

  const reviewsQuery = useQuery({
    enabled: Boolean(userId),
    queryKey: ["flashcards", "reviews", userId],
    queryFn: async (): Promise<FlashcardReviewRecord[]> => {
      if (!userId) return [];
      const baseQuery = query(
        collection(firebaseDb, "flashcard_reviews"),
        where("user_id", "==", userId)
      );
      try {
        const snapshot = await getDocs(
          query(baseQuery, orderBy("reviewed_at", "desc"))
        );
        return snapshot.docs.map(mapReviewDoc);
      } catch (error) {
        if (isMissingIndexError(error)) {
          const snapshot = await getDocs(baseQuery);
          return snapshot.docs
            .map(mapReviewDoc)
            .sort((a, b) =>
              (b.reviewed_at ?? "").localeCompare(a.reviewed_at ?? "")
            );
        }
        throw error;
      }
    },
  });

  const notesById = useMemo(() => {
    return new Map((notesQuery.data ?? []).map((note) => [note.id, note]));
  }, [notesQuery.data]);

  const filteredFlashcards = useMemo(() => {
    const endOfToday = dayjs().endOf("day");
    const noteFiltered = (flashcardsQuery.data ?? []).filter((card) => {
      if (selectedNoteId && card.note_id !== selectedNoteId) return false;
      if (selectedFolderId) {
        const note = card.note_id ? notesById.get(card.note_id) : null;
        if (!note || note.folder_id !== selectedFolderId) return false;
      }
      if (dueOnly) {
        const nextDue = card.next_due_at ? dayjs(card.next_due_at) : null;
        if (nextDue && nextDue.isAfter(endOfToday)) return false;
      }
      return true;
    });
    return noteFiltered.sort((a, b) => {
      const aDue = a.next_due_at ?? "";
      const bDue = b.next_due_at ?? "";
      return aDue.localeCompare(bDue);
    });
  }, [flashcardsQuery.data, selectedNoteId, selectedFolderId, dueOnly, notesById]);

  const activeCard = useMemo(() => {
    if (!filteredFlashcards.length) return null;
    if (activeCardId) {
      const found = filteredFlashcards.find((card) => card.id === activeCardId);
      if (found) return found;
    }
    return filteredFlashcards[0];
  }, [filteredFlashcards, activeCardId]);

  useEffect(() => {
    if (filteredFlashcards.length === 0) {
      setActiveCardId(null);
      setShowAnswerFor(null);
      return;
    }
    if (!activeCardId || !filteredFlashcards.some((card) => card.id === activeCardId)) {
      setActiveCardId(filteredFlashcards[0]?.id ?? null);
      setShowAnswerFor(null);
    }
  }, [filteredFlashcards, activeCardId]);

  const showSnackbar = (message: string, severity: SnackbarState["severity"] = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const createFlashcardMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("User not found");
      if (!newFlashcard.definition.trim()) {
        throw new Error("Please enter a definition.");
      }
      const now = new Date().toISOString();
      const payload: Omit<FlashcardRecord, "id"> = {
        user_id: userId,
        note_id: selectedNoteId || null,
        document_id: null,
        term: newFlashcard.term || null,
        definition: newFlashcard.definition,
        context: newFlashcard.context || null,
        category: newFlashcard.category,
        next_due_at: now,
        created_at: now,
        updated_at: now,
      };
      const ref = await addDoc(collection(firebaseDb, "flashcards"), payload);
      return { id: ref.id, ...payload } satisfies FlashcardRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flashcards", "list", userId] });
      setNewFlashcard((prev) => ({ ...prev, term: "", definition: "", context: "" }));
      showSnackbar("Flashcard created");
    },
    onError: (error: any) => showSnackbar(error?.message ?? "Failed to create flashcard", "error"),
  });

  const deleteFlashcardMutation = useMutation({
    mutationFn: async (flashcardId: string) => {
      await deleteDoc(doc(collection(firebaseDb, "flashcards"), flashcardId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flashcards", "list", userId] });
      showSnackbar("Flashcard deleted", "info");
      setSelectedIds((prev) => {
        const next = new Set(prev);
        // We don't know which ID was deleted here easily without passing it, 
        // but it's fine, the list will update.
        return next;
      });
    },
    onError: (error: any) => showSnackbar(error?.message ?? "Delete failed", "error"),
  });

  const updateFlashcardMutation = useMutation({
    mutationFn: async (card: FlashcardRecord) => {
      if (!userId) throw new Error("User not found");
      const { id, ...data } = card;
      const ref = doc(firebaseDb, "flashcards", id);
      await updateDoc(ref, {
        term: data.term,
        definition: data.definition,
        context: data.context,
        category: data.category,
        updated_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flashcards", "list", userId] });
      setEditingCard(null);
      showSnackbar("Flashcard updated");
    },
    onError: (error: any) => showSnackbar(error?.message ?? "Update failed", "error"),
  });

  const batchDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const batch = writeBatch(firebaseDb);
      ids.forEach((id) => {
        const ref = doc(firebaseDb, "flashcards", id);
        batch.delete(ref);
      });
      await batch.commit();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flashcards", "list", userId] });
      setSelectedIds(new Set());
      showSnackbar("Selected flashcards deleted", "info");
    },
    onError: (error: any) => showSnackbar(error?.message ?? "Batch delete failed", "error"),
  });

  // Use new React Query hook for flashcard review
  const reviewMutation = useReviewFlashcard();

  const handleReview = (cardId: string, quality: number) => {
    reviewMutation.mutate(
      {
        flashcard_id: cardId,
        quality,
      },
      {
        onSuccess: () => {
          setShowAnswerFor(null);
          queryClient.invalidateQueries({ queryKey: ["flashcards", "list", userId] });
          queryClient.invalidateQueries({ queryKey: ["flashcards", "reviews", userId] });
        },
        onError: (error: any) => {
          showSnackbar(error?.message ?? "Review failed", "error");
        },
      }
    );
  };

  // Use new React Query hook for flashcard generation
  const generateMutation = useGenerateFlashcards();

  const handleGenerate = () => {
    if (!selectedNoteId) {
      showSnackbar("Select a note to generate from", "error");
      return;
    }

    generateMutation.mutate(
      {
        note_id: selectedNoteId,
        count: 10,
        auto_save: true,
      },
      {
        onSuccess: (data) => {
          console.info("[flashcards] generation success", {
            noteId: selectedNoteId,
            generated: data.flashcards?.length ?? 0,
          });
          queryClient.invalidateQueries({ queryKey: ["flashcards", "list", userId] });
          showSnackbar(`Generated ${data.flashcards?.length ?? 0} flashcards`);
        },
        onError: (error: any) => {
          console.error("[flashcards] generation failed", error);
          showSnackbar(error?.message ?? "Generation failed", "error");
        },
      }
    );
  };

  const lastReviewByCard = useMemo(() => {
    const map = new Map<string, FlashcardReviewRecord>();
    for (const review of reviewsQuery.data ?? []) {
      const existing = map.get(review.flashcard_id);
      if (!existing || dayjs(review.reviewed_at).isAfter(dayjs(existing.reviewed_at))) {
        map.set(review.flashcard_id, review);
      }
    }
    return map;
  }, [reviewsQuery.data]);

  const stats = useMemo(() => {
    const total = filteredFlashcards.length;
    const endOfToday = dayjs().endOf("day");
    const due = filteredFlashcards.filter((card) => {
      if (!card.next_due_at) return true;
      return dayjs(card.next_due_at).isBefore(endOfToday);
    }).length;
    const reviewedThisWeek = (reviewsQuery.data ?? []).filter((review) =>
      dayjs(review.reviewed_at).isAfter(dayjs().subtract(7, "day"))
    ).length;
    const mastered = filteredFlashcards.filter((card) => {
      const last = lastReviewByCard.get(card.id);
      return last && last.interval_days >= 7;
    }).length;
    return {
      total,
      due,
      reviewedThisWeek,
      mastered,
      completion: total ? Math.round(((total - due) / total) * 100) : 0,
    };
  }, [filteredFlashcards, reviewsQuery.data, lastReviewByCard]);

  const availableNotes = useMemo(() => {
    const notes = notesQuery.data ?? [];
    if (!selectedFolderId) return notes;
    return notes.filter((note) => note.folder_id === selectedFolderId);
  }, [notesQuery.data, selectedFolderId]);

  const activeAnswerShown = activeCard && showAnswerFor === activeCard.id;

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newSelecteds = new Set(selectedIds);
    if (event.target.checked) {
      paginatedFlashcards.forEach((card) => newSelecteds.add(card.id));
    } else {
      paginatedFlashcards.forEach((card) => newSelecteds.delete(card.id));
    }
    setSelectedIds(newSelecteds);
  };

  const handleSelectOne = (event: React.MouseEvent<unknown>, id: string) => {
    event.stopPropagation();
    const newSelecteds = new Set(selectedIds);
    if (selectedIds.has(id)) {
      newSelecteds.delete(id);
    } else {
      newSelecteds.add(id);
    }
    setSelectedIds(newSelecteds);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const paginatedFlashcards = useMemo(() => {
    return filteredFlashcards.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [filteredFlashcards, page, rowsPerPage]);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" fontWeight={700}>
          Flashcards
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Create, review, and track bilingual flashcards with spaced repetition powered by Firestore.
        </Typography>
      </Box>

      <Paper sx={{ p: 2 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(5, 1fr)" },
            gap: 2,
          }}
        >
          <TextField
            select
            label="Folder"
            size="small"
            value={selectedFolderId}
            onChange={(event) => {
              setSelectedFolderId(event.target.value);
              setSelectedNoteId("");
            }}
          >
            <MenuItem value="">All folders</MenuItem>
            {(foldersQuery.data ?? []).map((folder) => (
              <MenuItem key={folder.id} value={folder.id}>
                {folder.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Note"
            size="small"
            value={selectedNoteId}
            onChange={(event) => setSelectedNoteId(event.target.value)}
            SelectProps={{ displayEmpty: true }}
          >
            <MenuItem value="">All notes</MenuItem>
            {availableNotes.map((note) => (
              <MenuItem key={note.id} value={note.id}>
                {note.title || "Untitled"}
              </MenuItem>
            ))}
          </TextField>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Switch
              checked={dueOnly}
              onChange={(event) => setDueOnly(event.target.checked)}
              inputProps={{ "aria-label": "Due today only" }}
            />
            <Typography variant="body2">Due today only</Typography>
          </Stack>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["flashcards", "list", userId] });
              queryClient.invalidateQueries({ queryKey: ["flashcards", "reviews", userId] });
            }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AutoAwesomeIcon />}
            onClick={handleGenerate}
            disabled={!selectedNoteId || generateMutation.isPending}
          >
            {generateMutation.isPending ? "Generating..." : "Generate from note"}
          </Button>
          <Button
            variant="outlined"
            startIcon={<ChatIcon />}
            onClick={async () => {
              if (!selectedNoteId) {
                showSnackbar("Select a note first", "info");
                return;
              }
              try {
                const note = notesById.get(selectedNoteId);
                const result = await startConversation.mutateAsync({
                  scope: { type: "doc", ids: [selectedNoteId] },
                  title: `Chat about ${note?.title || "flashcards"}`
                });
                navigate(`/chat/${result.conversation_id}`);
              } catch (error) {
                showSnackbar("Failed to start conversation", "error");
              }
            }}
            disabled={!selectedNoteId || startConversation.isPending}
          >
            {startConversation.isPending ? "Starting..." : "Chat about this deck"}
          </Button>
        </Box>
      </Paper>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(4, 1fr)" },
          gap: 2,
        }}
      >
        <Paper sx={{ p: 2 }}>
          <Typography variant="overline" color="text.secondary">
            Due today
          </Typography>
          <Typography variant="h4">{stats.due}</Typography>
          <Typography variant="body2" color="text.secondary">
            Cards needing attention before midnight.
          </Typography>
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Typography variant="overline" color="text.secondary">
            Total cards
          </Typography>
          <Typography variant="h4">{stats.total}</Typography>
          <Typography variant="body2" color="text.secondary">
            Within your current filters.
          </Typography>
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Typography variant="overline" color="text.secondary">
            Reviewed (7d)
          </Typography>
          <Typography variant="h4">{stats.reviewedThisWeek}</Typography>
          <Typography variant="body2" color="text.secondary">
            Recent reps tracked in Firestore.
          </Typography>
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Typography variant="overline" color="text.secondary">
            Mastered
          </Typography>
          <Typography variant="h4">{stats.mastered}</Typography>
          <Typography variant="body2" color="text.secondary">
            Interval 7+ days. Keep going!
          </Typography>
        </Paper>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "5fr 4fr" },
          gap: 3,
        }}
      >
        <Card sx={{ minHeight: 320, display: "flex", flexDirection: "column" }}>
          <CardContent sx={{ flexGrow: 1 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
              <Box>
                <Typography variant="overline" color="text.secondary">
                  Review queue
                </Typography>
                <Typography variant="h5" gutterBottom>
                  {activeCard
                    ? activeCard.term || "Untitled term"
                    : "No cards due"}
                </Typography>
              </Box>
              <Chip label={`${filteredFlashcards.length} in view`} />
            </Stack>
            {activeCard ? (
              <Stack spacing={1}>
                {activeCard.context ? (
                  <Typography variant="body2" color="text.secondary">
                    {activeCard.context}
                  </Typography>
                ) : null}
                <Typography variant="subtitle2" color="text.secondary">
                  {(activeCard.category?.toUpperCase() ?? "VOCABULARY")}
                  {activeCard.note_id && notesById.get(activeCard.note_id)
                    ? ` • ${notesById.get(activeCard.note_id)?.title ?? ""}`
                    : ""}
                </Typography>
                <Divider sx={{ my: 1 }} />
                {activeAnswerShown ? (
                  <Stack spacing={1}>
                    <Typography variant="body1">
                      {activeCard.definition}
                    </Typography>
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Tap "Show answer" when you're ready, then choose Needs review or I knew this to update Firestore.
                  </Typography>
                )}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                You're caught up! Pick a folder/note above or generate cards from a note.
              </Typography>
            )}
          </CardContent>
          <Box sx={{ p: 2, display: "flex", gap: 1 }}>
            <Button
              variant="outlined"
              fullWidth
              disabled={!activeCard}
              onClick={() => activeCard && setShowAnswerFor(activeCard.id)}
            >
              Show answer
            </Button>
          </Box>
          <Box
            sx={{
              display: "flex",
              gap: 1,
              p: 2,
              borderTop: "1px solid",
              borderColor: "divider",
            }}
          >
            <Button
              size="small"
              variant="outlined"
              color="warning"
              sx={{ flex: 1 }}
              disabled={!activeCard || !activeAnswerShown || reviewMutation.isPending}
              onClick={() =>
                activeCard &&
                handleReview(activeCard.id, 0)
              }
            >
              Needs review
            </Button>
            <Button
              size="small"
              variant="contained"
              color="success"
              sx={{ flex: 1 }}
              disabled={!activeCard || !activeAnswerShown || reviewMutation.isPending}
              onClick={() =>
                activeCard &&
                handleReview(activeCard.id, 5)
              }
            >
              I knew this
            </Button>
          </Box>
        </Card>

        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Create flashcard
          </Typography>
          <Stack spacing={1.5}>
            <TextField
              label="Term"
              size="small"
              placeholder="Term in any language"
              value={newFlashcard.term}
              onChange={(event) => setNewFlashcard((prev) => ({ ...prev, term: event.target.value }))}
            />
            <TextField
              label="Definition"
              size="small"
              multiline
              minRows={2}
              placeholder="Definition in your preferred language"
              value={newFlashcard.definition}
              onChange={(event) =>
                setNewFlashcard((prev) => ({ ...prev, definition: event.target.value }))
              }
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <TextField
                label="Context"
                size="small"
                fullWidth
                placeholder="Optional usage/example"
                value={newFlashcard.context}
                onChange={(event) => setNewFlashcard((prev) => ({ ...prev, context: event.target.value }))}
              />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <TextField
                select
                label="Category"
                size="small"
                fullWidth
                value={newFlashcard.category}
                onChange={(event) =>
                  setNewFlashcard((prev) => ({
                    ...prev,
                    category: event.target.value as FlashcardCategory,
                  }))
                }
              >
                {(["vocabulary", "concept", "code", "definition"] as FlashcardCategory[]).map(
                  (cat) => (
                    <MenuItem key={cat} value={cat}>
                      {cat.toUpperCase()}
                    </MenuItem>
                  )
                )}
              </TextField>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => createFlashcardMutation.mutate()}
                disabled={createFlashcardMutation.isPending}
              >
                {createFlashcardMutation.isPending ? "Saving..." : "Save flashcard"}
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 3,
        }}
      >
        <Paper sx={{ p: 2 }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={1}
            mb={1}
          >
            <Box>
              <Typography variant="subtitle1" fontWeight={600}>
                Card list
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Browse, delete, or jump to a card. Filters above limit the view.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center">
              {selectedIds.size > 0 && (
                <Button
                  size="small"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => {
                    if (window.confirm(`Delete ${selectedIds.size} selected cards?`)) {
                      batchDeleteMutation.mutate(Array.from(selectedIds));
                    }
                  }}
                >
                  Delete Selected ({selectedIds.size})
                </Button>
              )}
              <Chip label={`${filteredFlashcards.length} cards`} />
            </Stack>
          </Stack>
          <Divider sx={{ mb: 1 }} />
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    color="primary"
                    indeterminate={
                      paginatedFlashcards.some((card) => selectedIds.has(card.id)) &&
                      !paginatedFlashcards.every((card) => selectedIds.has(card.id))
                    }
                    checked={
                      paginatedFlashcards.length > 0 &&
                      paginatedFlashcards.every((card) => selectedIds.has(card.id))
                    }
                    onChange={handleSelectAll}
                  />
                </TableCell>
                <TableCell>Term</TableCell>
                <TableCell>Definition</TableCell>
                <TableCell>Due</TableCell>
                <TableCell>Context</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedFlashcards.map((card) => {
                const noteTitle = card.note_id
                  ? notesById.get(card.note_id)?.title ?? "Note removed"
                  : "Manual";
                const dueLabel = card.next_due_at
                  ? dayjs(card.next_due_at).fromNow()
                  : "Due now";
                const isSelected = selectedIds.has(card.id);

                return (
                  <TableRow
                    key={card.id}
                    hover
                    selected={isSelected || activeCard?.id === card.id}
                    sx={{ cursor: "pointer" }}
                    onClick={() => {
                      setActiveCardId(card.id);
                      setShowAnswerFor(null);
                    }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        color="primary"
                        checked={isSelected}
                        onClick={(event) => handleSelectOne(event, card.id)}
                      />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 180 }}>
                      <Typography variant="body2" noWrap title={card.term ?? ""}>
                        {card.term || "—"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap title={card.definition}>
                        {card.definition}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        color={
                          !card.next_due_at || dayjs(card.next_due_at).isBefore(dayjs())
                            ? "error"
                            : "default"
                        }
                        label={dueLabel}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap title={card.context ?? ""}>
                        {card.context || "—"}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" justifyContent="flex-end">
                        <IconButton
                          size="small"
                          onClick={(event) => {
                            event.stopPropagation();
                            setEditingCard(card);
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={(event) => {
                            event.stopPropagation();
                            const confirmDelete = window.confirm("Delete this flashcard?");
                            if (confirmDelete) {
                              deleteFlashcardMutation.mutate(card.id);
                            }
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!filteredFlashcards.length ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
                      No flashcards found. Try another filter or generate from a note.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
          <TablePagination
            rowsPerPageOptions={[10, 20, 30, 40, 50]}
            component="div"
            count={filteredFlashcards.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Paper>

      </Box>

      {/* Edit Dialog */}
      <Dialog open={Boolean(editingCard)} onClose={() => setEditingCard(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Flashcard</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Term"
              fullWidth
              value={editingCard?.term ?? ""}
              onChange={(e) =>
                setEditingCard((prev) => (prev ? { ...prev, term: e.target.value } : null))
              }
            />
            <TextField
              label="Definition"
              fullWidth
              multiline
              minRows={3}
              value={editingCard?.definition ?? ""}
              onChange={(e) =>
                setEditingCard((prev) => (prev ? { ...prev, definition: e.target.value } : null))
              }
            />
            <TextField
              label="Context"
              fullWidth
              value={editingCard?.context ?? ""}
              onChange={(e) =>
                setEditingCard((prev) => (prev ? { ...prev, context: e.target.value } : null))
              }
            />
            <TextField
              select
              label="Category"
              fullWidth
              value={editingCard?.category ?? "vocabulary"}
              onChange={(e) =>
                setEditingCard((prev) =>
                  prev ? { ...prev, category: e.target.value as FlashcardCategory } : null
                )
              }
            >
              {(["vocabulary", "concept", "code", "definition"] as FlashcardCategory[]).map((cat) => (
                <MenuItem key={cat} value={cat}>
                  {cat.toUpperCase()}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingCard(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              if (editingCard) {
                updateFlashcardMutation.mutate(editingCard);
              }
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Stack >
  );
}
