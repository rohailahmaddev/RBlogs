import { useEffect, useMemo, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { POSTS } from "../../api/data";
import { ARTICLES, DEFAULT_AUTHOR_BIO } from "../../api/article";
import ReadingProgress from "../article/ReadingProgress";
import { Cover } from "./PostCoverImage";
import ArticleBody, { getHeadings } from "../article/ArticleBody";
import ShareButtons from "../article/ShareButtons";
import TableOfContents from "../article/TableOfContent";
import PostCard from "./PostCard";
import { formatDate } from "../../utility/DateFormater";


const categorySlug = (name) => name.toLowerCase().replace(/\s+/g, "-");

// const formatDate = (iso) =>
//   new Intl.DateTimeFormat("en", { month: "long", day: "numeric", year: "numeric" }).format(
//     new Date(iso)
//   );

function NotFound() {
  return (
    <section className="flex min-h-[60vh] items-center justify-center bg-white px-4 dark:bg-slate-900">
      <div className="text-center">
        <p className="font-['Newsreader',serif] text-6xl font-semibold text-blue-600 dark:text-blue-400">
          404
        </p>
        <h1 className="mt-4 text-2xl font-semibold text-slate-900 dark:text-white">
          We couldn't find that post
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          It may have been moved or removed.
        </p>
        <Link
          to="/blogs"
          className="mt-6 inline-flex rounded-full bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
        >
          Browse all posts
        </Link>
      </div>
    </section>
  );
}

export default function BlogPost() {
  const { slug } = useParams();
  const bodyRef = useRef(null);

  const post = POSTS.find((p) => p.slug === slug);

  // Real article if we have one, otherwise the excerpt as a stand-in
  const blocks = useMemo(
    () => (post ? ARTICLES[post.slug] ?? [{ type: "p", text: post.excerpt }] : []),
    [post]
  );
  const headings = useMemo(() => getHeadings(blocks), [blocks]);

  const related = useMemo(() => {
    if (!post) return [];
    const others = POSTS.filter((p) => p.id !== post.id);
    const same = others.filter((p) => p.category === post.category);
    const rest = others.filter((p) => p.category !== post.category);
    return [...same, ...rest].slice(0, 3);
  }, [post]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    if (post) document.title = `${post.title} | RBlogs`;
  }, [post]);

  if (!post) return <NotFound />;

  return (
    <>
      <ReadingProgress targetRef={bodyRef} />

      <article className="bg-white pb-16 pt-10 dark:bg-slate-900 sm:pt-14 lg:pb-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <header className="max-w-3xl">
            <Link
              to="/blogs"
              className="group inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M19 12H5M11 6l-6 6 6 6" />
              </svg>
              All posts
            </Link>

            <div className="mt-6">
              <Link
                to={`/categories/${categorySlug(post.category)}`}
                className="inline-block rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 transition hover:bg-blue-100 dark:bg-blue-500/15 dark:text-blue-300 dark:hover:bg-blue-500/25"
              >
                {post.category}
              </Link>
            </div>

            <h1 className="mt-5 font-['Newsreader',serif] text-4xl font-semibold leading-[1.1] tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-[3.5rem]">
              {post.title}
            </h1>

            <p className="mt-5 text-xl leading-relaxed text-slate-600 dark:text-slate-300">
              {post.excerpt}
            </p>

            <div className="mt-8 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-base font-semibold text-white">
                {post.author.name.charAt(0)}
              </span>
              <div className="text-sm">
                <p className="font-semibold text-slate-900 dark:text-white">{post.author.name}</p>
                <p className="text-slate-500 dark:text-slate-400">
                  <time dateTime={post.date}>{formatDate(post.date)}</time>
                  <span aria-hidden="true"> · </span>
                  {post.readTime} min read
                </p>
              </div>
            </div>
          </header>

          {/* Cover */}
          <div className="mt-10 aspect-[16/8] overflow-hidden rounded-3xl bg-slate-100 shadow-xl shadow-blue-900/10 dark:bg-slate-800">
            <Cover post={post} className="!transition-none group-hover:!scale-100" />
          </div>

          {/* Body + table of contents */}
          <div className="mt-12 grid gap-12 xl:grid-cols-[minmax(0,44rem)_1fr] xl:gap-16">
            <div className="max-w-3xl">
              <div ref={bodyRef}>
                <ArticleBody blocks={blocks} />
              </div>

              <div className="mt-12 border-t border-slate-200 pt-8 dark:border-slate-800">
                <ShareButtons title={post.title} />
              </div>

              {/* Author box */}
              <div className="mt-10 flex gap-5 rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xl font-semibold text-white">
                  {post.author.name.charAt(0)}
                </span>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Written by</p>
                  <p className="font-semibold text-slate-900 dark:text-white">{post.author.name}</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {post.author.bio || DEFAULT_AUTHOR_BIO}
                  </p>
                </div>
              </div>
            </div>

            <aside className="hidden xl:block">
              <TableOfContents headings={headings} />
            </aside>
          </div>
        </div>
      </article>

      {/* Related posts */}
      {related.length > 0 && (
        <section
          aria-labelledby="related-heading"
          className="bg-slate-50 py-16 dark:bg-slate-950 sm:py-20"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2
              id="related-heading"
              className="font-['Newsreader',serif] text-3xl font-semibold tracking-tight text-slate-900 dark:text-white"
            >
              Keep reading
            </h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
              {related.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}