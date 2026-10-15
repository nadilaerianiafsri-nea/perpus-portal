export const MAX_EBOOK_BYTES = 50 * 1024 * 1024;

const privatePrefix = '/private-ebooks/';
const safeEBookName =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.pdf$/;

export function isSafeEBookFilename(filename: string): boolean {
  return safeEBookName.test(filename);
}

export function privateEBookReference(filename: string): string {
  if (!isSafeEBookFilename(filename)) {
    throw new Error('Nama file E-Book tidak valid.');
  }
  return `${privatePrefix}${filename}`;
}

export function privateEBookFilename(
  value: string | null | undefined,
): string | null {
  if (typeof value !== 'string' || !value.startsWith(privatePrefix)) {
    return null;
  }
  const filename = value.slice(privatePrefix.length);
  return isSafeEBookFilename(filename) ? filename : null;
}

export function validateEBookFile(
  buffer: Buffer,
  mimetype: string,
  originalname?: string,
): 'pdf' {
  if (!buffer.length) {
    throw new Error('File E-Book wajib dipilih.');
  }
  if (buffer.length > MAX_EBOOK_BYTES) {
    throw new Error('Ukuran file E-Book maksimal 50 MB.');
  }
  if (mimetype !== 'application/pdf') {
    throw new Error('Format E-Book harus PDF.');
  }

  if (originalname !== undefined) {
    const suffix = originalname.split('.').pop()?.toLowerCase();
    // eslint-disable-next-line no-control-regex -- Reject control bytes in upload filenames.
    if (
      originalname.length > 191 ||
      /[\\/\u0000-\u001f\u007f]/.test(originalname) ||
      suffix !== 'pdf'
    ) {
      throw new Error('Nama dan ekstensi file E-Book tidak valid.');
    }
  }

  const signature = Buffer.from('%PDF-', 'ascii');
  const headerLimit = Math.min(buffer.length, 1024);
  const signatureIndex = buffer.subarray(0, headerLimit).indexOf(signature);
  if (signatureIndex < 0) {
    throw new Error('Isi file E-Book tidak sesuai dengan format PDF.');
  }

  return 'pdf';
}

export type PrivateEBookBook = {
  isActive: boolean;
  accessMode: string | null;
  ebookUrl: string | null;
};

export type PrivateEBookAccessResult =
  | { allowed: true; filename: string }
  | {
      allowed: false;
      reason:
        | 'BOOK_NOT_FOUND'
        | 'BOOK_INACTIVE'
        | 'NO_ACTIVE_LOAN'
        | 'FILE_UNAVAILABLE';
    };

export function resolvePrivateEBookAccess(
  book: PrivateEBookBook | null | undefined,
  hasActiveLoan: boolean,
): PrivateEBookAccessResult {
  if (!book) return { allowed: false, reason: 'BOOK_NOT_FOUND' };
  if (!book.isActive) return { allowed: false, reason: 'BOOK_INACTIVE' };
  if (!hasActiveLoan) return { allowed: false, reason: 'NO_ACTIVE_LOAN' };
  if (book.accessMode !== 'BACA_DI_WEBSITE') {
    return { allowed: false, reason: 'FILE_UNAVAILABLE' };
  }
  const filename = privateEBookFilename(book.ebookUrl);
  if (!filename) return { allowed: false, reason: 'FILE_UNAVAILABLE' };
  return { allowed: true, filename };
}
