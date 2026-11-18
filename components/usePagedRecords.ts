"use client";

import { useState } from "react";
import type { RecordPageSize } from "./RecordPagination";

export function usePagedRecords<T>(items: readonly T[]) {
  const [page, setPage] = useState(1);
  const [pageSize, setSize] = useState<RecordPageSize>(10);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  return {
    page: currentPage,
    pageSize,
    total,
    totalPages,
    items: items.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    setPage,
    setPageSize: (size: RecordPageSize) => {
      setSize(size);
      setPage(1);
    },
  };
}
