export type TextInputOptions = { max?: number; required?: boolean; multiline?: boolean };
export function containsHtml(value: string): boolean;
export function textInputError(value: unknown, options?: TextInputOptions): string | null;
export function isSafeUrl(value: string, options?: { allowRelative?: boolean }): boolean;
export function escapeHtml(value: string): string;
