// Notes API types
export interface AIQARequest {
    note_id?: string;
    question: string;
    top_k?: number;
}

export interface AIQASource {
    chunk_id: string;
    note_id: string | null;
    position: number | null;
    score: number;
    preview: string;
}

export interface AIQAResponse {
    answer: string;
    sources: AIQASource[];
}

export interface ReindexNoteRequest {
    note_id: string;
    force?: boolean;
}

export interface ReindexNoteResponse {
    success: boolean;
    chunks_created: number;
    note_id: string;
}

export interface TranslateNoteRequest {
    note_id: string;
    target_lang: "zh" | "en";
    content?: string;
}

export interface TranslateNoteResponse {
    note_id: string;
    translated_content: string;
    target_language: string;
}

export interface ExtractTerminologyRequest {
    text: string;
    note_id?: string;
}

export interface TerminologyItem {
    term: string;
    definition: string;
}

export interface ExtractTerminologyResponse {
    terms: TerminologyItem[];
}

// Documents API types
export interface UploadProcessRequest {
    document_id: string;
    file_path: string;
    chunk_size?: number;
}

export interface UploadProcessResponse {
    success: boolean;
    document_id: string;
    note_id: string | null;
    chunks_created: number;
    text_preview: string;
}

// Flashcards API types
export interface GenerateFlashcardsRequest {
    note_id: string;
    count?: number;
    auto_save?: boolean;
}

export interface FlashcardItem {
    term: string;
    definition: string;
    context?: string;
    tags?: string[];
}

export interface GenerateFlashcardsResponse {
    flashcards: FlashcardItem[];
    note_id: string;
}

export interface ReviewFlashcardRequest {
    flashcard_id: string;
    quality: number; // 0-5 SM-2 quality rating
}

export interface ReviewFlashcardResponse {
    flashcard_id: string;
    next_review_date: string;
    interval: number;
    ease_factor: number;
}

// Graph API types
export interface ExtractGraphRequest {
    text: string;
    source_id: string;
}

export interface GraphNode {
    id: string;
    label: string;
    type: string;
    source_ids: string[];
}

export interface GraphEdge {
    id: string;
    from: string;
    to: string;
    relation: string;
    source_id: string;
}

export interface GraphData {
    nodes: GraphNode[];
    edges: GraphEdge[];
}

// Chat API types
export interface ChatScope {
    type: "doc" | "folder" | "all";
    ids: string[];
}

export interface StartConversationRequest {
    scope: ChatScope;
    title?: string;
}

export interface StartConversationResponse {
    conversation_id: string;
}

export interface SendMessageRequest {
    message: string;
}

export interface SourceChunk {
    chunk_id: string;
    note_id: string | null;
    doc_id: string | null;
    score: number;
    preview: string;
}

export interface SendMessageResponse {
    answer: string;
    sources: SourceChunk[];
}

export interface MessageItem {
    id: string;
    role: "user" | "assistant";
    content: string;
    created_at: string;
    sources?: SourceChunk[];
}

export interface ConversationListItem {
    id: string;
    title: string;
    scope: ChatScope;
    created_at: string;
    updated_at: string;
    message_count?: number;
}

export interface ConversationDetail {
    id: string;
    title: string;
    scope: ChatScope;
    created_at: string;
    updated_at: string;
    messages: MessageItem[];
}

// Analytics API types
export interface UserOverviewStats {
    total_notes: number;
    total_flashcards: number;
    total_reviews: number;
    avg_interval: number;
    mastery_rate_percent: number;
}

export interface DailyReviewActivity {
    review_date: string;  // YYYY-MM-DD format
    review_count: number;
    avg_rating: number;
}

export interface AnalyticsOverviewResponse {
    overview: UserOverviewStats;
    activity: DailyReviewActivity[];
}

