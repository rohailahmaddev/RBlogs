import { useState } from "react";

/** Headings used by the table of contents. */
export function getHeadings(blocks) {
  return blocks.filter((b) => b.type === "h2").map((b) => ({ id: b.id, text: b.text }));
}

function CodeBlock({ language, code }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked – ignore */
    }
  }

  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-lg shadow-slate-900/10 dark:bg-slate-950">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2.5">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
          {language || "code"}
        </span>
        <button
          type="button"
          onClick={copy}
          className="rounded-md px-2.5 py-1 text-xs font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-5 text-sm leading-relaxed text-slate-100">
        <code className="font-mono">{code}</code>
      </pre>
    </div>
  );
}

export default function ArticleBody({ blocks }) {
  return (
    <div className="text-lg leading-8 text-slate-700 dark:text-slate-300">
      {blocks.map((b, i) => {
        switch (b.type) {
          case "h2":
            return (
              <h2
                key={i}
                id={b.id}
                className="mb-4 mt-14 scroll-mt-28 font-['Newsreader',serif] text-3xl font-semibold leading-tight tracking-tight text-slate-900 dark:text-white"
              >
                {b.text}
              </h2>
            );
          case "h3":
            return (
              <h3
                key={i}
                id={b.id}
                className="mb-3 mt-10 scroll-mt-28 font-['Newsreader',serif] text-2xl font-semibold text-slate-900 dark:text-white"
              >
                {b.text}
              </h3>
            );
          case "quote":
            return (
              <blockquote
                key={i}
                className="my-10 border-l-4 border-blue-600 pl-6 font-['Newsreader',serif] text-2xl font-medium italic leading-snug text-slate-900 dark:border-blue-400 dark:text-white"
              >
                {b.text}
              </blockquote>
            );
          case "list":
            return (
              <ul key={i} className="my-6 space-y-3">
                {b.items.map((item, j) => (
                  <li key={j} className="flex gap-3">
                    <span className="mt-3 h-2 w-2 shrink-0 rounded-full bg-blue-600 dark:bg-blue-400" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            );
          case "callout":
            return (
              <aside
                key={i}
                className="my-8 rounded-2xl bg-blue-50 p-6 text-base font-medium leading-relaxed text-blue-900 ring-1 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-100 dark:ring-blue-500/20"
              >
                {b.text}
              </aside>
            );
          case "code":
            return <CodeBlock key={i} language={b.language} code={b.code} />;
          default:
            return (
              <p key={i} className="my-6">
                {b.text}
              </p>
            );
        }
      })}
    </div>
  );
}