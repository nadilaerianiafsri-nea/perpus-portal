"use client";

import { useState } from "react";
import Accordion from "@/components/Accordion";
import SearchField from "@/components/SearchField";
import styles from "./Information.module.css";

type FAQItem = {
  id: string;
  question: string;
  answer: string;
};

export default function FAQ({ items }: { items: FAQItem[] }) {
  const [search, setSearch] = useState("");
  const query = search.trim().toLocaleLowerCase("id-ID");
  const filtered = items.filter(({ question, answer }) =>
    `${question} ${answer}`.toLocaleLowerCase("id-ID").includes(query),
  );

  return (
    <section className={styles.faq} aria-label="Daftar pertanyaan dan jawaban">
      <SearchField
        initialValue=""
        onSearch={setSearch}
        delayMs={0}
        placeholder="Cari pertanyaan"
        label="Cari pertanyaan atau jawaban"
      />
      <div className={styles.faqResults}>
        {filtered.length ? (
          <Accordion
            defaultOpenId={items[0]?.id}
            items={filtered.map(({ id, question, answer }) => ({
              id,
              title: question,
              content: <p>{answer}</p>,
            }))}
          />
        ) : null}
        <p
          className={filtered.length ? styles.srOnly : styles.faqEmpty}
          role="status"
        >
          {filtered.length
            ? `${filtered.length} pertanyaan ditemukan.`
            : "Tidak ada pertanyaan yang sesuai."}
        </p>
      </div>
    </section>
  );
}
