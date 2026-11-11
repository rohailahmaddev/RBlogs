import { useEffect, useState } from "react";

/** Sticky "On this page" list that highlights the section being read. */
export default function TableOfContents({ headings }) {
  const [active, setActive] = useState(headings[0]?.id);

  useEffect(() => {
    if (headings.length < 2) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length) setActive(visible[0].target.id);
      },
      { rootMargin: "-90px 0px -65% 0px" }
    );
    headings.forEach((h) => {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length < 2) return null;

  return (
    <nav aria-label="On this page" className="sticky top-28">
      <p className="text-sm font-semibold text-slate-900 dark:text-white">On this page</p>
      <ul className="mt-4 space-y-1 border-l border-slate-200 dark:border-slate-800">
        {headings.map((h) => {
          const on = h.id === active;
          return (
            <li key={h.id}>
              <a
                href={`#${h.id}`}
                aria-current={on ? "location" : undefined}
                className={`-ml-px block border-l-2 py-1.5 pl-4 text-sm leading-snug transition-colors ${
                  on
                    ? "border-blue-600 font-medium text-blue-700 dark:border-blue-400 dark:text-blue-400"
                    : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-900 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-white"
                }`}
              >
                {h.text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}