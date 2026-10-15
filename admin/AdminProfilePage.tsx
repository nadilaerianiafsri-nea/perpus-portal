"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FiSave, FiUser } from "react-icons/fi";
import { plainTextMessage } from "@/members/inputSecurity";
import styles from "./AdminProfile.module.css";

type AdminProfilePageProps = {
  user: {
    name: string;
    email: string;
  };
};

type ApiPayload = {
  message?: string;
  user?: {
    name: string;
    email: string;
    role: "ADMIN";
  };
};

async function requestJson(path: string, body: Record<string, string>) {
  const response = await fetch(path, {
    method: "POST",
    cache: "no-store",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => null)) as ApiPayload | null;
  if (!response.ok) {
    throw new Error(payload?.message || "Permintaan belum dapat diproses. Silakan coba lagi.");
  }
  return payload ?? {};
}

function passwordError(value: string) {
  const bytes = new TextEncoder().encode(value).length;
  if (value.length < 8) return "Kata sandi minimal 8 karakter.";
  if (bytes > 72) return "Kata sandi maksimal 72 byte.";
  return "";
}

export default function AdminProfilePage({ user }: AdminProfilePageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("passwordChangeToken")?.trim() ?? "";
  const [passwordChangeToken, setPasswordChangeToken] = useState("");
  const [name, setName] = useState(user.name);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileNotice, setProfileNotice] = useState("");
  const [requestingPassword, setRequestingPassword] = useState(false);
  const [passwordRequestError, setPasswordRequestError] = useState("");
  const [passwordRequestNotice, setPasswordRequestNotice] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordChangeError, setPasswordChangeError] = useState("");
  const profilePending = useRef(false);
  const passwordRequestPending = useRef(false);
  const passwordChangePending = useRef(false);

  useEffect(() => {
    if (!tokenFromUrl) return;
    setPasswordChangeToken(tokenFromUrl);
    router.replace("/admin/profil", { scroll: false });
  }, [router, tokenFromUrl]);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (profilePending.current) return;
    const cleanedName = name.trim();
    const validation = plainTextMessage(cleanedName, 191, false);
    if (validation) {
      setProfileError(validation);
      return;
    }
    if (cleanedName.length < 3) {
      setProfileError("Nama lengkap minimal 3 karakter.");
      return;
    }

    profilePending.current = true;
    setSavingProfile(true);
    setProfileError("");
    setProfileNotice("");
    try {
      const payload = await requestJson("/api/auth/admin-profile", { name: cleanedName });
      setName(payload.user?.name ?? cleanedName);
      setProfileNotice("Profil admin berhasil diperbarui.");
      router.refresh();
    } catch (failure) {
      setProfileError(
        failure instanceof Error ? failure.message : "Profil admin belum dapat disimpan.",
      );
    } finally {
      profilePending.current = false;
      setSavingProfile(false);
    }
  }

  async function requestPasswordVerification(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (passwordRequestPending.current) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const currentPassword = String(form.get("currentPassword") ?? "");
    if (!currentPassword) {
      setPasswordRequestError("Password saat ini wajib diisi.");
      return;
    }
    if (new TextEncoder().encode(currentPassword).length > 72) {
      setPasswordRequestError("Password saat ini tidak valid.");
      return;
    }

    passwordRequestPending.current = true;
    setRequestingPassword(true);
    setPasswordRequestError("");
    setPasswordRequestNotice("");
    try {
      const payload = await requestJson("/api/auth/admin-profile/password/request", {
        currentPassword,
      });
      setPasswordRequestNotice(
        payload.message || `Link verifikasi telah dikirim ke ${user.email}.`,
      );
      formElement.reset();
    } catch (failure) {
      setPasswordRequestError(
        failure instanceof Error ? failure.message : "Email verifikasi belum dapat dikirim.",
      );
    } finally {
      passwordRequestPending.current = false;
      setRequestingPassword(false);
    }
  }

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (passwordChangePending.current || !passwordChangeToken) return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");
    const validation = passwordError(password);
    if (validation) {
      setPasswordChangeError(validation);
      return;
    }
    if (password !== confirmPassword) {
      setPasswordChangeError("Konfirmasi password baru tidak sama.");
      return;
    }

    passwordChangePending.current = true;
    setChangingPassword(true);
    setPasswordChangeError("");
    try {
      await requestJson("/api/auth/admin-profile/password/confirm", {
        token: passwordChangeToken,
        password,
        confirmPassword,
      });
      try {
        await fetch("/api/auth/logout", { method: "POST" });
      } finally {
        router.replace("/login");
        router.refresh();
      }
    } catch (failure) {
      setPasswordChangeError(
        failure instanceof Error ? failure.message : "Password belum dapat diperbarui.",
      );
      passwordChangePending.current = false;
      setChangingPassword(false);
    }
  }

  function cancelVerification() {
    setPasswordChangeToken("");
    setPasswordChangeError("");
    router.replace("/admin/profil", { scroll: false });
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeading}>
        <div>
          <h1>Profil Admin</h1>
          <p>Kelola identitas akun admin dan keamanan kata sandi.</p>
        </div>
      </header>

      <section className={styles.identityCard}>
        <div className={styles.identityAvatar} aria-hidden="true">
          {name
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase())
            .join("") || "AP"}
        </div>
        <div className={styles.identityText}>
          <strong>{name}</strong>
          <span>{user.email}</span>
          <small>Admin</small>
        </div>
        <FiUser aria-hidden="true" />
      </section>

      <div className={styles.grid}>
        <section className={styles.card}>
          <div className={styles.cardHeading}>
            <div>
              <h2>Informasi Profil</h2>
              <p>Nama dapat diperbarui. Email dan role mengikuti akun autentikasi.</p>
            </div>
          </div>

          <form className={styles.form} onSubmit={saveProfile}>
            <label className={styles.field}>
              <span>Nama Lengkap</span>
              <input
                name="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                minLength={3}
                maxLength={191}
                autoComplete="name"
                required
              />
            </label>
            <label className={styles.field}>
              <span>Email</span>
              <input type="email" value={user.email} readOnly />
              <small>Email digunakan untuk login dan verifikasi keamanan.</small>
            </label>
            <label className={styles.field}>
              <span>Role</span>
              <input value="Admin" readOnly />
            </label>

            <div className={styles.formFooter}>
              {profileError ? <p className={styles.error} role="alert">{profileError}</p> : null}
              {profileNotice ? <p className={styles.success} role="status">{profileNotice}</p> : null}
              <button className={styles.primaryButton} type="submit" disabled={savingProfile}>
                <FiSave aria-hidden="true" />
                {savingProfile ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </div>
          </form>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeading}>
            <div>
              <h2>Ganti Password</h2>
              <p>Perubahan password wajib dikonfirmasi melalui email admin.</p>
            </div>
          </div>

          {passwordChangeToken ? (
            <form className={styles.form} onSubmit={changePassword}>
              <div className={styles.verificationNotice} role="status">
                Link verifikasi email telah diterima. Masukkan password baru untuk menyelesaikan perubahan.
              </div>
              <label className={styles.field}>
                <span>Password Baru</span>
                <input
                  name="password"
                  type="password"
                  minLength={8}
                  maxLength={72}
                  autoComplete="new-password"
                  required
                />
                <small>Minimal 8 karakter dan maksimal 72 byte.</small>
              </label>
              <label className={styles.field}>
                <span>Konfirmasi Password Baru</span>
                <input
                  name="confirmPassword"
                  type="password"
                  minLength={8}
                  maxLength={72}
                  autoComplete="new-password"
                  required
                />
              </label>
              <div className={styles.formFooter}>
                {passwordChangeError ? (
                  <p className={styles.error} role="alert">{passwordChangeError}</p>
                ) : null}
                <div className={styles.buttonRow}>
                  <button
                    className={styles.secondaryButton}
                    type="button"
                    onClick={cancelVerification}
                    disabled={changingPassword}
                  >
                    Batal
                  </button>
                  <button className={styles.primaryButton} type="submit" disabled={changingPassword}>
                    {changingPassword ? "Mengubah Password..." : "Ubah Password"}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <form className={styles.form} onSubmit={requestPasswordVerification}>
              <div className={styles.securityInfo}>
                Demi keamanan, masukkan password saat ini. Sistem kemudian mengirim link verifikasi ke email <strong>{user.email}</strong>.
              </div>
              <label className={styles.field}>
                <span>Password Saat Ini</span>
                <input
                  name="currentPassword"
                  type="password"
                  maxLength={72}
                  autoComplete="current-password"
                  required
                />
              </label>
              <div className={styles.formFooter}>
                {passwordRequestError ? (
                  <p className={styles.error} role="alert">{passwordRequestError}</p>
                ) : null}
                {passwordRequestNotice ? (
                  <p className={styles.success} role="status">{passwordRequestNotice}</p>
                ) : null}
                <button className={styles.primaryButton} type="submit" disabled={requestingPassword}>
                  {requestingPassword ? "Mengirim..." : "Kirim Verifikasi Email"}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
