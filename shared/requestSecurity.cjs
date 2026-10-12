class RequestInputError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

exports.assertSameOrigin = function assertSameOrigin(request) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return;
  const origin = request.headers.get('origin');
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get('sec-fetch-site') === 'cross-site') {
    throw new RequestInputError('Permintaan tidak diizinkan.', 403);
  }
};

exports.readLimitedBytes = async function readLimitedBytes(request, max = 65536) {
  const declared = request.headers.get('content-length');
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > max)) throw new RequestInputError('Data permintaan terlalu panjang.', 413);
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks = [];
  let length = 0;
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      length += part.value.byteLength;
      if (length > max) { await reader.cancel(); throw new RequestInputError('Data permintaan terlalu panjang.', 413); }
      chunks.push(part.value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
};

exports.readLimitedText = async function readLimitedText(request, max = 65536) {
  const bytes = await exports.readLimitedBytes(request, max);
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { throw new RequestInputError('Encoding permintaan tidak valid.', 400); }
};

exports.requestErrorResponse = function requestErrorResponse(error) {
  return error instanceof RequestInputError ? Response.json({ message: error.message }, { status: error.status, headers: { 'Cache-Control': 'no-store' } }) : null;
};
