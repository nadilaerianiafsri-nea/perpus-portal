import { type FilterOptions, availabilityLabels, typeLabels } from "./types";
import styles from "./Catalog.module.css";
type Props = {
  query: URLSearchParams;
  options: FilterOptions;
  ebook: boolean;
  update: (values: Record<string, string | null>) => void;
  clear: () => void;
};
export default function Filters({
  query,
  options,
  ebook,
  update,
  clear,
}: Props) {
  function group(
    title: string,
    key: string,
    choices: { value: string; label: string }[],
  ) {
    const selected = (query.get(key) ?? "").split(",");
    return (
      <fieldset className={styles.filterGroup}>
        <legend>{title}</legend>
        {choices.map(({ value, label }) => (
          <label key={value}>
            <input
              type="checkbox"
              checked={selected.includes(value)}
              onChange={(e) =>
                update({
                  [key]:
                    (e.target.checked
                      ? [...selected.filter(Boolean), value]
                      : selected.filter((v) => v !== value)
                    ).join(",") || null,
                })
              }
            />
            <span>{label}</span>
          </label>
        ))}
      </fieldset>
    );
  }
  return (
    <div className={styles.filters}>
      <div className={styles.filterHeading}>
        <h2>Filter</h2>
        <button onClick={clear}>Bersihkan</button>
      </div>
      {!ebook &&
        group(
          "Jenis Koleksi",
          "type",
          Object.entries(typeLabels).map(([value, label]) => ({
            value,
            label,
          })),
        )}
      {!ebook &&
        group(
          "Ketersediaan",
          "availability",
          Object.entries(availabilityLabels).map(([value, label]) => ({
            value,
            label,
          })),
        )}
      {group(
        "Subjek / Kategori",
        "subject",
        options.subjects.map((value) => ({ value, label: value })),
      )}
      {group(
        "Bahasa",
        "language",
        options.languages.map((value) => ({ value, label: value })),
      )}
      <fieldset className={styles.filterGroup}>
        <legend>Tahun Terbit</legend>
        <div className={styles.yearRange}>
          <label>
            <span className={styles.srOnly}>Tahun terbit dari</span>
            <select
              value={query.get("yearFrom") ?? ""}
              onChange={(e) => update({ yearFrom: e.target.value || null })}
            >
              <option value="">Dari</option>
              {options.years.map((year) => (
                <option key={year}>{year}</option>
              ))}
            </select>
          </label>
          <span>–</span>
          <label>
            <span className={styles.srOnly}>Tahun terbit sampai</span>
            <select
              value={query.get("yearTo") ?? ""}
              onChange={(e) => update({ yearTo: e.target.value || null })}
            >
              <option value="">Sampai</option>
              {options.years.map((year) => (
                <option key={year}>{year}</option>
              ))}
            </select>
          </label>
        </div>
      </fieldset>
    </div>
  );
}
