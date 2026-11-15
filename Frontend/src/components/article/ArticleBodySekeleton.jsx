import { PostCardSkeleton } from "../ui/PostCard";

const Bone = ({ className = "" }) => (
  <div className={`rounded-md bg-slate-200 dark:bg-slate-800 ${className}`} />
);

export default function ArticleSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading article…</span>

      <article className="animate-pulse bg-white pb-16 pt-10 dark:bg-slate-900 sm:pt-14 lg:pb-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <header className="max-w-3xl">
            {/* Back link */}
            <Bone className="h-4 w-24" />

            {/* Category pill */}
            <div className="mt-6">
              <Bone className="h-6 w-24" />
            </div>

            {/* Title (2 lines) */}
            <div className="mt-5 space-y-3">
              <Bone className="h-10 w-full sm:h-12 lg:h-14" />
              <Bone className="h-10 w-3/4 sm:h-12 lg:h-14" />
            </div>

            {/* Excerpt (2 lines) */}
            <div className="mt-5 space-y-3">
              <Bone className="h-5 w-full" />
              <Bone className="h-5 w-5/6" />
            </div>

            {/* Author row */}
            <div className="mt-8 flex items-center gap-3">
              <Bone className="h-11 w-11 shrink-0 !rounded-full" />
              <div className="space-y-2">
                <Bone className="h-4 w-32" />
                <Bone className="h-3 w-44" />
              </div>
            </div>
          </header>

          {/* Cover */}
          <Bone className="mt-10 aspect-[16/8] w-full !rounded-3xl" />

          {/* Body + TOC */}
          <div className="mt-12 grid gap-12 xl:grid-cols-[minmax(0,44rem)_1fr] xl:gap-16">
            <div className="max-w-3xl">
              {/* Article body */}
              <div className="space-y-12">
                {[0, 1, 2].map((section) => (
                  <div key={section} className="space-y-4">
                    <Bone className="h-8 w-2/3" /> {/* h2 */}
                    <div className="space-y-3 pt-2">
                      <Bone className="h-4 w-full" />
                      <Bone className="h-4 w-full" />
                      <Bone className="h-4 w-11/12" />
                      <Bone className="h-4 w-4/5" />
                    </div>
                    {section === 1 && (
                      <div className="space-y-3 pt-2">
                        {[0, 1, 2].map((i) => (
                          <div key={i} className="flex items-center gap-3">
                            <Bone className="h-2 w-2 shrink-0 !rounded-full" />
                            <Bone className="h-4 w-3/4" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Share buttons */}
              <div className="mt-12 border-t border-slate-200 pt-8 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <Bone className="h-4 w-16" />
                  <Bone className="h-10 w-10 !rounded-full" />
                  <Bone className="h-10 w-10 !rounded-full" />
                  <Bone className="h-10 w-10 !rounded-full" />
                </div>
              </div>

              {/* Author box */}
              <div className="mt-10 flex gap-5 rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950">
                <Bone className="h-14 w-14 shrink-0 !rounded-full" />
                <div className="flex-1 space-y-2">
                  <Bone className="h-3 w-20" />
                  <Bone className="h-5 w-36" />
                  <div className="space-y-2 pt-2">
                    <Bone className="h-4 w-full" />
                    <Bone className="h-4 w-4/5" />
                  </div>
                </div>
              </div>
            </div>

            {/* Table of contents (xl only, like the real page) */}
            <aside className="hidden xl:block">
              <div className="sticky top-28 space-y-4">
                <Bone className="h-4 w-28" />
                <div className="space-y-3 border-l border-slate-200 pl-4 dark:border-slate-800">
                  <Bone className="h-4 w-4/5" />
                  <Bone className="h-4 w-3/5" />
                  <Bone className="h-4 w-11/12" />
                  <Bone className="h-4 w-2/3" />
                </div>
              </div>
            </aside>
          </div>
        </div>
      </article>

      {/* Related posts */}
      <section className="animate-pulse bg-slate-50 py-16 dark:bg-slate-950 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Bone className="h-8 w-48" />
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            <PostCardSkeleton />
            <PostCardSkeleton />
            <PostCardSkeleton />
          </div>
        </div>
      </section>
    </div>
  );
}