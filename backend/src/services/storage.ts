import { firebaseStorage } from "./firebaseAdmin";
import { NotFoundError } from "../errors";

export async function downloadFileBuffer(path: string): Promise<Buffer> {
  const bucket = firebaseStorage.bucket();
  const file = bucket.file(path);
  const [exists] = await file.exists();
  if (!exists) {
    throw new NotFoundError(`File not found at path: ${path}`);
  }
  const [buffer] = await file.download();
  return buffer;
}
