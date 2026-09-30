import { Head, Link } from '@inertiajs/react';

export default function Dashboard() {
    return (
        <>
            <Head title="Dashboard Pengunjung" />

            <div className="min-h-screen bg-slate-50">
                <header className="border-b border-slate-200 bg-white">
                    <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                        <div>
                            <p className="font-bold text-slate-900">
                                Perpustakaan Kemenkum Riau
                            </p>
                            <p className="text-xs text-slate-500">
                                Pengunjung
                            </p>
                        </div>

                        <Link
                            href={route('logout')}
                            method="post"
                            as="button"
                            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                        >
                            Keluar
                        </Link>
                    </div>
                </header>

                <main className="mx-auto max-w-7xl px-6 py-10">
                    <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
                        Perpustakaan Kemenkum Riau
                    </p>

                    <h1 className="mt-2 text-3xl font-bold text-slate-900">
                        Dashboard Pengunjung
                    </h1>

                    <p className="mt-2 text-slate-500">
                        Jelajahi koleksi, e-book, status peminjaman,
                        dan layanan perpustakaan.
                    </p>
                </main>
            </div>
        </>
    );
}
