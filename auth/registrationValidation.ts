export type MemberType = "umum" | "mahasiswa" | "pegawai";
export type RegistrationValues = {
  name: string; email: string; whatsapp: string; address: string; identity: string;
  university: string; division: string; password: string; confirmPassword: string; consent: boolean;
};
export type RegistrationErrors = Partial<Record<keyof RegistrationValues, string>>;
export function validateRegistration(values: RegistrationValues, memberType: MemberType): RegistrationErrors {
  const errors: RegistrationErrors = {};
  for (const field of ["name", "email", "whatsapp", "address", "identity"] as const) {
    if (!values[field].trim()) errors[field] = "Field ini wajib diisi.";
  }
  if (values.name.trim() && values.name.trim().length < 3) errors.name = "Nama lengkap minimal 3 karakter.";
  if (values.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = "Masukkan alamat email yang valid.";
  if (memberType === "mahasiswa" && !values.university.trim()) errors.university = "Nama perguruan tinggi wajib diisi.";
  if (memberType === "pegawai" && !values.division.trim()) errors.division = "Unit kerja / divisi wajib diisi.";
  if (values.password.length < 8) errors.password = "Kata sandi minimal 8 karakter.";
  if (!values.confirmPassword) errors.confirmPassword = "Konfirmasi kata sandi wajib diisi.";
  else if (values.confirmPassword !== values.password) errors.confirmPassword = "Konfirmasi kata sandi tidak sama.";
  if (!values.consent) errors.consent = "Setujui Syarat Layanan dan Kebijakan Privasi untuk melanjutkan.";
  for (const field of ['name', 'email', 'whatsapp', 'address', 'identity', 'university', 'division'] as const) {
    const required = ['name', 'email', 'whatsapp', 'address', 'identity'].includes(field) || (field === 'university' && memberType === 'mahasiswa') || (field === 'division' && memberType === 'pegawai');
    const error = plaintextError(values[field], { required, max: field === 'address' ? 2000 : field === 'whatsapp' ? 32 : 191, multiline: field === 'address' });
    if (error) errors[field] = error;
  }
  if (new TextEncoder().encode(values.password).length > 72) errors.password = 'Kata sandi maksimal 72 byte.';
  return errors;
}
import { plaintextError } from '../catalog/plaintextInput.cjs';
