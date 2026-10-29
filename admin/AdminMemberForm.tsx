"use client";

import AppSelect from "@/components/AppSelect";
import { ButtonLabel } from '@/components/Button';
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  adminMemberApiMessage,
  type AdminMemberDetailResponse,
  type AdminMemberType,
} from "./adminMembers";
import styles from "./AdminMembers.module.css";
import { plainTextMessage } from "../members/inputSecurity";

type Props = {
  id: string;
};

type FormState = {
  name: string;
  memberType: AdminMemberType;
  whatsapp: string;
  address: string;
  identityNumber: string;
  universityName: string;
  workUnit: string;
};

const initialForm: FormState = {
  name: "",
  memberType: "UMUM",
  whatsapp: "+62",
  address: "",
  identityNumber: "",
  universityName: "",
  workUnit: "",
};

function normalizeWhatsappInput(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "+62";

  let local = digits;
  if (local.startsWith("62")) local = local.slice(2);
  if (local.startsWith("0")) local = local.slice(1);

  return `+62${local.slice(0, 13)}`;
}

function whatsappMessage(value: string) {
  const textError = plainTextMessage(value, 16, false);
  if (textError) return textError;
  if (!/^\+628\d{7,12}$/.test(value)) {
    return "Nomor WhatsApp tidak valid. Gunakan format +628xxxxxxxxxx.";
  }
  return "";
}

