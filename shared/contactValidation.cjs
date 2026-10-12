const emailPattern = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/;
const { textInputError } = require('./inputValidation.cjs');
exports.validateContact = function validateContact(body) {
  const input = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  const errors = {};
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(input).some(key => !['name', 'email', 'message'].includes(key))) {
    errors.message = 'Data pesan memiliki field yang tidak valid.';
  }
  const text = (key, label, max) => {
    const value = typeof input[key] === 'string' ? input[key].trim() : '';
    if (!value) errors[key] = `${label} wajib diisi.`;
    else if (value.length > max) errors[key] = `${label} maksimal ${max} karakter.`;
    else {
      const error = textInputError(input[key], { max, multiline: key === 'message' });
      if (error) errors[key] = error;
    }
    return value;
  };
  const value = {name: text('name', 'Nama', 100), email: text('email', 'Email', 254).toLowerCase(), message: text('message', 'Pesan', 3000)};
  if (value.name && /[\r\n]/.test(value.name)) errors.name = 'Nama harus ditulis dalam satu baris.';
  const [local = '', domain = ''] = value.email.split('@');
  if (value.email && (!emailPattern.test(value.email) || local.length > 64 || local.startsWith('.') || local.endsWith('.') || local.includes('..') || domain.split('.').some(label => label.length > 63))) errors.email = 'Email tidak valid.';
  return {value, errors};
};
