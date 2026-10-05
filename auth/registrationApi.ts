import type { MemberType, RegistrationErrors, RegistrationValues } from "./registrationValidation";

type RegistrationResult =
  | { success: true; message: string }
  | { success: false; message: string; errors: RegistrationErrors };

const serverUnavailable = "Server tidak dapat dihubungi. Silakan coba lagi.";
const errorFields = ["name", "email", "whatsapp", "address", "identity", "university", "division", "password", "confirmPassword", "consent"] as const;

export async function registerMember(
  values: RegistrationValues,
  memberType: MemberType,
  fetcher: typeof fetch = fetch,
): Promise<RegistrationResult> {
  const { name, email, whatsapp, address, identity, password, consent } = values;
  const payload = {
    name, email, whatsapp, address, identity, password, consent, memberType,
    ...(memberType === "mahasiswa" ? { university: values.university } : {}),
    ...(memberType === "pegawai" ? { division: values.division } : {}),
  };
  try {
    const response = await fetcher("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });
    if (response.status === 409) return { success: false, message: "Email sudah terdaftar.", errors: { email: "Email sudah terdaftar." } };
    if (response.status >= 500) return { success: false, message: serverUnavailable, errors: {} };
    const body: unknown = await response.json();
    const data = body && typeof body === "object" ? body as Record<string, unknown> : {};
    if (response.status === 201) {
      return { success: true, message: "Pendaftaran berhasil. Akun Anda menunggu verifikasi email." };
    }
    const errors: RegistrationErrors = {};
    if (response.status === 400 && data.errors && typeof data.errors === "object") {
      const fields = data.errors as Record<string, unknown>;
      for (const key of errorFields) {
        const message = fields[key];
        if (typeof message === "string") errors[key] = message;
      }
    }
    return {
      success: false,
      message: response.status === 400 && typeof data.message === "string" ? data.message : "Pendaftaran gagal. Silakan coba lagi.",
      errors,
    };
  } catch {
    return { success: false, message: serverUnavailable, errors: {} };
  }
}
