import AddIcon from "@mui/icons-material/AddRounded";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesomeRounded";
import DeleteIcon from "@mui/icons-material/DeleteOutlineRounded";
import RefreshIcon from "@mui/icons-material/RefreshRounded";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  IconButton,
  LinearProgress,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { FirebaseError } from "firebase/app";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../providers/AuthProvider";
import { firebaseDb } from "../../lib/firebaseClient";
import { invokeFunction } from "../../lib/apiClient";

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
  term_zh?: string | null;
  term_en?: string | null;
  definition_zh: string;
  definition_en: string;
  context_zh?: string | null;
  context_en?: string | null;
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

type ReviewResponse = FlashcardReviewRecord["response"];

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
  const { user, getIdToken } = useAuth();
  const userId = user?.uid ?? null;
  const queryClient = useQueryClient();

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
        term_en: newFlashcard.term || null,
        term_zh: newFlashcard.term || null,
        definition_en: newFlashcard.definition,
        definition_zh: newFlashcard.definition,
        context_en: newFlashcard.context || null,
        context_zh: newFlashcard.context || null,
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
    },
    onError: (error: any) => showSnackbar(error?.message ?? "Delete failed", "error"),
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ cardId, response }: { cardId: string; response: ReviewResponse }) => {
      const token = await getIdToken();
      if (!token) throw new Error("Missing auth token");
      return invokeFunction<{ next_due_at: string }>({
        name: "flashcards-review",
        idToken: token,
        body: { flashcard_id: cardId, response },
      });
    },
    onSuccess: () => {
      setShowAnswerFor(null);
      queryClient.invalidateQueries({ queryKey: ["flashcards", "list", userId] });
      queryClient.invalidateQueries({ queryKey: ["flashcards", "reviews", userId] });
    },
    onError: (error: any) => showSnackbar(error?.message ?? "Review failed", "error"),
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedNoteId) {
        throw new Error("Select a note to generate from");
      }
      const token = await getIdToken();
      if (!token) throw new Error("Missing auth token");
      return invokeFunction<{ flashcards: FlashcardRecord[]; saved_count: number }>({
        name: "ai-flashcards-generate",
        idToken: token,
        body: { note_id: selectedNoteId },
      });
    },
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
  });

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

  const forgettingCurve = useMemo(() => {
    if (!filteredFlashcards.length) return [];
    const days = 7;
    const now = dayjs();
    return Array.from({ length: days }).map((_, index) => {
      const targetDate = now.add(index, "day");
      let totalProb = 0;
      filteredFlashcards.forEach((card) => {
        const lastReview = lastReviewByCard.get(card.id);
        const lastDate = lastReview
          ? dayjs(lastReview.reviewed_at)
          : dayjs(card.next_due_at ?? card.created_at ?? now.toISOString());
        const interval = Math.max(1, lastReview?.interval_days ?? 1);
        const daysElapsed = targetDate.diff(lastDate, "day");
        const retention = Math.exp(-daysElapsed / (interval * 1.4));
        totalProb += retention;
      });
      const average = totalProb / filteredFlashcards.length;
      return { label: targetDate.format("ddd"), value: Math.round(average * 100) };
    });
  }, [filteredFlashcards, lastReviewByCard]);

  const availableNotes = useMemo(() => {
    const notes = notesQuery.data ?? [];
    if (!selectedFolderId) return notes;
    return notes.filter((note) => note.folder_id === selectedFolderId);
  }, [notesQuery.data, selectedFolderId]);

  const activeAnswerShown = activeCard && showAnswerFor === activeCard.id;

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
            onClick={() => generateMutation.mutate()}
            disabled={!selectedNoteId || generateMutation.isPending}
          >
            {generateMutation.isPending ? "Generating..." : "Generate from note"}
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
                    ? activeCard.term_en || activeCard.term_zh || "Untitled term"
                    : "No cards due"}
                </Typography>
              </Box>
              <Chip label={`${filteredFlashcards.length} in view`} />
            </Stack>
            {activeCard ? (
              <Stack spacing={1}>
                {activeCard.context_en || activeCard.context_zh ? (
                  <Typography variant="body2" color="text.secondary">
                    {activeCard.context_en || activeCard.context_zh}
                  </Typography>
                ) : null}
                <Typography variant="subtitle2" color="text.secondary">
                  {activeCard.category.toUpperCase()}
                  {activeCard.note_id && notesById.get(activeCard.note_id)
                    ? ` • ${notesById.get(activeCard.note_id)?.title ?? ""}`
                    : ""}
                </Typography>
                <Divider sx={{ my: 1 }} />
                {activeAnswerShown ? (
                  <Stack spacing={1}>
                    <Typography variant="body1">
                      {activeCard.definition_en}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      {activeCard.definition_zh}
                    </Typography>
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Tap "Show answer" when you're ready. Responses update Firestore review history.
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
            {(["again", "hard", "good", "easy"] as ReviewResponse[]).map((label) => (
              <Button
                key={label}
                size="small"
                variant="contained"
                color={label === "easy" ? "success" : label === "again" ? "error" : "primary"}
                sx={{ flex: 1 }}
                disabled={!activeCard || !activeAnswerShown || reviewMutation.isPending}
                onClick={() =>
                  activeCard &&
                  reviewMutation.mutate({ cardId: activeCard.id, response: label })
                }
              >
                {label.charAt(0).toUpperCase() + label.slice(1)}
              </Button>
            ))}
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
          gridTemplateColumns: { xs: "1fr", lg: "7fr 5fr" },
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
            <Chip label={`${filteredFlashcards.length} cards`} />
          </Stack>
              <Divider sx={{ mb: 1 }} />
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Term</TableCell>
                    <TableCell>Definition</TableCell>
                    <TableCell>Due</TableCell>
                    <TableCell>Note</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
            <TableBody>
              {filteredFlashcards.map((card) => {
                const noteTitle = card.note_id
                  ? notesById.get(card.note_id)?.title ?? "Note removed"
                  : "Manual";
                const dueLabel = card.next_due_at
                  ? dayjs(card.next_due_at).fromNow()
                  : "Due now";
                return (
                  <TableRow
                    key={card.id}
                    hover
                    selected={activeCard?.id === card.id}
                    sx={{ cursor: "pointer" }}
                    onClick={() => {
                      setActiveCardId(card.id);
                      setShowAnswerFor(null);
                    }}
                  >
                    <TableCell sx={{ maxWidth: 180 }}>
                      <Typography variant="body2" noWrap title={card.term_en ?? card.term_zh ?? ""}>
                        {card.term_en || card.term_zh || "—"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {card.category.toUpperCase()}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 240 }}>
                      <Typography variant="body2" noWrap title={card.definition_en}>
                        {card.definition_en}
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
                      <Typography variant="body2" noWrap title={noteTitle}>
                        {noteTitle}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
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
                    </TableCell>
                  </TableRow>
                );
              })}
              {!filteredFlashcards.length ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Typography variant="body2" color="text.secondary">
                      No flashcards found. Try another filter or generate from a note.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </Paper>

        <Paper sx={{ p: 2, position: "relative" }}>
          <Typography variant="subtitle1" fontWeight={600}>
            Forgetting curve (projection)
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={1}>
            Based on your latest intervals. Higher is better; review before the curve dips.
          </Typography>
          {!forgettingCurve.length ? (
            <Typography variant="body2" color="text.secondary">
              Add or review cards to see a projection.
            </Typography>
          ) : (
            <Box sx={{ mt: 1 }}>
              <svg viewBox="0 0 300 160" role="presentation" width="100%" height="160">
                <polyline
                  fill="none"
                  stroke="#1e6ad4"
                  strokeWidth={3}
                  points={forgettingCurve
                    .map((point, idx) => {
                      const x = (300 / Math.max(1, forgettingCurve.length - 1)) * idx;
                      const y = 150 - (point.value / 100) * 140;
                      return `${x},${y}`;
                    })
                    .join(" ")}
                />
                {forgettingCurve.map((point, idx) => {
                  const x = (300 / Math.max(1, forgettingCurve.length - 1)) * idx;
                  const y = 150 - (point.value / 100) * 140;
                  return (
                    <g key={point.label}>
                      <circle cx={x} cy={y} r={4} fill="#1e6ad4" />
                      <text x={x} y={155} fontSize="10" textAnchor="middle" fill="#6c757d">
                        {point.label}
                      </text>
                      <text x={x} y={y - 8} fontSize="11" textAnchor="middle" fill="#1e6ad4">
                        {point.value}%
                      </text>
                    </g>
                  );
                })}
              </svg>
              <LinearProgress
                variant="determinate"
                value={stats.completion}
                sx={{ mt: 1 }}
              />
              <Typography variant="caption" color="text.secondary">
                Overall completion: {stats.completion}% of visible cards not due.
              </Typography>
            </Box>
          )}
        </Paper>
      </Box>

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
    </Stack>
  );
}
