import sanitizeHtml from "sanitize-html";

/**
 * Blog content is HTML written by users, so it MUST be cleaned on the server
 * before it is saved. Otherwise a publisher could store <script> or onerror=
 * code that runs in every reader's browser (XSS).
 *
 * Only the tags and attributes below survive. Everything else is removed.
*/

const OPTIONS = {
  allowedTags: [
    "h2", "h3", "h4", "p", "br", "hr",
    "strong", "b", "em", "i", "u", "s",
    "blockquote", "ul", "ol", "li",
    "a", "code", "pre", "img", "figure", "figcaption",
    "table", "thead", "tbody", "tr", "th", "td",
  ],
  allowedAttributes: {
    a: ["href", "title", "rel", "target"],
    img: ["src", "alt", "title", "width", "height"],
    code: ["class"], // only language-xxx, see allowedClasses
  },
  allowedClasses: { code: ["language-*"] },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: { img: ["http", "https"] },
  allowProtocolRelative: false,
  transformTags: {
    h1: "h2", // the page title is already the only <h1>
    a: sanitizeHtml.simpleTransform("a", {
      rel: "noopener noreferrer nofollow",
      target: "_blank",
    }),
  },
};

export const sanitizeContent = (html) => sanitizeHtml(String(html ?? ""), OPTIONS);

/** Text only, no tags. Used to check the content is not empty and to count words. */
export const getPlainText = (html) =>
  sanitizeHtml(String(html ?? ""), { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/g, " ")
    .trim();

/** Minutes to read, at about 200 words per minute (minimum 1). */
export const getReadTime = (html) => {
  const words = getPlainText(html).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
};