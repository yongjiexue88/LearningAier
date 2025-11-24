import AddIcon from "@mui/icons-material/AddRounded";
import QuestionAnswerIcon from "@mui/icons-material/QuestionAnswerRounded";
import StyleIcon from "@mui/icons-material/StyleRounded";
import FolderIcon from "@mui/icons-material/FolderRounded";
import ExpandMoreIcon from "@mui/icons-material/ExpandMoreRounded";
import ChevronRightIcon from "@mui/icons-material/ChevronRightRounded";
import MoreVertIcon from "@mui/icons-material/MoreVertRounded";
import DeleteIcon from "@mui/icons-material/DeleteOutlineRounded";
import RenameIcon from "@mui/icons-material/DriveFileRenameOutlineRounded";
import TranslateIcon from "@mui/icons-material/GTranslate";
import HistoryIcon from "@mui/icons-material/HistoryRounded";
import SaveIcon from "@mui/icons-material/SaveRounded";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulletedRounded";
import DuplicateIcon from "@mui/icons-material/ContentCopyRounded";
import CloudUploadIcon from "@mui/icons-material/CloudUploadRounded";
import CodeIcon from "@mui/icons-material/CodeRounded";
import PreviewIcon from "@mui/icons-material/PreviewRounded";

import CreateNewFolderIcon from "@mui/icons-material/CreateNewFolderRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
  Checkbox,
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
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
  MenuItem,
  Tooltip,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useAuth } from "../../providers/AuthProvider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useStartConversation } from "../../hooks/useChat";
import { sendMessage } from "../../services/api/chat";
import { saveAs } from "file-saver";
import {
  buildFolderTree,
  computeSortOrder,
  computeWordStats,
  extractHeadings,
  formatReadingTime,
  isDescendant,
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
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import {
  useReindexNote,
  useTranslateNote,
  useExtractGraph,
} from "../../services/hooks/useNoteAI";
import { useProcessDocument } from "../../services/hooks/useDocuments";
import { useGenerateFlashcards } from "../../services/hooks/useFlashcards";
import {
  ref as storageRef,
  uploadBytes,
} from "firebase/storage";
import {
  firebaseDb,
  firebaseStorage,
} from "../../lib/firebaseClient";


const DOCUMENTS_BUCKET = "documents";
const AUTO_HISTORY_INTERVAL_MS = 60_000;
const AUTO_SAVE_INTERVAL_MS = 60_000;
const EDITOR_PANEL_HEIGHT = { xs: "60vh", lg: "66vh" };

const markdownPreviewSx = {
  "& h1": { fontSize: "1.8rem", fontWeight: 700, marginTop: 24, marginBottom: 8 },
  "& h2": { fontSize: "1.6rem", fontWeight: 700, marginTop: 20, marginBottom: 8 },
  "& h3": { fontSize: "1.4rem", fontWeight: 700, marginTop: 16, marginBottom: 6 },
  "& h4": { fontSize: "1.2rem", fontWeight: 700, marginTop: 14, marginBottom: 6 },
  "& h5": { fontSize: "1.1rem", fontWeight: 700, marginTop: 12, marginBottom: 4 },
  "& h6": { fontSize: "1rem", fontWeight: 700, marginTop: 10, marginBottom: 4 },
  "& p": { marginBlock: 1, lineHeight: 1.6 },
  "& hr": {
    border: 0,
    borderTop: (theme: any) => `1px solid ${theme.palette.divider}`,
    marginBlock: 2,
  },
  "& strong": { fontWeight: 700 },
  "& em": { fontStyle: "italic" },
  "& del": { textDecoration: "line-through" },
  "& a": {
    color: (theme: any) => theme.palette.primary.main,
    textDecoration: "underline",
    textDecorationThickness: "from-font",
  },
  "& ul, & ol": { paddingLeft: 24, marginBlock: 1.25 },
  "& li": { marginTop: 4, lineHeight: 1.5 },
  "& blockquote": {
    margin: "14px 0",
    padding: "12px 16px",
    borderLeft: (theme: any) => `4px solid ${theme.palette.divider}`,
    backgroundColor: (theme: any) => alpha(theme.palette.text.primary, 0.04),
    color: (theme: any) => theme.palette.text.secondary,
    borderRadius: 8,
  },
  "& code": {
    fontFamily: "JetBrains Mono, monospace",
    backgroundColor: (theme: any) => alpha(theme.palette.text.primary, 0.08),
    padding: "2px 6px",
    borderRadius: 6,
    fontSize: "0.95em",
  },
  "& pre": {
    backgroundColor: (theme: any) => alpha(theme.palette.text.primary, 0.06),
    padding: "12px 14px",
    borderRadius: 10,
    overflowX: "auto",
    fontFamily: "JetBrains Mono, monospace",
    fontSize: "0.95em",
    border: (theme: any) => `1px solid ${theme.palette.divider}`,
  },
  "& pre code": { backgroundColor: "transparent", padding: 0 },
  "& img": { maxWidth: "100%", display: "block", margin: "12px 0", borderRadius: 8 },
  "& table": {
    borderCollapse: "collapse",
    width: "100%",
    marginBlock: 2,
    "& th, & td": {
      border: (theme: any) => `1px solid ${theme.palette.divider}`,
      padding: "8px 10px",
      textAlign: "left",
    },
    "& th": {
      backgroundColor: (theme: any) => alpha(theme.palette.text.primary, 0.05),
    },
  },
};

interface NoteListItem {
  id: string;
  title: string;
  folder_id: string;
  created_at: string;
  updated_at: string;
  word_count: number;
  reading_time_seconds: number;
  auto_save_version: number;
  sort_order: number;
}

interface NoteDetail extends NoteListItem {
  content_md_zh: string | null;
  content_md_en: string | null;
  auto_saved_at: string | null;
  primary_language?: "zh" | "en" | "generic" | null;
}

interface NoteVersion {
  id: string;
  note_id: string;
  created_at: string;
  snapshot_reason: "auto" | "manual" | "restore" | "system";
  language_tab?: "zh" | "en" | "generic" | null;
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
  set_id?: string | null;
  note_id?: string | null;
  document_id?: string | null;
  term: string | null;
  definition: string;
  context: string | null;
  category: string;
  created_at: string;
}

interface ProfileRecord {
  id: string;
  llm_provider?: string | null;
  llm_model?: string | null;
}

type GeneratedFlashcard = Omit<FlashcardRecord, "id" | "created_at"> & {
  id: string;
  created_at?: string;
};

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
  content: string;
};

