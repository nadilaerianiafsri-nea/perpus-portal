import { parseAdminBookInput, positiveBookId } from './admin-books.input';
import { parseAdminEBookInput } from '../admin-ebooks/admin-ebooks.input';
import { validateCoverFile } from '../admin-uploads/cover-file';

const book = {
  code: 'BK-1', title: 'Hukum & HAM', author: "O'Connor", isbnIssn: '',
  publisher: 'R&D', year: 2026, edition: '', language: 'Indonesia',
  subject: 'Hukum', location: 'Lantai 1', shelf: 'A-1', totalStock: 1,
  description: 'Ringkasan\nBuku', coverUrl: '/images/landing/book-placeholder-1.svg', isActive: true,
};
const ebook = {
  code: book.code, title: book.title, author: book.author, isbnIssn: '', publisher: book.publisher,
  year: 2026, edition: '', language: 'Indonesia', subject: 'Hukum', description: book.description,
  coverUrl: book.coverUrl, accessMode: 'BACA_DI_WEBSITE', ebookUrl: 'https://example.com/book.pdf',
  accessDurationDays: null, licenseNote: '', isActive: true,
};

describe('Admin content security input boundary', () => {
  it.each(['code', 'title', 'author', 'isbnIssn', 'publisher', 'edition', 'language', 'subject', 'location', 'shelf', 'description', 'coverUrl'])('rejects HTML book %s', (field) => {
    expect(() => parseAdminBookInput({ ...book, [field]: '<img src=x onerror=alert(1)>' })).toThrow('Input tidak boleh mengandung HTML.');
  });
  it.each(['code', 'title', 'author', 'isbnIssn', 'publisher', 'edition', 'language', 'subject', 'description', 'coverUrl', 'ebookUrl', 'licenseNote'])('rejects HTML e-book %s', (field) => {
    expect(() => parseAdminEBookInput({ ...ebook, [field]: '<svg onload=alert(1)>' })).toThrow('Input tidak boleh mengandung HTML.');
  });
  it('retains legitimate punctuation and SQL-shaped plain text', () => {
    expect(parseAdminBookInput(book).author).toBe("O'Connor");
    expect(parseAdminBookInput({ ...book, title: "' OR 1=1 --" }).title).toBe("' OR 1=1 --");
    expect(parseAdminEBookInput(ebook).publisher).toBe('R&D');
    expect(parseAdminBookInput({ ...book, edition: '   ' }).edition).toBeNull();
    expect(parseAdminEBookInput({ ...ebook, licenseNote: '   ' }).licenseNote).toBeNull();
  });
  it.each(['javascript:alert(1)', 'data:image/svg+xml,test', 'vbscript:msgbox(1)', '//evil.example/img', '/uploads/covers/evil.svg'])('rejects unsafe cover URL %s', (coverUrl) => {
    expect(() => parseAdminBookInput({ ...book, coverUrl })).toThrow();
    expect(() => parseAdminEBookInput({ ...ebook, coverUrl })).toThrow();
  });
  it.each(['javascript:alert(1)', 'data:text/html,test', 'vbscript:msgbox(1)', '//evil.example/ebook'])('rejects unsafe ebook source %s', (ebookUrl) => {
    expect(() => parseAdminEBookInput({ ...ebook, ebookUrl })).toThrow();
  });
  it('rejects unknown body keys and numeric coercion', () => {
    expect(() => parseAdminBookInput({ ...book, isDemo: true })).toThrow();
    expect(() => parseAdminEBookInput({ ...ebook, type: 'FISIK' })).toThrow();
    expect(() => parseAdminBookInput({ ...book, year: '2026' })).toThrow();
    expect(() => parseAdminEBookInput({ ...ebook, accessDurationDays: '2' })).toThrow();
  });
  it('rejects database integer overflow IDs', () => {
    expect(() => positiveBookId('2147483648')).toThrow();
  });
  it('rejects a valid PNG signature under an executable filename', () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    // Uploaded filename must agree with the content and MIME allowlist.
    expect(() => (validateCoverFile as (...args: unknown[]) => unknown)(png, 'image/png', 'cover.html')).toThrow();
  });
});
