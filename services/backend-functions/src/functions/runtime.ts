export interface HttpRequest {
  readonly method: string;
  readonly headers?: Readonly<Record<string, string | undefined>>;
  readonly body?: unknown;
}

export interface HttpResponse<TBody = unknown> {
  readonly status: number;
  readonly headers?: Readonly<Record<string, string>>;
  readonly body: TBody;
}

export type HttpHandler<TBody = unknown> = (request: HttpRequest) => Promise<HttpResponse<TBody>>;

export interface CallableAuthContext {
  readonly uid: string;
  readonly email?: string | null;
  readonly token?: Readonly<Record<string, unknown>>;
}

export interface CallableContext {
  readonly auth: CallableAuthContext | null;
}

export type CallableHandler<TRequest, TResponse> = (
  requestData: TRequest,
  context: CallableContext
) => Promise<TResponse>;

export class FunctionError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "FunctionError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function readJsonBody<TBody>(request: HttpRequest): TBody {
  if (typeof request.body === "string") {
    return JSON.parse(request.body) as TBody;
  }

  return request.body as TBody;
}

export function jsonResponse<TBody>(status: number, body: TBody): HttpResponse<TBody> {
  return {
    status,
    headers: {
      "content-type": "application/json"
    },
    body
  };
}

export function noContentResponse(): HttpResponse<Record<string, never>> {
  return {
    status: 204,
    body: {}
  };
}

export function ensureHttpMethod(request: HttpRequest, method: string): void {
  if (request.method.toUpperCase() !== method.toUpperCase()) {
    throw new FunctionError(405, "method-not-allowed", `Expected ${method.toUpperCase()} request.`);
  }
}

export function toErrorResponse(error: unknown): HttpResponse<{ error: { code: string; message: string; details?: unknown } }> {
  if (error instanceof FunctionError) {
    return jsonResponse(error.status, {
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    });
  }

  if (error instanceof Error) {
    return jsonResponse(500, {
      error: {
        code: "internal",
        message: error.message
      }
    });
  }

  return jsonResponse(500, {
    error: {
      code: "internal",
      message: "Unknown error."
    }
  });
}
