export const MAX_COVER_BYTES = 5 * 1024 * 1024;

export type CoverExtension = 'jpg' | 'png' | 'webp';

const safeCoverName =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|png|webp)$/;

export function coverExtension(mimetype: string): CoverExtension | null {
  if (mimetype === 'image/jpeg') return 'jpg';
  if (mimetype === 'image/png') return 'png';
  if (mimetype === 'image/webp') return 'webp';
  return null;
}

export function isSafeCoverFilename(filename: string): boolean {
  return safeCoverName.test(filename);
}

function isJpeg(buffer: Buffer): boolean {
  return (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  );
}

function isPng(buffer: Buffer): boolean {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  return (
    buffer.length >= signature.length &&
    signature.every((value, index) => buffer[index] === value)
  );
}

function isWebp(buffer: Buffer): boolean {
  return (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  );
}

export function validateCoverFile(
  buffer: Buffer,
  mimetype: string,
): CoverExtension {
  if (buffer.length > MAX_COVER_BYTES) {
    throw new Error('Ukuran cover maksimal 5 MB.');
  }

  const extension = coverExtension(mimetype);
  if (!extension) {
    throw new Error('Format cover harus JPG, PNG, atau WEBP.');
  }

  const matches =
    extension === 'jpg'
      ? isJpeg(buffer)
      : extension === 'png'
        ? isPng(buffer)
        : isWebp(buffer);

  if (!matches) {
    throw new Error('Isi file cover tidak sesuai dengan format gambarnya.');
  }

  return extension;
}
