/** Upload validation: detect JPEG/PNG/WebP by magic bytes and read pixel size. */
export type ImageKind = { mime: "image/jpeg" | "image/png" | "image/webp"; ext: "jpg" | "png" | "webp" };

const ascii = (d: Uint8Array, start: number, end: number) => String.fromCharCode(...d.subarray(start, end));

export function detectImage(d: Uint8Array): ImageKind | null {
  if (d.length < 12) return null;
  if (d[0] === 0xff && d[1] === 0xd8 && d[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (d[0] === 0x89 && ascii(d, 1, 4) === "PNG" && d[4] === 0x0d && d[5] === 0x0a) return { mime: "image/png", ext: "png" };
  if (ascii(d, 0, 4) === "RIFF" && ascii(d, 8, 12) === "WEBP") return { mime: "image/webp", ext: "webp" };
  return null;
}

export function readImageSize(d: Uint8Array, kind: ImageKind): { width: number; height: number } | null {
  try {
    if (kind.ext === "png") {
      const v = new DataView(d.buffer, d.byteOffset, d.byteLength);
      return { width: v.getUint32(16), height: v.getUint32(20) };
    }
    if (kind.ext === "jpg") {
      let i = 2;
      while (i + 9 < d.length) {
        if (d[i] !== 0xff) return null;
        const marker = d[i + 1];
        const len = (d[i + 2] << 8) | d[i + 3];
        // SOF0..SOF15 except DHT(C4), JPG(C8), DAC(CC)
        if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
          return { height: (d[i + 5] << 8) | d[i + 6], width: (d[i + 7] << 8) | d[i + 8] };
        }
        i += 2 + len;
      }
      return null;
    }
    // WebP: VP8 / VP8L / VP8X
    const chunk = ascii(d, 12, 16);
    if (chunk === "VP8X") return { width: 1 + (d[24] | (d[25] << 8) | (d[26] << 16)), height: 1 + (d[27] | (d[28] << 8) | (d[29] << 16)) };
    if (chunk === "VP8L") {
      const b = d.subarray(21, 25);
      return { width: 1 + (((b[1] & 0x3f) << 8) | b[0]), height: 1 + (((b[3] & 0x0f) << 10) | (b[2] << 2) | ((b[1] & 0xc0) >> 6)) };
    }
    if (chunk === "VP8 ") return { width: ((d[27] << 8) | d[26]) & 0x3fff, height: ((d[29] << 8) | d[28]) & 0x3fff };
    return null;
  } catch {
    return null;
  }
}
