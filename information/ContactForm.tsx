"use client";
import { useRef, useState, type FormEvent } from "react";
import { validateContact, type ContactInput, type ContactErrors } from "@/shared/contactValidation.cjs";
import styles from "./Contact.module.css";

const empty: ContactInput = { name: "", email: "", message: "" };
export default function ContactForm() {
  const [values, setValues] = useState(empty);
  const [errors, setErrors] = useState<ContactErrors>({});
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; text: string } | null>(null);
  const pending = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    const form = event.currentTarget;
    const { value, errors: nextErrors } = validateContact(values);
    setErrors(nextErrors);
    setFeedback(null);
    if (Object.keys(nextErrors).length) {
      form.querySelector<HTMLElement>(`[name="${Object.keys(nextErrors)[0]}"]`)?.focus();
      return;
    }
    pending.current = true;
    setBusy(true);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(value),
        signal: AbortSignal.timeout(30000),
      });
      const data = await response.json();
      if (response.ok && data.success === true) {
        setValues(empty);
        setFeedback({ success: true, text: "Pesan berhasil dikirim. Terima kasih telah menghubungi kami." });
      } else {
        if (response.status === 400 && data.errors && typeof data.errors === "object") {
          const fieldErrors: ContactErrors = {};
          for (const key of ["name", "email", "message"] as const)
            if (typeof data.errors[key] === "string") fieldErrors[key] = data.errors[key];
          setErrors(fieldErrors);
        }
        setFeedback({ success: false, text: data.code === "CONTACT_UNAVAILABLE"
          ? "Layanan pesan belum dapat dihubungi. Silakan coba lagi."
          : response.status === 429 ? "Tunggu 60 detik sebelum mengirim pesan lagi."
          : "Pesan belum dapat dikirim. Silakan coba lagi." });
      }
    } catch {
      setFeedback({ success: false, text: "Layanan pesan belum dapat dihubungi. Silakan coba lagi." });
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  const fields = [
    { key: "name", label: "Nama", placeholder: "Nama lengkap", max: 100, type: "text", autoComplete: "name" },
    { key: "email", label: "Email", placeholder: "nama@email.com", max: 254, type: "email", autoComplete: "email" },
    { key: "message", label: "Pesan", placeholder: "Tulis pesan Anda", max: 3000 },
  ] as const;
  return (
    <form onSubmit={submit} noValidate aria-busy={busy} className={styles.form}>
      {fields.map((field) => {
        const props = {
          id: `contact-${field.key}`, name: field.key, value: values[field.key], placeholder: field.placeholder,
          maxLength: field.max, required: true, disabled: busy,
          "aria-invalid": !!errors[field.key],
          "aria-describedby": errors[field.key] ? `contact-${field.key}-error` : undefined,
          onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            setValues((previous) => ({ ...previous, [field.key]: event.target.value }));
            setErrors((previous) => ({ ...previous, [field.key]: undefined }));
            setFeedback(null);
          },
        };
        return (
          <div className={styles.field} key={field.key}>
            <label htmlFor={props.id}>{field.label} <span aria-hidden="true">*</span></label>
            {field.key === "message" ? <textarea {...props} rows={4} /> : <input {...props} type={field.type} autoComplete={field.autoComplete} />}
            {errors[field.key] && <p id={`contact-${field.key}-error`} className={styles.fieldError}>{errors[field.key]}</p>}
          </div>
        );
      })}
      <button type="submit" disabled={busy}>{busy ? "Mengirim..." : "Kirim Pesan"}</button>
      <div role="status" aria-live="polite">
        {feedback && <p className={feedback.success ? styles.success : styles.failure}>{feedback.text}</p>}
      </div>
    </form>
  );
}
