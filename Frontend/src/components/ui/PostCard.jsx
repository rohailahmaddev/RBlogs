import { Link } from "react-router-dom";
import { Cover } from "./PostCoverImage";
import { formatDate } from "../../utility/DateFormater";

/* Image if the post has one, otherwise a branded placeholder
   that echoes the three lines from the RBlogs logo. */

function Meta({ post }) {
    return (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                {post.author.name.charAt(0)}
            </span>
            <span className="font-medium text-slate-700 dark:text-slate-200">{post.author.name}</span>
            <span aria-hidden="true">·</span>
            <time dateTime={post.date}>{formatDate(post.date)}</time>
            <span aria-hidden="true">·</span>
            <span>{post.readTime} min read</span>
        </div>
    );
}

function Arrow() {
    return (
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
    );
}

function Category({ children }) {
    return (
        <span className="inline-block rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
            {children}
        </span>
    );
}

export default function PostCard({ post, variant = "default" }) {
    const href = `/blogs/${post.slug}`;
    // Stretched link: the title link covers the whole card, so the card is
    // clickable but screen readers still hear a single, clear link.
    const titleLink = (
        <Link
            to={href}
            className="after:absolute after:inset-0 focus:outline-none focus-visible:after:ring-2 focus-visible:after:ring-blue-500 focus-visible:after:rounded-[inherit]"
        >
            {post.title}
        </Link>
    );

    if (variant === "featured") {
        return (
            <article className="group relative grid overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-xl hover:shadow-blue-900/10 dark:border-slate-800 dark:bg-slate-900 lg:grid-cols-5">
                <div className="aspect-[16/10] overflow-hidden lg:col-span-3 lg:aspect-auto lg:min-h-[22rem]">
                    <Cover post={post} />
                </div>
                <div className="flex flex-col justify-center gap-5 p-6 sm:p-8 lg:col-span-2 lg:p-10">
                    <Category>{post.category}</Category>
                    <h3 className="font-['Newsreader',serif] text-3xl font-semibold leading-tight tracking-tight text-slate-900 transition-colors group-hover:text-blue-700 dark:text-white dark:group-hover:text-blue-400 sm:text-[2rem]">
                        {titleLink}
                    </h3>
                    <p className="leading-relaxed text-slate-600 dark:text-slate-300">{post.excerpt}</p>
                    <Meta post={post} />
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400">
                        Read article <Arrow />
                    </span>
                </div>
            </article>
        );
    }

    return (
        <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-900/10 dark:border-slate-800 dark:bg-slate-900">
            <div className="aspect-[16/10] overflow-hidden">
                <Cover post={post} />
            </div>
            <div className="flex flex-1 flex-col gap-3 p-5">
                <Category>{post.category}</Category>
                <h3 className="font-['Newsreader',serif] text-xl font-semibold leading-snug text-slate-900 transition-colors group-hover:text-blue-700 dark:text-white dark:group-hover:text-blue-400">
                    {titleLink}
                </h3>
                <p className="line-clamp-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {post.excerpt}
                </p>
                <div className="mt-auto pt-2">
                    <Meta post={post} />
                </div>
            </div>
        </article>
    );
}

export function PostCardSkeleton({ variant = "default" }) {
    const featured = variant === "featured";
    return (
        <div
            className={`animate-pulse overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 ${featured ? "lg:grid lg:grid-cols-5" : ""
                }`}
            aria-hidden="true"
        >
            <div
                className={`aspect-[16/10] bg-slate-200 dark:bg-slate-800 ${featured ? "lg:col-span-3 lg:aspect-auto lg:min-h-[22rem]" : ""
                    }`}
            />
            <div className={`space-y-3 p-5 ${featured ? "lg:col-span-2 lg:p-10" : ""}`}>
                <div className="h-5 w-24 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-6 w-4/5 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-4 w-full rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-4 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
            </div>
        </div>
    );
}
