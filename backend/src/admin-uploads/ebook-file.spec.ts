import {
  privateEBookFilename,
  privateEBookReference,
  resolvePrivateEBookAccess,
  validateEBookFile,
} from './ebook-file';

describe('E-Book private file', () => {
  const uuid = '123e4567-e89b-42d3-a456-426614174000';

  it('accepts a real PDF upload and creates a private reference', () => {
    const pdf = Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF');

    expect(validateEBookFile(pdf, 'application/pdf', 'contoh.pdf')).toBe(
      'pdf',
    );
    expect(privateEBookReference(`${uuid}.pdf`)).toBe(
      `/private-ebooks/${uuid}.pdf`,
    );
    expect(privateEBookFilename(`/private-ebooks/${uuid}.pdf`)).toBe(
      `${uuid}.pdf`,
    );
  });

  it('rejects a fake PDF even when its MIME type and extension say PDF', () => {
    expect(() =>
      validateEBookFile(
        Buffer.from('not a pdf'),
        'application/pdf',
        'contoh.pdf',
      ),
    ).toThrow('Isi file E-Book tidak sesuai dengan format PDF.');
  });

  it('allows a private PDF only while the member has an active loan', () => {
    const book = {
      isActive: true,
      accessMode: 'BACA_DI_WEBSITE',
      ebookUrl: `/private-ebooks/${uuid}.pdf`,
    };

    expect(resolvePrivateEBookAccess(book, true)).toEqual({
      allowed: true,
      filename: `${uuid}.pdf`,
    });
    expect(resolvePrivateEBookAccess(book, false)).toEqual({
      allowed: false,
      reason: 'NO_ACTIVE_LOAN',
    });
  });
});
