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
    target_language: "zh" | "en";
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
    front: string;
    back: string;
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
