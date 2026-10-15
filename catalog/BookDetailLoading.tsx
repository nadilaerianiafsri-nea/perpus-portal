import { RelatedBooksLoading } from "./RelatedBooks";
import shared from "./BookDetail.module.css";
import styles from "./EBookDetail.module.css";

export default function BookDetailLoading({
  member = false,
}: {
  member?: boolean;
}) {
  return (
    <div
      className={`${shared.page} ${member ? shared.memberPage : ""} ${styles.page}`}
      role="status"
      aria-label="Memuat detail koleksi"
      aria-busy="true"
    >
      <div aria-hidden="true">
        <div className={`${styles.skeleton} ${styles.loadingLine}`} />
        <div className={styles.hero}>
          <div className={styles.coverStage}>
            <div className={`${styles.skeleton} ${styles.loadingCover}`} />
          </div>
          <div>
            <div className={`${styles.skeleton} ${styles.loadingTitle}`} />
            <div className={`${styles.skeleton} ${styles.loadingLine}`} />
            <div className={`${styles.skeleton} ${styles.loadingParagraph}`} />
          </div>
        </div>
        <div className={styles.details}>
          {[0, 1].map((key) => (
            <div key={key} className={shared.card}>
              <div className={`${styles.skeleton} ${styles.loadingLine}`} />
              <div
                className={`${styles.skeleton} ${styles.loadingParagraph}`}
              />
            </div>
          ))}
        </div>
        <RelatedBooksLoading ebook />
      </div>
    </div>
  );
}
