import { getFunctionsBaseUrl } from "./firebaseClient";

export async function invokeFunction<T>({
  name,
  body,
  idToken,
}: {
  name: string;
  body: Record<string, unknown>;
  idToken?: string | null;
}): Promise<T> {
  const response = await fetch(`${getFunctionsBaseUrl()}/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      errorBody || `Request to ${name} failed (${response.status})`
    );
  }

  return response.json() as Promise<T>;
}
