import AddIcon from "@mui/icons-material/AddRounded";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesomeRounded";
import QuestionAnswerIcon from "@mui/icons-material/QuestionAnswerRounded";
import StyleIcon from "@mui/icons-material/StyleRounded";
import FolderIcon from "@mui/icons-material/FolderRounded";
import ExpandMoreIcon from "@mui/icons-material/ExpandMoreRounded";
import ChevronRightIcon from "@mui/icons-material/ChevronRightRounded";
import MoreVertIcon from "@mui/icons-material/MoreVertRounded";
import DeleteIcon from "@mui/icons-material/DeleteOutlineRounded";
import RenameIcon from "@mui/icons-material/DriveFileRenameOutlineRounded";
import SyncIcon from "@mui/icons-material/SyncRounded";
import CompareIcon from "@mui/icons-material/CompareArrowsRounded";
import TranslateIcon from "@mui/icons-material/GTranslate";
import HistoryIcon from "@mui/icons-material/HistoryRounded";
import SaveIcon from "@mui/icons-material/SaveRounded";
import DuplicateIcon from "@mui/icons-material/ContentCopyRounded";
import CloudUploadIcon from "@mui/icons-material/CloudUploadRounded";
import ImageIcon from "@mui/icons-material/ImageRounded";
import CodeIcon from "@mui/icons-material/CodeRounded";
import PreviewIcon from "@mui/icons-material/PreviewRounded";
import RefreshIcon from "@mui/icons-material/RefreshRounded";
import TimerIcon from "@mui/icons-material/TimerRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  IconButton,
  InputAdornment,
  LinearProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useAuth } from "../../providers/AuthProvider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { saveAs } from "file-saver";
import {
  buildFolderTree,
  computeSortOrder,
  computeWordStats,
  extractHeadings,
  formatReadingTime,
  isDescendant,
  noteProcessorResultToMarkdown,
  slugify,
  type FolderNode,
  type FolderRecord,
} from "./utils";
import { FirebaseError } from "firebase/app";
import { createAnkiExporter } from "../../lib/ankiExport";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  limit,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import {
  firebaseDb,
  firebaseStorage,
} from "../../lib/firebaseClient";
import { invokeFunction } from "../../lib/apiClient";

const DOCUMENTS_BUCKET = "documents";
const NOTE_ASSETS_BUCKET = "note-assets";
const AUTO_HISTORY_INTERVAL_MS = 60_000;

interface NoteListItem {
  id: string;
  title: string;
  folder_id: string;
  created_at: string;
  updated_at: string;
  word_count: number;
  reading_time_seconds: number;
  auto_save_version: number;
}

interface NoteDetail extends NoteListItem {
  content_md_zh: string | null;
  content_md_en: string | null;
  auto_saved_at: string | null;
  primary_language: "zh" | "en";
}

interface NoteVersion {
  id: string;
  note_id: string;
  created_at: string;
  snapshot_reason: "auto" | "manual" | "restore" | "system";
  language_tab: "zh" | "en";
  title: string;
  content_md_zh: string | null;
  content_md_en: string | null;
  metadata?: {
    word_count?: number;
    reading_time_seconds?: number;
  };
}

interface FlashcardRecord {
  id: string;
  term_zh: string | null;
  term_en: string | null;
  definition_zh: string;
  definition_en: string;
  context_zh: string | null;
  context_en: string | null;
  category: string;
  created_at: string;
}

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  language?: "zh" | "en";
}

interface ChatMessage extends ConversationMessage {
  id: string;
  citations?: {
    id: string;
    note_id: string;
    source_title: string;
    similarity: number;
  }[];
}

const languageLabels: Record<"zh" | "en", string> = {
  zh: "Chinese",
  en: "English",
};

const markdownComponents = {
  code({
    inline,
    className,
    children,
    ...props
  }: {
    inline?: boolean;
    className?: string;
    children: React.ReactNode;
  }) {
    const match = /language-(\w+)/.exec(className ?? "");
    if (!inline && match) {
      return (
        <SyntaxHighlighter
          style={oneDark}
          language={match[1]}
          PreTag="div"
          {...props}
        >
          {String(children).replace(/\n$/, "")}
        </SyntaxHighlighter>
      );
    }
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  },
};

function isMissingIndexError(error: unknown): error is FirebaseError {
  return error instanceof FirebaseError && error.code === "failed-precondition";
}

function mapFolderDoc(
  docSnap: QueryDocumentSnapshot<DocumentData>
): FolderRecord {
  const data = docSnap.data() as Omit<FolderRecord, "id">;
  return { id: docSnap.id, ...data };
}

function mapNoteDoc(
  docSnap: QueryDocumentSnapshot<DocumentData>
): NoteListItem {
  const data = docSnap.data() as Omit<NoteListItem, "id">;
  return { id: docSnap.id, ...data };
}

function mapNoteVersionDoc(
  docSnap: QueryDocumentSnapshot<DocumentData>
): NoteVersion {
  const data = docSnap.data() as Omit<NoteVersion, "id">;
  return { id: docSnap.id, ...data };
}

type NoteDraftState = {
  title: string;
  zh: string;
  en: string;
};

