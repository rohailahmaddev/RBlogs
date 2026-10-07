import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { filterPosts, sortPosts, paginate } from "../../utility/FilterPost";

/**
 * Keeps search / filters / sort / page in the URL, e.g.
 *   /blogs?q=react&category=Design&author=Sara%20Ahmed&sort=oldest&page=2
 * so results can be shared, bookmarked, and the back button works.
 */
export default function usePostFilters(posts) {
  const [params, setParams] = useSearchParams();

  const q = params.get("q") ?? "";
  const category = params.get("category") ?? "All";
  const author = params.get("author") ?? "All";
  const sort = params.get("sort") ?? "newest";
  const page = Math.max(1, Number(params.get("page")) || 1);

  const update = useCallback(
    (changes, { replace = false } = {}) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          Object.entries(changes).forEach(([key, value]) => {
            const isDefault =
              value === "" ||
              value === "All" ||
              (key === "sort" && value === "newest") ||
              (key === "page" && value === 1);
            if (isDefault) next.delete(key);
            else next.set(key, String(value));
          });
          if (!("page" in changes)) next.delete("page"); // any filter change -> page 1
          return next;
        },
        { replace }
      );
    },
    [setParams]
  );

  const clearAll = useCallback(() => setParams({}), [setParams]);

  const categories = useMemo(() => [...new Set(posts.map((p) => p.category))].sort(), [posts]);
  const authors = useMemo(() => [...new Set(posts.map((p) => p.author.name))].sort(), [posts]);

  const filtered = useMemo(
    () => sortPosts(filterPosts(posts, { q, category, author }), sort),
    [posts, q, category, author, sort]
  );
  const pageData = useMemo(() => paginate(filtered, page), [filtered, page]);

  const hasFilters = Boolean(q || category !== "All" || author !== "All");

  return {
    q,
    category,
    author,
    sort,
    categories,
    authors,
    total: filtered.length,
    hasFilters,
    ...pageData, // items, page, totalPages
    setQuery: (v) => update({ q: v }, { replace: true }),
    setCategory: (v) => update({ category: v }),
    setAuthor: (v) => update({ author: v }),
    setSort: (v) => update({ sort: v }),
    setPage: (v) => update({ page: v }),
    clearAll,
  };
}