"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { SiGoogle } from "react-icons/si";
import AuthShell from "./AuthShell";
import styles from "./Auth.module.css";

type LoginResponse = {
  user?: {
    id: number;
    name: string;
    email: string;
    role: "ADMIN" | "PENGUNJUNG";
  };
  message?: string;
  code?: string;
};

export default function Login() {
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;
    setPendingEmail("");
    setError("");
    setInfo("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          remember,
        }),
      });

      const data = (await response.json()) as LoginResponse;

      if (!response.ok || !data.user) {
        if (data.code === "EMAIL_NOT_VERIFIED") setPendingEmail(email.trim().toLowerCase());
        setError(
          data.message ??
            "Login gagal. Periksa kembali email dan kata sandi.",
        );
        return;
      }

      router.replace(
        data.user.role === "ADMIN"
          ? "/admin"
          : "/pengunjung",
      );

      router.refresh();
    } catch {
      setError(
        "Backend tidak dapat dihubungi. Pastikan NestJS berjalan di port 3001.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <div className={styles.formWrap}>
        <header className={styles.heading}>
          <h2>Masuk</h2>
          <p>Masuk ke akun anggota Anda.</p>
        </header>

        <form
          className={styles.loginCard}
          onSubmit={handleLogin}
        >
          <label className={styles.field}>
            <span>
              Email <b>*</b>
            </span>

            <input
              type="email"
              placeholder="nama@email.com"
              autoComplete="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              required
            />
          </label>

          <label className={styles.field}>
            <span>
              Kata Sandi <b>*</b>
            </span>

            <div className={styles.password}>
              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                placeholder="Masukkan kata sandi"
                autoComplete="current-password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                required
              />

              <button
                type="button"
                aria-label={
                  showPassword
                    ? "Sembunyikan kata sandi"
                    : "Tampilkan kata sandi"
                }
                onClick={() =>
                  setShowPassword(
                    (value) => !value,
                  )
                }
              >
                {showPassword ? (
                  <FiEyeOff />
                ) : (
                  <FiEye />
                )}
              </button>
            </div>
          </label>

          <div className={styles.metaRow}>
            <label className={styles.remember}>
              <input
                type="checkbox"
                checked={remember}
                onChange={(event) =>
                  setRemember(
                    event.target.checked,
                  )
                }
              />
              <span>Ingat saya</span>
            </label>

            <Link className={styles.linkButton} href="/forgot-password">Lupa kata sandi?</Link>
          </div>

          <button
            className={styles.primaryButton}
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Memeriksa..."
              : "Masuk"}
          </button>

          {error && (
            <p className={styles.inlineInfo}>
              {error}
            </p>
          )}

          {pendingEmail && <Link className={styles.actionLink} href={`/check-email?email=${encodeURIComponent(pendingEmail)}`}>Kirim ulang email verifikasi</Link>}

          {info && (
            <p className={styles.inlineInfo}>
              {info}
            </p>
          )}
        </form>

        <p className={styles.switchText}>
          Belum punya akun?{" "}
          <Link href="/register">
            Daftar Anggota
          </Link>
        </p>

        <button
          className={styles.googleButton}
          type="button"
          onClick={() => {
            setError("");
            setInfo(
              "Login Google belum diaktifkan. OAuth Google akan dipasang pada tahap berikutnya.",
            );
          }}
        >
          <SiGoogle />
          <span>Login With Google</span>
        </button>
      </div>
    </AuthShell>
  );
}
