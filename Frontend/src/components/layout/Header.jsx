import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Navbar } from "../Navigation/Navbar";

export default function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  // Close the mobile menu after navigating
  useEffect(() => setOpen(false), [location.pathname]);

  // Add a shadow once the page scrolls
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close on Escape, and lock body scroll while the menu is open
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b backdrop-blur-xl transition-all duration-300
        ${
          scrolled
            ? "border-slate-200/80 bg-white/85 shadow-sm dark:border-slate-800 dark:bg-slate-900/85"
            : "border-transparent bg-white/70 dark:bg-slate-900/70"
        }`}
    >
      <Navbar open={open} setOpen={setOpen} />
    </header>
  );
}
