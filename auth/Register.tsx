'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FiBriefcase, FiUser } from 'react-icons/fi';
import { PiStudent } from 'react-icons/pi';
import AuthShell from './AuthShell';
import styles from './Auth.module.css';

type MemberType = 'umum' | 'mahasiswa' | 'pegawai';

const memberOptions = [
  {
    value: 'umum' as MemberType,
    title: 'Masyarakat Umum',
    description: 'Untuk pemustaka umum dengan identitas NIK/KTP.',
    icon: FiUser,
  },
  {
    value: 'mahasiswa' as MemberType,
    title: 'Mahasiswa',
    description: 'Untuk mahasiswa dengan NIM/KTM dan perguruan tinggi.',
    icon: PiStudent,
  },
  {
    value: 'pegawai' as MemberType,
    title: 'Pegawai Internal',
    description: 'Untuk pegawai internal Kemenkum Riau dengan unit kerja.',
    icon: FiBriefcase,
  },
];

export default function Register() {
  const [memberType, setMemberType] = useState<MemberType>('umum');
  const [info, setInfo] = useState('');

  return (
    <AuthShell>
      <div className={`${styles.formWrap} ${styles.registerWrap}`}>
        <header className={styles.heading}>
          <h2>Daftar Anggota</h2>
          <p>Pilih jenis keanggotaan Anda.</p>
        </header>

        <div className={styles.memberList}>
          {memberOptions.map((option) => {
            const Icon = option.icon;
            const active = memberType === option.value;

            return (
              <button
                key={option.value}
                type="button"
                className={`${styles.memberCard} ${active ? styles.memberCardActive : ''}`}
                onClick={() => {
                  setMemberType(option.value);
                  setInfo('');
                }}
              >
                <span className={styles.memberIcon}><Icon /></span>
                <span className={styles.memberCopy}>
                  <strong>{option.title}</strong>
                  <small>{option.description}</small>
                </span>
                <span className={`${styles.radio} ${active ? styles.radioActive : ''}`} />
              </button>
            );
          })}
        </div>

        <button
          className={styles.primaryButton}
          type="button"
          onClick={() =>
            setInfo(
              `Jenis ${memberType} sudah dipilih. Form registrasi database akan dibuat pada tahap berikutnya.`,
            )
          }
        >
          Lanjutkan
        </button>

        {info && <p className={styles.inlineInfo}>{info}</p>}

        <p className={styles.switchText}>
          Sudah punya akun? <Link href="/login">Masuk</Link>
        </p>
      </div>
    </AuthShell>
  );
}
