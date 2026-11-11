import { Link } from "react-router-dom";
import logo from "../../assets/logo.png";

/* ------------------------------------------------------------------ */
/*  Content – edit these                                               */
/* ------------------------------------------------------------------ */
const LINK_GROUPS = [
  {
    title: "Explore",
    links: [
      { label: "Home", to: "/" },
      { label: "Blogs", to: "/blogs" },
      { label: "Categories", to: "/categories" },
      { label: "About", to: "/about" },
      { label: "Contact", to: "/contact" },
    ],
  },
  {
    title: "Topics",
    links: [
      { label: "Web development", to: "/categories/web-development" },
      { label: "Design", to: "/categories/design" },
      { label: "Career", to: "/categories/career" },
      { label: "AI", to: "/categories/ai" },
      { label: "Productivity", to: "/categories/productivity" },
    ],
  },
  {
    title: "Community",
    links: [
      { label: "Write a post", to: "/write" },
      { label: "Sign in", to: "/login" },
      { label: "Create account", to: "/register" },
      { label: "Privacy policy", to: "/privacy" },
      { label: "Terms of use", to: "/terms" },
    ],
  },
];

// Replace the URLs with your own profiles
const SOCIALS = [
  {
    label: "GitHub",
    href: "https://github.com/",
    path: "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12",
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/",
    path: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
  },
  {
    label: "X (Twitter)",
    href: "https://x.com/",
    path: "M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z",
  },
];

/* ------------------------------------------------------------------ */
/*  Pieces                                                             */
/* ------------------------------------------------------------------ */
function FooterLogo() {
  return (
    <Link
      to="/"
      aria-label="RBlogs home"
      className="group inline-flex items-center gap-2.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
    >
      {/* <img
        src={logo}
        alt="logo"
        className="h-9 w-auto transition-transform duration-300 group-hover:-rotate-6"
      /> */}
      <span className="text-2xl font-extrabold tracking-tight">
        <span className="text-blue-500">R</span>
        <span className="text-white">Blogs</span>
      </span>
    </Link>
  );
}

function BackToTop() {
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="group cursor-pointer inline-flex items-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-blue-400 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
    >
      Back to top
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 19V5M6 11l6-6 6 6" />
      </svg>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Footer                                                             */
/* ------------------------------------------------------------------ */
export const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-800 bg-slate-900 text-slate-300 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 pb-8 pt-14 sm:px-6 lg:px-8 lg:pt-16">
        <div className="grid gap-12 lg:grid-cols-[1.6fr_1fr_1fr_1fr] lg:gap-10">
          {/* Brand */}
          <div>
            <FooterLogo />
            <p className="mt-5 max-w-sm leading-relaxed text-slate-400">
              Clear, honest writing on web development, design and the craft of
              building things. Read freely, or publish your own post in minutes.
            </p>
            <ul className="mt-6 flex items-center gap-3">
              {SOCIALS.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 text-slate-300 transition hover:-translate-y-0.5 hover:border-blue-500 hover:bg-blue-600 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                  >
                    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden="true">
                      <path d={s.path} />
                    </svg>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Link columns */}
          <nav
            aria-label="Footer"
            className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:col-span-3 lg:grid-cols-3"
          >
            {LINK_GROUPS.map((group) => (
              <div key={group.title}>
                <h3 className="text-sm font-semibold text-white">{group.title}</h3>
                <ul className="mt-4 space-y-3">
                  {group.links.map((l) => (
                    <li key={l.to}>
                      <Link
                        to={l.to}
                        className="text-sm text-slate-400 transition-colors hover:text-white focus:outline-none focus-visible:text-white focus-visible:underline"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* Bottom bar */}
        <div className="mt-14 flex flex-col items-start justify-between gap-5 border-t border-slate-800 pt-8 sm:flex-row sm:items-center">
          <p className="text-sm text-slate-500">
            © {year} RBlogs. All rights reserved.
          </p>
          <BackToTop />
        </div>
      </div>
    </footer>
  );
}