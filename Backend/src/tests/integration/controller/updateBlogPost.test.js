import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

/* ------------------------------------------------------------------ */
/*  Mocks. Paths are relative to THIS file. Adjust to your layout.     */
/*  Real: routing, authorizeRole, multer, validateSchema (zod),        */
/*        controller, service, error handler.                          */
/*  Mocked: verifyJWT (we control who is logged in), DB, Cloudinary,   */
/*          mail (so importing the app has no side effects).           */
/* ------------------------------------------------------------------ */

// ASSUMPTION: these are exported from this file.
vi.mock("../../../modules/repository.js", () => ({
  getBlogById: vi.fn(),
  updateBlogById: vi.fn(),
  getCategory: vi.fn(),
  createBlogs: vi.fn(),
  getUserByEmailRepo: vi.fn(),
  verifyEmailRepo: vi.fn(),
}));

// importOriginal keeps authorizeRole REAL.
vi.mock("../../../middleware/auth.middleware.js", async (importOriginal) => ({
  ...(await importOriginal()),
  verifyJWT: vi.fn(),
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
import { getBlogById, updateBlogById, getCategory } from "../../../modules/repository.js";
import { verifyJWT } from "../../../middleware/auth.middleware.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../../../infrastructure/storage/cloudinary.storage.js";
import { ROLES } from "../../../utils/contants.js";
import { ApiError } from "../../../utils/ApiError.js";

/* ------------------------------------------------------------------ */
/*  Fixtures and helpers                                               */
/* ------------------------------------------------------------------ */
const url = (id = 5) => `/api/v1/posts/update-post/${id}`; // <- change to your real route

// ASSUMPTION: jsonContent accepts this rich-text document. Edit if needed.
const CONTENT = {
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: "Updated body of the post." }] }],
};
const EMPTY_CONTENT = { type: "doc", content: [{ type: "paragraph" }] };

// The existing blog as the repository returns it. It carries BOTH spellings of
// the author field because the service reads blog.authorId while your RBAC
// middleware reads post.author_id. Make the repository return ONE spelling
// and delete the other here.
const EXISTING = {
  id: 5,
  author_id: 42,
  authorId: 42,
  title: "Old title",
  excerpt: "Old excerpt",
  status: "draft",
  publishedAt: null,
  cover_url: "https://res.cloudinary.com/demo/image/upload/v1/old.png",
  public_id: "blog/old_cover",
};
const UPDATED = { ...EXISTING, title: "New title" };

const owner = { id: 42, email: "owner@example.com", role: ROLES.PUBLISHER };
const otherPublisher = { id: 77, email: "other@example.com", role: ROLES.PUBLISHER };
const admin = { id: 1, email: "admin@example.com", role: ROLES.ADMIN };

const NEW_IMAGE = {
  secure_url: "https://res.cloudinary.com/demo/image/upload/v2/new.png",
  url: "http://res.cloudinary.com/demo/image/upload/v2/new.png",
  public_id: "blog/new_cover",
};

const asUser = (user) =>
  verifyJWT.mockImplementation((req, _res, next) => {
    req.user = user;
    next();
  });
const rejectsAs401 = () =>
  verifyJWT.mockImplementation((_req, _res, next) =>
    // statusCode: change to `status` if your error handler reads that instead
    next(Object.assign(new ApiError(401, "Unauthorized request")))
  );

// JSON request (multer ignores non-multipart bodies)
const update = (id = 5, body = { title: "New title" }) => request(app).put(url(id)).send(body);

const IMAGE_BUFFER = Buffer.from("fake-image-bytes");

// multipart request with a new cover image (real multer writes it to disk)
const updateWithFile = (id = 5, fields = { title: "New title" }) => {
  const r = request(app).put(url(id));
  for (const [k, v] of Object.entries(fields)) {
    r.field(k, typeof v === "object" ? JSON.stringify(v) : String(v));
  }
  return r.attach("file", Buffer.from("fake-image-bytes"), {
    filename: "new.png",
    contentType: "image/png",
  });
};

// What the service passed to updateBlogById(id, data)
const idArg = () => updateBlogById.mock.calls[0][0];
const dataArg = () => updateBlogById.mock.calls[0][1];

let consoleErrorSpy;

