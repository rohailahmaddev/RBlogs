const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Wraps every search word found in `text` with a <mark>. */
export default function Highlight({ text, query = "" }) {
  const terms = query.trim().split(/\s+/).filter(Boolean).map(escapeRegExp);
  if (terms.length === 0) return text;

  const parts = text.split(new RegExp(`(${terms.join("|")})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark
            key={i}
            className="rounded bg-yellow-200/80 px-0.5 text-inherit dark:bg-blue-500/40"
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}