export function NotesPage() {
  const { user, getIdToken } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.uid ?? null;

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [languageTab, setLanguageTab] = useState<"zh" | "en">("zh");
  const [noteDraft, setNoteDraft] = useState<NoteDraftState>({
    title: "",
    zh: "",
    en: "",
  });
  const [showPreview, setShowPreview] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatHistory, setChatHistory] = useState<ConversationMessage[]>([]);
  const [askAIScope, setAskAIScope] = useState<"note" | "folder" | "all">(
    "note"
  );
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "info" | "error";
  }>({ open: false, message: "", severity: "success" });
  const [folderMenu, setFolderMenu] = useState<{
    anchor: HTMLElement | null;
    folderId?: string;
  }>({ anchor: null });
  const [folderDialog, setFolderDialog] = useState<{
    mode: "create" | "rename";
    open: boolean;
    targetId?: string;
    name: string;
    parentId: string | null;
  }>({ mode: "create", open: false, name: "", parentId: null });
  const [generateNotesDialog, setGenerateNotesDialog] = useState(false);
  const [generateNotesInput, setGenerateNotesInput] = useState("");
  const [translationDialog, setTranslationDialog] = useState<{
    open: boolean;
    diff: { heading: string; issue: string; details: string }[];
    recommendations: string[];
  }>({ open: false, diff: [], recommendations: [] });
  const [latestFlashcards, setLatestFlashcards] = useState<FlashcardRecord[]>(
    []
  );
  const [flashcardDialogOpen, setFlashcardDialogOpen] = useState(false);
  const [uploadState, setUploadState] = useState<{
    status: "idle" | "uploading" | "processing";
    filename?: string;
  }>({ status: "idle" });
  const [isDocDragOver, setIsDocDragOver] = useState(false);
  const [autoSaveState, setAutoSaveState] = useState<
    "idle" | "saving" | "saved"
  >("idle");
  const lastHistoryRef = useRef<number>(0);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const markdownInputRef = useRef<HTMLTextAreaElement | null>(null);
  const [askAIInput, setAskAIInput] = useState("");
  const [askAILoading, setAskAILoading] = useState(false);
  const callFunction = useCallback(
    async <T,>(name: string, body: Record<string, unknown>): Promise<T> => {
      const token = await getIdToken();
      return invokeFunction<T>({ name, body, idToken: token });
    },
    [getIdToken]
  );

  const foldersQuery = useQuery({
    enabled: Boolean(userId),
    queryKey: ["folders", userId],
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
          console.warn(
            [
              "Firestore missing index for folders (user_id + sort_order).",
              "Falling back to client-side sorting; create the index for best performance.",
            ].join(" ")
          );
          const fallbackSnapshot = await getDocs(baseQuery);
          return fallbackSnapshot.docs
            .map(mapFolderDoc)
            .sort((a, b) => a.sort_order - b.sort_order);
        }
        throw error;
      }
    },
  });

  const notesQuery = useQuery({
    enabled: Boolean(userId),
    queryKey: ["notes", "list", userId],
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
          console.warn(
            [
              "Firestore missing index for notes (user_id + sort_order).",
              "Falling back to client-side sorting; create the index for best performance.",
            ].join(" ")
          );
          const fallbackSnapshot = await getDocs(baseQuery);
          return fallbackSnapshot.docs
            .map(mapNoteDoc)
            .sort((a, b) => a.sort_order - b.sort_order);
        }
        throw error;
      }
    },
  });

  const noteDetailQuery = useQuery({
    enabled: Boolean(selectedNoteId) && Boolean(userId),
    queryKey: ["notes", "detail", selectedNoteId],
    queryFn: async (): Promise<NoteDetail> => {
      if (!selectedNoteId) {
        throw new Error("Note not selected");
      }
      const snap = await getDoc(doc(firebaseDb, "notes", selectedNoteId));
      if (!snap.exists()) {
        throw new Error("Note not found");
      }
      const data = snap.data() as Omit<NoteDetail, "id"> & { user_id: string };
      if (data.user_id !== userId) {
        throw new Error("Unauthorized");
      }
      return { ...data, id: snap.id };
    },
  });

  const historyQuery = useQuery({
    enabled: historyOpen && Boolean(selectedNoteId) && Boolean(userId),
    queryKey: ["notes", "versions", selectedNoteId],
    queryFn: async (): Promise<NoteVersion[]> => {
      if (!selectedNoteId) return [];
      const baseQuery = query(
        collection(firebaseDb, "note_versions"),
        where("note_id", "==", selectedNoteId)
      );
      try {
        const snapshot = await getDocs(
          query(baseQuery, orderBy("created_at", "desc"), limit(50))
        );
        return snapshot.docs.map(mapNoteVersionDoc);
      } catch (error) {
        if (isMissingIndexError(error)) {
          console.warn(
            [
              "Firestore missing index for note_versions (note_id + created_at).",
              "Falling back to client-side sorting; create the index for best performance.",
            ].join(" ")
          );
          const fallbackSnapshot = await getDocs(baseQuery);
          return fallbackSnapshot.docs
            .map(mapNoteVersionDoc)
            .sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime()
            )
            .slice(0, 50);
        }
        throw error;
      }
    },
  });

  const folders = foldersQuery.data ?? [];
  const notes = notesQuery.data ?? [];
  const noteDetail = noteDetailQuery.data ?? null;
  const noteVersions = historyQuery.data ?? [];

  const notesByFolder = useMemo(() => {
    return notes.reduce<Record<string, number>>((acc, note) => {
      acc[note.folder_id] = (acc[note.folder_id] ?? 0) + 1;
      return acc;
    }, {});
  }, [notes]);

  const folderTree = useMemo(
    () => buildFolderTree(folders, notesByFolder),
    [folders, notesByFolder]
  );

  useEffect(() => {
    if (!selectedFolderId && folders.length > 0) {
      setSelectedFolderId(folders[0].id);
    }
    if (!expandedFolders.size && folders.length) {
      setExpandedFolders(new Set(folders.map((folder) => folder.id)));
    }
  }, [folders, selectedFolderId, expandedFolders.size]);

  useEffect(() => {
    if (!selectedFolderId) return;
    const folderNotes = notes.filter(
      (note) => note.folder_id === selectedFolderId
    );
    if (folderNotes.length && !selectedNoteId) {
      setSelectedNoteId(folderNotes[0].id);
    }
    if (
      selectedNoteId &&
      !folderNotes.some((note) => note.id === selectedNoteId)
    ) {
      setSelectedNoteId(folderNotes[0]?.id ?? null);
    }
  }, [notes, selectedFolderId, selectedNoteId]);

  useEffect(() => {
    if (!noteDetail) return;
    setNoteDraft({
      title: noteDetail.title,
      zh: noteDetail.content_md_zh ?? "",
      en: noteDetail.content_md_en ?? "",
    });
    setLanguageTab(noteDetail.primary_language ?? "zh");
    setAutoSaveState("idle");
  }, [noteDetail?.id]);

  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, []);

  const isDirty = useMemo(() => {
    if (!noteDetail) return false;
    return (
      noteDraft.title !== (noteDetail.title ?? "") ||
      noteDraft.zh !== (noteDetail.content_md_zh ?? "") ||
      noteDraft.en !== (noteDetail.content_md_en ?? "")
    );
  }, [noteDraft, noteDetail]);

  const headings = useMemo(() => {
    const content = languageTab === "zh" ? noteDraft.zh : noteDraft.en;
    return extractHeadings(content);
  }, [languageTab, noteDraft]);

  const notesInFolder = useMemo(() => {
    if (!selectedFolderId) return [];
    return notes.filter((note) => note.folder_id === selectedFolderId);
  }, [notes, selectedFolderId]);

  const showSnackbar = useCallback(
    (message: string, severity: "success" | "info" | "error" = "success") => {
      setSnackbar({ open: true, message, severity });
    },
    []
  );

  const invalidateNotes = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["notes", "list"] });
    if (selectedNoteId) {
      queryClient.invalidateQueries({
        queryKey: ["notes", "detail", selectedNoteId],
      });
    }
  }, [queryClient, selectedNoteId]);

  const saveNote = useCallback(
    async (reason: "auto" | "manual" | "restore" = "manual") => {
      if (!selectedNoteId || !userId) return;
      setAutoSaveState("saving");
      const stats = computeWordStats(noteDraft.zh, noteDraft.en);
      await updateDoc(doc(firebaseDb, "notes", selectedNoteId), {
        title: noteDraft.title.trim() || "Untitled note",
        content_md_zh: noteDraft.zh,
        content_md_en: noteDraft.en,
        word_count: stats.wordCount,
        reading_time_seconds: stats.readingTimeSeconds,
        auto_saved_at: new Date().toISOString(),
        auto_save_version: (noteDetail?.auto_save_version ?? 0) + 1,
        updated_at: new Date().toISOString(),
      });
      invalidateNotes();
      setAutoSaveState("saved");
      const now = Date.now();
      const shouldSnapshot =
        reason !== "auto" || now - lastHistoryRef.current > AUTO_HISTORY_INTERVAL_MS;
      if (shouldSnapshot) {
        await addDoc(collection(firebaseDb, "note_versions"), {
          note_id: selectedNoteId,
          user_id: userId,
          title: noteDraft.title,
          content_md_zh: noteDraft.zh,
          content_md_en: noteDraft.en,
          language_tab: languageTab,
          snapshot_reason: reason,
          metadata: {
            word_count: stats.wordCount,
            reading_time_seconds: stats.readingTimeSeconds,
          },
          created_at: new Date().toISOString(),
        });
        lastHistoryRef.current = now;
        if (historyOpen) {
          queryClient.invalidateQueries({
            queryKey: ["notes", "versions", selectedNoteId],
          });
        }
      }
    },
    [
      selectedNoteId,
      userId,
      noteDraft,
      noteDetail?.auto_save_version,
      invalidateNotes,
      languageTab,
      historyOpen,
      queryClient,
    ]
  );

  useEffect(() => {
    if (!selectedNoteId || !isDirty) return;
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }
    autoSaveTimer.current = setTimeout(() => {
      saveNote("auto").catch((error) => {
        console.error(error);
        showSnackbar("Auto-save failed", "error");
      });
    }, 2000);
  }, [selectedNoteId, noteDraft, isDirty, saveNote, showSnackbar]);

  const handleCreateFolder = async () => {
    if (!userId) throw new Error("Sign in required");
    const name = folderDialog.name.trim() || "New Folder";
    await addDoc(collection(firebaseDb, "folders"), {
      name,
      user_id: userId,
      parent_id: folderDialog.parentId,
      sort_order: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    queryClient.invalidateQueries({ queryKey: ["folders"] });
  };

  const handleRenameFolder = async () => {
    if (!folderDialog.targetId) return;
    await updateDoc(doc(firebaseDb, "folders", folderDialog.targetId), {
      name: folderDialog.name.trim(),
      updated_at: new Date().toISOString(),
    });
    queryClient.invalidateQueries({ queryKey: ["folders"] });
  };

  const folderDialogMutation = useMutation({
    mutationFn: async () => {
      if (folderDialog.mode === "create") {
        await handleCreateFolder();
      } else {
        await handleRenameFolder();
      }
    },
    onSuccess: () => {
      setFolderDialog((prev) => ({ ...prev, open: false, name: "" }));
      showSnackbar("Folder saved");
    },
    onError: (error: Error) => showSnackbar(error.message, "error"),
  });

  const createNoteMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFolderId || !userId) {
        throw new Error("Select a folder before creating notes.");
      }
      const now = new Date().toISOString();
      const docRef = await addDoc(collection(firebaseDb, "notes"), {
        title: "Untitled note",
        folder_id: selectedFolderId,
        user_id: userId,
        primary_language: "zh",
        content_md_zh: "",
        content_md_en: "",
        word_count: 0,
        reading_time_seconds: 0,
        auto_save_version: 0,
        auto_saved_at: null,
        created_at: now,
        updated_at: now,
        sort_order: Date.now(),
      });
      return docRef.id;
    },
    onSuccess: (id) => {
      invalidateNotes();
      setSelectedNoteId(id);
      showSnackbar("Note created");
    },
    onError: (error: Error) => showSnackbar(error.message, "error"),
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      await deleteDoc(doc(firebaseDb, "notes", noteId));
    },
    onSuccess: () => {
      invalidateNotes();
      setSelectedNoteId(null);
      showSnackbar("Note deleted", "info");
    },
    onError: (error: Error) => showSnackbar(error.message, "error"),
  });

  const duplicateNoteMutation = useMutation({
    mutationFn: async () => {
      if (!noteDetail || !userId) {
        throw new Error("Nothing to duplicate");
      }
      const now = new Date().toISOString();
      const docRef = await addDoc(collection(firebaseDb, "notes"), {
        title: `${noteDetail.title} (Copy)`,
        folder_id: noteDetail.folder_id,
        user_id: userId,
        primary_language: noteDetail.primary_language,
        content_md_zh: noteDetail.content_md_zh,
        content_md_en: noteDetail.content_md_en,
        word_count: noteDetail.word_count,
        reading_time_seconds: noteDetail.reading_time_seconds,
        auto_save_version: noteDetail.auto_save_version,
        auto_saved_at: noteDetail.auto_saved_at,
        created_at: now,
        updated_at: now,
        sort_order: Date.now(),
      });
      return docRef.id;
    },
    onSuccess: (id) => {
      invalidateNotes();
      setSelectedNoteId(id);
      showSnackbar("Note duplicated");
    },
    onError: (error: Error) => showSnackbar(error.message, "error"),
  });

  const moveFolder = useMutation({
    mutationFn: async ({
      folderId,
      parentId,
      sortOrder,
    }: {
      folderId: string;
      parentId: string | null;
      sortOrder: number;
    }) => {
      await updateDoc(doc(firebaseDb, "folders", folderId), {
        parent_id: parentId,
        sort_order: sortOrder,
        updated_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
    },
    onError: (error: Error) => showSnackbar(error.message, "error"),
  });

  const handleFolderDrop = (
    draggedId: string,
    target: FolderRecord,
    position: "before" | "after" | "inside"
  ) => {
    if (draggedId === target.id) return;
    if (isDescendant(folders, target.id, draggedId)) return;
    const siblings = folders
      .filter(
        (folder) =>
          folder.parent_id ===
          (position === "inside" ? target.id : target.parent_id)
      )
      .filter((folder) => folder.id !== draggedId)
      .sort((a, b) => a.sort_order - b.sort_order);
    const parentId =
      position === "inside" ? target.id : target.parent_id ?? null;
    let sortOrder = target.sort_order;
    const targetIndex = siblings.findIndex((folder) => folder.id === target.id);
    if (position === "before") {
      const prev = siblings[targetIndex - 1];
      sortOrder = computeSortOrder(prev?.sort_order, target.sort_order);
    } else if (position === "after") {
      const next = siblings[targetIndex + 1];
      sortOrder = computeSortOrder(target.sort_order, next?.sort_order);
    } else {
      const children = folders
        .filter((folder) => folder.parent_id === target.id)
        .sort((a, b) => a.sort_order - b.sort_order);
      const lastChild = children[children.length - 1];
      sortOrder = computeSortOrder(lastChild?.sort_order, undefined);
    }
    moveFolder.mutate({ folderId: draggedId, parentId, sortOrder });
  };

  const handleNoteFolderChange = async (folderId: string) => {
    if (!selectedNoteId) return;
    await updateDoc(doc(firebaseDb, "notes", selectedNoteId), {
      folder_id: folderId,
      updated_at: new Date().toISOString(),
    });
    invalidateNotes();
    setSelectedFolderId(folderId);
    showSnackbar("Note moved");
  };

  const handleTranslation = async (
    mode: "translate" | "compare" | "sync",
    targetLanguage: "zh" | "en"
  ) => {
    if (!selectedNoteId) {
      showSnackbar("Choose a note first", "info");
      return;
    }
    const sourceLanguage = targetLanguage === "zh" ? "en" : "zh";
    const sourceValue =
      sourceLanguage === "zh" ? noteDraft.zh : noteDraft.en;
    const targetValue =
      targetLanguage === "zh" ? noteDraft.zh : noteDraft.en;
    try {
      const data = await callFunction<any>("ai-notes-translate", {
        note_id: selectedNoteId,
        mode,
        source_language: sourceLanguage,
        target_language: targetLanguage,
        source_text: sourceValue,
        target_text: targetValue,
      });
    if (mode === "compare") {
      setTranslationDialog({
        open: true,
        diff: data.result.diff_summary,
        recommendations: data.result.recommendations,
      });
      return;
    }
    if (targetLanguage === "zh") {
      setNoteDraft((prev) => ({
        ...prev,
        zh: data.result.translated_markdown,
      }));
    } else {
      setNoteDraft((prev) => ({
        ...prev,
        en: data.result.translated_markdown,
      }));
    }
    showSnackbar(
      mode === "sync" ? "Auto-sync applied" : "Translation ready",
      "success"
    );
    if (mode === "sync") {
      await saveNote("manual").catch((err) =>
        showSnackbar(err.message, "error")
      );
    }
    } catch (error: any) {
      showSnackbar(error?.message ?? "Translation failed", "error");
    }
  };

  const handleGenerateNotes = async () => {
    if (!generateNotesInput.trim()) {
      showSnackbar("Paste some source text first", "info");
      return;
    }
    try {
      const data = await callFunction<any>("ai-notes-process", {
        text: generateNotesInput,
      });
      setNoteDraft((prev) => ({
        ...prev,
        zh: noteProcessorResultToMarkdown(data, "zh"),
        en: noteProcessorResultToMarkdown(data, "en"),
      }));
      setGenerateNotesDialog(false);
      setGenerateNotesInput("");
      showSnackbar("Draft generated");
    } catch (error: any) {
      showSnackbar(error?.message ?? "Generation failed", "error");
    }
  };

  const handleFlashcards = async () => {
    if (!selectedNoteId) {
      showSnackbar("Select a note first", "info");
      return;
    }
    try {
      const data = await callFunction<any>("ai-flashcards-generate", {
        note_id: selectedNoteId,
      });
      setLatestFlashcards(data.flashcards ?? []);
      setFlashcardDialogOpen(true);
      showSnackbar(`Generated ${data.flashcards?.length ?? 0} flashcards`);
    } catch (error: any) {
      showSnackbar(error?.message ?? "Flashcard generation failed", "error");
    }
  };

  const handleAskAI = async () => {
    if (!askAIInput.trim()) return;
    setAskAILoading(true);
    const scope =
      askAIScope === "note" && selectedNoteId
        ? { type: "note", id: selectedNoteId }
        : askAIScope === "folder" && selectedFolderId
        ? { type: "folder", id: selectedFolderId }
        : { type: "all" };
    const nextHistory: ConversationMessage[] = [
      ...chatHistory,
      { role: "user", content: askAIInput, language: languageTab },
    ];
    setChatMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "user",
        content: askAIInput,
        language: languageTab,
      },
    ]);
    setAskAIInput("");
    try {
      const data = await callFunction<{ answer: string }>("ai-notes-qa", {
        question: askAIInput,
        scope,
        history: nextHistory,
      });
      const answerText = data.answer ?? "";
      setChatMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: answerText,
        },
      ]);
      setChatHistory([
        ...nextHistory,
        {
          role: "assistant",
          content: answerText,
        },
      ]);
    } catch (error: any) {
      showSnackbar(error?.message ?? "AI request failed", "error");
    } finally {
      setAskAILoading(false);
    }
  };

  const handleExportApkg = async () => {
    if (!latestFlashcards.length || !noteDetail) return;
    const exporter = await createAnkiExporter(
      `Study Assistant – ${noteDetail.title}`
    );
    latestFlashcards.forEach((card) => {
      const front =
        card.term_en || card.term_zh || card.definition_en.slice(0, 60);
      const back = [
        `<strong>${card.term_en ?? ""}</strong>`,
        `<p>${card.definition_en}</p>`,
        `<hr/>`,
        `<p>${card.definition_zh}</p>`,
      ].join("");
      exporter.addCard(front, back);
    });
    const zip = await exporter.save();
    const slug = slugify(noteDetail.title || "flashcards");
    saveAs(zip, `${slug}.apkg`);
    showSnackbar("Exported .apkg file", "success");
  };

  const handleImageUpload = async (file: File) => {
    if (!userId) return;
    try {
      const path = `${NOTE_ASSETS_BUCKET}/${userId}/${Date.now()}-${
        file.name
      }`;
      const refObj = storageRef(firebaseStorage, path);
      await uploadBytes(refObj, file, {
        cacheControl: "3600",
      });
      const url = await getDownloadURL(refObj);
    const snippet = `![${file.name}](${url})`;
    setNoteDraft((prev) =>
      languageTab === "zh"
        ? { ...prev, zh: `${prev.zh}\n\n${snippet}` }
        : { ...prev, en: `${prev.en}\n\n${snippet}` }
    );
    } catch (error: any) {
      showSnackbar(error?.message ?? "Image upload failed", "error");
    }
  };

  const handlePdfDrop = async (file: File) => {
    if (!userId || !selectedFolderId) {
      showSnackbar("Select a folder before dropping documents", "info");
      return;
    }
    setUploadState({ status: "uploading", filename: file.name });
    try {
      const storagePath = `${DOCUMENTS_BUCKET}/${userId}/${Date.now()}-${
        file.name
      }`;
      const refObj = storageRef(firebaseStorage, storagePath);
      await uploadBytes(refObj, file, { cacheControl: "3600" });
      const docRef = await addDoc(collection(firebaseDb, "documents"), {
        user_id: userId,
        folder_id: selectedFolderId,
        title: file.name.replace(/\.pdf$/i, ""),
        file_path: storagePath,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      setUploadState({ status: "processing", filename: file.name });
      const data = await callFunction<any>("documents-upload-process", {
        document_id: docRef.id,
      });
      setUploadState({ status: "idle" });
      setNoteDraft({
        title: file.name,
        zh: noteProcessorResultToMarkdown(data.noteDraft, "zh"),
        en: noteProcessorResultToMarkdown(data.noteDraft, "en"),
      });
      showSnackbar("PDF extracted into editor", "success");
    } catch (error: any) {
      setUploadState({ status: "idle" });
      showSnackbar(error?.message ?? "Document processing failed", "error");
    }
  };

  const toggleFolderExpansion = (id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const renderFolderNodes = (nodes: FolderNode[]) =>
    nodes.map((node) => {
      const hasChildren = node.children.length > 0;
      const isExpanded =
        expandedFolders.size === 0 || expandedFolders.has(node.id);
      return (
        <Box key={node.id}>
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            draggable
            onDragStart={(event) => {
              event.dataTransfer.setData("text/plain", node.id);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const draggedId = event.dataTransfer.getData("text/plain");
              const bounds = (
                event.currentTarget as HTMLElement
              ).getBoundingClientRect();
              const position =
                event.clientY - bounds.top < bounds.height / 3
                  ? "before"
                  : event.clientY - bounds.top >
                      (bounds.height / 3) * 2
                  ? "after"
                  : "inside";
              handleFolderDrop(draggedId, node, position);
            }}
            sx={{
              px: 1,
              py: 0.5,
              borderRadius: 1,
              bgcolor:
                selectedFolderId === node.id
                  ? alpha("#1e6ad4", 0.1)
                  : "transparent",
              cursor: "pointer",
              pl: `${node.depth * 16 + 8}px`,
            }}
            onClick={() => setSelectedFolderId(node.id)}
          >
            {hasChildren ? (
              <IconButton
                size="small"
                onClick={(event) => {
                  event.stopPropagation();
                  toggleFolderExpansion(node.id);
                }}
              >
                {isExpanded ? (
                  <ExpandMoreIcon fontSize="small" />
                ) : (
                  <ChevronRightIcon fontSize="small" />
                )}
              </IconButton>
            ) : (
              <Box sx={{ width: 32 }} />
            )}
            <FolderIcon fontSize="small" color="primary" />
            <Box flexGrow={1}>
              <Typography variant="body2" fontWeight={600}>
                {node.name} ({node.noteCount})
              </Typography>
            </Box>
            <IconButton
              size="small"
              onClick={(event) => {
                event.stopPropagation();
                setFolderMenu({
                  anchor: event.currentTarget,
                  folderId: node.id,
                });
              }}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          </Stack>
          {hasChildren && isExpanded && (
            <Box>{renderFolderNodes(node.children)}</Box>
          )}
        </Box>
      );
    });

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", lg: "340px 1fr" },
        gap: 3,
        position: "relative",
      }}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes("Files")) {
          event.preventDefault();
          setIsDocDragOver(true);
        }
      }}
      onDragLeave={(event) => {
        if (
          event.relatedTarget === null ||
          !(event.currentTarget as HTMLElement).contains(
            event.relatedTarget as Node
          )
        ) {
          setIsDocDragOver(false);
        }
      }}
      onDrop={(event) => {
        if (!event.dataTransfer.files?.length) return;
        const file = event.dataTransfer.files[0];
        if (file.type === "application/pdf") {
          event.preventDefault();
          setIsDocDragOver(false);
          void handlePdfDrop(file);
        }
      }}
    >
      {isDocDragOver && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            border: "2px dashed",
            borderColor: "primary.main",
            bgcolor: alpha("#1e6ad4", 0.05),
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <Stack spacing={1} alignItems="center">
            <CloudUploadIcon color="primary" sx={{ fontSize: 48 }} />
            <Typography>Drop PDF to auto-generate notes</Typography>
          </Stack>
        </Box>
      )}

      <Stack spacing={2}>
        <Paper sx={{ p: 2, display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="h6" flexGrow={1}>
            Folders
          </Typography>
          <Button
            startIcon={<AddIcon />}
            onClick={() =>
              setFolderDialog({
                mode: "create",
                open: true,
                name: "",
                parentId: selectedFolderId,
              })
            }
          >
            New Folder
          </Button>
        </Paper>
        <Paper sx={{ p: 1, minHeight: 320 }}>
          {foldersQuery.isLoading ? (
            <Stack alignItems="center" justifyContent="center" sx={{ py: 6 }}>
              <CircularProgress size={24} />
            </Stack>
          ) : folderTree.length ? (
            renderFolderNodes(folderTree)
          ) : (
            <Typography variant="body2" color="text.secondary">
              Create folders to organize your bilingual notes.
            </Typography>
          )}
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Stack direction="row" alignItems="center" mb={1}>
            <Typography variant="subtitle1" flexGrow={1}>
              Notes ({notesInFolder.length})
            </Typography>
            <IconButton
              size="small"
              onClick={() => createNoteMutation.mutate()}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </Stack>
          <List dense>
            {notesInFolder.map((note) => (
              <ListItemButton
                key={note.id}
                selected={note.id === selectedNoteId}
                onClick={() => setSelectedNoteId(note.id)}
              >
                <ListItemText
                  primary={note.title}
                  secondary={`Updated ${new Date(
                    note.updated_at
                  ).toLocaleString()}`}
                />
              </ListItemButton>
            ))}
            {!notesInFolder.length && (
              <Typography variant="body2" color="text.secondary">
                No notes in this folder yet.
              </Typography>
            )}
          </List>
        </Paper>
      </Stack>

      <Stack spacing={2}>
        <Paper sx={{ p: 3, display: "flex", flexDirection: "column", gap: 2 }}>
          <Stack spacing={2}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              alignItems={{ xs: "stretch", md: "center" }}
            >
              <TextField
                fullWidth
                label="Note title"
                value={noteDraft.title}
                onChange={(event) =>
                  setNoteDraft((prev) => ({
                    ...prev,
                    title: event.target.value,
                  }))
                }
              />
              <TextField
                select
                label="Folder"
                value={noteDetail?.folder_id ?? selectedFolderId ?? ""}
                onChange={(event) => handleNoteFolderChange(event.target.value)}
                sx={{ minWidth: 200 }}
              >
                {folders.map((folder) => (
                  <MenuItem key={folder.id} value={folder.id}>
                    {folder.name}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                icon={<HistoryIcon />}
                label={
                  noteDetail
                    ? `Updated ${new Date(
                        noteDetail.updated_at
                      ).toLocaleTimeString()}`
                    : "Select a note"
                }
              />
              <Chip
                icon={<PreviewIcon />}
                label={`${noteDetail?.word_count ?? 0} words`}
              />
              <Chip
                icon={<TimerIcon />}
                label={formatReadingTime(noteDetail?.reading_time_seconds ?? 0)}
              />
              <Chip
                color={
                  autoSaveState === "saving"
                    ? "warning"
                    : autoSaveState === "saved"
                    ? "success"
                    : "default"
                }
                label={
                  autoSaveState === "saving"
                    ? "Saving..."
                    : autoSaveState === "saved"
                    ? "All changes saved"
                    : "Idle"
                }
              />
              <Button
                startIcon={<SaveIcon />}
                onClick={() => saveNote("manual")}
                disabled={!isDirty}
              >
                Save now
              </Button>
              <Button
                startIcon={<DuplicateIcon />}
                onClick={() => duplicateNoteMutation.mutate()}
                disabled={!noteDetail}
              >
                Duplicate
              </Button>
              <Button
                startIcon={<HistoryIcon />}
                onClick={() => setHistoryOpen(true)}
                disabled={!noteDetail}
              >
                History
              </Button>
              <Button
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => selectedNoteId && deleteNoteMutation.mutate(selectedNoteId)}
                disabled={!selectedNoteId}
              >
                Delete
              </Button>
              <Button
                startIcon={<RefreshIcon />}
                onClick={async () => {
                  if (!selectedNoteId) return;
                  try {
                    await callFunction("notes-reindex", {
                      note_id: selectedNoteId,
                    });
                    showSnackbar("Note reindexed", "success");
                  } catch (error: any) {
                    showSnackbar(error?.message ?? "Reindex failed", "error");
                  }
                }}
                disabled={!selectedNoteId}
              >
                Reindex
              </Button>
            </Stack>
            <Divider />
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={1}
              flexWrap="wrap"
              useFlexGap
            >
              <Button
                startIcon={<AutoAwesomeIcon />}
                variant="outlined"
                onClick={() => setGenerateNotesDialog(true)}
              >
                Generate Notes
              </Button>
              <Button
                startIcon={<StyleIcon />}
                variant="outlined"
                onClick={handleFlashcards}
                disabled={!selectedNoteId}
              >
                Generate Flashcards
              </Button>
              <Button
                startIcon={<QuestionAnswerIcon />}
                variant="contained"
                onClick={() => setChatOpen(true)}
              >
                Ask AI
              </Button>
            </Stack>
            <Tabs
              value={languageTab}
              onChange={(_event, value) => setLanguageTab(value)}
              sx={{ borderBottom: 1, borderColor: "divider" }}
            >
              <Tab value="zh" label="Chinese" />
              <Tab value="en" label="English" />
            </Tabs>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button
                startIcon={<TranslateIcon />}
                onClick={() => handleTranslation("translate", "zh")}
              >
                EN → ZH
              </Button>
              <Button
                startIcon={<TranslateIcon />}
                onClick={() => handleTranslation("translate", "en")}
              >
                ZH → EN
              </Button>
              <Button
                startIcon={<CompareIcon />}
                onClick={() => handleTranslation("compare", languageTab)}
              >
                Compare
              </Button>
              <Button
                startIcon={<SyncIcon />}
                onClick={() => handleTranslation("sync", languageTab)}
              >
                Auto-sync
              </Button>
              <Button
                startIcon={<ImageIcon />}
                component="label"
              >
                Insert image
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      void handleImageUpload(file);
                    }
                  }}
                />
              </Button>
              <Button
                startIcon={<CodeIcon />}
                onClick={() => {
                  const language = prompt("Language (e.g., python, sql)") ?? "";
                  const snippet = `\n\`\`\`${language}\n// code here\n\`\`\`\n`;
                  const key = languageTab === "zh" ? "zh" : "en";
                  setNoteDraft((prev) =>
                    key === "zh"
                      ? { ...prev, zh: prev.zh + snippet }
                      : { ...prev, en: prev.en + snippet }
                  );
                }}
              >
                Code block
              </Button>
              <Button
                startIcon={<PreviewIcon />}
                variant={showPreview ? "contained" : "outlined"}
                onClick={() => setShowPreview((prev) => !prev)}
              >
                {showPreview ? "Hide preview" : "Live preview"}
              </Button>
            </Stack>
            <Stack
              direction={{ xs: "column", lg: "row" }}
              spacing={2}
              alignItems="stretch"
            >
              <TextField
                multiline
                minRows={16}
                fullWidth
                value={languageTab === "zh" ? noteDraft.zh : noteDraft.en}
                onChange={(event) => {
                  const value = event.target.value;
                  setNoteDraft((prev) =>
                    languageTab === "zh"
                      ? { ...prev, zh: value }
                      : { ...prev, en: value }
                  );
                }}
                placeholder={`Write ${languageLabels[languageTab]} markdown...`}
                inputRef={markdownInputRef}
                InputProps={{
                  sx: { fontFamily: "JetBrains Mono, monospace" },
                }}
              />
              {showPreview && (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    width: { xs: "100%", lg: "50%" },
                    maxHeight: 480,
                    overflow: "auto",
                  }}
                >
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={markdownComponents as any}
                  >
                    {languageTab === "zh" ? noteDraft.zh : noteDraft.en}
                  </ReactMarkdown>
                </Paper>
              )}
            </Stack>
            {!!headings.length && (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Outline
                </Typography>
                <Stack spacing={0.5}>
                  {headings.map((heading) => (
                    <Typography
                      key={heading.id}
                      sx={{ pl: `${(heading.level - 1) * 12}px` }}
                      variant="body2"
                    >
                      • {heading.text}
                    </Typography>
                  ))}
                </Stack>
              </Paper>
            )}
            {uploadState.status !== "idle" && (
              <LinearProgress
                sx={{ borderRadius: 1 }}
                variant={
                  uploadState.status === "processing" ? "indeterminate" : "determinate"
                }
              />
            )}
          </Stack>
        </Paper>
      </Stack>

      <Menu
        anchorEl={folderMenu.anchor}
        open={Boolean(folderMenu.anchor)}
        onClose={() => setFolderMenu({ anchor: null })}
      >
        <MenuItem
          onClick={() => {
            const folder = folders.find((f) => f.id === folderMenu.folderId);
            setFolderDialog({
              mode: "rename",
              open: true,
              targetId: folder?.id,
              name: folder?.name ?? "",
              parentId: folder?.parent_id ?? null,
            });
            setFolderMenu({ anchor: null });
          }}
        >
          <RenameIcon fontSize="small" sx={{ mr: 1 }} /> Rename
        </MenuItem>
        <MenuItem
          onClick={async () => {
            if (!folderMenu.folderId) return;
            if (
              confirm(
                "Delete folder? Notes inside will also be deleted (cascade)."
              )
            ) {
              try {
                const folderId = folderMenu.folderId;
                const folderNotes = notes.filter(
                  (note) => note.folder_id === folderId
                );
                await Promise.all(
                  folderNotes.map((note) =>
                    deleteDoc(doc(firebaseDb, "notes", note.id))
                  )
                );
                await deleteDoc(doc(firebaseDb, "folders", folderId));
                queryClient.invalidateQueries({ queryKey: ["folders"] });
                showSnackbar("Folder deleted", "info");
              } catch (error: any) {
                showSnackbar(error?.message ?? "Failed to delete folder", "error");
              }
            }
            setFolderMenu({ anchor: null });
          }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>

      <Dialog
        open={folderDialog.open}
        onClose={() => setFolderDialog((prev) => ({ ...prev, open: false }))}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>
          {folderDialog.mode === "create" ? "Create Folder" : "Rename Folder"}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Folder name"
            fullWidth
            value={folderDialog.name}
            onChange={(event) =>
              setFolderDialog((prev) => ({
                ...prev,
                name: event.target.value,
              }))
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFolderDialog((prev) => ({ ...prev, open: false }))}>
            Cancel
          </Button>
          <Button
            onClick={() => folderDialogMutation.mutate()}
            disabled={folderDialogMutation.isPending}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={generateNotesDialog}
        onClose={() => setGenerateNotesDialog(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Generate Bilingual Notes</DialogTitle>
        <DialogContent>
          <TextField
            multiline
            minRows={8}
            label="Paste source text"
            fullWidth
            value={generateNotesInput}
            onChange={(event) => setGenerateNotesInput(event.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGenerateNotesDialog(false)}>Cancel</Button>
          <Button onClick={handleGenerateNotes} variant="contained">
            Generate
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={translationDialog.open}
        onClose={() =>
          setTranslationDialog({ open: false, diff: [], recommendations: [] })
        }
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Comparison summary</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle2" gutterBottom>
            Differences
          </Typography>
          <List dense>
            {translationDialog.diff.map((item, index) => (
              <ListItem key={`${item.heading}-${index}`}>
                <ListItemText
                  primary={`${item.issue.toUpperCase()}: ${item.heading}`}
                  secondary={item.details}
                />
              </ListItem>
            ))}
          </List>
          <Typography variant="subtitle2" gutterBottom>
            Recommendations
          </Typography>
          <List dense>
            {translationDialog.recommendations.map((item, index) => (
              <ListItem key={index}>
                <ListItemText primary={item} />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() =>
              setTranslationDialog({
                open: false,
                diff: [],
                recommendations: [],
              })
            }
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={flashcardDialogOpen}
        onClose={() => setFlashcardDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Flashcards</DialogTitle>
        <DialogContent dividers>
          <List dense>
            {latestFlashcards.map((card) => (
              <ListItem key={card.id}>
                <ListItemText
                  primary={`${card.category.toUpperCase()}: ${
                    card.term_en ?? card.term_zh ?? "Term"
                  }`}
                  secondary={`${card.definition_en.slice(
                    0,
                    80
                  )} / ${card.definition_zh.slice(0, 80)}`}
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleExportApkg} disabled={!latestFlashcards.length}>
            Export to Anki (.apkg)
          </Button>
          <Button onClick={() => setFlashcardDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Drawer anchor="right" open={historyOpen} onClose={() => setHistoryOpen(false)}>
        <Box sx={{ width: 360, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Version history
          </Typography>
          {historyQuery.isLoading ? (
            <Stack alignItems="center" sx={{ py: 4 }}>
              <CircularProgress size={24} />
            </Stack>
          ) : (
            <List dense>
              {noteVersions.map((version) => (
                <ListItemButton
                  key={version.id}
                  onClick={() => {
                    setNoteDraft({
                      title: version.title,
                      zh: version.content_md_zh ?? "",
                      en: version.content_md_en ?? "",
                    });
                    setLanguageTab(version.language_tab);
                    saveNote("restore").catch((error) =>
                      showSnackbar(error.message, "error")
                    );
                  }}
                >
                  <ListItemText
                    primary={`${new Date(version.created_at).toLocaleString()} (${version.snapshot_reason})`}
                    secondary={`${version.metadata?.word_count ?? 0} words`}
                  />
                </ListItemButton>
              ))}
              {!noteVersions.length && (
                <Typography variant="body2" color="text.secondary">
                  No history yet.
                </Typography>
              )}
            </List>
          )}
        </Box>
      </Drawer>

      <Drawer anchor="right" open={chatOpen} onClose={() => setChatOpen(false)}>
        <Box sx={{ width: 420, height: "100%", display: "flex", flexDirection: "column" }}>
          <Box sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider" }}>
            <Typography variant="h6">Ask AI</Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                select
                label="Scope"
                size="small"
                value={askAIScope}
                onChange={(event) =>
                  setAskAIScope(event.target.value as "note" | "folder" | "all")
                }
              >
                <MenuItem value="note">Current note</MenuItem>
                <MenuItem value="folder">Current folder</MenuItem>
                <MenuItem value="all">All notes</MenuItem>
              </TextField>
            </Stack>
          </Box>
          <Box sx={{ flexGrow: 1, overflowY: "auto", p: 2 }}>
            <Stack spacing={2}>
              {chatMessages.map((message) => (
                <Box
                  key={message.id}
                  sx={{
                    alignSelf:
                      message.role === "user" ? "flex-end" : "flex-start",
                    bgcolor:
                      message.role === "user"
                        ? "primary.main"
                        : alpha("#1e6ad4", 0.1),
                    color: message.role === "user" ? "primary.contrastText" : "text.primary",
                    p: 1.5,
                    borderRadius: 2,
                    maxWidth: "90%",
                  }}
                >
                  <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                    {message.content}
                  </Typography>
                  {message.citations && (
                    <Stack direction="row" spacing={0.5} mt={1} flexWrap="wrap">
                      {message.citations.map((citation) => (
                        <Chip
                          key={citation.id}
                          size="small"
                          label={`${citation.source_title} (${citation.similarity.toFixed(2)})`}
                        />
                      ))}
                    </Stack>
                  )}
                </Box>
              ))}
              {askAILoading && (
                <Stack alignItems="center">
                  <CircularProgress size={20} />
                </Stack>
              )}
            </Stack>
          </Box>
          <Box sx={{ p: 2, borderTop: "1px solid", borderColor: "divider" }}>
            <TextField
              multiline
              minRows={2}
              value={askAIInput}
              onChange={(event) => setAskAIInput(event.target.value)}
              placeholder="Ask something about your notes..."
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Button onClick={handleAskAI} disabled={askAILoading}>
                      Send
                    </Button>
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        </Box>
      </Drawer>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
