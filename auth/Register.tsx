"use client";

import { type FormEvent, useRef, useState } from "react";
import Link from "next/link";
import { FiArrowLeft, FiBriefcase, FiEye, FiEyeOff, FiUser } from "react-icons/fi";
import { PiStudent } from "react-icons/pi";
import WaitingVerification from './WaitingVerification';
import AuthShell from "./AuthShell";
import { registerMember } from "./registrationApi";
import { type MemberType, type RegistrationErrors, type RegistrationValues, validateRegistration } from "./registrationValidation";
import styles from "./Auth.module.css";

const memberOptions = [
  { value: "umum", title: "Masyarakat Umum", description: "Untuk pemustaka umum dengan identitas NIK/KTP.", icon: FiUser },
  { value: "mahasiswa", title: "Mahasiswa", description: "Untuk mahasiswa dengan NIM/KTM dan perguruan tinggi.", icon: PiStudent },
  { value: "pegawai", title: "Pegawai Internal", description: "Untuk pegawai internal Kemenkum Riau dengan unit kerja.", icon: FiBriefcase },
] as const;

type FieldProps = {
  name: Exclude<keyof RegistrationValues, "consent">;
  label: string; placeholder: string; value: string; onChange: (value: string) => void;
  error?: string; helper?: string; type?: "text" | "email" | "tel" | "password"; autoComplete?: string;
  disabled?: boolean;
};

function FormField({ name, label, placeholder, value, onChange, error, helper, type = "text", autoComplete, disabled }: FieldProps) {
  const [visible, setVisible] = useState(false);
  const password = type === "password";
  const input = <input id={name} name={name} type={password && visible ? "text" : type} placeholder={placeholder}
    autoComplete={autoComplete} value={value} onChange={(event) => onChange(event.target.value)} required
    minLength={password ? 8 : undefined} aria-invalid={!!error} disabled={disabled}
    aria-describedby={[helper ? `${name}-helper` : "", error ? `${name}-error` : ""].filter(Boolean).join(" ") || undefined} />;
  return <div className={styles.field}>
    <label htmlFor={name}>{label} <b>*</b></label>
    {password ? <div className={styles.password}>{input}
      <button type="button" disabled={disabled} aria-label={`${visible ? "Sembunyikan" : "Tampilkan"} ${label.toLowerCase()}`} aria-pressed={visible}
        onClick={() => setVisible(!visible)}>{visible ? <FiEyeOff /> : <FiEye />}</button>
    </div> : input}
    {helper && <small id={`${name}-helper`} className={styles.fieldHelper}>{helper}</small>}
    {error && <small id={`${name}-error`} className={styles.fieldError}>{error}</small>}
  </div>;
}

