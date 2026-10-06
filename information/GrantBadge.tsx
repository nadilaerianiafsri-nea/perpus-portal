import { FiAlertTriangle, FiCheckCircle, FiClock } from "react-icons/fi";
import { type GrantStatus, grantStatusLabels } from "./grantTypes";
import styles from "./Information.module.css";
export default function GrantBadge({ status }: { status: GrantStatus }) {
  const Icon =
    status === "SUDAH_DIKATALOGKAN"
      ? FiCheckCircle
      : status === "SEDANG_DIPROSES"
        ? FiClock
        : FiAlertTriangle;
  return (
    <span
      className={`${styles.badge} ${status === "SUDAH_DIKATALOGKAN" ? styles.catalogued : status === "SEDANG_DIPROSES" ? styles.processing : styles.pending}`}
    >
      <Icon aria-hidden="true" />
      {grantStatusLabels[status]}
    </span>
  );
}
