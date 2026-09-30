# Landing Page Perpus Portal

Folder ini berisi landing page Next.js yang dapat langsung ditempel ke project:

`E:\Project\perpus-portal-next`

## File utama

- `app/page.tsx`
- `app/layout.tsx`
- `app/globals.css`
- `components/LandingNavbar.tsx`
- `components/LandingFooter.tsx`
- `lib/landing-data.ts`
- `public/images/landing/*`

## Mengganti foto

Semua path gambar dipusatkan di:

`lib/landing-data.ts`

Contoh:

```ts
hero: "/images/landing/hero-perpustakaan.jpg",
```

Lalu simpan file asli Anda pada:

`public/images/landing/hero-perpustakaan.jpg`

Anda tidak perlu mengubah kode layout atau card.
