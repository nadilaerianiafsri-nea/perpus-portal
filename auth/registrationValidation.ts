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
  return errors;
}
