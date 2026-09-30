import { Head, Link, useForm } from '@inertiajs/react';

export default function Login({ status, canResetPassword }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <>
            <Head title="Masuk" />

            <div className="min-h-screen bg-[#f6f9f7] lg:grid lg:grid-cols-2">

                {/* LEFT SIDE */}
                <section className="relative hidden overflow-hidden bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-700 lg:flex lg:flex-col lg:justify-between">

                    <div className="absolute -left-32 top-20 h-96 w-96 rounded-full bg-white/5" />
                    <div className="absolute -bottom-32 right-0 h-[500px] w-[500px] rounded-full bg-white/5" />

                    <div className="relative z-10 p-12">
                        <Link
                            href="/"
                            className="inline-flex items-center gap-3"
                        >
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white font-bold text-emerald-800 shadow-lg">
                                P
                            </div>

                            <div className="text-white">
                                <p className="text-lg font-bold leading-tight">
                                    Perpustakaan
                                </p>
                                <p className="text-sm text-emerald-100">
                                    Kemenkum Riau
                                </p>
                            </div>
                        </Link>
                    </div>

                    <div className="relative z-10 max-w-xl px-12 pb-16">
                        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-emerald-200">
                            Portal Perpustakaan
                        </p>

                        <h1 className="text-5xl font-bold leading-tight text-white">
                            Akses pengetahuan
                            <span className="block text-emerald-200">
                                dalam satu portal.
                            </span>
                        </h1>

                        <p className="mt-6 max-w-lg text-lg leading-relaxed text-emerald-50/90">
                            Masuk untuk mengakses koleksi buku, e-book,
                            peminjaman, riwayat aktivitas, dan berbagai layanan
                            Perpustakaan Kemenkum Riau.
                        </p>
                    </div>
                </section>

                {/* RIGHT SIDE */}
                <main className="flex min-h-screen items-center justify-center px-6 py-12 sm:px-10 lg:px-16">
                    <div className="w-full max-w-md">

                        {/* Mobile logo */}
                        <Link
                            href="/"
                            className="mb-10 flex items-center gap-3 lg:hidden"
                        >
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-700 font-bold text-white">
                                P
                            </div>

                            <div>
                                <p className="font-bold text-slate-900">
                                    Perpustakaan
                                </p>
                                <p className="text-xs text-slate-500">
                                    Kemenkum Riau
                                </p>
                            </div>
                        </Link>

                        <div>
                            <p className="text-sm font-semibold text-emerald-700">
                                Selamat datang kembali
                            </p>

                            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                                Masuk ke akun Anda
                            </h2>

                            <p className="mt-3 text-sm leading-relaxed text-slate-500">
                                Gunakan akun Google atau email dan password untuk
                                mengakses portal perpustakaan.
                            </p>
                        </div>

                        {status && (
                            <div className="mt-6 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                                {status}
                            </div>
                        )}

                        {/* GOOGLE */}
                        <a
                            href="/auth/google/redirect"
                            className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-5 py-3.5 font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
                        >
                            <GoogleIcon />

                            <span>Masuk dengan Google</span>
                        </a>

                        {/* DIVIDER */}
                        <div className="my-7 flex items-center gap-4">
                            <div className="h-px flex-1 bg-slate-200" />

                            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                                atau dengan email
                            </span>

                            <div className="h-px flex-1 bg-slate-200" />
                        </div>

                        {/* EMAIL LOGIN */}
                        <form onSubmit={submit} className="space-y-5">

                            <div>
                                <label
                                    htmlFor="email"
                                    className="mb-2 block text-sm font-semibold text-slate-700"
                                >
                                    Email
                                </label>

                                <input
                                    id="email"
                                    type="email"
                                    value={data.email}
                                    onChange={(e) =>
                                        setData('email', e.target.value)
                                    }
                                    autoComplete="username"
                                    autoFocus
                                    placeholder="nama@email.com"
                                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                                />

                                {errors.email && (
                                    <p className="mt-2 text-sm text-red-600">
                                        {errors.email}
                                    </p>
                                )}
                            </div>

                            <div>
                                <div className="mb-2 flex items-center justify-between">
                                    <label
                                        htmlFor="password"
                                        className="text-sm font-semibold text-slate-700"
                                    >
                                        Password
                                    </label>

                                    {canResetPassword && (
                                        <Link
                                            href={route('password.request')}
                                            className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
                                        >
                                            Lupa password?
                                        </Link>
                                    )}
                                </div>

                                <input
                                    id="password"
                                    type="password"
                                    value={data.password}
                                    onChange={(e) =>
                                        setData('password', e.target.value)
                                    }
                                    autoComplete="current-password"
                                    placeholder="Masukkan password"
                                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                                />

                                {errors.password && (
                                    <p className="mt-2 text-sm text-red-600">
                                        {errors.password}
                                    </p>
                                )}
                            </div>

                            <label className="flex cursor-pointer items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={data.remember}
                                    onChange={(e) =>
                                        setData(
                                            'remember',
                                            e.target.checked
                                        )
                                    }
                                    className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
                                />

                                <span className="text-sm text-slate-600">
                                    Ingat saya
                                </span>
                            </label>

                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full rounded-xl bg-emerald-700 px-5 py-3.5 font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {processing
                                    ? 'Memproses...'
                                    : 'Masuk'}
                            </button>
                        </form>

                        <p className="mt-8 text-center text-sm text-slate-500">
                            Belum memiliki akun?{' '}
                            <Link
                                href={route('register')}
                                className="font-semibold text-emerald-700 hover:text-emerald-800"
                            >
                                Daftar sekarang
                            </Link>
                        </p>

                        <div className="mt-10 border-t border-slate-200 pt-6 text-center">
                            <Link
                                href="/"
                                className="text-sm font-medium text-slate-500 transition hover:text-emerald-700"
                            >
                                ← Kembali ke Beranda
                            </Link>
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
}

function GoogleIcon() {
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            aria-hidden="true"
        >
            <path
                fill="#4285F4"
                d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-1.99 3.02v2.54h3.22c1.89-1.74 2.99-4.3 2.99-7.41Z"
            />
            <path
                fill="#34A853"
                d="M12 22c2.7 0 4.96-.9 6.61-2.42l-3.22-2.54c-.89.6-2.03.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.06v2.62A10 10 0 0 0 12 22Z"
            />
            <path
                fill="#FBBC05"
                d="M6.39 13.87A6 6 0 0 1 6.07 12c0-.65.11-1.28.32-1.87V7.51H3.06A10 10 0 0 0 2 12c0 1.61.39 3.14 1.06 4.49l3.33-2.62Z"
            />
            <path
                fill="#EA4335"
                d="M12 6c1.47 0 2.79.51 3.83 1.49l2.87-2.87A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.94 5.51l3.33 2.62C7.18 7.76 9.39 6 12 6Z"
            />
        </svg>
    );
}
