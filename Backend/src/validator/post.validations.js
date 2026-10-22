import { z } from "zod";
import { extractText } from "../utils/helper";

const MAX_CONTENT_BYTES = 500 * 1024; // 500 KB of editor JSON

// multipart/form-data sends everything as strings, so JSON must be parsed first
const jsonContent = z
  .preprocess((val) => {
    if (typeof val !== "string") return val;
    try {
      return JSON.parse(val);
    } catch {
      return null; // fails the object/array check below
    }
  }, z.union([z.record(z.string(), z.any()), z.array(z.any())], {
    error: "Content must be valid JSON",
  }))
  .refine(
    (c) => JSON.stringify(c).length <= MAX_CONTENT_BYTES,
    "Content is too large"
  )
  .refine(
    (c) => extractText(c).trim().length > 0,
    "Content cannot be empty"
  );

// "true"/"false" strings from form data -> boolean
const formBoolean = z.preprocess(
  (v) => (v === "true" ? true : v === "false" ? false : v),
  z.boolean()
);

// Shared fields, no defaults (so they stay truly optional when made partial)
const postBase = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(500, "Title must be at most 500 characters"),

  // Optional: if empty, the controller generates one from the content
  excerpt: z
    .string()
    .trim()
    .max(500, "Excerpt must be at most 500 characters")
    .optional()
    .transform((v) => (v ? v : undefined)),

  content: jsonContent,

  // Maps to category_id in the DB
  category: z.coerce
    .number({ error: "Category must be a number" })
    .int()
    .positive("Invalid category"),

  status: z.enum(["draft", "published"], {
    error: "Status must be draft or published",
  }),
});

// ---------- Create ----------
export const createPostSchema = postBase.extend({
  status: postBase.shape.status.default("draft"),
});

// ---------- Update (PATCH) ----------
export const updatePostSchema = postBase
  .partial()
  .extend({
    // true = delete the existing cover image without uploading a new one
    remove_cover: formBoolean.optional(),
  })
  .refine(
    (data) => Object.values(data).some((v) => v !== undefined),
    "Provide at least one field to update"
  );

// ---------- Params ----------
export const postIdParamSchema = z.object({
  id: z.coerce.number().int().positive("Invalid post id"),
});

// ---------- List query ----------
export const listPostsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  category: z.coerce.number().int().positive().optional(),
  author: z.coerce.number().int().positive().optional(),
  status: z.enum(["draft", "published"]).optional(),
  search: z.string().trim().min(1).max(100).optional(),
});

// export type CreatePostInput = z.infer<typeof createPostSchema>;
// export type UpdatePostInput = z.infer<typeof updatePostSchema>;
// export type ListPostsQuery = z.infer<typeof listPostsQuerySchema>;