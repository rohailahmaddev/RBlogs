import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import logo from "../../assets/logo.png"
// import { CATEGORIES } from "../data/categories";

/**
 * <NotFound />  -> the catch-all page for unknown URLs
 * <NotFound title="We couldn't find that post" message="..." />  -> reuse for a missing post
 */
export default function NotFound({
  title = "Couldn't find that page",
  message = "The link may be broken, or the page may have been moved or removed.",
}) {
  const { pathname } = useLocation();
//   const navigate = useNavigate();
//   const [query, setQuery] = useState("");

  // Respect "reduce motion": skip the pen animation and show the finished line
  const [reduceMotion] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  // Tab title, and ask search engines not to index this page
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Page not found | RBlogs";
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex";
    document.head.appendChild(meta);
    return () => {
      document.title = previousTitle;
      meta.remove();
    };
  }, []);

//   function handleSearch(e) {
//     e.preventDefault();
//     const q = query.trim();
//     navigate(q ? `/blogs?q=${encodeURIComponent(q)}` : "/blogs");
//   }

  return (
    <section className="relative flex min-h-[75vh] items-center overflow-hidden bg-white dark:bg-slate-900">
      {/* Brand mark, large and quiet, like the hero */}
      {/* <img
        src={logo}
        alt="logo"
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 top-1/2 w-[30rem] max-w-none -translate-y-1/2 select-none opacity-[0.06] dark:opacity-[0.1] sm:w-[38rem] lg:right-0"
      /> */}

      <div className="relative flex mx-auto w-full max-w-7xl justify-center px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="max-w-2xl">
          {/* 404 with a pen-drawn underline */}
          <p
            aria-hidden="true"
            className="font-['Newsreader',serif] text-[7rem] font-semibold leading-none tracking-tight text-blue-600 dark:text-blue-400 sm:text-[10rem]"
          >
            404
          </p>
          <svg viewBox="0 0 180 24" className="-mt-1 h-5 w-44 text-blue-600 dark:text-blue-400 sm:h-6 sm:w-56" fill="none" aria-hidden="true">
            <path
              d="M2 12 C 30 2, 60 22, 90 12 S 150 2, 178 12"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              pathLength="1"
              strokeDasharray="1"
              strokeDashoffset={reduceMotion ? 0 : 1}
            >
              {!reduceMotion && (
                <animate attributeName="stroke-dashoffset" from="1" to="0" dur="1.1s" begin="0.35s" fill="freeze" />
              )}
            </path>
          </svg>

          <h1 className="mt-8 font-['Newsreader',serif] text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            {title}
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-slate-600 dark:text-slate-300">{message}</p>

          {pathname !== "/" && (
            <p className="mt-4 max-w-full truncate rounded-lg bg-slate-100 px-3 py-1.5 font-mono text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {pathname}
            </p>
          )}

          {/* Actions */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-full bg-blue-600 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900"
            >
              Back to home
            </Link>
            <Link
              to="/blogs"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 px-7 py-3.5 text-base font-semibold text-slate-900 transition hover:border-blue-500 hover:text-blue-600 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-600 dark:text-white dark:hover:border-blue-400 dark:hover:text-blue-400"
            >
              Browse all posts
            </Link>
          </div>

          {/* Search instead */}
          {/* <form role="search" onSubmit={handleSearch} className="mt-10 max-w-lg">
            <label htmlFor="notfound-search" className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Or search for what you were looking for
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="notfound-search"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search posts…"
                autoComplete="off"
                className="h-12 w-full flex-1 rounded-full border border-slate-200 bg-white px-5 text-base text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-blue-400"
              />
              <button
                type="submit"
                className="h-12 shrink-0 rounded-full bg-slate-900 px-6 text-sm font-semibold text-white transition hover:bg-slate-800 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 dark:focus-visible:ring-offset-slate-900"
              >
                Search
              </button>
            </div>
          </form> */}

          {/* Topics */}
          {/* <div className="mt-10">
            <p className="text-sm text-slate-500 dark:text-slate-400">Popular topics</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <li key={c.slug}>
                  <Link
                    to={`/blogs?category=${c.slug}`}
                    className="inline-block rounded-full bg-slate-100 px-4 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-blue-600 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-blue-600"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div> */}
        </div>
      </div>
    </section>
  );
}