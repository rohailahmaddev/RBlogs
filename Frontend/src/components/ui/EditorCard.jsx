import { useContext, useEffect, useState } from "react";
import { Data } from "../../context/context";
import { getLatestPost } from "../../utility/GetLatestPost";
import { PostCardSkeleton } from "./PostCard";


// The one animated moment: a post being written, then published
function useWritingDemo(text) {
    console.log("text", text)
    if(!text) return { typed: null, stage:null };
    const [reduced] = useState(
        () =>
            typeof window !== "undefined" &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
    const [count, setCount] = useState(reduced ? text?.length : 0);
    const [stage, setStage] = useState(reduced ? "published" : "typing");

    useEffect(() => {
        if (reduced) return;
        let interval;
        let publishTimer;
        const startTimer = setTimeout(() => {
            let i = 0;
            interval = setInterval(() => {
                i += 1;
                setCount(i);
                if (i >= text?.length) {
                    clearInterval(interval);
                    setStage("drafted");
                    publishTimer = setTimeout(() => setStage("published"), 1100);
                }
            }, 55);
        }, 700);

        return () => {
            clearTimeout(startTimer);
            clearTimeout(publishTimer);
            clearInterval(interval);
        };
    }, [reduced, text]);

    return { typed: text?.slice(0, count), stage };
}


export function HeroEditorSkeleton() {
  return (
    <div
      className="relative animate-pulse rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl shadow-blue-900/10 dark:border-slate-700 dark:bg-slate-800 dark:shadow-black/40 sm:p-6"
      aria-hidden="true"
    >
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div className="h-5 w-24 rounded bg-slate-200 dark:bg-slate-700" />

        <div className="h-8 w-28 rounded-full bg-slate-200 dark:bg-slate-700" />
      </div>

      {/* Title */}
      <div className="min-h-[4.5rem] space-y-3 sm:min-h-[5.25rem]">
        <div className="h-8 w-full rounded bg-slate-200 dark:bg-slate-700 sm:h-9" />
        <div className="h-8 w-3/5 rounded bg-slate-200 dark:bg-slate-700 sm:h-9" />
      </div>

      {/* Body lines */}
      <div className="mt-4 space-y-3">
        <div className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-slate-700" />

        <div className="h-2.5 w-4/5 rounded-full bg-slate-200 dark:bg-slate-700" />

        <div className="h-2.5 w-3/5 rounded-full bg-slate-200 dark:bg-slate-700" />
      </div>

      {/* Footer */}
      <div className="mt-6 flex items-center justify-end gap-3">
        {/* Category placeholders */}
        {/* <div className="flex gap-2">
          <div className="h-7 w-16 rounded-lg bg-slate-200 dark:bg-slate-700" />

          <div className="h-7 w-16 rounded-lg bg-slate-200 dark:bg-slate-700" />
        </div> */}

        {/* Publish button placeholder */}
        <div className="h-9 w-28 rounded-full bg-slate-200 dark:bg-slate-700" />
      </div>
    </div>
  );
}



export function EditorCard() {
    const { data, loading, reftech } = useContext(Data);
    const latestPost = getLatestPost(data?.items)
    console.log("latestPost:",latestPost)
    const { typed, stage } = useWritingDemo(latestPost?.title);
    if(loading) return <HeroEditorSkeleton/>
    const filled = stage !== "typing";
    const published = stage === "published";

    const lines = [
        { w: "w-full", o: "bg-blue-600/80" },
        { w: "w-4/5", o: "bg-blue-500/55" },
        { w: "w-3/5", o: "bg-blue-500/35" },
    ];

    return (
        <div className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl shadow-blue-900/10 dark:border-slate-700 dark:bg-slate-800 dark:shadow-black/40 sm:p-6">
            {/* header */}
            <div className="mb-5 flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-900 dark:text-white">New post</span>
                <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors duration-500 ${published
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300"
                        }`}
                >
                    <span
                        className={`h-1.5 w-1.5 rounded-full ${published ? "bg-emerald-500" : "bg-slate-400"
                            }`}
                    />
                    {published ? "Published" : "Draft"}
                </span>
            </div>

            {/* typed title */}
            <p
                className="min-h-[4.5rem] font-['Newsreader',serif] text-2xl font-semibold leading-snug text-slate-900 dark:text-white sm:min-h-[5.25rem] sm:text-[1.7rem]"
            >
                {typed}
                {stage === "typing" && (
                    <span className="ml-0.5 inline-block h-[1.1em] w-0.5 translate-y-1 animate-pulse bg-blue-600 dark:bg-blue-400" />
                )}
            </p>

            {/* body lines – echo the three lines in the logo */}
            <div className="mt-4 space-y-3">
                {lines.map((l, i) => (
                    <div key={i} className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-700/60">
                        <div
                            className={`h-full rounded-full ${l.o} transition-[width] duration-700 ease-out ${filled ? l.w : "w-0"
                                }`}
                            style={{ transitionDelay: `${i * 140}ms` }}
                        />
                    </div>
                ))}
            </div>

            {/* footer */}
            <div className="mt-6 flex items-center justify-end gap-3">
                {/* <div className="flex flex-wrap gap-2">
                    {["Writing", "Habits"].map((t) => (
                        <span
                            key={t}
                            className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600 dark:border-slate-600 dark:text-slate-300"
                        >
                            {t}
                        </span>
                    ))}
                </div> */}
                <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold text-white transition-colors duration-500 ${published ? "bg-emerald-600" : "bg-blue-600"
                        }`}
                >
                    {published && (
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 13l4 4L19 7" />
                        </svg>
                    )}
                    {published ? "Published" : "Publish"}
                </span>
            </div>
        </div>
    );
}
