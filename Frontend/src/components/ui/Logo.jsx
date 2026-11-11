import { Link } from "react-router-dom";
// import logo from "../../assets/logo.png";

export function Logo() {
  return (
    <Link
      to="/"
      aria-label="RBlogs home"
      className="group flex items-center gap-2.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      {/* <img
        src={logo}
        alt="logo"
        className="h-9 w-auto transition-transform duration-300 group-hover:-rotate-6"
      /> */}
      <span className="text-2xl font-extrabold tracking-tight">
        <span className="text-blue-600 dark:text-blue-500">R</span>
        <span className="text-slate-900 dark:text-white">Blogs</span>
      </span>
    </Link>
  );
}
