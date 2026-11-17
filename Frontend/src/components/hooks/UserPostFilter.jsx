import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

export const PAGE_SIZE = 9;

export default function usePostFilters() {
  const [params, setParams] = useSearchParams();

  const search = params.get("search") ?? "";
  const category = params.get("category") ?? "All";
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

  // What gets sent to the API ("All" means no category filter)
  const apiParams = useMemo(
    () => ({ search, category: category === "All" ? undefined : category, sort, page, limit: PAGE_SIZE }),
    [search, category, sort, page]
  );
  return {
    search,
    category,
    sort,
    page,
    apiParams,
    hasFilters: Boolean( search || category !== "All" || sort !== "newest"),
    setQuery: (v) => update({ search: v }, { replace: true }),
    setCategory: (v) => update({ category: v }),
    setSort: (v) => update({ sort: v }),
    setPage: (v) => update({ page: v }),
    clearAll: () => setParams(new URLSearchParams(), { replace: true }),
  };
}