import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";


// ASSUMPTION: getBlogById is exported from this file.
vi.mock("../../../modules/repository.js", () => ({
  getBlogById: vi.fn(),
  getBlogs: vi.fn(),
  deleteBlogPost: vi.fn(),
  updateBlogPost: vi.fn(),
  getCategory: vi.fn(),
  createBlogs: vi.fn(),
  getUserByEmailRepo: vi.fn(),
  verifyEmailRepo: vi.fn(),
}));

vi.mock("../../../middleware/auth.middleware.js", async (importOriginal) => ({
  ...(await importOriginal()),
  verifyJWT: vi.fn(),
  optionalAuth: vi.fn(),
}));

vi.mock("../../../infrastructure/storage/cloudinary.storage.js", () => ({
  uploadOnCloudinary: vi.fn(),
  deleteFromCloudinary: vi.fn(),
}));
vi.mock("../../../infrastructure/email/email.services.js", () => ({
  sendEmailService: vi.fn(),
  sendVerificationEmail: vi.fn(),
  sendFogotPasswordEmail: vi.fn(),
}));

import app from "../../../app.js";
import { getBlogById } from "../../../modules/repository.js";
import { optionalAuth } from "../../../middleware/auth.middleware.js";
import { ROLES } from "../../../utils/contants.js";

/* ------------------------------------------------------------------ */
/*  Fixtures and helpers                                               */
/* ------------------------------------------------------------------ */
const url = (id = 5) => `/api/v1/posts/get-blog/${id}`; // <- change to your real route
const get = (id = 5) => request(app).get(url(id));

const CONTENT = {
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: "The full body of the post." }] }],
};

// The row getBlogById returns. This test uses the Prisma camelCase shape (like
// the list endpoint). If your getBlogById returns snake_case, adjust the
// fixture AND the mapper. The row ALSO carries internal fields that must never
// reach a reader: publicId, the author's email and password hash.
const PUBLISHED = {
  id: 5,
  title: "My post",
  slug: "my-post",
  excerpt: "A short excerpt",
  content: CONTENT,
  cover_url: "https://res.cloudinary.com/demo/image/upload/v1/cover.png",
  read_time: 3,
  status: "PUBLISHED",
  published_at: new Date("2026-01-01T00:00:00.000Z"),
  created_at: new Date("2025-12-31T00:00:00.000Z"),
  author_id: 42,
  category: { id: 2, name: "Tech" },
  author: { id: 42, name: "Author", email: "author@secret.example", password: "$2b$10$neverReturned" },
  public_id: "secret/public_id",
};
const DRAFT = { ...PUBLISHED, status: "DRAFT", published_at: null };

const owner = { id: 42, email: "author@secret.example", role: ROLES.PUBLISHER };
const otherPublisher = { id: 77, email: "other@example.com", role: ROLES.PUBLISHER };
const reader = { id: 9, email: "reader@example.com", role: ROLES.READER };
const admin = { id: 1, email: "admin@example.com", role: ROLES.ADMIN };

const anonymous = () => optionalAuth.mockImplementation((_req, _res, next) => next());
const asUser = (user) =>{
  optionalAuth.mockImplementation((req, _res, next) => {
    req.user = user;
    next();
  })};