export default function AdminMemberForm({ id }: Props) {
  const router = useRouter();

  const [form, setForm] = useState<FormState>(initialForm);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`/api/members/admin/members/${id}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(
            await adminMemberApiMessage(
              response,
              "Data anggota belum dapat dimuat.",
            ),
          );
        }

        const payload = (await response.json()) as AdminMemberDetailResponse;

        if (!active) {
          return;
        }

        setEmail(payload.member.email);

        setForm({
          name: payload.member.name,
          memberType: payload.member.memberType ?? "UMUM",
          whatsapp: normalizeWhatsappInput(payload.member.profile?.whatsapp ?? "+62"),
          address: payload.member.profile?.address ?? "",
          identityNumber: payload.member.profile?.identityNumber ?? "",
          universityName: payload.member.profile?.universityName ?? "",
          workUnit: payload.member.profile?.workUnit ?? "",
        });
      } catch (reason) {
        if (!active) {
          return;
        }

        setError(
          reason instanceof Error
            ? reason.message
            : "Data anggota belum dapat dimuat.",
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [id]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    if (key !== "memberType") {
      const message = key === "whatsapp"
        ? whatsappMessage(String(value))
        : plainTextMessage(
            String(value),
            key === "address" ? 2000 : 191,
            key === "address",
          );
      setFieldErrors((current) => ({ ...current, [key]: message }));
    }

    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) {
      return;
    }

    const fields = [
      "name",
      "whatsapp",
      "address",
      "identityNumber",
      ...(form.memberType === "MAHASISWA" ? ["universityName"] : []),
      ...(form.memberType === "PEGAWAI" ? ["workUnit"] : []),
    ] as (keyof FormState)[];

    const errors = Object.fromEntries(
      fields.map((key) => [
        key,
        key === "whatsapp"
          ? whatsappMessage(form.whatsapp)
          : plainTextMessage(
              form[key],
              key === "address" ? 2000 : 191,
              key === "address",
            ),
      ]),
    );

    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) return;

    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/members/admin/members/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name.trim(),
          memberType: form.memberType,
          whatsapp: form.whatsapp,
          address: form.address.trim(),
          identityNumber: form.identityNumber.trim(),
          universityName:
            form.memberType === "MAHASISWA" ? form.universityName.trim() : null,
          workUnit: form.memberType === "PEGAWAI" ? form.workUnit.trim() : null,
        }),
      });

      if (!response.ok) {
        throw new Error(
          await adminMemberApiMessage(response, "Data anggota gagal disimpan."),
        );
      }

      router.push(`/admin/keanggotaan/${id}`);
      router.refresh();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Data anggota gagal disimpan.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className={styles.statePanel}>Memuat data anggota...</div>;
  }

  return (
    <div className={styles.formPage}>
      <header className={styles.detailHeading}>
        <div>
          <div className={styles.localBreadcrumb}>
            <Link href="/admin/keanggotaan">Keanggotaan</Link>
            <span>/</span>
            <Link href={`/admin/keanggotaan/${id}`}>Detail</Link>
            <span>/</span>
            <strong>Edit</strong>
          </div>

          <h1 data-page-title>Edit Anggota</h1>
        </div>
      </header>

      {error ? (
        <div className={styles.errorBox} role="alert">
          <p>{error}</p>
        </div>
      ) : null}

      <form className={styles.memberForm} onSubmit={submit}>
        <section className={styles.formSection}>
          <h2>Informasi Akun</h2>

          <div className={styles.formGrid}>
            <label>
              <span>Nama Anggota *</span>
              <input
                type="text"
                value={form.name}
                aria-invalid={Boolean(fieldErrors.name)}
                aria-describedby={fieldErrors.name ? "admin-member-name-error" : undefined}
                minLength={3}
                maxLength={191}
                required
                onChange={(event) => update("name", event.target.value)}
              />
              {fieldErrors.name && <small id="admin-member-name-error" role="alert">{fieldErrors.name}</small>}
            </label>

            <label>
              <span>Email</span>
              <input type="email" value={email} disabled />
              <small>Email tidak dapat diubah melalui administrasi keanggotaan.</small>
            </label>

            <label>
              <span>Jenis Anggota *</span>
              <AppSelect
                value={form.memberType}
                onChange={(event) =>
                  update("memberType", event.target.value as AdminMemberType)
                }
              >
                <option value="UMUM">Masyarakat Umum</option>
                <option value="MAHASISWA">Mahasiswa</option>
                <option value="PEGAWAI">Pegawai Internal</option>
              </AppSelect>
            </label>

            <label>
              <span>WhatsApp *</span>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={form.whatsapp}
                aria-invalid={Boolean(fieldErrors.whatsapp)}
                aria-describedby={fieldErrors.whatsapp ? "admin-member-whatsapp-error" : "admin-member-whatsapp-helper"}
                maxLength={16}
                required
                placeholder="+6281234567890"
                onChange={(event) =>
                  update("whatsapp", normalizeWhatsappInput(event.target.value))
                }
              />
              {fieldErrors.whatsapp ? (
                <small id="admin-member-whatsapp-error" role="alert">{fieldErrors.whatsapp}</small>
              ) : (
                <small id="admin-member-whatsapp-helper">Awalan +62 dipertahankan otomatis.</small>
              )}
            </label>

            <label>
              <span>Nomor Identitas *</span>
              <input
                type="text"
                value={form.identityNumber}
                aria-invalid={Boolean(fieldErrors.identityNumber)}
                aria-describedby={fieldErrors.identityNumber ? "admin-member-identityNumber-error" : undefined}
                maxLength={191}
                required
                onChange={(event) => update("identityNumber", event.target.value)}
              />
              {fieldErrors.identityNumber && <small id="admin-member-identityNumber-error" role="alert">{fieldErrors.identityNumber}</small>}
            </label>

            {form.memberType === "MAHASISWA" ? (
              <label>
                <span>Universitas *</span>
                <input
                  type="text"
                  value={form.universityName}
                  aria-invalid={Boolean(fieldErrors.universityName)}
                  aria-describedby={fieldErrors.universityName ? "admin-member-universityName-error" : undefined}
                  maxLength={191}
                  required
                  onChange={(event) => update("universityName", event.target.value)}
                />
                {fieldErrors.universityName && <small id="admin-member-universityName-error" role="alert">{fieldErrors.universityName}</small>}
              </label>
            ) : null}

            {form.memberType === "PEGAWAI" ? (
              <label>
                <span>Unit Kerja *</span>
                <input
                  type="text"
                  value={form.workUnit}
                  aria-invalid={Boolean(fieldErrors.workUnit)}
                  aria-describedby={fieldErrors.workUnit ? "admin-member-workUnit-error" : undefined}
                  maxLength={191}
                  required
                  onChange={(event) => update("workUnit", event.target.value)}
                />
                {fieldErrors.workUnit && <small id="admin-member-workUnit-error" role="alert">{fieldErrors.workUnit}</small>}
              </label>
            ) : null}

            <label className={styles.fullField}>
              <span>Alamat *</span>
              <textarea
                value={form.address}
                aria-invalid={Boolean(fieldErrors.address)}
                aria-describedby={fieldErrors.address ? "admin-member-address-error" : undefined}
                maxLength={2000}
                required
                onChange={(event) => update("address", event.target.value)}
              />
              {fieldErrors.address && <small id="admin-member-address-error" role="alert">{fieldErrors.address}</small>}
            </label>
          </div>
        </section>

        <footer className={styles.formFooter}>
          <Link
            data-button="ghost"
            data-button-size="md"
            href={`/admin/keanggotaan/${id}`}
            className={styles.secondaryButton}
          >
            Batal
          </Link>

          <button
            data-button="primary"
            data-button-size="md"
            data-button-loading={saving}
            type="submit"
            className={styles.primaryButton}
            disabled={saving}
          >
            <ButtonLabel loading={saving} pending="Menyimpan...">Simpan Perubahan</ButtonLabel>
          </button>
        </footer>
      </form>
    </div>
  );
}
