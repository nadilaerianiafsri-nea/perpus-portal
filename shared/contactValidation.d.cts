export type ContactInput = { name: string; email: string; message: string };
export type ContactErrors = Partial<Record<keyof ContactInput, string>>;
export function validateContact(body: unknown): { value: ContactInput; errors: ContactErrors };
