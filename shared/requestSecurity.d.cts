export function assertSameOrigin(request: Request): void;
export function readLimitedBytes(request: Request, max?: number): Promise<Uint8Array<ArrayBuffer>>;
export function readLimitedText(request: Request, max?: number): Promise<string>;
export function requestErrorResponse(error: unknown): Response | null;
