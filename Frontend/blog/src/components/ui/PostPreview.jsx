/* A small finished post sitting behind the editor */
export function PostPreview() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-lg shadow-blue-900/10 dark:border-slate-700 dark:bg-slate-800 dark:shadow-black/40">
      <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
        Career
      </span>
      <p className="mt-2 font-['Newsreader',serif] text-lg font-semibold leading-snug text-slate-900 dark:text-white">
        A junior developer's guide to code reviews
      </p>
      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 font-semibold text-white">
          R
        </span>
        5 min read
      </div>
    </div>
  );
}