import DOMPurify from "dompurify";

const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

/**
 * Takes the HTML string from the API and returns:
 *  - html: sanitized HTML with an id on every h2/h3/h4
 *  - headings: [{ id, text, level }] for the table of contents
 */
export function prepareContent(rawHtml, fallbackText = "") {
  const source = rawHtml?.trim()
    ? rawHtml
    : `<p>${fallbackText}</p>`;

  // Defense in depth: the server already sanitizes, this is cheap
  const clean = DOMPurify.sanitize(source, { ADD_ATTR: ["target"] });

  const doc = new DOMParser().parseFromString(clean, "text/html");
  const headings = [];
  const used = new Map();

  doc.body.querySelectorAll("h2, h3, h4").forEach((el) => {
    const text = el.textContent.trim();
    if (!text) return;

    // Make ids unique if two headings have the same text
    let id = slugify(text) || "section";
    const count = used.get(id) ?? 0;
    used.set(id, count + 1);
    if (count > 0) id = `${id}-${count}`;

    el.id = id;
    headings.push({ id, text, level: Number(el.tagName[1]) });
  });

  return { html: doc.body.innerHTML, headings };
}