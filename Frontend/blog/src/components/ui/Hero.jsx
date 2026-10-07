import logo from "../../assets/logo.png";
import { Link } from "react-router-dom";
import { EditorCard } from "./EditorCard";
import { PostPreview } from "./PostPreview";

/* ------------------------------------------------------------------ */
/*  Content – edit these to match your real blog                       */
/* ------------------------------------------------------------------ */
const HEADLINE = "Read what's worth your time. Write what's worth sharing.";
const SUBTEXT =
    "RBlogs is a home for clear, honest writing on web development, design and the craft of building things. Read freely, or publish your own post in minutes.";

const TOPICS = [
    { label: "Web development", to: "/categories/web-development" },
    { label: "Design", to: "/categories/design" },
    { label: "Career", to: "/categories/career" },
    { label: "AI", to: "/categories/ai" },
    { label: "Productivity", to: "/categories/productivity" },
];



/* ------------------------------------------------------------------ */
/*  Hero                                                               */
/* ------------------------------------------------------------------ */
export default function Hero() {
    return (
        <section className="relative overflow-hidden bg-white dark:bg-slate-900">
            {/* Brand mark, large and quiet, behind the visual */}
            <img
                src={logo}
                alt="logo"
                aria-hidden="true"
                className="pointer-events-none absolute -right-24 -top-10 w-136 max-w-none select-none opacity-[0.07] dark:opacity-[0.12] lg:-right-10 lg:top-4 lg:w-160"
            />

            <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-12 lg:gap-10 lg:px-8 lg:py-28">
                {/* Text */}
                <div className="lg:col-span-7">
                    <h1 className="max-w-2xl font-['Newsreader',serif] text-[2.6rem] font-semibold leading-[1.08] tracking-tight text-slate-900 dark:text-white sm:text-6xl lg:text-[4.25rem]">
                        {HEADLINE}
                    </h1>

                    <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600 dark:text-slate-300">
                        {SUBTEXT}
                    </p>

                    <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                        <Link
                            to="/blogs"
                            className="inline-flex items-center justify-center rounded-full bg-blue-600 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900"
                        >
                            Start reading
                        </Link>
                        <Link
                            to="/write"
                            className="inline-flex items-center justify-center rounded-full border border-slate-300 px-7 py-3.5 text-base font-semibold text-slate-900 transition hover:border-blue-500 hover:text-blue-600 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-600 dark:text-white dark:hover:border-blue-400 dark:hover:text-blue-400 dark:focus-visible:ring-offset-slate-900"
                        >
                            Write a post
                        </Link>
                    </div>

                    {/* Topics */}
                    <div className="mt-12">
                        <p className="text-sm text-slate-500 dark:text-slate-400">Popular topics</p>
                        <ul className="mt-3 flex flex-wrap gap-2">
                            {TOPICS.map((t) => (
                                <li key={t.to}>
                                    <Link
                                        to={t.to}
                                        className="inline-block rounded-full bg-slate-100 px-4 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-blue-600 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-blue-600"
                                    >
                                        {t.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Visual */}
                <div className="relative mx-auto w-full max-w-md lg:col-span-5 lg:max-w-none" aria-hidden="true">
                    <div className="lg:ml-6">
                        <EditorCard />
                    </div>
                    <div className="absolute -bottom-10 -left-2 hidden w-60 sm:block lg:-left-10">
                        <PostPreview />
                    </div>
                    {/* spacer so the preview card never collides with content below */}
                    <div className="hidden h-10 sm:block" />
                </div>
            </div>
        </section>
    );
}
