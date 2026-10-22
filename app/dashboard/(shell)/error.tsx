"use client";
import { ErrorState } from "@/members/MemberUI";
export default function Error({ reset }: { reset: () => void }) { return <ErrorState message="Halaman anggota belum dapat dimuat. Silakan coba lagi." retry={reset} />; }
