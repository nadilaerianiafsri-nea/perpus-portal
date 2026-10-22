import { redirect } from "next/navigation";

export const metadata = {
  title: "Katalog E-Book | Perpustakaan Kemenkum Riau",
};

export default function Page() {
  redirect("/koleksi?type=EBOOK");
}
