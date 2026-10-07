"use client";

import Script from "next/script";
import { useImperativeHandle, useRef, useState, type Ref } from "react";
import styles from "./Auth.module.css";

type RecaptchaApi = {
  ready: (callback: () => void) => void;
  render: (container: HTMLElement, options: {
    sitekey: string;
    theme: "light";
    size: "normal" | "compact";
    callback: (token: string) => void;
    "expired-callback": () => void;
    "error-callback": () => void;
  }) => number;
  reset: (widgetId: number) => void;
};

declare global {
  interface Window { grecaptcha?: RecaptchaApi }
}

export type LoginCaptchaHandle = { reset: () => void };

export default function LoginCaptcha({ siteKey, onTokenChange, ref }: {
  siteKey: string;
  onTokenChange: (token: string) => void;
  ref?: Ref<LoginCaptchaHandle>;
}) {
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<number | null>(null);
  const [error, setError] = useState("");

  useImperativeHandle(ref, () => ({
    reset() {
      onTokenChange("");
      if (widgetId.current !== null) window.grecaptcha?.reset(widgetId.current);
    },
  }), [onTokenChange]);

  function unavailable() {
    onTokenChange("");
    setError("CAPTCHA tidak dapat dimuat. Periksa koneksi lalu muat ulang halaman.");
  }

  function renderCaptcha() {
    const api = window.grecaptcha;
    if (!api) { unavailable(); return; }
    api.ready(() => {
      if (!container.current || widgetId.current !== null) return;
      try {
        widgetId.current = api.render(container.current, {
          sitekey: siteKey,
          theme: "light",
          size: container.current.clientWidth < 304 ? "compact" : "normal",
          callback: token => { setError(""); onTokenChange(token); },
          "expired-callback": () => onTokenChange(""),
          "error-callback": unavailable,
        });
      } catch { unavailable(); }
    });
  }

  return <div className={styles.captchaArea}>
    <Script id="login-recaptcha" src="https://www.google.com/recaptcha/api.js?render=explicit&hl=id" strategy="afterInteractive" onReady={renderCaptcha} onError={unavailable} />
    <div ref={container} aria-label="Verifikasi keamanan reCAPTCHA" />
    {error && <p className={styles.loginError} role="alert">{error}</p>}
  </div>;
}
