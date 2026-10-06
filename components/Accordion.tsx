"use client";

import { useId, useState, type ReactNode } from "react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import styles from "./Accordion.module.css";

type AccordionItem = { id: string; title: string; content: ReactNode };

export default function Accordion({
  items,
  defaultOpenId = null,
}: {
  items: AccordionItem[];
  defaultOpenId?: string | null;
}) {
  const prefix = useId();
  const [openId, setOpenId] = useState(defaultOpenId);

  return (
    <div className={styles.list}>
      {items.map(({ id, title, content }) => {
        const open = openId === id;
        const buttonId = `${prefix}-${id}-button`;
        const panelId = `${prefix}-${id}-panel`;
        const Chevron = open ? FiChevronUp : FiChevronDown;
        return (
          <section className={styles.item} key={id}>
            <h2 className={styles.heading}>
              <button
                id={buttonId}
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                className={styles.button}
                onClick={() => setOpenId(open ? null : id)}
              >
                <span>{title}</span>
                <Chevron aria-hidden="true" />
              </button>
            </h2>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!open}
              className={styles.panel}
            >
              {content}
            </div>
          </section>
        );
      })}
    </div>
  );
}
