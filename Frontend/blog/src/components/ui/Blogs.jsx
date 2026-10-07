import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { POSTS } from "../../api/data";
import usePostFilters from "./UserPostFilter";
import SearchBar from "./Search";
import PostCard, { PostCardSkeleton } from "./PostCard";
import Pagination from "./Pagination";
import { SORT_OPTIONS } from "../../utility/FilterPost";
import SelectField from "./SelectField";

function FilterChip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 py-1 pl-3 pr-1.5 text-sm font-medium text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter ${label}`}
        className="flex h-5 w-5 items-center justify-center rounded-full transition hover:bg-blue-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-blue-500/30"
      >
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </span>
  );
}

/**
 * <Blogs />                              -> uses the sample data
 * <Blogs posts={apiPosts} loading={x} /> -> plug in your API later
 */
export default function Blogs({ posts = POSTS, loading = false }) {
  const f = usePostFilters(posts);
  const resultsRef = useRef(null);

  useEffect(() => {
    document.title = "All posts | RBlogs";
  }, []);

  function goToPage(p) {
    f.setPage(p);
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const authorOptions = [
    { value: "All", label: "All authors" },
    ...f.authors.map((a) => ({ value: a, label: a })),
  ];

  return (
    <>
      {/* Page header + controls */}
      <section className="bg-white pb-10 pt-14 dark:bg-slate-900 sm:pt-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-['Newsreader',serif] text-4xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
            All posts
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
            Search the whole archive, or narrow it down by topic and author.
          </p>

          {/* Search + selects */}
          <div className="mt-8 flex flex-col gap-3 lg:flex-row">
            <SearchBar value={f.q} onChange={f.setQuery} />
            <div className="flex flex-col gap-3 sm:flex-row">
              <SelectField
                label="Filter by author"
                value={f.author}
                onChange={f.setAuthor}
                options={authorOptions}
              />
              <SelectField
                label="Sort posts"
                value={f.sort}
                onChange={f.setSort}
                options={SORT_OPTIONS}
              />
            </div>
          </div>

          {/* Category pills */}
          <div
            role="group"
            aria-label="Filter posts by category"
            className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
          >
            {["All", ...f.categories].map((c) => {
              const on = c === f.category;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => f.setCategory(c)}
                  aria-pressed={on}
                  className={`shrink-0 cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    on
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/25"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Results */}
      <section
        ref={resultsRef}
        aria-label="Search results"
        className="scroll-mt-20 bg-slate-50 py-10 dark:bg-slate-950 sm:py-14 lg:pb-24"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Summary + active filters */}
          {!loading && (
            <div className="mb-8 flex flex-wrap items-center gap-x-4 gap-y-3">
              <p role="status" aria-live="polite" className="text-sm text-slate-600 dark:text-slate-300">
                {f.total === 0
                  ? "No posts found"
                  : `Showing ${f.items.length} of ${f.total} ${f.total === 1 ? "post" : "posts"}`}
              </p>

              {f.hasFilters && (
                <>
                  <ul className="flex flex-wrap items-center gap-2">
                    {f.q && (
                      <li>
                        <FilterChip label={`“${f.q}”`} onRemove={() => f.setQuery("")} />
                      </li>
                    )}
                    {f.category !== "All" && (
                      <li>
                        <FilterChip label={f.category} onRemove={() => f.setCategory("All")} />
                      </li>
                    )}
                    {f.author !== "All" && (
                      <li>
                        <FilterChip label={f.author} onRemove={() => f.setAuthor("All")} />
                      </li>
                    )}
                  </ul>
                  <button
                    type="button"
                    onClick={f.clearAll}
                    className="text-sm font-semibold text-blue-600 hover:text-blue-700 focus:outline-none focus-visible:underline dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Clear all
                  </button>
                </>
              )}
            </div>
          )}

          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
              {Array.from({ length: 6 }, (_, i) => (
                <PostCardSkeleton key={i} />
              ))}
            </div>
          ) : f.total === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900">
              <p className="font-['Newsreader',serif] text-2xl font-semibold text-slate-900 dark:text-white">
                Nothing matches your search
              </p>
              <p className="mx-auto mt-2 max-w-md text-slate-600 dark:text-slate-300">
                Try different keywords, check the spelling, or remove a filter.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={f.clearAll}
                  className="rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Clear all filters
                </button>
                <Link
                  to="/write"
                  className="rounded-full border border-slate-300 px-6 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-blue-500 hover:text-blue-600 dark:border-slate-600 dark:text-white dark:hover:border-blue-400 dark:hover:text-blue-400"
                >
                  Write about it
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
                {f.items.map((p) => (
                  <PostCard key={p.id} post={p} query={f.q} />
                ))}
              </div>
              <Pagination page={f.page} totalPages={f.totalPages} onChange={goToPage} />
            </>
          )}
        </div>
      </section>
    </>
  );
}