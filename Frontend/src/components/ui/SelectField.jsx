import { useId } from "react";

/** Styled native <select> (keeps the great mobile picker). */
export default function SelectField({ label, value, onChange, options }) {
  const id = useId();
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full cursor-pointer appearance-none rounded-full border border-slate-200 bg-white pl-5 pr-11 text-sm font-medium text-slate-700
          shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15
          dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-blue-400 sm:w-48"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <svg
        viewBox="0 0 24 24"
        className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </div>
  );
}