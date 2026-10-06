const emailPattern = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/;
exports.validateContact = function validateContact(body) {
  const input = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  const errors = {};
  const text = (key, label, max) => {
    const value = typeof input[key] === 'string' ? input[key].trim() : '';
    if (!value) errors[key] = `${label} wajib diisi.`;
    else if (value.length > max) errors[key] = `${label} maksimal ${max} karakter.`;
    else if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) errors[key] = `${label} mengandung karakter tidak valid.`;
    return value;
  };
  const value = {name: text('name', 'Nama', 100), email: text('email', 'Email', 254).toLowerCase(), message: text('message', 'Pesan', 3000)};
  if (value.name && /[\r\n]/.test(value.name)) errors.name = 'Nama harus ditulis dalam satu baris.';
  const [local = '', domain = ''] = value.email.split('@');
  if (value.email && (!emailPattern.test(value.email) || local.length > 64 || local.startsWith('.') || local.endsWith('.') || local.includes('..') || domain.split('.').some(label => label.length > 63))) errors.email = 'Email tidak valid.';
  return {value, errors};
};
