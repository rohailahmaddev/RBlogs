import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { POSTS } from "../../api/data";
import PostCard, { PostCardSkeleton } from "./PostCard";

const MAX_POSTS = 7; // 1 featured + 6 cards

/**
 * Props let you plug in real data later without touching the layout:
 *   <LatestPosts posts={data} loading={isLoading} />
 */
export function LatestPosts({ posts = POSTS, loading = false }) {
    const [active, setActive] = useState("All");

    const categories = useMemo(
        () => ["All", ...new Set(posts.map((p) => p.category))],
        [posts]
    );

    const visible = useMemo(() => {
        const list = active === "All" ? posts : posts.filter((p) => p.category === active);
        return list.slice(0, MAX_POSTS);
    }, [posts, active]);

    const [featured, ...rest] = visible;

    return (
        <section
            aria-labelledby="latest-posts-heading"
            className="bg-slate-50 py-16 dark:bg-slate-950 sm:py-20 lg:py-24"
        >
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* Heading row */}
                <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h2
                            id="latest-posts-heading"
                            className="font-['Newsreader',serif] text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl"
                        >
                            Fresh from the blog
                        </h2>
                        <p className="mt-2 max-w-xl text-slate-600 dark:text-slate-300">
                            New ideas, tutorials and lessons from people who build things.
                        </p>
                    </div>
                    <Link
                        to="/blogs"
                        className="group inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                        View all posts
                        <svg
                            viewBox="0 0 24 24"
                            className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                        >
                            <path d="M5 12h14M13 6l6 6-6 6" />
                        </svg>
                    </Link>
                </div>

                {/* Category filter */}
                <div
                    role="group"
                    aria-label="Filter posts by category"
                    className="-mx-4 mt-8 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
                >
                    {categories.map((c) => {
                        const on = c === active;
                        return (
                            <button
                                key={c}
                                type="button"
                                onClick={() => setActive(c)}
                                aria-pressed={on}
                                className={`shrink-0 cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${on
                                        ? "bg-blue-600 text-white shadow-md shadow-blue-600/25"
                                        : "bg-white text-slate-700 ring-1 ring-slate-200 hover:ring-blue-300 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-800 dark:hover:ring-blue-500"
                                    }`}
                            >
                                {c}
                            </button>
                        );
                    })}
                </div>

                {/* Content */}
                <div className="mt-8 space-y-6 lg:space-y-8">
                    {loading ? (
                        <>
                            <PostCardSkeleton variant="featured" />
                            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
                                {[0, 1, 2].map((i) => (
                                    <PostCardSkeleton key={i} />
                                ))}
                            </div>
                        </>
                    ) : visible.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900">
                            <p className="font-medium text-slate-900 dark:text-white">No posts here yet</p>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                Try another category, or be the first to write one.
                            </p>
                            <Link
                                to="/write"
                                className="mt-5 inline-flex rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                            >
                                Write a post
                            </Link>
                        </div>
                    ) : (
                        <>
                            <PostCard post={featured} variant="featured" />
                            {rest.length > 0 && (
                                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
                                    {rest.map((p) => (
                                        <PostCard key={p.id} post={p} />
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </section>
    );
}
