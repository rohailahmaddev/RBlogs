// Pure helpers (no React) so they are easy to test and reuse with an API later.

export const PAGE_SIZE = 9;

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "shortest", label: "Quickest read" },
  { value: "longest", label: "Longest read" },
];

/** Every search word must appear in the title, excerpt, category or author. */
export function filterPosts(posts, { q = "", category = "All", author = "All" }) {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);

  return posts.filter((p) => {
    if (category !== "All" && p.category !== category) return false;
    if (author !== "All" && p.author.name !== author) return false;
    if (terms.length === 0) return true;

    const haystack = `${p.title} ${p.excerpt} ${p.category} ${p.author.name}`.toLowerCase();
    return terms.every((t) => haystack.includes(t));
  });
}

export function sortPosts(posts, sort) {
  const list = [...posts];
  switch (sort) {
    case "oldest":
      return list.sort((a, b) => a.date.localeCompare(b.date));
    case "shortest":
      return list.sort((a, b) => a.readTime - b.readTime);
    case "longest":
      return list.sort((a, b) => b.readTime - a.readTime);
    default:
      return list.sort((a, b) => b.date.localeCompare(a.date));
  }
}

export function paginate(items, page, size = PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(Math.max(1, page), totalPages);
  return {
    items: items.slice((current - 1) * size, current * size),
    page: current,
    totalPages,
  };
}