const { isSafeUrl } = require('./inputValidation.cjs');
const localCover = /^\/(?:images\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.(?:svg|jpg|jpeg|png|webp)|uploads\/covers\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|png|webp))$/;
const localDocument = /^\/(?:ebooks|files)\/[A-Za-z0-9_-]+\.(?:html|pdf)$/;
exports.safeCoverUrl = function safeCoverUrl(value) {
  return typeof value === 'string' && (isSafeUrl(value) || localCover.test(value)) ? value : '/images/landing/book-placeholder-1.svg';
};
exports.safeEBookUrl = function safeEBookUrl(value) {
  return typeof value === 'string' && (isSafeUrl(value) || localDocument.test(value)) ? value : null;
};
exports.localReaderSource = function localReaderSource(value) {
  return typeof value === 'string' && localDocument.test(value) ? value : null;
};
