import { Link, NavLink } from "react-router-dom";
import { DesktopLink } from "../ui/DestopMenu"
import { Logo } from "../ui/Logo"
import ThemeToggle from "../ui/ToggleTheme";

const NAV_LINKS = [
  { label: "Home", to: "/" },
  { label: "Blogs", to: "/blogs" },
  { label: "Categories", to: "/categories" },
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
];

export const Navbar = ({open,setOpen}) => {
  return (
    <>
      <nav
        aria-label="Main"
        className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
      >
        <Logo />

        {/* ... react let spread its property into component props allow  */}
        <ul className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.to}>
              <DesktopLink {...link} />
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />

          <Link
            to="/write"
            className="hidden rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-blue-600/25
              transition hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 active:scale-95
              focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
              focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 sm:inline-flex"
          >
            Write a post
          </Link>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-700
              transition hover:border-blue-300 hover:text-blue-600
              focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
              dark:border-slate-700 dark:text-slate-200 dark:hover:border-blue-500 dark:hover:text-blue-400 lg:hidden"
          >
            <span className="relative block h-3.5 w-4.5" aria-hidden="true">
              <span
                className={`absolute left-0 h-0.5 w-full rounded bg-current transition-all duration-300 ${open ? "top-1.5 rotate-45" : "top-0"
                  }`}
              />
              <span
                className={`absolute left-0 top-1.5 h-0.5 w-full rounded bg-current transition-opacity duration-200 ${open ? "opacity-0" : "opacity-100"
                  }`}
              />
              <span
                className={`absolute left-0 h-0.5 w-full rounded bg-current transition-all duration-300 ${open ? "top-1.5 -rotate-45" : "top-3"
                  }`}
              />
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <div
        id="mobile-menu"
        className={`grid transition-[grid-template-rows] duration-300 ease-out lg:hidden ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
      >
        <div className="overflow-hidden">
          <ul className="space-y-1 border-t border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900 sm:px-6">
            {NAV_LINKS.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  end={link.to === "/"}
                  tabIndex={open ? 0 : -1}
                  className={({ isActive }) =>
                    `flex items-center justify-between rounded-xl px-4 py-3 text-base font-medium transition-colors ${isActive
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
                      : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
            <li className="pt-2 sm:hidden">
              <Link
                to="/write"
                tabIndex={open ? 0 : -1}
                className="block rounded-xl bg-blue-600 px-4 py-3 text-center font-semibold text-white transition hover:bg-blue-700"
              >
                Write a post
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </>
  )
}