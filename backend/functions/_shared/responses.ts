export async function readJson<T>(req: Request): Promise<T> {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new BadRequestError("Request must be JSON");
  }
  return await req.json();
}

export function jsonResponse(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
    status: init.status ?? 200,
  });
}

export class BadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BadRequestError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export function handleError(error: unknown): Response {
  if (error instanceof UnauthorizedError) {
    return jsonResponse({ error: error.message }, { status: 401 });
  }
  if (error instanceof BadRequestError) {
    return jsonResponse({ error: error.message }, { status: 400 });
  }
  console.error("[EdgeFunction] Unhandled error", error);
  return jsonResponse({ error: "Internal Server Error" }, { status: 500 });
}
