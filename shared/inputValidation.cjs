const { Tokenizer } = require('htmlparser2');
const { decodeHTMLStrict } = require('entities');

// Inspect entities once without rewriting stored input or repeatedly decoding.
// Output encoding remains a separate requirement, including for older records.
exports.containsHtml = function containsHtml(value) {
  if (typeof value !== 'string') return false;
  let found = false;
  const markup = () => { found = true; };
  const noop = () => {};
  // Token callbacks see unmatched closing tags as well as ordinary HTML. No DOM
  // insertion or sanitizer is involved: plain-text fields reject markup outright.
  const parser = new Tokenizer({ decodeEntities: false }, {
    onopentagname: markup, onclosetag: markup, oncomment: markup,
    ondeclaration: markup, onprocessinginstruction: markup, oncdata: markup,
    onattribdata: noop, onattribentity: noop, onattribend: noop,
    onattribname: noop, onend: noop, onopentagend: noop,
    onselfclosingtag: noop, ontext: noop, ontextentity: noop,
  });
  // A trailing space lets the tokenizer finish an unterminated tag name.
  parser.write(decodeHTMLStrict(value) + ' ');
  parser.end();
  return found;
};

exports.textInputError = function textInputError(value, options = {}) {
  const { max = 191, required = true, multiline = false } = options;
  if (typeof value !== 'string') return 'Input harus berupa teks.';
  if (required && !value.trim()) return 'Input wajib diisi.';
  if (value.length > max) return `Input maksimal ${max} karakter.`;
  if (exports.containsHtml(value)) return 'Input tidak boleh mengandung HTML.';
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value) || (!multiline && /[\r\n\t]/.test(value))) {
    return 'Input mengandung karakter tidak valid.';
  }
  return null;
};

exports.isSafeUrl = function isSafeUrl(value, options = {}) {
  if (typeof value !== 'string' || !value || value.length > 2048 || value !== value.trim()) return false;
  if (/[\u0000-\u0020\u007f\\]/.test(value) || /%(?:0[0-9a-f]|1[0-9a-f]|7f)/i.test(value) || exports.containsHtml(value)) return false;
  try {
    if (value.startsWith('/')) {
      if (!options.allowRelative || value.startsWith('//')) return false;
      return new URL(value, 'https://input.invalid').origin === 'https://input.invalid';
    }
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !!url.hostname && !url.username && !url.password;
  } catch { return false; }
};

exports.escapeHtml = function escapeHtml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
};
