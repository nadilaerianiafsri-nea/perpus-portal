"use client";

import {
  FormEvent,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  FiBriefcase,
  FiEye,
  FiEyeOff,
  FiUser,
} from "react-icons/fi";

import { PiStudent } from "react-icons/pi";

import AuthShell from "./AuthShell";
import styles from "./Auth.module.css";

type MemberType =
  | "umum"
  | "mahasiswa"
  | "pegawai";

type RegisterResponse = {
  user?: {
    id: number;
    name: string;
    email: string;
    role: "ADMIN" | "PENGUNJUNG";
  };
  message?: string;
};

const memberOptions = [
  {
    value: "umum" as MemberType,
    title: "Masyarakat Umum",
    description:
      "Untuk pemustaka umum dengan identitas NIK/KTP.",
    icon: FiUser,
  },
  {
    value: "mahasiswa" as MemberType,
    title: "Mahasiswa",
    description:
      "Untuk mahasiswa dengan NIM/KTM dan perguruan tinggi.",
    icon: PiStudent,
  },
  {
    value: "pegawai" as MemberType,
    title: "Pegawai Internal",
    description:
      "Untuk pegawai internal Kemenkum Riau dengan unit kerja.",
    icon: FiBriefcase,
  },
];

export default function Register() {
  const router = useRouter();

  const [step, setStep] =
    useState<1 | 2>(1);

  const [memberType, setMemberType] =
    useState<MemberType>("umum");

  const [name, setName] = useState("");
  const [email, setEmail] =
    useState("");
  const [password, setPassword] =
    useState("");
  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function handleRegister(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");

    if (name.trim().length < 3) {
      setError(
        "Nama lengkap minimal 3 karakter.",
      );
      return;
    }

    if (password.length < 8) {
      setError(
        "Kata sandi minimal 8 karakter.",
      );
      return;
    }

    if (
      password !== confirmPassword
    ) {
      setError(
        "Konfirmasi kata sandi tidak sama.",
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "/api/auth/register",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            name,
            email,
            password,
            memberType,
          }),
        },
      );

      const data =
        (await response.json()) as RegisterResponse;

      if (
        !response.ok ||
        !data.user
      ) {
        setError(
          data.message ??
            "Registrasi gagal. Silakan periksa kembali data Anda.",
        );
        return;
      }

      router.replace("/pengunjung");
      router.refresh();
    } catch {
      setError(
        "Registrasi tidak dapat diproses. Pastikan backend berjalan.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <div
        className={`${styles.formWrap} ${styles.registerWrap}`}
      >
        {step === 1 ? (
          <>
            <header
              className={styles.heading}
            >
              <h2>Daftar Anggota</h2>
              <p>
                Pilih jenis keanggotaan
                Anda.
              </p>
            </header>

            <div
              className={
                styles.memberList
              }
            >
              {memberOptions.map(
                (option) => {
                  const Icon =
                    option.icon;

                  const active =
                    memberType ===
                    option.value;

                  return (
                    <button
                      key={
                        option.value
                      }
                      type="button"
                      className={`${styles.memberCard} ${
                        active
                          ? styles.memberCardActive
                          : ""
                      }`}
                      onClick={() => {
                        setMemberType(
                          option.value,
                        );
                        setError("");
                      }}
                    >
                      <span
                        className={
                          styles.memberIcon
                        }
                      >
                        <Icon />
                      </span>

                      <span
                        className={
                          styles.memberCopy
                        }
                      >
                        <strong>
                          {
                            option.title
                          }
                        </strong>

                        <small>
                          {
                            option.description
                          }
                        </small>
                      </span>

                      <span
                        className={`${styles.radio} ${
                          active
                            ? styles.radioActive
                            : ""
                        }`}
                      />
                    </button>
                  );
                },
              )}
            </div>

            <button
              className={
                styles.primaryButton
              }
              type="button"
              onClick={() => {
                setError("");
                setStep(2);
              }}
            >
              Lanjutkan
            </button>

            <p
              className={
                styles.switchText
              }
            >
              Sudah punya akun?{" "}
              <Link href="/login">
                Masuk
              </Link>
            </p>
          </>
        ) : (
          <>
            <header
              className={styles.heading}
            >
              <h2>Lengkapi Data</h2>
              <p>
                Isi data akun untuk
                menyelesaikan pendaftaran.
              </p>
            </header>

            <form
              className={
                styles.loginCard
              }
              onSubmit={
                handleRegister
              }
            >
              <label
                className={
                  styles.field
                }
              >
                <span>
                  Nama Lengkap{" "}
                  <b>*</b>
                </span>

                <input
                  type="text"
                  placeholder="Nama lengkap"
                  autoComplete="name"
                  value={name}
                  onChange={(event) =>
                    setName(
                      event.target
                        .value,
                    )
                  }
                  required
                />
              </label>

              <label
                className={
                  styles.field
                }
              >
                <span>
                  Email <b>*</b>
                </span>

                <input
                  type="email"
                  placeholder="nama@email.com"
                  autoComplete="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(
                      event.target
                        .value,
                    )
                  }
                  required
                />
              </label>

              <label
                className={
                  styles.field
                }
              >
                <span>
                  Kata Sandi{" "}
                  <b>*</b>
                </span>

                <div
                  className={
                    styles.password
                  }
                >
                  <input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    placeholder="Minimal 8 karakter"
                    autoComplete="new-password"
                    value={password}
                    onChange={(
                      event,
                    ) =>
                      setPassword(
                        event.target
                          .value,
                      )
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
                        (value) =>
                          !value,
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

              <label
                className={
                  styles.field
                }
              >
                <span>
                  Konfirmasi Kata
                  Sandi <b>*</b>
                </span>

                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  placeholder="Ulangi kata sandi"
                  autoComplete="new-password"
                  value={
                    confirmPassword
                  }
                  onChange={(event) =>
                    setConfirmPassword(
                      event.target
                        .value,
                    )
                  }
                  required
                />
              </label>

              <button
                className={
                  styles.primaryButton
                }
                type="submit"
                disabled={loading}
              >
                {loading
                  ? "Mendaftarkan..."
                  : "Daftar Anggota"}
              </button>

              <button
                className={
                  styles.googleButton
                }
                type="button"
                onClick={() => {
                  setError("");
                  setStep(1);
                }}
              >
                Kembali
              </button>

              {error && (
                <p
                  className={
                    styles.inlineInfo
                  }
                >
                  {error}
                </p>
              )}
            </form>

            <p
              className={
                styles.switchText
              }
            >
              Sudah punya akun?{" "}
              <Link href="/login">
                Masuk
              </Link>
            </p>
          </>
        )}
      </div>
    </AuthShell>
  );
}
