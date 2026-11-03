import { describe, it, expect } from "vitest";
import { toCsv, BOM } from "@/lib/csv";

describe("CSV export", () => {
  it("starts with a UTF-8 BOM and keeps Croatian letters", () => {
    const csv = toCsv(["Ime", "Grad"], [["Đurđa Šimić", "Čakovec"]]);
    expect(csv.startsWith(BOM)).toBe(true);
    expect(csv).toContain("Đurđa Šimić,Čakovec");
    const bytes = Buffer.from(csv, "utf8");
    expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
  });
  it("escapes delimiters, quotes and formula injection", () => {
    const csv = toCsv(["a"], [['x;y'], ['say "hi"'], ["=SUM(A1)"]], ";");
    expect(csv).toContain('"x;y"');
    expect(csv).toContain('"say ""hi"""');
    expect(csv).toContain("'=SUM(A1)");
  });
});
