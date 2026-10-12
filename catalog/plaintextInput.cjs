const { textInputError } = require('../shared/inputValidation.cjs');
exports.plaintextError = function plaintextError(value, options = {}) {
  const error = textInputError(value, { max: 191, required: false, ...options });
  return error === 'Input tidak boleh mengandung HTML.' ? 'HTML tidak diperbolehkan pada kolom ini.' : error;
};
