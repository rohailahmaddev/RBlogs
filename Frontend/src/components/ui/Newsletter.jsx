import { useState } from "react";
import { subscribeToNewsletter } from "../../api/newletter";
import logo from "../../assets/logo.png";

const PERKS = [
  "One email a week, never more",
  "Hand-picked posts and fresh ideas",
  "Writing tips for new authors",
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function Check({ className = "h-3.5 w-3.5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | success
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (status === "loading") return;

    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      setError("Please enter a valid email address.");
      return;
    }

    setError("");
    setStatus("loading");
    try {
      await subscribeToNewsletter(value);
      setStatus("success");
      setEmail("");
    } catch (err) {
      setStatus("idle");
      setError(err?.message || "Something went wrong. Please try again.");
    }
  }

  return (
    <section
      aria-labelledby="newsletter-heading"
      className="bg-slate-50 pb-16 dark:bg-slate-950 sm:pb-20 lg:pb-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-blue-600 px-6 py-12 shadow-2xl shadow-blue-900/20 dark:bg-blue-700 sm:px-12 sm:py-16 lg:px-16 lg:py-20">
          {/* Decorative: the RBlogs mark in white, huge and faint */}
          <img
            src={logo}
            alt="logo"
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-16 -right-16 w-[26rem] max-w-none select-none brightness-0 invert opacity-[0.08] sm:w-[34rem]"
          />
          {/* Decorative: the three logo lines */}
          <div
            className="pointer-events-none absolute left-0 top-10 hidden space-y-3 lg:block"
            aria-hidden="true"
          >
            <div className="h-2.5 w-16 rounded-r-full bg-white/25" />
            <div className="h-2.5 w-10 rounded-r-full bg-white/15" />
            <div className="h-2.5 w-6 rounded-r-full bg-white/10" />
          </div>

          <div className="relative grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            {/* Copy + form */}
            <div>
              <h2
                id="newsletter-heading"
                className="font-['Newsreader',serif] text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl lg:text-[2.75rem]"
              >
                The best new posts, in your inbox every week.
              </h2>
              <p className="mt-4 max-w-lg text-lg leading-relaxed text-blue-100">
                Join readers who like their reading list short and worth it.
              </p>

              <div aria-live="polite" className="mt-8">
                {status === "success" ? (
                  <div className="flex max-w-lg items-start gap-3 rounded-2xl bg-white/10 p-4 text-white ring-1 ring-white/20">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-blue-700">
                      <Check />
                    </span>
                    <div>
                      <p className="font-semibold">You're on the list.</p>
                      <p className="text-sm text-blue-100">
                        Watch your inbox for the next issue.
                      </p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} noValidate className="max-w-lg">
                    <label htmlFor="newsletter-email" className="sr-only">
                      Email address
                    </label>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <input
                        id="newsletter-email"
                        type="email"
                        name="email"
                        autoComplete="email"
                        inputMode="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (error) setError("");
                        }}
                        aria-invalid={Boolean(error)}
                        aria-describedby={error ? "newsletter-error" : undefined}
                        disabled={status === "loading"}
                        className={`w-full flex-1 rounded-full border-0 bg-white px-5 py-3.5 text-base text-slate-900 placeholder:text-slate-400
                          shadow-sm outline-none ring-2 transition focus:ring-white disabled:opacity-70 ${
                            error ? "ring-red-300" : "ring-transparent"
                          }`}
                      />
                      <button
                        type="submit"
                        disabled={status === "loading"}
                        className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-7 py-3.5 text-base font-semibold text-white
                          transition hover:bg-slate-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-80
                          focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-blue-600"
                      >
                        {status === "loading" ? (
                          <>
                            <svg
                              viewBox="0 0 24 24"
                              className="h-4 w-4 animate-spin"
                              fill="none"
                              aria-hidden="true"
                            >
                              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.3" strokeWidth="4" />
                              <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                            </svg>
                            Subscribing…
                          </>
                        ) : (
                          "Subscribe"
                        )}
                      </button>
                    </div>

                    {error ? (
                      <p
                        id="newsletter-error"
                        role="alert"
                        className="mt-3 text-sm font-medium text-red-100"
                      >
                        {error}
                      </p>
                    ) : (
                      <p className="mt-3 text-sm text-blue-100/90">
                        No spam. Unsubscribe anytime.
                      </p>
                    )}
                  </form>
                )}
              </div>
            </div>

            {/* Perks */}
            <ul className="space-y-4 lg:pl-8">
              {PERKS.map((perk) => (
                <li
                  key={perk}
                  className="flex items-center gap-4 rounded-2xl bg-white/10 px-5 py-4 text-white ring-1 ring-white/15 backdrop-blur-sm"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-blue-700">
                    <Check className="h-4 w-4" />
                  </span>
                  <span className="text-base font-medium">{perk}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
