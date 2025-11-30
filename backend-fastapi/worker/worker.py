import os
from arq.connections import RedisSettings
from worker.pdf_processor import PDFProcessor

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

async def process_document_task(ctx, document_id: str, file_path: str, user_id: str, extract_text: bool, generate_embeddings: bool):
    """
    Task function to be executed by arq worker.
    """
    processor = PDFProcessor()
    await processor.process_document(
        document_id=document_id,
        file_path=file_path,
        user_id=user_id,
        extract_text=extract_text,
        generate_embeddings=generate_embeddings
    )

class WorkerSettings:
    functions = [process_document_task]
    redis_settings = RedisSettings.from_dsn(REDIS_URL)