export function NotesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.uid ?? null;

  // React Query Hooks
  const reindexNote = useReindexNote();
  const translateNote = useTranslateNote();
  const extractGraph = useExtractGraph();
  const processDocument = useProcessDocument();
  const generateFlashcards = useGenerateFlashcards();
  const startConversation = useStartConversation();

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<NoteDraftState>({
    title: "",
    content: "",
  });
  const [showPreview, setShowPreview] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
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
  const [latestFlashcards, setLatestFlashcards] = useState<FlashcardRecord[]>(
    []
  );
  const [flashcardDialogOpen, setFlashcardDialogOpen] = useState(false);
  const [flashcardSelectionOpen, setFlashcardSelectionOpen] = useState(false);
  const [flashcardSelection, setFlashcardSelection] = useState<GeneratedFlashcard[]>([]);
  const [selectedFlashcardIds, setSelectedFlashcardIds] = useState<Set<string>>(new Set());
  const [flashcardModelInUse, setFlashcardModelInUse] = useState<string | null>(null);
  const [savingFlashcards, setSavingFlashcards] = useState(false);
  const [generatingFlashcards, setGeneratingFlashcards] = useState(false);
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
  const [translateMenuAnchor, setTranslateMenuAnchor] =
    useState<HTMLElement | null>(null);
  const [translateLoading, setTranslateLoading] = useState(false);
  const [styleMenuAnchor, setStyleMenuAnchor] = useState<HTMLElement | null>(
    null
  );

  const hasInitializedFolders = useRef(false);


  const profileQuery = useQuery({
    enabled: Boolean(userId),
    queryKey: ["profile", userId],
    queryFn: async (): Promise<ProfileRecord | null> => {
      if (!userId) return null;
      const snap = await getDoc(doc(firebaseDb, "profiles", userId));
      if (!snap.exists()) return null;
      const data = snap.data() as Omit<ProfileRecord, "id">;
      return { id: snap.id, ...data };
    },
  });

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

  // Log folder information for debugging/cleanup
  useEffect(() => {
    if (folders.length > 0) {
      console.log('[Folders Debug] All folders in Firestore:',
        folders.map(f => ({
          id: f.id,
          name: f.name,
          parent_id: f.parent_id,
          noteCount: notesByFolder[f.id] || 0
        }))
      );
      console.log('[Folders Debug] Folders in tree (visible in sidebar):', folderTree.length);
    }
  }, [folders, folderTree.length, notesByFolder]);

  useEffect(() => {
    // Reset selectedFolderId if it references a deleted folder
    if (selectedFolderId && !folders.find(f => f.id === selectedFolderId)) {
      setSelectedFolderId(null);
    }

    // Set to first folder if none selected
    if (!selectedFolderId && folders.length > 0) {
      setSelectedFolderId(folders[0].id);
    }

    // Only auto-expand folders on initial load, not when user manually collapses them
    if (!hasInitializedFolders.current && folders.length > 0) {
      setExpandedFolders(new Set(folders.map((folder) => folder.id)));
      hasInitializedFolders.current = true;
    }
  }, [folders, selectedFolderId]);

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
    const contentFromNote =
      noteDetail.content_md_en ??
      noteDetail.content_md_zh ??
      "";
    setNoteDraft({
      title: noteDetail.title,
      content: contentFromNote,
    });
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
    const persistedContent =
      noteDetail.content_md_en ?? noteDetail.content_md_zh ?? "";
    return (
      noteDraft.title !== (noteDetail.title ?? "") ||
      noteDraft.content !== persistedContent
    );
  }, [noteDraft, noteDetail]);

  const headings = useMemo(() => {
    return extractHeadings(noteDraft.content);
  }, [noteDraft.content]);

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

  type TextStyleAction =
    | "indent"
    | "outdent"
    | "bullet"
    | "heading1"
    | "heading2"
    | "heading3"
    | "bold"
    | "italic"
    | "strike";

  const applyTextStyling = useCallback(
    (action: TextStyleAction) => {
      const textarea = markdownInputRef.current;
      if (!textarea) return;
      const value = noteDraft.content;
      const selectionStart = textarea.selectionStart ?? 0;
      const selectionEnd = textarea.selectionEnd ?? 0;
      const isInline =
        action === "bold" || action === "italic" || action === "strike";
      if (isInline) {
        const wrapper =
          action === "bold" ? "**" : action === "italic" ? "*" : "~~";
        let start = selectionStart;
        let end = selectionEnd;
        if (start === end) {
          const before = value.slice(0, start);
          const after = value.slice(end);
          const leftMatch = before.match(/[\S]+$/);
          const rightMatch = after.match(/^[\S]+/);
          start = leftMatch ? start - leftMatch[0].length : start;
          end = rightMatch ? end + rightMatch[0].length : end;
        }
        const selectedText = value.slice(start, end) || "text";
        const nextValue =
          value.slice(0, start) + wrapper + selectedText + wrapper + value.slice(end);
        setNoteDraft((prev) => ({ ...prev, content: nextValue }));
        requestAnimationFrame(() => {
          const cursorStart = start + wrapper.length;
          const cursorEnd = cursorStart + selectedText.length;
          textarea.focus();
          textarea.setSelectionRange(cursorStart, cursorEnd);
        });
        return;
      }

      const lineStart = value.lastIndexOf("\n", Math.max(selectionStart - 1, 0)) + 1;
      const nextLineBreak = value.indexOf("\n", Math.max(selectionEnd, selectionStart));
      const lineEnd = nextLineBreak === -1 ? value.length : nextLineBreak;
      const before = value.slice(0, lineStart);
      const target = value.slice(lineStart, lineEnd);
      const after = value.slice(lineEnd);

      const transformLine = (line: string) => {
        switch (action) {
          case "indent":
            return `  ${line}`;
          case "outdent":
            return line.replace(/^(?: {1,2}|\t)/, "");
          case "bullet": {
            const trimmed = line.trimStart();
            const withoutBullet = trimmed.replace(/^([-*+]|\d+\.)\s+/, "");
            return `- ${withoutBullet}`;
          }
          case "heading1":
          case "heading2":
          case "heading3": {
            const level = action === "heading1" ? 1 : action === "heading2" ? 2 : 3;
            const cleaned = line.trimStart().replace(/^#{1,6}\s+/, "");
            return `${"#".repeat(level)} ${cleaned || "Heading"}`.trimEnd();
          }
          default:
            return line;
        }
      };

      const updatedBlock = target
        .split("\n")
        .map((line) => transformLine(line))
        .join("\n");
      const nextValue = before + updatedBlock + after;
      setNoteDraft((prev) => ({ ...prev, content: nextValue }));

      requestAnimationFrame(() => {
        const newEnd = lineStart + updatedBlock.length;
        textarea.focus();
        textarea.setSelectionRange(lineStart, newEnd);
      });
    },
    [noteDraft.content]
  );

  const saveNote = useCallback(
    async (
      reason: "auto" | "manual" | "restore" = "manual",
      draftOverride?: NoteDraftState
    ) => {
      if (!selectedNoteId || !userId) return;
      setAutoSaveState("saving");
      const draft = draftOverride ?? noteDraft;
      const stats = computeWordStats(draft.content);
      await updateDoc(doc(firebaseDb, "notes", selectedNoteId), {
        title: draft.title.trim() || "Untitled note",
        content_md_zh: draft.content,
        content_md_en: draft.content,
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
          title: draft.title,
          content_md_zh: draft.content,
          content_md_en: draft.content,
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

      // Only trigger graph extraction and reindexing if content is not empty
      const hasContent = draft.content.trim().length > 0;

      if (hasContent) {
        // Silently update knowledge graph
        extractGraph.mutate({
          text: draft.content,
          source_id: selectedNoteId,
        });

        // Silently reindex to Pinecone for RAG
        reindexNote.mutate({
          note_id: selectedNoteId,
        });
      }
    },
    [
      selectedNoteId,
      userId,
      noteDraft,
      noteDetail?.auto_save_version,
      invalidateNotes,
      historyOpen,
      queryClient,
      extractGraph,
      reindexNote,
    ]
  );

  const restoreVersion = useCallback(
    async (version: NoteVersion) => {
      const restoredDraft: NoteDraftState = {
        title: version.title,
        content: version.content_md_en ?? version.content_md_zh ?? "",
      };
      setNoteDraft(restoredDraft);
      await saveNote("restore", restoredDraft);
      showSnackbar("Version restored", "success");
      setHistoryOpen(false);
    },
    [saveNote, showSnackbar]
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
    }, AUTO_SAVE_INTERVAL_MS);
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
        primary_language: "generic",
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
      const duplicatedContent =
        noteDetail.content_md_en ?? noteDetail.content_md_zh ?? "";
      const docRef = await addDoc(collection(firebaseDb, "notes"), {
        title: `${noteDetail.title} (Copy)`,
        folder_id: noteDetail.folder_id,
        user_id: userId,
        primary_language: "generic",
        content_md_zh: duplicatedContent,
        content_md_en: duplicatedContent,
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

  const handleTranslation = async (targetLanguage: "zh" | "en") => {
    if (translateLoading) return;
    if (!selectedNoteId) {
      showSnackbar("Choose a note first", "info");
      return;
    }
    const sourceText = noteDraft.content;
    if (!sourceText.trim()) {
      showSnackbar("Nothing to translate yet", "info");
      return;
    }
    setTranslateLoading(true);
    try {
      const data = await translateNote.mutateAsync({
        note_id: selectedNoteId,
        target_lang: targetLanguage,
        content: sourceText,
      });
      setNoteDraft((prev) => ({
        ...prev,
        content: data.translated_content,
      }));
      showSnackbar(
        `Translated to ${languageLabels[targetLanguage]}`,
        "success"
      );
    } catch (error: any) {
      showSnackbar(error?.message ?? "Translation failed", "error");
    } finally {
      setTranslateLoading(false);
    }
  };


  const handleFlashcards = async () => {
    if (!selectedNoteId) {
      showSnackbar("Select a note first", "info");
      return;
    }
    setGeneratingFlashcards(true);
    try {
      const data = await generateFlashcards.mutateAsync({
        note_id: selectedNoteId,
        count: 10, // Default count
        auto_save: false, // We handle saving manually in this UI
      });
      const generated: GeneratedFlashcard[] =
        (data.flashcards ?? []).map((card) => ({
          ...card,
          id: crypto.randomUUID(),
          set_id: null,
          note_id: selectedNoteId,
          document_id: null,
          term: card.term ?? null,
          definition: card.definition ?? "",
          context: card.context ?? null,
          category: "vocabulary",
        })) ?? [];
      if (!generated.length) {
        showSnackbar("No flashcards generated. Try adjusting the note content.", "info");
        return;
      }
      setFlashcardSelection(generated);
      setSelectedFlashcardIds(new Set(generated.map((card) => card.id)));
      setFlashcardModelInUse(profileQuery.data?.llm_model ?? null);
      setFlashcardSelectionOpen(true);
      console.info("[notes] flashcard generation success", {
        noteId: selectedNoteId,
        generated: generated.length,
        model: profileQuery.data?.llm_model ?? "default",
      });
    } catch (error: any) {
      console.error("[notes] flashcard generation failed", error);
      showSnackbar(error?.message ?? "Flashcard generation failed", "error");
    } finally {
      setGeneratingFlashcards(false);
    }
  };

  const handleSaveSelectedFlashcards = async () => {
    if (!selectedNoteId) return;
    const selectedCards = flashcardSelection.filter((card) =>
      selectedFlashcardIds.has(card.id)
    );
    if (!selectedCards.length) {
      showSnackbar("Select at least one card to save.", "info");
      return;
    }
    setSavingFlashcards(true);
    try {
      // Batch save to Firestore
      const batch = writeBatch(firebaseDb);
      const flashcardsCol = collection(firebaseDb, "flashcards");
      const now = new Date().toISOString();

      const savedCards: FlashcardRecord[] = selectedCards.map((card) => {
        const newDocRef = doc(flashcardsCol);
        const newCard: FlashcardRecord = {
          id: newDocRef.id,
          note_id: selectedNoteId,
          document_id: null,
          term: card.term ?? null,
          definition: card.definition,
          context: card.context ?? null,
          category: card.category ?? "definition",
          created_at: now,
        };
        batch.set(newDocRef, newCard);
        return newCard;
      });

      await batch.commit();

      const data = {
        flashcards: savedCards,
        saved_count: savedCards.length,
        set_id: undefined
      };
      setLatestFlashcards(data.flashcards ?? []);
      setFlashcardDialogOpen(true);
      setFlashcardSelectionOpen(false);
      showSnackbar(
        `Saved ${data.saved_count ?? data.flashcards?.length ?? selectedCards.length} flashcards`
      );
      console.info("[notes] flashcard save success", {
        noteId: selectedNoteId,
        saved: data.saved_count ?? data.flashcards?.length ?? selectedCards.length,
        setId: data.set_id,
      });
    } catch (error: any) {
      console.error("[notes] flashcard save failed", error);
      showSnackbar(error?.message ?? "Failed to save flashcards", "error");
    } finally {
      setSavingFlashcards(false);
    }
  };

  const toggleFlashcardSelection = (id: string, next?: boolean) => {
    setSelectedFlashcardIds((prev) => {
      const updated = new Set(prev);
      const shouldSelect = typeof next === "boolean" ? next : !updated.has(id);
      if (shouldSelect) {
        updated.add(id);
      } else {
        updated.delete(id);
      }
      return updated;
    });
  };

  const selectAllFlashcards = () => {
    setSelectedFlashcardIds(new Set(flashcardSelection.map((card) => card.id)));
  };

  const clearFlashcardSelection = () => {
    setSelectedFlashcardIds(new Set());
  };

  const handleAskAI = async () => {
    if (!askAIInput.trim()) return;
    if (!selectedNoteId && askAIScope === "note") {
      showSnackbar("No note selected", "error");
      return;
    }
    if (!selectedFolderId && askAIScope === "folder") {
      showSnackbar("No folder selected", "error");
      return;
    }

    setAskAILoading(true);
    const userMessageText = askAIInput;
    setAskAIInput("");

    // Add user message to UI immediately
    const userMsgId = crypto.randomUUID();
    setChatMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        role: "user",
        content: userMessageText,
      },
    ]);

    try {
      // Create conversation if needed
      if (!currentConversationId) {
        let scope;
        if (askAIScope === "note" && selectedNoteId) {
          scope = { type: "doc" as const, ids: [selectedNoteId] };
        } else if (askAIScope === "folder" && selectedFolderId) {
          scope = { type: "folder" as const, ids: [selectedFolderId] };
        } else {
          scope = { type: "all" as const, ids: [] };
        }

        const conversationResult = await startConversation.mutateAsync({
          scope,
          title: `Chat about ${noteDetail?.title || "notes"}`,
        });
        setCurrentConversationId(conversationResult.conversation_id);

        // Send the message in the new conversation
        const response = await sendMessage(conversationResult.conversation_id, userMessageText);

        // Add assistant response
        setChatMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: response.answer,
            citations: response.sources?.map((s) => ({
              id: s.chunk_id,
              note_id: s.note_id || "",
              source_title: s.preview?.slice(0, 30) || "Source",
              similarity: s.score,
            })),
          },
        ]);
      } else {
        // Send message in existing conversation
        const response = await sendMessage(currentConversationId, userMessageText);

        // Add assistant response
        setChatMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: response.answer,
            citations: response.sources?.map((s) => ({
              id: s.chunk_id,
              note_id: s.note_id || "",
              source_title: s.preview?.slice(0, 30) || "Source",
              similarity: s.score,
            })),
          },
        ]);
      }
    } catch (error: any) {
      console.error("Chat error:", error);
      showSnackbar(error?.message ?? "Failed to send message", "error");
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
      const front = card.term || card.definition.slice(0, 60);
      const back = [
        `<strong>${card.term ?? ""}</strong>`,
        `<p>${card.definition}</p>`,
      ].join("");
      exporter.addCard(front, back);
    });
    const zip = await exporter.save();
    const slug = slugify(noteDetail.title || "flashcards");
    saveAs(zip, `${slug}.apkg`);
    showSnackbar("Exported .apkg file", "success");
  };

  const handlePdfDrop = async (file: File) => {
    if (!userId || !selectedFolderId) {
      showSnackbar("Select a folder before dropping documents", "info");
      return;
    }
    setUploadState({ status: "uploading", filename: file.name });
    try {
      const storagePath = `${DOCUMENTS_BUCKET}/${userId}/${Date.now()}-${file.name
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
      const data = await processDocument.mutateAsync({
        document_id: docRef.id,
        file_path: storagePath,
      });
      setUploadState({ status: "idle" });
      const extractedEn = data.text_preview || "";
      const extractedZh = "";
      setNoteDraft({
        title: file.name,
        content: extractedEn || extractedZh,
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
                  ? alpha("#1e6ad4", 0.12)
                  : "transparent",
              cursor: "pointer",
              pl: `${node.depth * 16 + 8}px`,
              borderLeft:
                selectedFolderId === node.id ? "3px solid" : "3px solid transparent",
              borderColor:
                selectedFolderId === node.id ? "primary.main" : "transparent",
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
        <Paper sx={{ p: 2, borderRadius: 2, boxShadow: "0 6px 18px rgba(0,0,0,0.04)" }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="subtitle2" fontWeight={700}>
              Folders
            </Typography>
            <Tooltip title="Create folder">
              <IconButton
                size="small"
                color="primary"
                onClick={() =>
                  setFolderDialog({
                    mode: "create",
                    open: true,
                    name: "",
                    parentId: null,
                  })
                }
              >
                <CreateNewFolderIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
          <Divider sx={{ mb: 1 }} />
          <Box sx={{ maxHeight: 360, overflow: "auto" }}>
            {foldersQuery.isLoading ? (
              <Stack alignItems="center" justifyContent="center" sx={{ py: 6 }}>
                <CircularProgress size={24} />
              </Stack>
            ) : folderTree.length ? (
              renderFolderNodes(folderTree)
            ) : (
              <Stack spacing={2} alignItems="center" sx={{ py: 3 }}>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Create folders to organize your notes.
                </Typography>

                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<CreateNewFolderIcon />}
                  onClick={() =>
                    setFolderDialog({
                      mode: "create",
                      open: true,
                      name: "",
                      parentId: null,
                    })
                  }
                >
                  Create First Folder
                </Button>
              </Stack>
            )}
          </Box>
        </Paper>
        <Paper sx={{ p: 2, borderRadius: 2, boxShadow: "0 6px 18px rgba(0,0,0,0.04)" }}>
          <Stack direction="row" alignItems="center" mb={1} spacing={1}>
            <Typography variant="subtitle1" fontWeight={700} flexGrow={1}>
              Notes ({notesInFolder.length})
            </Typography>
            <IconButton
              size="small"
              color="primary"
              onClick={() => createNoteMutation.mutate()}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </Stack>
          <Divider sx={{ mb: 1 }} />
          <List dense sx={{ maxHeight: 360, overflow: "auto" }}>
            {notesInFolder.map((note) => (
              <ListItemButton
                key={note.id}
                selected={note.id === selectedNoteId}
                onClick={() => setSelectedNoteId(note.id)}
                sx={{
                  borderRadius: 1.5,
                  mb: 0.5,
                  alignItems: "flex-start",
                  "&.Mui-selected": {
                    backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.12),
                    borderLeft: "3px solid",
                    borderColor: "primary.main",
                  },
                }}
              >
                <ListItemText
                  primary={
                    <Typography fontWeight={700} fontSize="0.95rem">
                      {note.title}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="body2" color="text.secondary">
                      {note.word_count ?? 0} words
                    </Typography>
                  }
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
        <Paper
          sx={{
            p: 3,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            borderRadius: 2,
            boxShadow: "0 8px 24px rgba(0,0,0,0.04)",
          }}
        >
          <Stack spacing={1.5}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              alignItems={{ xs: "stretch", md: "center" }}
            >
              <TextField
                fullWidth
                placeholder="Untitled note"
                variant="standard"
                InputProps={{
                  disableUnderline: false,
                  sx: { fontSize: "1.6rem", fontWeight: 700 },
                }}
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
            <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography variant="body2" color="text.secondary">
                {noteDetail
                  ? `Updated ${new Date(noteDetail.updated_at).toLocaleTimeString()}`
                  : "Select a note"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                •
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {noteDetail?.word_count ?? 0} words
              </Typography>
              <Typography variant="body2" color="text.secondary">
                •
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formatReadingTime(noteDetail?.reading_time_seconds ?? 0)}
              </Typography>
              <Chip
                size="small"
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
                      ? "Saved"
                      : "Idle"
                }
              />
              <Tooltip title="Save now (Cmd/Ctrl + S)">
                <span>
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => saveNote("manual")}
                    disabled={!isDirty}
                  >
                    <SaveIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Duplicate note">
                <span>
                  <IconButton
                    size="small"
                    onClick={() => duplicateNoteMutation.mutate()}
                    disabled={!noteDetail}
                  >
                    <DuplicateIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Version history">
                <span>
                  <IconButton
                    size="small"
                    onClick={() => setHistoryOpen(true)}
                    disabled={!noteDetail}
                  >
                    <HistoryIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Delete note">
                <span>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() =>
                      selectedNoteId && deleteNoteMutation.mutate(selectedNoteId)
                    }
                    disabled={!selectedNoteId}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          </Stack>

          <Box
            sx={{
              backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.03),
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              p: 1.5,
              display: "flex",
              flexWrap: "wrap",
              gap: 1,
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button
                startIcon={<StyleIcon />}
                variant="contained"
                onClick={handleFlashcards}
                disabled={!selectedNoteId || generatingFlashcards}
              >
                {generatingFlashcards ? "Generating..." : "Generate Flashcards"}
              </Button>
              <Button
                startIcon={<QuestionAnswerIcon />}
                variant="contained"
                color="secondary"
                onClick={() => {
                  if (!selectedNoteId) {
                    showSnackbar("Select a note first", "info");
                    return;
                  }
                  // Just toggle the chat dialog - preserve history
                  setChatOpen(true);
                }}
                disabled={!selectedNoteId}
              >
                Ask AI
              </Button>

            </Stack>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button
                startIcon={<TranslateIcon />}
                variant="outlined"
                disabled={!selectedNoteId || translateLoading}
                onClick={(event) => setTranslateMenuAnchor(event.currentTarget)}
              >
                {translateLoading ? "Translating..." : "Translate"}
              </Button>
              <Button
                startIcon={<FormatListBulletedIcon />}
                variant="outlined"
                onClick={(event) => setStyleMenuAnchor(event.currentTarget)}
              >
                Text styling
              </Button>
              <Button
                startIcon={<CodeIcon />}
                variant="outlined"
                onClick={() => {
                  const language = prompt("Language (e.g., python, sql)") ?? "";
                  const snippet = `\n\`\`\`${language}\n// code here\n\`\`\`\n`;
                  setNoteDraft((prev) => ({ ...prev, content: prev.content + snippet }));
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
          </Box>

          <Stack
            direction={{ xs: "column", lg: "row" }}
            spacing={2}
            alignItems="stretch"
            sx={{
              width: "100%",
              maxWidth: "100%",
              mx: 0,
            }}
          >
            <TextField
              multiline
              minRows={10}
              fullWidth
              sx={{
                flex: 1,
                width: { xs: "100%", lg: showPreview ? "50%" : "100%" },
                height: EDITOR_PANEL_HEIGHT,
                "& .MuiInputBase-root": {
                  height: "100%",
                  alignItems: "flex-start",
                  bgcolor: "background.paper",
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  px: 1,
                },
                "& .MuiInputBase-input": {
                  height: "100% !important",
                  overflow: "auto",
                  lineHeight: 1.7,
                },
              }}
              value={noteDraft.content}
              onChange={(event) => {
                const value = event.target.value;
                setNoteDraft((prev) => ({ ...prev, content: value }));
              }}
              placeholder="Write your note in Markdown..."
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
                  flex: 1,
                  width: { xs: "100%", lg: "50%" },
                  height: EDITOR_PANEL_HEIGHT,
                  overflow: "auto",
                  borderRadius: 2,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.04)",
                }}
              >
                <Box sx={markdownPreviewSx}>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                    components={markdownComponents as any}
                  >
                    {noteDraft.content}
                  </ReactMarkdown>
                </Box>
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
        </Paper>
      </Stack>

      <Menu
        anchorEl={translateMenuAnchor}
        open={Boolean(translateMenuAnchor)}
        onClose={() => setTranslateMenuAnchor(null)}
      >
        {(["zh", "en"] as const).map((lang) => (
          <MenuItem
            key={lang}
            disabled={translateLoading}
            onClick={() => {
              setTranslateMenuAnchor(null);
              void handleTranslation(lang);
            }}
          >
            Translate to {languageLabels[lang]}
          </MenuItem>
        ))}
      </Menu>

      <Menu
        anchorEl={styleMenuAnchor}
        open={Boolean(styleMenuAnchor)}
        onClose={() => setStyleMenuAnchor(null)}
      >
        <MenuItem
          onClick={() => {
            applyTextStyling("heading1");
            setStyleMenuAnchor(null);
          }}
        >
          Heading 1 (#)
        </MenuItem>
        <MenuItem
          onClick={() => {
            applyTextStyling("heading2");
            setStyleMenuAnchor(null);
          }}
        >
          Heading 2 (##)
        </MenuItem>
        <MenuItem
          onClick={() => {
            applyTextStyling("heading3");
            setStyleMenuAnchor(null);
          }}
        >
          Heading 3 (###)
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            applyTextStyling("bold");
            setStyleMenuAnchor(null);
          }}
        >
          Bold (**)
        </MenuItem>
        <MenuItem
          onClick={() => {
            applyTextStyling("italic");
            setStyleMenuAnchor(null);
          }}
        >
          Italic (*)
        </MenuItem>
        <MenuItem
          onClick={() => {
            applyTextStyling("strike");
            setStyleMenuAnchor(null);
          }}
        >
          Strikethrough (~~)
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            applyTextStyling("bullet");
            setStyleMenuAnchor(null);
          }}
        >
          Bullet list
        </MenuItem>
        <MenuItem
          onClick={() => {
            applyTextStyling("indent");
            setStyleMenuAnchor(null);
          }}
        >
          Indent
        </MenuItem>
        <MenuItem
          onClick={() => {
            applyTextStyling("outdent");
            setStyleMenuAnchor(null);
          }}
        >
          Outdent
        </MenuItem>
      </Menu>

      <Menu
        anchorEl={folderMenu.anchor}
        open={Boolean(folderMenu.anchor)}
        onClose={() => setFolderMenu({ anchor: null })}
      >
        <MenuItem
          onClick={() => {
            const folder = folders.find((f) => f.id === folderMenu.folderId);
            setFolderDialog({
              mode: "create",
              open: true,
              name: "",
              parentId: folder?.id ?? null,
            });
            setFolderMenu({ anchor: null });
          }}
        >
          <CreateNewFolderIcon fontSize="small" sx={{ mr: 1 }} /> Create Folder
        </MenuItem>
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

            try {
              const folderId = folderMenu.folderId;
              const folderNotes = notes.filter(
                (note) => note.folder_id === folderId
              );

              // Prevent deletion if folder contains notes
              if (folderNotes.length > 0) {
                showSnackbar(
                  `Cannot delete folder with ${folderNotes.length} note${folderNotes.length > 1 ? 's' : ''}. Please delete or move the notes first.`,
                  "error"
                );
                setFolderMenu({ anchor: null });
                return;
              }

              // Confirm deletion for empty folder
              if (!confirm("Delete this empty folder?")) {
                setFolderMenu({ anchor: null });
                return;
              }

              await deleteDoc(doc(firebaseDb, "folders", folderId));

              // Reset selection if we deleted the currently selected folder
              if (selectedFolderId === folderId) {
                setSelectedFolderId(null);
              }

              queryClient.invalidateQueries({ queryKey: ["folders"] });
              showSnackbar("Folder deleted", "info");
            } catch (error: any) {
              showSnackbar(error?.message ?? "Failed to delete folder", "error");
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
        open={flashcardSelectionOpen}
        onClose={() => {
          if (savingFlashcards) return;
          setFlashcardSelectionOpen(false);
        }}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Review generated flashcards</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              alignItems={{ xs: "flex-start", sm: "center" }}
              justifyContent="space-between"
            >
              <Typography variant="body2" color="text.secondary">
                Using model:{" "}
                {flashcardModelInUse ??
                  profileQuery.data?.llm_model ??
                  "default (workspace setting)"}
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button size="small" variant="outlined" onClick={selectAllFlashcards}>
                  Select all
                </Button>
                <Button size="small" variant="outlined" onClick={clearFlashcardSelection}>
                  Clear all
                </Button>
              </Stack>
            </Stack>
            <List dense>
              {flashcardSelection.map((card) => (
                <ListItem
                  key={card.id}
                  alignItems="flex-start"
                  secondaryAction={
                    <Checkbox
                      edge="end"
                      checked={selectedFlashcardIds.has(card.id)}
                      onChange={(event) => toggleFlashcardSelection(card.id, event.target.checked)}
                    />
                  }
                >
                  <ListItemText
                    primary={
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="subtitle1">
                          {card.term ?? "Term"}
                        </Typography>
                        <Chip
                          label={(card.category ?? "definition").toUpperCase()}
                          size="small"
                        />
                      </Stack>
                    }
                    secondary={
                      <Stack spacing={0.5}>
                        <Typography variant="body2" color="text.primary">
                          {card.definition}
                        </Typography>
                        {card.context ? (
                          <Typography variant="caption" color="text.secondary">
                            {card.context}
                          </Typography>
                        ) : null}
                      </Stack>
                    }
                  />
                </ListItem>
              ))}
              {!flashcardSelection.length && (
                <ListItem>
                  <ListItemText
                    primary="No flashcards generated yet."
                    secondary="Generate flashcards from a note to review and select them here."
                  />
                </ListItem>
              )}
            </List>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              if (savingFlashcards) return;
              setFlashcardSelectionOpen(false);
              setFlashcardSelection([]);
              setSelectedFlashcardIds(new Set());
            }}
            disabled={savingFlashcards}
          >
            Start over
          </Button>
          <Button
            onClick={handleSaveSelectedFlashcards}
            variant="contained"
            disabled={savingFlashcards || !selectedFlashcardIds.size}
          >
            {savingFlashcards
              ? "Saving..."
              : `Save ${selectedFlashcardIds.size} flashcard${selectedFlashcardIds.size === 1 ? "" : "s"}`}
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
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Saved to Firestore{latestFlashcards[0]?.set_id ? ` (set ${latestFlashcards[0]?.set_id})` : ""}.
          </Typography>
          <List dense>
            {latestFlashcards.map((card) => (
              <ListItem key={card.id}>
                <ListItemText
                  primary={`${card.category.toUpperCase()}: ${card.term ?? "Term"}`}
                  secondary={`${card.definition.slice(0, 80)}`}
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
                  onClick={() =>
                    restoreVersion(version).catch((error) =>
                      showSnackbar(error.message, "error")
                    )
                  }
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

      <Dialog
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            position: 'fixed',
            right: 24,
            bottom: 24,
            top: 'auto',
            left: 'auto',
            m: 0,
            maxHeight: '70vh',
            width: 450,
          }
        }}
      >
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Ask AI</Typography>
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  setCurrentConversationId(null);
                  setChatMessages([]);
                  showSnackbar("Started new conversation", "info");
                }}
              >
                New Chat
              </Button>
              <IconButton size="small" onClick={() => setChatOpen(false)}>
                <DeleteIcon />
              </IconButton>
            </Stack>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center" mt={1}>
            <TextField
              select
              label="Scope"
              size="small"
              value={askAIScope}
              onChange={(event) =>
                setAskAIScope(event.target.value as "note" | "folder" | "all")
              }
              fullWidth
            >
              <MenuItem value="note">Current note</MenuItem>
              <MenuItem value="folder">Current folder</MenuItem>
              <MenuItem value="all">All notes</MenuItem>
            </TextField>
          </Stack>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 2 }}>
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
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            value={askAIInput}
            onChange={(event) => setAskAIInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                handleAskAI();
              }
            }}
            placeholder="Ask something about your notes... (Enter to send, Shift+Enter for new line)"
            disabled={askAILoading}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Button onClick={handleAskAI} disabled={askAILoading || !askAIInput.trim()}>
                    Send
                  </Button>
                </InputAdornment>
              ),
            }}
          />
        </DialogActions>
      </Dialog>

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
