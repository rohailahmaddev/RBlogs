import { NavLink } from "react-router-dom";

export function DesktopLink({ to, label }) {
  return (
    <NavLink 
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        `group relative px-3 py-2 text-[15px] font-medium transition-colors
         focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-md
         ${
           isActive
             ? "text-blue-600 dark:text-blue-400"
             : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
         }`
      }
    >
      {({ isActive }) => (
        <>
          {label}
          <span
            className={`absolute inset-x-3 -bottom-0.5 h-0.5 origin-left rounded-full bg-blue-600 transition-transform duration-300 dark:bg-blue-400 ${
              isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
            }`}
          />
        </>
      )}
    </NavLink>
  );
}
