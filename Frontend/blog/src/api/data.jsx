// Sample data for RBlogs. Same shape your API should return.
//
// Fields:
//   id        unique number (or string)
//   slug      used in the URL -> /blogs/<slug>
//   title     post title
//   excerpt   1-2 sentence summary (cards clamp it to 2 lines)
//   category  must match across posts to group in the filter tabs
//   author    { name }
//   date      ISO string "YYYY-MM-DD"
//   readTime  minutes (number)
//   cover     image URL, or null for the branded placeholder
//
// Cover images below use picsum.photos (random stock photos, seeded so they
// stay the same). Swap them for your own Cloudinary URLs later.

const cover = (seed) => `https://picsum.photos/seed/${seed}/900/560`;

export const POSTS = [
  {
    id: 1,
    slug: "why-i-stopped-chasing-the-perfect-draft",
    title: "Why I stopped chasing the perfect draft",
    excerpt:
      "Shipping an honest first version taught me more about writing than a year of polishing ever did. Here is the routine that made it stick.",
    category: "Productivity",
    author: { name: "Rohail Khan" },
    date: "2026-10-01",
    readTime: 6,
    cover: cover("rblogs-draft"),
  },
  {
    id: 2,
    slug: "junior-developers-guide-to-code-reviews",
    title: "A junior developer's guide to code reviews",
    excerpt:
      "How to give feedback that actually helps, and how to receive it without taking it personally.",
    category: "Career",
    author: { name: "Ayesha Malik" },
    date: "2026-09-26",
    readTime: 5,
    cover: cover("rblogs-review"),
  },
  {
    id: 3,
    slug: "react-state-without-the-headache",
    title: "React state without the headache",
    excerpt:
      "When to reach for useState, when to lift state up, and when a reducer is genuinely worth the extra code.",
    category: "Web development",
    author: { name: "Hamza Ali" },
    date: "2026-09-18",
    readTime: 8,
    cover: cover("rblogs-react"),
  },
  {
    id: 4,
    slug: "designing-readable-blog-layouts",
    title: "Designing readable blog layouts",
    excerpt:
      "Line length, spacing and type choices that keep readers on the page instead of closing the tab.",
    category: "Design",
    author: { name: "Sara Ahmed" },
    date: "2026-09-10",
    readTime: 4,
    cover: null, // shows the branded placeholder
  },
  {
    id: 5,
    slug: "using-ai-as-a-writing-partner",
    title: "Using AI as a writing partner, not a ghostwriter",
    excerpt:
      "Practical ways to brainstorm, outline and edit with AI while keeping your own voice intact.",
    category: "AI",
    author: { name: "Rohail Khan" },
    date: "2026-09-02",
    readTime: 7,
    cover: cover("rblogs-ai"),
  },
  {
    id: 6,
    slug: "jwt-auth-the-parts-tutorials-skip",
    title: "JWT auth: the parts tutorials skip",
    excerpt:
      "Token storage, refresh flows and the small mistakes that quietly weaken your login system.",
    category: "Web development",
    author: { name: "Hamza Ali" },
    date: "2026-08-25",
    readTime: 9,
    cover: cover("rblogs-jwt"),
  },
  {
    id: 7,
    slug: "building-a-focused-deep-work-week",
    title: "Building a focused deep-work week",
    excerpt:
      "A simple schedule for students and developers who always have too many tabs open.",
    category: "Productivity",
    author: { name: "Ayesha Malik" },
    date: "2026-08-17",
    readTime: 5,
    cover: null,
  },
  {
    id: 8,
    slug: "tailwind-patterns-that-scale",
    title: "Tailwind patterns that scale past the first page",
    excerpt:
      "Keep utility classes readable with component extraction, design tokens and a few house rules.",
    category: "Web development",
    author: { name: "Sara Ahmed" },
    date: "2026-08-09",
    readTime: 6,
    cover: cover("rblogs-tailwind"),
  },
  {
    id: 9,
    slug: "color-palettes-for-dark-mode",
    title: "Color palettes that survive dark mode",
    excerpt:
      "Why simply inverting your colors fails, and how to pick tones that keep contrast and mood.",
    category: "Design",
    author: { name: "Sara Ahmed" },
    date: "2026-08-01",
    readTime: 5,
    cover: cover("rblogs-dark"),
  },
  {
    id: 10,
    slug: "first-internship-what-i-wish-i-knew",
    title: "My first internship: what I wish I knew",
    excerpt:
      "Asking better questions, owning small tasks and turning a short placement into a real reference.",
    category: "Career",
    author: { name: "Ayesha Malik" },
    date: "2026-07-22",
    readTime: 7,
    cover: cover("rblogs-intern"),
  },
  {
    id: 11,
    slug: "prompting-for-better-code-reviews",
    title: "Prompting AI for better code reviews",
    excerpt:
      "Give the model context, constraints and a checklist, and its feedback gets far more useful.",
    category: "AI",
    author: { name: "Hamza Ali" },
    date: "2026-07-14",
    readTime: 6,
    cover: null,
  },
  {
    id: 12,
    slug: "writing-habit-for-busy-developers",
    title: "A writing habit for busy developers",
    excerpt:
      "Twenty minutes a day, one small topic at a time. How to build a blog without burning out.",
    category: "Productivity",
    author: { name: "Rohail Khan" },
    date: "2026-07-05",
    readTime: 4,
    cover: cover("rblogs-habit"),
  },
];