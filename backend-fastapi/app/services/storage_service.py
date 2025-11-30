import datetime
from google.cloud import storage
from app.config import get_settings

class StorageService:
    def __init__(self):
        self.settings = get_settings()
        self.client = storage.Client(project=self.settings.firebase_project_id)
        self.bucket_name = self.settings.firebase_storage_bucket

    def generate_upload_signed_url(self, blob_name: str, content_type: str, expiration_minutes: int = 15) -> str:
        """
        Generates a V4 signed URL for uploading a file to GCS.
        """
        bucket = self.client.bucket(self.bucket_name)
        blob = bucket.blob(blob_name)

        url = blob.generate_signed_url(
            version="v4",
            expiration=datetime.timedelta(minutes=expiration_minutes),
            method="PUT",
            content_type=content_type,
        )
        return url

    def generate_download_signed_url(self, blob_name: str, expiration_minutes: int = 60) -> str:
        """
        Generates a V4 signed URL for downloading a file from GCS.
        """
        bucket = self.client.bucket(self.bucket_name)
        blob = bucket.blob(blob_name)

        url = blob.generate_signed_url(
            version="v4",
            expiration=datetime.timedelta(minutes=expiration_minutes),
            method="GET",
        )
        return url
