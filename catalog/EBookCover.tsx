"use client";

import Image from "next/image";
import { useState } from "react";
import { safeCoverUrl } from "@/shared/displayUrls.cjs";

export default function EBookCover({
  src,
  title,
}: {
  src: string;
  title: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <Image
      src={
        failed ? "/images/landing/book-placeholder-1.svg" : safeCoverUrl(src)
      }
      alt={`Sampul ${title}`}
      fill
      priority
      sizes="(max-width: 700px) 176px, 240px"
      onError={() => setFailed(true)}
    />
  );
}
