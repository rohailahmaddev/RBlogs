import { useEffect, useState } from "react";

/** Debounced search box. `value` comes from the URL, `onChange` writes back to it. */
export default function SearchBar({ value, onChange, delay = 300 }) {
  const [text, setText] = useState(value);

  // URL changed elsewhere (e.g. "Clear all") -> reflect it in the input
  useEffect(() => setText(value), [value]);

  // Wait until the user pauses typing before updating results
  useEffect(() => {
    if (text === value) return;
    const t = setTimeout(() => onChange(text), delay);
    return () => clearTimeout(t);
  }, [text, value, onChange, delay]);

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        onChange(text);
      }}
      className="relative flex-1"
    >
      <label htmlFor="blog-search" className="sr-only">
        Search posts by title, author or category
      </label>
      <svg
        viewBox="0 0 24 24"
        className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.3-4.3" />
      </svg>
      <input
        id="blog-search"
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && setText("")}
        placeholder="Search by title, author or category…"
        autoComplete="off"
        className="h-12 w-full rounded-full border border-slate-200 bg-white pl-12 pr-12 text-base text-slate-900 placeholder:text-slate-400
          shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15
          dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-blue-400"
      />
      {text && (
        <button
          type="button"
          onClick={() => setText("")}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      )}
    </form>
  );
}