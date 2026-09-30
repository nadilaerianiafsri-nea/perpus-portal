import { Head, Link, usePage } from "@inertiajs/react";
export default function Home() {
    const { auth } = usePage().props;
    const books = [
        {
            title: "Hukum Administrasi Negara",
            author: "Dr. Ridwan HR",
            category: "Hukum",
        },
        {
            title: "Pengantar Ilmu Hukum",
            author: "Prof. Sudikno",
            category: "Hukum",
        },
        {
            title: "Hak Asasi Manusia",
            author: "Tim Kemenkum",
            category: "HAM",
        },
        {
            title: "Hukum Perdata Indonesia",
            author: "Subekti",
            category: "Hukum Perdata",
        },
    ];

    return (
        <>
            <Head title="Perpustakaan Kemenkum Riau" />

            <div className="min-h-screen bg-[#f8faf9] text-slate-800">
                {/* NAVBAR */}
                <header className="bg-white border-b border-slate-200">
                    <div className="max-w-7xl mx-auto px-6 lg:px-8 h-20 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-emerald-700 flex items-center justify-center text-white font-bold text-lg">
                                P
                            </div>

                            <div>
                                <h1 className="font-bold text-lg leading-tight">
                                    Perpustakaan
                                </h1>
                                <p className="text-xs text-slate-500">
                                    Kemenkum Riau
                                </p>
                            </div>
                        </div>

                        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
                            <a href="#" className="text-emerald-700">
                                Beranda
                            </a>
                            <a href="#" className="hover:text-emerald-700">
                                Koleksi
                            </a>
                            <a href="#" className="hover:text-emerald-700">
                                E-Book
                            </a>
                            <a href="#" className="hover:text-emerald-700">
                                Layanan
                            </a>
                            <a href="#" className="hover:text-emerald-700">
                                Tentang
                            </a>
                        </nav>

                        {auth?.user ? (
                            <Link
                                href={route("dashboard")}
                                className="bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition"
                            >
                                Dashboard
                            </Link>
                        ) : (
                            <Link
                                href={route("login")}
                                className="bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition"
                            >
                                Masuk
                            </Link>
                        )}
                    </div>
                </header>

                {/* HERO */}
                <section className="bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-600 text-white">
                    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20 lg:py-28">
                        <div className="max-w-3xl">
                            <p className="uppercase tracking-[0.25em] text-emerald-100 text-sm font-semibold mb-4">
                                Perpustakaan Digital
                            </p>

                            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                                Temukan Pengetahuan,
                                <span className="block text-emerald-100">
                                    Perluas Wawasan
                                </span>
                            </h2>

                            <p className="mt-6 text-lg text-emerald-50 max-w-2xl leading-relaxed">
                                Jelajahi koleksi buku, e-book, referensi hukum,
                                dan berbagai sumber pengetahuan Perpustakaan
                                Kemenkum Riau.
                            </p>

                            {/* SEARCH */}
                            <div className="mt-10 bg-white rounded-2xl shadow-xl p-2 flex flex-col sm:flex-row gap-2 max-w-2xl">
                                <input
                                    type="text"
                                    placeholder="Cari judul buku, penulis, atau topik..."
                                    className="flex-1 px-5 py-4 rounded-xl text-slate-800 outline-none"
                                />

                                <button className="bg-emerald-700 hover:bg-emerald-800 text-white px-7 py-4 rounded-xl font-semibold transition">
                                    Cari Buku
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* QUICK MENU */}
                <section className="-mt-10 relative z-10">
                    <div className="max-w-7xl mx-auto px-6 lg:px-8">
                        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 grid grid-cols-2 md:grid-cols-4 overflow-hidden">
                            <QuickMenu
                                title="Koleksi Buku"
                                description="Jelajahi koleksi perpustakaan"
                            />

                            <QuickMenu
                                title="E-Book"
                                description="Baca koleksi digital"
                            />

                            <QuickMenu
                                title="Peminjaman"
                                description="Kelola peminjaman buku"
                            />

                            <QuickMenu
                                title="Hibah Buku"
                                description="Informasi donasi buku"
                            />
                        </div>
                    </div>
                </section>

                {/* COLLECTION */}
                <section className="max-w-7xl mx-auto px-6 lg:px-8 py-20">
                    <div className="flex items-end justify-between mb-8">
                        <div>
                            <p className="text-emerald-700 font-semibold text-sm uppercase tracking-wider">
                                Koleksi
                            </p>

                            <h3 className="text-3xl font-bold mt-2">
                                Koleksi Terbaru
                            </h3>

                            <p className="text-slate-500 mt-2">
                                Temukan buku terbaru yang tersedia di
                                perpustakaan.
                            </p>
                        </div>

                        <a
                            href="#"
                            className="hidden md:block text-emerald-700 font-semibold hover:underline"
                        >
                            Lihat Semua
                        </a>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {books.map((book, index) => (
                            <BookCard
                                key={index}
                                title={book.title}
                                author={book.author}
                                category={book.category}
                            />
                        ))}
                    </div>
                </section>
            </div>
        </>
    );
}

function QuickMenu({ title, description }) {
    return (
        <div className="p-7 border-r border-b md:border-b-0 border-slate-100 hover:bg-emerald-50 transition cursor-pointer">
            <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold mb-4">
                →
            </div>

            <h4 className="font-bold text-lg">{title}</h4>

            <p className="text-sm text-slate-500 mt-1">{description}</p>
        </div>
    );
}

function BookCard({ title, author, category }) {
    return (
        <article className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition">
            <div className="aspect-[3/4] bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center p-8">
                <div className="bg-white shadow-md rounded-lg w-full h-full flex items-center justify-center text-center p-5">
                    <span className="font-bold text-emerald-800">{title}</span>
                </div>
            </div>

            <div className="p-5">
                <span className="inline-block text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full mb-3">
                    {category}
                </span>

                <h4 className="font-bold text-lg leading-snug">{title}</h4>

                <p className="text-sm text-slate-500 mt-2">{author}</p>
            </div>
        </article>
    );
}
