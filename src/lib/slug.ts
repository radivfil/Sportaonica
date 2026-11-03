const MAP: Record<string, string> = { đ: "d", Đ: "d", ß: "ss" };

/** Croatian-friendly slug: "Što ponijeti?" -> "sto-ponijeti" */
export function slugify(input: string): string {
  return input
    .replace(/[đĐß]/g, (c) => MAP[c] ?? c)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
