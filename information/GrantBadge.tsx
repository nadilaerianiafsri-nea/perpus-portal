import { FiCheckCircle, FiClock } from "react-icons/fi";

import { type GrantStatus, grantStatusLabels } from "./grantTypes";
import styles from "./Information.module.css";

export default function GrantBadge({ status }: { status: GrantStatus }) {
  const catalogued = status === "SUDAH_DIKATALOGKAN";

  const Icon = catalogued ? FiCheckCircle : FiClock;

  return (
    <span
      className={`${styles.badge} ${
        catalogued ? styles.catalogued : styles.pending
      }`}
    >
      <Icon aria-hidden="true" />
      {grantStatusLabels[status]}
    </span>
  );
}
