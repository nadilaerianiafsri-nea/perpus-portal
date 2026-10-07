"use client";

import { FormEvent, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiEye, FiEyeOff } from "react-icons/fi";
import AuthShell from "./AuthShell";
import styles from "./Auth.module.css";
import { loginReturn } from "./loginReturn";
import LoginCaptcha, { type LoginCaptchaHandle } from "./LoginCaptcha";

const captchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim() ?? "";
const captchaRequired = Boolean(captchaSiteKey) || process.env.NODE_ENV === "production";

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
  const [captchaToken, setCaptchaToken] = useState("");
  const captcha = useRef<LoginCaptchaHandle>(null);
  const [loading, setLoading] = useState(false);
  const submissionLocked = useRef(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submissionLocked.current) return;
    if (captchaRequired && !captchaToken) {
      setError("Selesaikan CAPTCHA sebelum masuk.");
      return;
    }
    submissionLocked.current = true;
    setPendingEmail("");
    setError("");
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
          ...(captchaToken ? { captchaToken } : {}),
        }),
        signal: AbortSignal.timeout(15000),
      });

      const data = (await response.json()) as LoginResponse;

      if (!response.ok || !data.user) {
        if (data.code === "EMAIL_NOT_VERIFIED") setPendingEmail(email.trim().toLowerCase());
        setError(
          (typeof data.message === "string" ? data.message : undefined) ??
            "Login gagal. Periksa kembali email dan kata sandi.",
        );
        return;
      }

      router.replace(
        data.user.role === "ADMIN"
          ? "/admin"
          : loginReturn(new URLSearchParams(window.location.search).get("next")),
      );

      router.refresh();
    } catch {
      setError(
        "Server tidak dapat dihubungi. Silakan coba lagi.",
      );
    } finally {
      // Google tokens are single-use; unsuccessful attempts need a new challenge.
      captcha.current?.reset();
      setLoading(false);
      submissionLocked.current = false;
    }
  }

  return (
    <AuthShell login>
      <div className={styles.loginContent}>
        <Link className={styles.loginBack} href="/"><FiArrowLeft aria-hidden /> Kembali ke Beranda</Link>
        <Link href="/" className={styles.brand} aria-label="Perpustakaan Kemenkum Riau — Beranda">
          <span className={styles.brandMark}>P</span>
          <span className={styles.brandCopy}><strong>Perpustakaan</strong><small>Kemenkum Riau</small></span>
        </Link>
        <header className={styles.heading}>
          <h1 id="login-title">Masuk</h1>
          <p>Masuk ke akun anggota Anda.</p>
        </header>

        <form
          className={styles.loginForm}
          onSubmit={handleLogin}
        >
          <div className={styles.field}>
            <label htmlFor="login-email">
              Email <b>*</b>
            </label>

            <input
              type="email"
              id="login-email"
              name="email"
              placeholder="nama@email.com"
              autoComplete="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="login-password">
              Kata Sandi <b>*</b>
            </label>

            <div className={styles.password}>
              <input
                id="login-password"
                name="password"
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
                aria-controls="login-password"
                aria-pressed={showPassword}
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
                  <FiEyeOff aria-hidden />
                ) : (
                  <FiEye aria-hidden />
                )}
              </button>
            </div>
          </div>

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

          {captchaSiteKey ? <LoginCaptcha ref={captcha} siteKey={captchaSiteKey} onTokenChange={setCaptchaToken} /> : (
            <p className={styles.captchaNotice} role="status">{captchaRequired
              ? "Verifikasi keamanan belum tersedia. Silakan coba lagi nanti."
              : "CAPTCHA belum aktif di mode pengembangan."}</p>
          )}

          {error && <p className={styles.loginError} role="alert">{error}</p>}
          {pendingEmail && <Link className={styles.actionLink} href={`/check-email?email=${encodeURIComponent(pendingEmail)}`}>Kirim ulang email verifikasi</Link>}

          <button
            className={styles.primaryButton}
            type="submit"
            disabled={loading || (captchaRequired && !captchaToken)}
          >
            {loading
              ? "Memproses..."
              : "Masuk"}
          </button>

        </form>

        <p className={styles.switchText}>
          Belum punya akun?{" "}
          <Link href="/register">
            Daftar Anggota
          </Link>
        </p>

      </div>
    </AuthShell>
  );
}