export default function Register() {
  const [step, setStep] = useState<1 | 2>(1);
  const [memberType, setMemberType] = useState<MemberType>("umum");
  const [values, setValues] = useState<RegistrationValues>({ name: "", email: "", whatsapp: "", address: "", identity: "", university: "", division: "", password: "", confirmPassword: "", consent: false });
  const [errors, setErrors] = useState<RegistrationErrors>({});
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const submissionLocked = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const selected = memberOptions.find((option) => option.value === memberType)!;

  function update<K extends keyof RegistrationValues>(name: K, value: RegistrationValues[K]) {
    setValues((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: undefined }));
    setNotice("");
  }
  function changeStep(next: 1 | 2) {
    setStep(next); setErrors({}); setNotice("");
    requestAnimationFrame(() => {
      heading.current?.focus({ preventScroll: true });
      heading.current?.scrollIntoView({ block: "start" });
    });
  }
  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submissionLocked.current) return;
    const nextErrors = validateRegistration(values, memberType);
    setErrors(nextErrors); setNotice("");
    if (Object.keys(nextErrors).length) {
      requestAnimationFrame(() => form.current?.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    submissionLocked.current = true;
    setLoading(true);
    const result = await registerMember(values, memberType);
    setNotice(result.message);
    setLoading(false);
    if (result.success) {
      setSucceeded(true);
      setValues((previous) => ({ ...previous, password: "", confirmPassword: "" }));
      return;
    }
    submissionLocked.current = false;
    setErrors(result.errors);
    requestAnimationFrame(() => form.current?.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus());
  }
  const field = (name: FieldProps["name"], label: string, placeholder: string, helper?: string, type?: FieldProps["type"], autoComplete?: string) =>
    <FormField key={name} name={name} label={label} placeholder={placeholder} helper={helper} type={type} autoComplete={autoComplete}
      value={values[name]} onChange={(value) => update(name, value)} error={errors[name]} disabled={loading || succeeded} />;

  if (succeeded) return <WaitingVerification email={values.email.trim().toLowerCase()} notice={notice} />;

  return <AuthShell registration>
    <div className={`${styles.formWrap} ${styles.registerWrap}`}>
      <header className={styles.heading}>
        <h2 ref={heading} tabIndex={-1}>{step === 1 ? "Daftar Anggota" : "Formulir Pendaftaran"}</h2>
        <p>{step === 1 ? "Pilih jenis keanggotaan Anda." : `Jenis anggota: ${selected.title}`}</p>
      </header>
      {step === 1 ? <>
        <fieldset className={styles.memberList}>
          <legend className={styles.visuallyHidden}>Jenis keanggotaan</legend>
          {memberOptions.map((option) => {
            const Icon = option.icon;
            const active = memberType === option.value;
            return <label key={option.value} className={`${styles.memberCard} ${active ? styles.memberCardActive : ""}`}>
              <span className={styles.memberIcon}><Icon aria-hidden="true" /></span>
              <span className={styles.memberCopy}><strong>{option.title}</strong><small>{option.description}</small></span>
              <input className={styles.membershipRadio} type="radio" name="memberType" value={option.value} checked={active}
                onChange={() => { setMemberType(option.value); setErrors({}); setNotice(""); }} />
            </label>;
          })}
        </fieldset>
        <button className={styles.primaryButton} type="button" onClick={() => changeStep(2)}>Lanjutkan</button>
        <p className={styles.switchText}>Sudah punya akun? <Link href="/login">Masuk</Link></p>
      </> : <>
        <button className={styles.backToMembership} type="button" disabled={loading || succeeded} onClick={() => changeStep(1)}><FiArrowLeft aria-hidden="true" /> Ubah jenis anggota</button>
        <form ref={form} className={`${styles.loginCard} ${styles.registrationCard}`} onSubmit={handleRegister} aria-busy={loading} noValidate>
          {field("name", "Nama Lengkap", "Nama sesuai identitas", undefined, "text", "name")}
          {field("email", "Email", "nama@email.com", "Digunakan untuk verifikasi & pengingat layanan.", "email", "email")}
          {field("whatsapp", "Nomor WhatsApp", "+62 8xx-xxxx-xxxx", "Wajib. Digunakan untuk pengingat layanan (jatuh tempo, reservasi). Tidak dapat dinonaktifkan.", "tel", "tel")}
          {field("address", "Alamat", "Alamat domisili", undefined, "text", "street-address")}
          {field("identity", memberType === "pegawai" ? "Nomor Identitas Pegawai" : `Nomor Identitas (${memberType === "mahasiswa" ? "NIM/KTM" : "NIK/KTP"})`,
            memberType === "pegawai" ? "Nomor identitas pegawai" : `Nomor ${memberType === "mahasiswa" ? "NIM/KTM" : "NIK/KTP"}`,
            memberType === "pegawai" ? "Label dapat disesuaikan dengan nomenklatur resmi." : "Cukup ketik nomor. Tidak perlu unggah foto.")}
          {memberType === "mahasiswa" && field("university", "Nama Perguruan Tinggi", "Nama perguruan tinggi")}
          {memberType === "pegawai" && field("division", "Unit Kerja / Divisi", "Unit kerja / divisi")}
          <div className={styles.passwordColumns}>
            {field("password", "Kata Sandi", "Minimal 8 karakter", undefined, "password", "new-password")}
            {field("confirmPassword", "Konfirmasi Kata Sandi", "Ulangi kata sandi", undefined, "password", "new-password")}
          </div>
          <div>
            <label className={styles.consent}>
              <input id="consent" name="consent" type="checkbox" checked={values.consent} onChange={(event) => update("consent", event.target.checked)}
                required disabled={loading || succeeded} aria-invalid={!!errors.consent} aria-describedby={errors.consent ? "consent-error" : undefined} />
              <span>Saya menyetujui [Syarat Layanan] dan [Kebijakan Privasi].</span>
            </label>
            {errors.consent && <small id="consent-error" className={styles.fieldError}>{errors.consent}</small>}
          </div>
          <button className={styles.primaryButton} type="submit" disabled={loading || succeeded}>{loading ? "Mendaftar..." : succeeded ? "Terdaftar" : "Daftar"}</button>
          {notice && <p className={styles.registrationNotice} role={succeeded ? "status" : "alert"}>{notice}</p>}
          <p className={styles.activationNote}>Akun langsung aktif setelah verifikasi email — tanpa persetujuan admin.</p>
        </form>
      </>}
    </div>
  </AuthShell>;
}
