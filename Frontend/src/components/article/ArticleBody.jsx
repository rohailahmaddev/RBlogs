import { useState } from "react";

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

export default function ArticleBody({ html }) {
  if (!html) return null;

  return (
    <div
      className="
        text-lg leading-8 text-slate-700 dark:text-slate-300

        [&_h2]:mb-4 [&_h2]:mt-14 [&_h2]:scroll-mt-28
        [&_h2]:font-['Newsreader',serif] [&_h2]:text-3xl [&_h2]:font-semibold
        [&_h2]:leading-tight [&_h2]:tracking-tight
        [&_h2]:text-slate-900 dark:[&_h2]:text-white

        [&_h3]:mb-3 [&_h3]:mt-10 [&_h3]:scroll-mt-28
        [&_h3]:font-['Newsreader',serif] [&_h3]:text-2xl [&_h3]:font-semibold
        [&_h3]:text-slate-900 dark:[&_h3]:text-white

        [&_h4]:mb-2 [&_h4]:mt-8 [&_h4]:scroll-mt-28
        [&_h4]:text-xl [&_h4]:font-semibold
        [&_h4]:text-slate-900 dark:[&_h4]:text-white

        [&_p]:my-6

        [&_ul]:my-6 [&_ul]:list-disc [&_ul]:space-y-3 [&_ul]:pl-6
        [&_ul>li]:marker:text-blue-600 dark:[&_ul>li]:marker:text-blue-400

        [&_ol]:my-6 [&_ol]:list-decimal [&_ol]:space-y-3 [&_ol]:pl-6
        [&_ol>li]:marker:font-semibold [&_ol>li]:marker:text-blue-600
        dark:[&_ol>li]:marker:text-blue-400

        [&_blockquote]:my-10 [&_blockquote]:border-l-4 [&_blockquote]:border-blue-600
        [&_blockquote]:pl-6 [&_blockquote]:font-['Newsreader',serif]
        [&_blockquote]:text-2xl [&_blockquote]:font-medium [&_blockquote]:italic
        [&_blockquote]:leading-snug [&_blockquote]:text-slate-900
        dark:[&_blockquote]:border-blue-400 dark:[&_blockquote]:text-white

        [&_a]:text-blue-600 [&_a]:underline-offset-4 hover:[&_a]:underline
        dark:[&_a]:text-blue-400

        [&_strong]:font-semibold [&_strong]:text-slate-900 dark:[&_strong]:text-white

        [&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1.5 [&_code]:py-0.5
        [&_code]:text-base [&_code]:text-slate-900
        dark:[&_code]:bg-slate-800 dark:[&_code]:text-slate-100

        [&_pre]:my-8 [&_pre]:overflow-x-auto [&_pre]:rounded-xl
        [&_pre]:bg-slate-900 [&_pre]:p-5 [&_pre]:text-sm [&_pre]:text-slate-100
        [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-slate-100

        [&_img]:my-8 [&_img]:rounded-2xl
        [&_hr]:my-12 [&_hr]:border-slate-200 dark:[&_hr]:border-slate-700

        [&_table]:my-8 [&_table]:w-full [&_table]:text-left
        [&_th]:border-b [&_th]:border-slate-300 [&_th]:py-2 [&_th]:font-semibold
        dark:[&_th]:border-slate-600
        [&_td]:border-b [&_td]:border-slate-200 [&_td]:py-2
        dark:[&_td]:border-slate-700
      "
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}