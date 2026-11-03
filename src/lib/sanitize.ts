import sanitizeHtml from "sanitize-html";

/** Allow-list sanitiser for CMS rich text (defence in depth; admin is trusted but cookies are not). */
export function sanitizePostHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ["p", "br", "strong", "em", "u", "s", "h2", "h3", "ul", "ol", "li", "blockquote", "a", "img", "hr", "code", "pre"],
    allowedAttributes: { a: ["href", "target", "rel"], img: ["src", "alt", "width", "height", "loading", "decoding"] },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: { img: ["http", "https"] },
    allowProtocolRelative: false,
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, ...(attribs.href?.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {}) },
      }),
      img: (tagName, attribs) => ({ tagName, attribs: { ...attribs, loading: "lazy", decoding: "async" } }),
    },
  });
}
