const MAX_PROFILE_PHOTO_BYTES = 5 * 1024 * 1024;
const avatarReference = /^\/uploads\/avatars\/[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}\.(?:jpg|png|webp)$/;
const photoMimeByExtension = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

exports.MAX_PROFILE_PHOTO_BYTES = MAX_PROFILE_PHOTO_BYTES;

exports.getInitials = function getInitials(name) {
  if (typeof name !== 'string' || !name.trim()) return '?';
  const words = name.trim().split(/\s+/u);
  const first = Array.from(words[0]);
  return (words.length === 1
    ? first.slice(0, 2).join('')
    : first[0] + Array.from(words[words.length - 1])[0]
  ).toUpperCase();
};

exports.profilePhotoFileError = function profilePhotoFileError(file) {
  if (!file || typeof file.name !== 'string' || /[\u0000-\u001f\u007f/\\:]/u.test(file.name)) {
    return 'Gunakan foto JPG, PNG, atau WEBP.';
  }
  const extension = file.name.match(/\.([a-z]+)$/i)?.[1].toLowerCase();
  if (!extension || !Object.hasOwn(photoMimeByExtension, extension) || photoMimeByExtension[extension] !== file.type) {
    return 'Gunakan foto JPG, PNG, atau WEBP.';
  }
  if (!Number.isInteger(file.size) || file.size <= 0) return 'File foto tidak valid.';
  if (file.size > MAX_PROFILE_PHOTO_BYTES) return 'Ukuran foto maksimal 5 MB.';
  return null;
};

exports.profilePhotoUrl = function profilePhotoUrl(reference) {
  if (typeof reference !== 'string' || reference.match(avatarReference)?.[0] !== reference) return null;
  return `/api/members/me/profile/photo/${reference.slice('/uploads/avatars/'.length)}`;
};