beforeEach(() => {
  vi.resetAllMocks();
  asUser(owner);
  getBlogById.mockResolvedValue(EXISTING);
  updateBlogById.mockResolvedValue(UPDATED);
  getCategory.mockResolvedValue({ id: 2, name: "News" });
  uploadOnCloudinary.mockResolvedValue(NEW_IMAGE);
  deleteFromCloudinary.mockResolvedValue(undefined);
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */
describe("PUT /update-post/:id", () => {
  /* ---------------------------- success --------------------------- */
  describe("success", () => {
    // NOTE: as the service is written today it cannot even be loaded
    // (`let blogId` redeclares the destructured parameter `blogId`), and the
    // ownership check reads `blog` before it is declared. Until both are
    // fixed, every test in this file fails.
    it("returns 200 with the success message and the updated blog", async () => {
      const res = await update();
  
      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/blog updated successfully/i);
      expect(res.body.data.blog).toEqual(UPDATED);
    });

    it("loads the blog by its numeric id and updates that same id", async () => {
      await update(5);

      expect(getBlogById).toHaveBeenCalledWith(5);
      expect(idArg()).toBe(5);
      expect(typeof idArg()).toBe("number");
    });

    it("sends ONLY the changed fields to the repository (partial update)", async () => {
      await update(5, { title: "New title" });

      expect(dataArg()).toEqual({ title: "New title" });
    });

    it("updates title, excerpt and content together", async () => {
      const res = await update(5, { title: "New title", excerpt: "New excerpt", content: CONTENT });
      expect(dataArg()).toMatchObject({ title: "New title", excerpt: "New excerpt" });
      expect(dataArg().content).toEqual(CONTENT);
    });

    it("trims the title (zod .trim()) before saving", async () => {
      // Fails if validateSchema does not write the parsed body back to req.body.
      await update(5, { title: "   New title   " });

      expect(dataArg().title).toBe("New title");
    });

    it("accepts content sent as a JSON string (multipart style)", async () => {
      const res = await update(5, { content: JSON.stringify(CONTENT) });

      expect(res.status).toBe(200);
      expect(dataArg().content).toEqual(CONTENT);
    });

    it("never lets the client change protected fields (author, id, slug, cover columns, counters)", async () => {
      await update(5, {
        title: "New title",
        author_id: 999,
        authorId: 999,
        id: 1,
        slug: "hacked-slug",
        views: 1_000_000,
        public_id: "evil/public-id",
        cover_url: "https://evil.example/x.png",
      });

      expect(Object.keys(dataArg())).toEqual(["title"]);
    });

    it("does not touch Cloudinary when the cover is not involved", async () => {
      await update();

      expect(uploadOnCloudinary).not.toHaveBeenCalled();
      expect(deleteFromCloudinary).not.toHaveBeenCalled();
    });
  });

  /* ---------------------------- ownership -------------------------- */
  describe("ownership and roles", () => {
    it("lets the author edit their own post", async () => {
      asUser(owner);

      expect((await update()).status).toBe(200);
    });

    it("lets an ADMIN edit anyone's post", async () => {
      asUser(admin);

      const res = await update();

      expect(res.status).toBe(200);
      expect(updateBlogById).toHaveBeenCalledTimes(1);
    });

    // BUG: the check is `!user.role !== ROLES.ADMIN && blog.authorId !== user.id`.
    // `!user.role !== ROLES.ADMIN` is always true, so ADMIN gets no bypass, and
    // `blog` is read before it is fetched. It should be (after the fetch):
    //   if (user.role !== ROLES.ADMIN && blog.authorId !== user.id) ...
    it("returns 403 when a PUBLISHER edits someone else's post", async () => {
      asUser(otherPublisher);

      const res = await update();

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/only edit your own posts/i);
      expect(updateBlogById).not.toHaveBeenCalled();
    });

    it("does not upload an image or touch Cloudinary when the user may not edit the post", async () => {
      asUser(otherPublisher);

      const res = await updateWithFile();

      expect(res.status).toBe(403);
      expect(uploadOnCloudinary).not.toHaveBeenCalled();
      expect(deleteFromCloudinary).not.toHaveBeenCalled();
    });

    it("returns 404 (not 403) for a missing post, so ids can't be probed by non-owners", async () => {
      asUser(otherPublisher);
      getBlogById.mockResolvedValue(null);

      const res = await update();

      expect(res.status).toBe(404);
    });
  });

 /* ---------------------------- not found / id --------------------- */
  describe("blog id and lookup", () => {
    it.each([null, undefined])("returns 404 when the blog does not exist (%s)", async (value) => {
      getBlogById.mockResolvedValue(value);

      const res = await update();

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/blog not found/i);
      expect(updateBlogById).not.toHaveBeenCalled();
      expect(uploadOnCloudinary).not.toHaveBeenCalled();
    });

    it.each(["abc", "0", "-5", "1.5", "5abc"])("returns 400 for invalid id %j, without any DB lookup", async (id) => {
      const res = await update(id);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/invalid blog id/i);
      expect(getBlogById).not.toHaveBeenCalled();
    });

    it("returns 404 when the id segment is missing", async () => {
      const res = await request(app).put("/api/v1/posts/update-post/").send({ title: "New title" });

      expect(res.status).toBe(404);
      expect(getBlogById).not.toHaveBeenCalled();
    });

    // BUG: a database failure is reported as 404 "Blog not found." It should
    // be a 500, otherwise an outage looks like deleted data.
    it("returns 500 (not 404) when the lookup itself throws", async () => {
      getBlogById.mockRejectedValue(new Error("connection lost"));

      const res = await update();
      expect(res.status).toBe(500);
      expect(updateBlogById).not.toHaveBeenCalled();
    });
  });

  /* ---------------------------- category --------------------------- */
  describe("category", () => {

    // BUG: unlike create, update never checks that the category exists.
    it("returns 404 and updates nothing when the new category does not exist", async () => {
      getCategory.mockResolvedValue(null);

      const res = await update(5, { categoryId: 9999 });

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/category not found/i);
      expect(updateBlogById).not.toHaveBeenCalled();
    });

    it.each([
      ["not a number", "abc"],
      ["zero", 0],
      ["negative", -3],
      ["a decimal", 1.5],
    ])("rejects a category that is %s with 400", async (_label, category) => {
      const res = await update(5, { category });

      expect(res.status).toBe(400);
      expect(getBlogById).not.toHaveBeenCalled();
    });
  });

 /* ----------------------------- status ---------------------------- */
  describe("status and publishedAt", () => {
    it("publishes a draft and stamps publishedAt", async () => {
      const res = await update(5, { status: "published" });

      expect(res.status).toBe(200);
      expect(dataArg().status).toMatch(/^published$/i);
      expect(dataArg().published_at).toBeInstanceOf(Date);
    });
    
    it("does not overwrite publishedAt of a post that was already published", async () => {
      getBlogById.mockResolvedValue({ ...EXISTING, status: "published", published_at: new Date("2026-01-01") });

      await update(5, { status: "published" });

      expect(dataArg()).not.toHaveProperty("publishedAt");
    });

    it("moves a post back to draft without touching publishedAt", async () => {
      getBlogById.mockResolvedValue({ ...EXISTING, status: "published", publishedAt: new Date("2026-01-01") });

      const res = await update(5, { status: "draft" });

      expect(res.status).toBe(200);
      expect(dataArg().status).toMatch(/^draft$/i);
      expect(dataArg()).not.toHaveProperty("publishedAt");
    });

    it.each(["archived", "PUBLISHED_NOW", "", 1])("rejects status %j with 400", async (status) => {
      const res = await update(5, { status });

      expect(res.status).toBe(400);
      expect(updateBlogById).not.toHaveBeenCalled();
    });
  });

  /* --------------------------- cover image ------------------------- */
  describe("replacing the cover image", () => {
    it("uploads the new image once, passing the local file PATH", async () => {
      const rest = await updateWithFile();

      expect(uploadOnCloudinary).toHaveBeenCalledTimes(1);
      expect(uploadOnCloudinary.mock.calls[0][0]).toEqual(IMAGE_BUFFER);
    });

    it("saves the new image URL and public id", async () => {
      await updateWithFile();

      expect(dataArg().cover_url).toBe(NEW_IMAGE.secure_url);
      expect(dataArg().public_id).toBe(NEW_IMAGE.public_id);
    });

    it("falls back to `url` when Cloudinary returns no secure_url", async () => {
      uploadOnCloudinary.mockResolvedValue({ url: NEW_IMAGE.url, public_id: NEW_IMAGE.public_id });

      await updateWithFile();

      expect(dataArg().cover_url).toBe(NEW_IMAGE.url);
    });

    it("deletes the OLD image after a successful update, and only the old one", async () => {
      const res = await updateWithFile();

      expect(res.status).toBe(200);
      expect(deleteFromCloudinary).toHaveBeenCalledTimes(1);
      expect(deleteFromCloudinary).toHaveBeenCalledWith(EXISTING.public_id);
    });

    it("deletes the old image only AFTER the database update succeeded", async () => {
      await updateWithFile();

      const dbOrder = updateBlogById.mock.invocationCallOrder[0];
      const deleteOrder = deleteFromCloudinary.mock.invocationCallOrder[0];
      expect(dbOrder).toBeLessThan(deleteOrder);
    });

    it("does not try to delete anything when the post had no cover before", async () => {
      getBlogById.mockResolvedValue({ ...EXISTING, cover_url: null, public_id: null });

      const res = await updateWithFile();

      expect(res.status).toBe(200);
      expect(deleteFromCloudinary).not.toHaveBeenCalled();
    });

    it("still returns 200 when deleting the old image fails (and logs it)", async () => {
      deleteFromCloudinary.mockRejectedValue(new Error("cloudinary down"));

      const res = await updateWithFile();

      expect(res.status).toBe(200);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringMatching(/could not delete old cover image/i),
        EXISTING.public_id,
        expect.any(Error)
      );
    });

    it("allows changing ONLY the cover image (no text fields)", async () => {
      const res = await updateWithFile(5, {});

      expect(res.status).toBe(200);
      expect(uploadOnCloudinary).toHaveBeenCalledTimes(1);
      expect(dataArg().public_id).toBe(NEW_IMAGE.public_id);
    });

    it("returns 502 and saves nothing when the upload fails", async () => {
      uploadOnCloudinary.mockRejectedValue(new Error("cloudinary 500"));

      const res = await updateWithFile();

      expect(res.status).toBe(502);
      expect(res.body.message).toMatch(/failed to upload cover image/i);
      expect(updateBlogById).not.toHaveBeenCalled();
      expect(deleteFromCloudinary).not.toHaveBeenCalled();
    });
  });

  describe("removing the cover image", () => {
    it("clears cover_url and public_id and deletes the old image", async () => {
      const res = await update(5, { removeCover: true });

      expect(res.status).toBe(200);
      expect(dataArg().cover_url).toBeNull();
      expect(dataArg().public_id).toBeNull();
      expect(uploadOnCloudinary).not.toHaveBeenCalled();
      expect(deleteFromCloudinary).toHaveBeenCalledWith(EXISTING.public_id);
    });

    it("accepts the form-data string 'true'", async () => {
      const res = await updateWithFile(5, { removeCover: "true" });

      // a file is attached too, so the NEW image wins (see next test)
      expect(res.status).toBe(200);
    });

    it("does NOT remove the cover when remove_cover is 'false'", async () => {
      const res = await update(5, { title: "New title", remove_cover: "false" });

      expect(res.status).toBe(200);
      expect(dataArg()).not.toHaveProperty("cover_url");
      expect(deleteFromCloudinary).not.toHaveBeenCalled();
    });

    it("prefers the new image when a file AND remove_cover are both sent", async () => {
      await updateWithFile(5, { remove_cover: true });

      expect(dataArg().public_id).toBe(NEW_IMAGE.public_id);
      expect(deleteFromCloudinary).toHaveBeenCalledTimes(1);
      expect(deleteFromCloudinary).toHaveBeenCalledWith(EXISTING.public_id);
    });
  });

  describe("rollback when the database update fails", () => {
    beforeEach(() => {
      updateBlogById.mockRejectedValue(new Error("deadlock"));
    });

    it("returns 500 'Failed to update the blog post.'", async () => {
      const res = await update();

      expect(res.status).toBe(500);
      expect(res.body.message).toMatch(/failed to update the blog post/i);
    });

    it("deletes the NEW image (it is now an orphan) and keeps the OLD one", async () => {
      await updateWithFile();

      expect(deleteFromCloudinary).toHaveBeenCalledTimes(1);
      expect(deleteFromCloudinary).toHaveBeenCalledWith(NEW_IMAGE.public_id);
      expect(deleteFromCloudinary).not.toHaveBeenCalledWith(EXISTING.public_id);
    });

    it("keeps the old image when a cover REMOVAL fails to save", async () => {
      await update(5, { remove_cover: true });

      expect(deleteFromCloudinary).not.toHaveBeenCalled();
    });

    it("does not call Cloudinary at all when no image was involved", async () => {
      await update();

      expect(deleteFromCloudinary).not.toHaveBeenCalled();
    });

    it("still returns the original 500 when deleting the orphan also fails", async () => {
      deleteFromCloudinary.mockRejectedValue(new Error("cloudinary down"));

      const res = await updateWithFile();

      expect(res.status).toBe(500);
      expect(res.body.message).toMatch(/failed to update the blog post/i);
    });
  });

  /* ----------------------- schema validation ----------------------- */
  describe("schema validation (updatePostSchema)", () => {
    it.each([
      ["title too short (2 chars)", { title: "ab" }],
      ["title whitespace only", { title: "      " }],
      ["title longer than 500 chars", { title: "t".repeat(501) }],
      ["title is a number", { title: 12345 }],
      ["title is an object", { title: { $ne: "" } }],
      ["excerpt longer than 500 chars", { excerpt: "x".repeat(501) }],
      ["content has no text", { content: EMPTY_CONTENT }],
      ["content is not valid JSON", { content: "not json {{{" }],
      ["content is a plain number", { content: 42 }],
      ["removeCover is not a boolean", { removeCover: "maybe" }],
    ])("rejects %s with 400 before any DB or Cloudinary call", async (_label, body) => {
      const res = await update(5, body);

      expect(res.status).toBe(400);
      expect(getBlogById).not.toHaveBeenCalled();
      expect(updateBlogById).not.toHaveBeenCalled();
      expect(uploadOnCloudinary).not.toHaveBeenCalled();
    });

    // it("rejects an empty body ('Provide at least one field to update')", async () => {
    //   const res = await update(5, {});

    //   expect(res.status).toBe(400);
    //   expect(res.body.message).toMatch(/at least one field/i);
    //   expect(getBlogById).not.toHaveBeenCalled();
    // });

    it("does not upload the image when validation fails", async () => {
      const res = await updateWithFile(5, { title: "ab" });

      expect(res.status).toBe(400);
      expect(uploadOnCloudinary).not.toHaveBeenCalled();
    });
  });

  /* ------------------- authentication and authorization ------------ */
  describe("authentication and roles", () => {
    it("returns 401 when verifyJWT rejects, and touches nothing", async () => {
      rejectsAs401();

      const res = await update();
      console.log(res.body)
      expect(res.status).toBe(401);
      expect(getBlogById).not.toHaveBeenCalled();
      expect(updateBlogById).not.toHaveBeenCalled();
      expect(uploadOnCloudinary).not.toHaveBeenCalled();
    });

    it.each([ROLES.PUBLISHER, ROLES.ADMIN])("allows the %s role", async (role) => {
      asUser({ ...owner, role });

      expect((await update()).status).toBe(200);
    });

    it.each([ROLES.READER, "guest", undefined])("returns 403 for role %s", async (role) => {
      asUser({ ...owner, role });

      const res = await update();

      expect(res.status).toBe(403);
      expect(getBlogById).not.toHaveBeenCalled();
      expect(updateBlogById).not.toHaveBeenCalled();
    });

    it("checks the role BEFORE validating or processing the file", async () => {
      asUser({ ...owner, role: ROLES.READER });

      const res = await updateWithFile(5, { title: "ab" }); // also invalid

      expect(res.status).toBe(403);
      expect(uploadOnCloudinary).not.toHaveBeenCalled();
    });
  });

  /* ---------------------------- server errors ---------------------- */
  describe("server errors", () => {
    it("does not leak database details to the client", async () => {
      updateBlogById.mockRejectedValue(new Error("ER_PARSE_ERROR near 'UPDATE blogs SET title'"));

      const res = await update();
      console.log(res.body)
      expect(res.status).toBe(500);
      expect(res.body).toEqual({
        success: false,
        statusCode: 500,
        message: "Failed to update the blog post.",
      });
    });

    it("does not leak Cloudinary details to the client", async () => {
      uploadOnCloudinary.mockRejectedValue(new Error("Cloudinary api_key abc123 invalid for cloud 'my-cloud'"));

      const res = await updateWithFile();

      expect(JSON.stringify(res.body)).not.toMatch(/api_key|abc123|my-cloud/i);
    });

    it("returns 500 even when something other than an Error is thrown", async () => {
      updateBlogById.mockRejectedValue("boom");

      const res = await update();

      expect(res.status).toBe(500);
    });
  });

  /* ------------------------------ routing -------------------------- */
  describe("routing", () => {
    it.each(["get", "post", "patch", "delete"])("does not answer %s on the same URL (404)", async (method) => {
      const res = await request(app)[method](url(5));

      expect(res.status).toBe(404);
      expect(getBlogById).not.toHaveBeenCalled();
      expect(updateBlogById).not.toHaveBeenCalled();
    });
  });
});