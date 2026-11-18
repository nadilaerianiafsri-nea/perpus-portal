"use client";

import { useState, type ReactNode } from "react";
import RecordPagination, { type RecordPageSize } from "./RecordPagination";

type Props<T> = {
  items: readonly T[];
  children: (rows: T[]) => ReactNode;
  label: string;
};

export default function PagedItems<T>({ items, children, label }: Props<T>) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<RecordPageSize>(10);
  const count = items.length;
  const pages = Math.max(1, Math.ceil(count / pageSize));
  const activePage = Math.max(1, Math.min(page, pages));
  const visible = items.slice((activePage - 1) * pageSize, activePage * pageSize);

  return (
    <>
      {children(visible)}
      <RecordPagination
        label={label}
        page={activePage}
        pageSize={pageSize}
        total={count}
        totalPages={pages}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
      />
    </>
  );
}