beforeEach(() => {
  vi.resetAllMocks();
  anonymous();
  getBlogById.mockResolvedValue(PUBLISHED);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */
describe("GET /get-blog/:id", () => {
  /* ------------------------ published posts ------------------------ */
  describe("a published post", () => {
    it("is readable by anyone, without logging in, with 200 and the success message", async () => {
      const res = await get();
      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/blog fetched successfully/i);
      expect(optionalAuth).toHaveBeenCalledTimes(1);
    });

    it("looks the blog up by its numeric id", async () => {
      await get(5);

      expect(getBlogById).toHaveBeenCalledTimes(1);
      expect(getBlogById).toHaveBeenCalledWith(5);
      expect(typeof getBlogById.mock.calls[0][0]).toBe("number");
    });

    it("returns the full post including the body", async () => {
      const res = await get();

      expect(res.body.data).toMatchObject({
        id: 5,
        title: "My post",
        slug: "my-post",
        excerpt: "A short excerpt",
      });
      expect(res.body.data.content).toEqual(CONTENT);
    });

    it.each([
      ["a reader", reader],
      ["another publisher", otherPublisher],
      ["an admin", admin],
    ])("is readable by %s", async (_label, user) => {
      asUser(user);

      expect((await get()).status).toBe(200);
    });

    // BUG: the service returns the raw repository row. Anything the query
    // selected (Cloudinary public id, the author's email, even a password hash
    // if the join selects too much) goes straight to the public. Map the row
    // to an explicit public shape (see getBlogById.service.improved.js).
    it("never exposes internal fields: Cloudinary public id, author email, password hash", async () => {
      const res = await get();
      const body = JSON.stringify(res.body);

      expect(body).not.toContain("secret/public_id");
      expect(body).not.toContain("author@secret.example");
      expect(body).not.toContain("neverReturned");
      expect(res.body.data).not.toHaveProperty("publicId");
    });

    it("exposes only public author data (id and name)", async () => {
      const res = await get();

      expect(res.body.data.author).toEqual({ id: 42, name: "Author" });
    });
  });

  /* ---------------------------- drafts ----------------------------- */
  describe("a draft post", () => {
    beforeEach(() => getBlogById.mockResolvedValue(DRAFT));
    
    // BUG: the service never looks at the status or at req.user, so ANYONE can
    // read any draft just by guessing ids 1, 2, 3... Only the author and admins
    // may see a draft; everyone else gets 404.
    it("is NOT readable by anonymous visitors (404)", async () => {
      const res = await get();
      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/blog not found/i);
      expect(JSON.stringify(res.body)).not.toContain("My post");
    });

    it.each([
      ["a reader", reader],
      ["another publisher", otherPublisher],
    ])("is NOT readable by %s (404)", async (_label, user) => {
      asUser(user);

      const res = await get();

      expect(res.status).toBe(404);
      expect(JSON.stringify(res.body)).not.toContain("The full body");
    });

    it("answers 404, not 403, so the response does not reveal that the draft exists", async () => {
      const draftRes = await get(5);

      getBlogById.mockResolvedValue(null);
      const missingRes = await get(6);

      expect(draftRes.status).toBe(missingRes.status);
      expect(draftRes.body.message).toBe(missingRes.body.message);
    });

    it("is readable by its author", async () => {
      asUser(owner);

      const res = await get();

      expect(res.status).toBe(200);
      expect(res.body.data.content).toEqual(CONTENT);
    });

    it("is readable by an admin", async () => {
      asUser(admin);

      expect((await get()).status).toBe(200);
    });

    it.each(["draft", "DRAFT", "Draft"])("treats status %j as a draft whatever the casing", async (status) => {
      getBlogById.mockResolvedValue({ ...DRAFT, status });

      const res = await get();

      expect(res.status).toBe(404);
    });

    it.each([null, undefined, "", "ARCHIVED"])(
      "fails closed: a post with status %j is hidden from the public",
      async (status) => {
        getBlogById.mockResolvedValue({ ...PUBLISHED, status });

        const res = await get();

        expect(res.status).toBe(404);
      }
    );
  });

  /* ------------------------- cache headers ------------------------- */
  // HARDENING: the same URL returns a draft to its author and 404 to everyone
  // else. Without Cache-Control a shared cache or CDN may store the author's
  // response and serve the draft to the public.
  describe("cache headers", () => {
    it("never lets a draft be stored by shared caches", async () => {
      getBlogById.mockResolvedValue(DRAFT);
      asUser(owner);

      const res = await get();

      expect(res.status).toBe(200);
      expect(res.headers["cache-control"]).toMatch(/private|no-store/i);
    });

    it("lets a published post be cached publicly for a short time", async () => {
      const res = await get();

      expect(res.headers["cache-control"]).toMatch(/public/i);
      expect(res.headers["cache-control"]).toMatch(/max-age=\d+/i);
    });
  });

  /* ---------------------------- not found -------------------------- */
  describe("blog lookup", () => {
    it.each([null, undefined])("returns 404 when the blog does not exist (%s)", async (value) => {
      getBlogById.mockResolvedValue(value);

      const res = await get();

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/blog not found/i);
    });

    it("returns 500 (not 404) when the lookup throws", async () => {
      getBlogById.mockRejectedValue(new Error("connection lost"));

      const res = await get();

      expect(res.status).toBe(500);
      expect(res.body.message).toMatch(/something went wrong/i);
    });

    it("does not leak database details to the client", async () => {
      getBlogById.mockRejectedValue(new Error("PrismaClientKnownRequestError: SELECT * FROM blogs WHERE id"));

      const res = await get();

      expect(res.status).toBe(500);
      expect(JSON.stringify(res.body)).not.toMatch(/prisma|SELECT|blogs/i);
    });

    it("returns 500 even when something other than an Error is thrown", async () => {
      getBlogById.mockRejectedValue("boom");

      const res = await get();

      expect(res.status).toBe(500);
    });
  });

  /* ----------------------------- id checks ------------------------- */
  describe("blog id validation", () => {
    it.each(["abc", "0", "-5", "1.5", "5abc", "1e3", "0x10", "%2B5", "%205%20", "99999999999999999999"])(
      "returns 400 for invalid id %j, without any DB lookup",
      async (id) => {
        const res = await get(id);

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/invalid blog id/i);
        expect(getBlogById).not.toHaveBeenCalled();
      }
    );

    it("returns 404 when the id segment is missing", async () => {
      const res = await request(app).get("/api/v1/posts/get-blog/");

      expect(res.status).toBe(404);
      expect(getBlogById).not.toHaveBeenCalled();
    });

    it("validates the id BEFORE hitting the database even for logged-in users", async () => {
      asUser(admin);

      const res = await get("abc");

      expect(res.status).toBe(400);
      expect(getBlogById).not.toHaveBeenCalled();
    });
  });

  /* ------------------------ optionalAuth failure -------------------- */
  describe("optionalAuth", () => {
    it("returns 500 (and queries nothing) when optionalAuth itself fails, e.g. the user lookup is down", async () => {
      optionalAuth.mockImplementation((_req, _res, next) => next(new Error("db down")));

      const res = await get();

      expect(res.status).toBe(500);
      expect(getBlogById).not.toHaveBeenCalled();
    });
  });

  /* ------------------------------ routing -------------------------- */
  describe("routing", () => {
    it.each(["post", "put", "patch", "delete"])("does not answer %s on the same URL (404)", async (method) => {
      const res = await request(app)[method](url(5));

      expect(res.status).toBe(404);
      expect(getBlogById).not.toHaveBeenCalled();
    });

    it("returns 404 for an extra path segment", async () => {
      const res = await request(app).get(`${url(5)}/comments`);

      expect(res.status).toBe(404);
      expect(getBlogById).not.toHaveBeenCalled();
    });
  });
});