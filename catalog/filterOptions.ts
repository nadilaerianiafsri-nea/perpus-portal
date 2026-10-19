import { availabilityLabels, typeLabels, type FilterOptions } from "./types";

export const catalogFilterKeys = [
  "type",
  "availability",
  "subject",
  "language",
  "yearFrom",
  "yearTo",
] as const;
export type FilterChoice = { value: string; label: string; values: string[] };
export type FilterChip = {
  name: string;
  value: string;
  label: string;
  values?: string[];
};

export function filterChoiceKey(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("id-ID");
}

export function filterChoices(values: string[]): FilterChoice[] {
  const groups = new Map<string, FilterChoice>();
  for (const value of values) {
    const key = filterChoiceKey(value);
    if (!key) continue;
    const existing = groups.get(key);
    if (existing) {
      if (!existing.values.includes(value)) existing.values.push(value);
      continue;
    }
    const text = value.trim().replace(/\s+/g, " ");
    const plainCase =
      text === text.toLocaleLowerCase("id-ID") ||
      text === text.toLocaleUpperCase("id-ID");
    const label =
      plainCase && text.length > 3
        ? key.charAt(0).toLocaleUpperCase("id-ID") + key.slice(1)
        : text;
    groups.set(key, { value, label, values: [value] });
  }
  return [...groups.values()].sort((a, b) =>
    a.label.localeCompare(b.label, "id", { sensitivity: "base" }),
  );
}

export function memberFilterChips(
  query: URLSearchParams,
  options: FilterOptions,
  ebook: boolean,
): FilterChip[] {
  const chips: FilterChip[] = [];
  for (const name of ebook
    ? ["subject", "language"]
    : ["type", "availability", "subject", "language"]) {
    const selected = (query.get(name) ?? "").split(",").filter(Boolean);
    if (name === "subject" || name === "language") {
      const choices = filterChoices(
        name === "subject" ? options.subjects : options.languages,
      );
      for (const group of filterChoices(selected)) {
        const option = choices.find(
          (item) =>
            filterChoiceKey(item.value) === filterChoiceKey(group.value),
        );
        chips.push({
          name,
          value: group.value,
          label: option?.label ?? group.label,
          values: group.values,
        });
      }
    } else
      for (const value of selected) {
        chips.push({
          name,
          value,
          label:
            name === "type"
              ? (typeLabels[value as keyof typeof typeLabels] ?? value)
              : (availabilityLabels[value as keyof typeof availabilityLabels] ??
                value),
        });
      }
  }
  for (const name of ["yearFrom", "yearTo"]) {
    const value = query.get(name);
    if (value)
      chips.push({
        name,
        value,
        label: `${name === "yearFrom" ? "Dari" : "Sampai"} ${value}`,
      });
  }
  return chips;
}

export function filterUpdates(
  query: URLSearchParams,
): Record<string, string | null> {
  return Object.fromEntries(
    catalogFilterKeys.map((key) => [key, query.get(key) || null]),
  );
}

export function filterValidationError(query: URLSearchParams): string | null {
  if (
    query.get("yearFrom") &&
    query.get("yearTo") &&
    Number(query.get("yearFrom")) > Number(query.get("yearTo"))
  ) {
    return "Tahun awal harus lebih kecil atau sama dengan tahun akhir.";
  }
  if (
    catalogFilterKeys.some(
      (key) => (query.get(key) ?? "").split(",").filter(Boolean).length > 20,
    )
  ) {
    return "Pilih maksimal 20 nilai pada satu kelompok filter.";
  }
  return null;
}
