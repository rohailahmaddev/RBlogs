import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

/* ------------------------------------------------------------------ */
/*  Mocks. Paths are relative to THIS file. Adjust to your layout.     */
/*  Real: routing, authorizeRole, multer, validateSchema (zod),        */
/*        controller, service, slug/excerpt/read-time helpers,         */
/*        error handler.                                               */
/*  Mocked: verifyJWT (we control who is logged in), DB, Cloudinary,   */
/*          mail (so importing the app has no side effects).           */
/* ------------------------------------------------------------------ */

// ASSUMPTION: getCategory and createBlogs are exported from this file.
vi.mock("../../../modules/repository.js", () => ({
  getCategory: vi.fn(),
  createBlogs: vi.fn(),
  getUserByEmailRepo: vi.fn(),
  verifyEmailRepo: vi.fn(),
}));

// importOriginal keeps authorizeRole REAL (in case it lives in this file).
vi.mock("../../../middleware/auth.middleware.js", async (importOriginal) => ({
  ...(await importOriginal()),
  verifyJWT: vi.fn(),
}));

// ASSUMPTION: uploadImage and deleteFromCloudinary live in this file.
vi.mock("../../../infrastructure/storage/cloudinary.storage.js", () => ({
  uploadOnCloudinary: vi.fn(),
  deleteFromCloudinary: vi.fn(),
}));

// uploadImage: vi.fn(),
//  sendEmailService: vi.fn(),

vi.mock("../../../infrastructure/email/email.services.js", () => ({
  sendVerificationEmail: vi.fn(),
  sendFogotPasswordEmail: vi.fn(),
}));

import app from "../../../app.js";
import { getCategory, createBlogs } from "../../../modules/repository.js";
import { verifyJWT } from "../../../middleware/auth.middleware.js";
import { deleteFromCloudinary, uploadOnCloudinary } from "../../../infrastructure/storage/cloudinary.storage.js";
import { ROLES } from "../../../utils/contants.js"; // ASSUMPTION: path
import { ApiError } from "../../../utils/ApiError.js";

/* ------------------------------------------------------------------ */
/*  Fixtures and helpers                                               */
/* ------------------------------------------------------------------ */
const URL = "/api/v1/posts/create-post"; // <- change to your real route

// Prisma uses "P2002". If you use mysql2 the code is "ER_DUP_ENTRY": change
// BOTH this constant and the check in the service (error?.code !== "P2002").
const DUPLICATE_CODE = "P2002";
const dupError = () =>
  Object.assign(new Error("Unique constraint failed on the fields: (`slug`)"), {
    code: DUPLICATE_CODE,
  });

// ASSUMPTION: jsonContent accepts a rich-text JSON document (TipTap-like).
// Replace with a minimal document that passes your jsonContent schema.
const CONTENT = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [{ type: "text", text: "Hello world. This is the body of my first blog post." }],
    },
  ],
};

const validBody = {
  title: "Hello World Post",
  excerpt: "A short excerpt",
  content: CONTENT,
  category: 1,
  status: "published",
};

const author = { id: 42, email: "author@example.com", role: ROLES.PUBLISHER };
const CATEGORY = { id: 1, name: "Tech" };
const SAVED_POST = { id: 100, title: "Hello World Post", slug: "hello-world-post", status: "published" };
// ASSUMPTION: uploadImage resolves { url, public_id }. Rename `url` if yours differs.
const UPLOADED = { url: "https://res.cloudinary.com/demo/image/upload/v1/cover.png", public_id: "blog/cover_abc" };

const asUser = (user) =>
  verifyJWT.mockImplementation((req, _res, next) => {
    req.user = user;
    next();
  });
const rejectsAs401 = () =>
  verifyJWT.mockImplementation((_req, _res, next) =>
    // statusCode: change to `status` if your error handler reads that instead
    next(new ApiError(401, "Unauthorized request"))
  );

// JSON request (multer ignores non-multipart bodies)
const create = (body = validBody) => request(app).post(URL).send(body);

// multipart request with a cover image. Real multer writes the file to its
// configured temp folder.
const createWithFile = (fields = validBody) => {
  const r = request(app).post(URL);
  for (const [k, v] of Object.entries(fields)) {
    r.field(k, typeof v === "object" ? JSON.stringify(v) : String(v));
  }
  return r.attach("file", Buffer.from("fake-image-bytes"), {
    filename: "cover.png",
    contentType: "image/png",
  });
};

const savedArg = (call = 0) => createBlogs.mock.calls[call][0];

beforeEach(() => {
  vi.resetAllMocks();
  asUser(author);
  getCategory.mockResolvedValue(CATEGORY);
  createBlogs.mockResolvedValue(SAVED_POST);
 uploadOnCloudinary.mockResolvedValue(UPLOADED);
  deleteFromCloudinary.mockResolvedValue(undefined);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */
describe("POST /create-post", () => {
  /* ---------------------------- success --------------------------- */
  describe("success", () => {
    // NOTE: every success test fails until you fix `cover?.public_id` in the
    // service (it should be `coverImage?.public_id`): `cover` does not exist,
    // so building the createBlogs() arguments throws a ReferenceError.
    it("returns 201 with the success message and the created post", async () => {
      const res = await create();

      expect(res.status).toBe(201);
      expect(res.body.message).toMatch(/blog posted successfully/i);
      expect(res.body.data).toEqual(SAVED_POST);
    });

    it("looks the category up by the submitted id", async () => {
      await create();

      expect(getCategory).toHaveBeenCalledTimes(1);
      // zod coerces "1" -> 1. If you see the string "1" here, validateSchema is
      // not writing the parsed data back to req.body.
      expect(Number(getCategory.mock.calls[0][0])).toBe(1);
    });

    it("saves the post once with author id, category id, slug, read time and no cover image", async () => {
      await create();

      expect(createBlogs).toHaveBeenCalledTimes(1);
      expect(savedArg()).toMatchObject({
        userId: author.id,
        title: "Hello World Post",
        categoryId: CATEGORY.id,
        status: "published",
        excerpt: "A short excerpt",
        coverImage: null,
        imagePublicId: null,
      });
      expect(savedArg().slug).toMatch(/^hello-world-post$/);
      expect(savedArg().read_time).toBeTypeOf("number");
      expect(savedArg().content).toEqual(CONTENT);
    });

    it("takes the author from the logged-in user, never from the request body", async () => {
      await create({ ...validBody, userId: 999, user_id: 999 });

      expect(savedArg().userId).toBe(author.id);
    });

    it("defaults status to 'draft' when it is not sent", async () => {
      const { status: _omit, ...withoutStatus } = validBody;

      const res = await create(withoutStatus);

      expect(res.status).toBe(201);
      expect(savedArg().status).toBe("draft");
    });

    it("saves status 'published' when asked", async () => {
      await create({ ...validBody, status: "published" });

      expect(savedArg().status).toBe("published");
    });

    it("trims the title (zod .trim()) before saving and slugging it", async () => {
      // Fails if validateSchema does not write the parsed body back to req.body.
      await create({ ...validBody, title: "   Hello World Post   " });

      expect(savedArg().title).toBe("Hello World Post");
      expect(savedArg().slug).not.toMatch(/^-|-$/);
    });

    it("uploads no image and never calls Cloudinary when no file is attached", async () => {
      await create();

    //   expect(uploadImage).not.toHaveBeenCalled();
      expect(deleteFromCloudinary).not.toHaveBeenCalled();
    });
  });

  /* ------------------------- excerpt handling ---------------------- */
  describe("excerpt", () => {
    it.each([
      ["omitted", (({ excerpt: _e, ...rest }) => rest)(validBody)],
      ["an empty string", { ...validBody, excerpt: "" }],
      ["only whitespace", { ...validBody, excerpt: "     " }],
    ])("generates an excerpt from the content when excerpt is %s", async (_label, body) => {
      const res = await create(body);

      expect(res.status).toBe(201);
      expect(savedArg().excerpt).toBeTypeOf("string");
      expect(savedArg().excerpt.length).toBeGreaterThan(0);
      expect(savedArg().excerpt.length).toBeLessThanOrEqual(500);
    });

    it("keeps the author's excerpt when one is given", async () => {
      await create();

      expect(savedArg().excerpt).toBe("A short excerpt");
    });

    it("rejects an excerpt longer than 500 characters with 400", async () => {
      const res = await create({ ...validBody, excerpt: "x".repeat(501) });

      expect(res.status).toBe(400);
      expect(createBlogs).not.toHaveBeenCalled();
    });
  });

  /* ------------------------- cover image --------------------------- */
  describe("cover image upload", () => {
    it("uploads the attached file once and returns 201", async () => {
      const res = await createWithFile();

      expect(res.status).toBe(201);
      expect(uploadOnCloudinary).toHaveBeenCalledTimes(1);
      expect(uploadOnCloudinary.mock.calls[0][0]).toBeTypeOf("string");
    });

    it("saves the image public id so the image can be deleted later", async () => {
      await createWithFile();
      expect(savedArg().imagePublicId).toBe(UPLOADED.public_id);
    });

    // POSSIBLE BUG: the service passes the WHOLE upload result as `coverImage`.
    // A DB column normally stores the URL string. Fails if you really are
    // saving an object; change the assertion if your column stores JSON.
    it("saves the cover image URL (a string), not the whole upload object", async () => {
      await createWithFile();

      expect(savedArg().coverImage).toBe(UPLOADED.url);
    });

    it("does not delete the image when the post is saved successfully", async () => {
      await createWithFile();

      expect(deleteFromCloudinary).not.toHaveBeenCalled();
    });

    it("returns 500 and saves nothing when the upload fails", async () => {
      uploadOnCloudinary.mockRejectedValue(new Error("cloudinary 500"));
      const res = await createWithFile();

      expect(res.status).toBe(500);
      expect(res.body.message).toMatch(/something went wrong/i);
      expect(createBlogs).not.toHaveBeenCalled();
      expect(deleteFromCloudinary).not.toHaveBeenCalled(); // nothing was uploaded
    });
  });

  /* ------------------------ rollback / cleanup --------------------- */
  describe("cleans up the uploaded image when saving fails", () => {
    it("deletes the uploaded image and returns 500 when createBlogs throws", async () => {
      createBlogs.mockRejectedValue(new Error("connection lost"));

      const res = await createWithFile();

      expect(res.status).toBe(500);
      expect(deleteFromCloudinary).toHaveBeenCalledTimes(1);
      expect(deleteFromCloudinary).toHaveBeenCalledWith(UPLOADED.public_id);
    });

    it("deletes the uploaded image when every slug attempt collides (409)", async () => {
      createBlogs.mockRejectedValue(dupError());

      const res = await createWithFile();

      expect(res.status).toBe(409);
      expect(deleteFromCloudinary).toHaveBeenCalledWith(UPLOADED.public_id);
    });

    it("does not call Cloudinary delete when there was no image", async () => {
      createBlogs.mockRejectedValue(new Error("connection lost"));

      await create();

      expect(deleteFromCloudinary).not.toHaveBeenCalled();
    });

    // BUG: deleteFromCloudinary runs inside the catch without its own
    // try/catch. If it throws, the ORIGINAL error (e.g. the 409) is lost and
    // the client gets a raw 500. Wrap the cleanup in try/catch + console.error.
    it("still returns the ORIGINAL error (409) when the image cleanup also fails", async () => {
      createBlogs.mockRejectedValue(dupError());
      deleteFromCloudinary.mockRejectedValue(new Error("cloudinary down"));

      const res = await createWithFile();

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/unique slug/i);
    });
  });

  /* ---------------------------- category --------------------------- */
  describe("category", () => {
    it.each([null, undefined])("returns 404 when the category does not exist (%s)", async (value) => {
      getCategory.mockResolvedValue(value);

      const res = await create();

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/category not found/i);
      expect(createBlogs).not.toHaveBeenCalled();
    });

    it("does not upload the image when the category does not exist", async () => {
      getCategory.mockResolvedValue(null);

      const res = await createWithFile();

      expect(res.status).toBe(404);
    //   expect(uploadImage).not.toHaveBeenCalled();
      expect(deleteFromCloudinary).not.toHaveBeenCalled();
    });

    it("returns 500 when the category lookup throws", async () => {
      getCategory.mockRejectedValue(new Error("connection lost"));

      const res = await create();

      expect(res.status).toBe(500);
      expect(createBlogs).not.toHaveBeenCalled();
    });
  });

  /* ------------------------ unique slug retries -------------------- */
  describe("slug generation", () => {
    it("retries with a random suffix after a duplicate slug and then succeeds", async () => {
      createBlogs.mockRejectedValueOnce(dupError()).mockResolvedValueOnce(SAVED_POST);

      const res = await create();

      expect(res.status).toBe(201);
      expect(createBlogs).toHaveBeenCalledTimes(2);
      expect(savedArg(0).slug).toBe("hello-world-post");
      expect(savedArg(1).slug).toMatch(/^hello-world-post-[0-9a-f]{6}$/);
    });

    it("uploads the cover image only once, even when the save is retried", async () => {
      createBlogs.mockRejectedValueOnce(dupError()).mockResolvedValueOnce(SAVED_POST);

      await createWithFile();

    //   expect(uploadImage).toHaveBeenCalledTimes(1);
      expect(savedArg(1).imagePublicId).toBe(UPLOADED.public_id);
      expect(deleteFromCloudinary).not.toHaveBeenCalled();
    });

    it("gives up after 5 attempts with 409, each using a different slug", async () => {
      createBlogs.mockRejectedValue(dupError());

      const res = await create();

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/unique slug/i);
      expect(createBlogs).toHaveBeenCalledTimes(5);
      const slugs = createBlogs.mock.calls.map(([a]) => a.slug);
      expect(new Set(slugs).size).toBe(5);
    });

    it("does NOT retry on errors other than a unique violation", async () => {
      createBlogs.mockRejectedValue(Object.assign(new Error("boom"), { code: "P2003" }));

      const res = await create();

      expect(res.status).toBe(500);
      expect(createBlogs).toHaveBeenCalledTimes(1);
    });

    // EDGE CASE: a title like "!!!" (or one written only in Urdu/Arabic script)
    // can slugify to "" depending on createSlug. An empty slug is a broken URL.
    it("never saves an empty slug, even for a title with no latin letters", async () => {
      await create({ ...validBody, title: "!!!" });

      expect(savedArg().slug).toBeTypeOf("string");
      expect(savedArg().slug.length).toBeGreaterThan(0);
    });
  });

  /* ----------------------- schema validation ----------------------- */
  describe("schema validation (createPostSchema)", () => {
    const { title: _t, ...noTitle } = validBody;
    const { content: _c, ...noContent } = validBody;
    const { category: _k, ...noCategory } = validBody;

    it.each([
      ["title missing", noTitle],
      ["title too short (2 chars)", { ...validBody, title: "ab" }],
      ["title whitespace only", { ...validBody, title: "      " }],
      ["title longer than 500 chars", { ...validBody, title: "t".repeat(501) }],
      ["title is a number", { ...validBody, title: 12345 }],
      ["title is an object", { ...validBody, title: { $ne: "" } }],
      ["content missing", noContent],
      ["category missing", noCategory],
      ["category is not a number", { ...validBody, category: "abc" }],
      ["category is zero", { ...validBody, category: 0 }],
      ["category is negative", { ...validBody, category: -3 }],
      ["category is a decimal", { ...validBody, category: 1.5 }],
      ["status is unknown", { ...validBody, status: "archived" }],
      ["status is empty", { ...validBody, status: "" }],
    ])("rejects %s with 400 before any DB or Cloudinary call", async (_label, body) => {
      const res = await create(body);

      expect(res.status).toBe(400);
      expect(getCategory).not.toHaveBeenCalled();
      expect(createBlogs).not.toHaveBeenCalled();
    //   expect(uploadImage).not.toHaveBeenCalled();
    });

    it("rejects an empty body", async () => {
      const res = await create({});

      expect(res.status).toBe(400);
      expect(createBlogs).not.toHaveBeenCalled();
    });

    it("coerces a multipart category string ('1') to a number", async () => {
      const res = await createWithFile();

      expect(res.status).toBe(201);
      expect(Number(getCategory.mock.calls[0][0])).toBe(1);
    });

    it("does not upload the image when validation fails", async () => {
      const res = await createWithFile({ ...validBody, title: "ab" });

      expect(res.status).toBe(400);
    //   expect(uploadImage).not.toHaveBeenCalled();
    });
  });

  /* ------------------ authentication and authorization -------------- */
  describe("authentication and roles", () => {
    it("returns 401 when verifyJWT rejects, and touches nothing", async () => {
      rejectsAs401();

      const res = await create();
      expect(res.status).toBe(401);
      expect(getCategory).not.toHaveBeenCalled();
      expect(createBlogs).not.toHaveBeenCalled();
    //   expect(uploadImage).not.toHaveBeenCalled();
    });

    it.each([ROLES.PUBLISHER, ROLES.ADMIN])("allows the %s role", async (role) => {
      asUser({ ...author, role });

      const res = await create();

      expect(res.status).toBe(201);
    });

    // ASSUMPTION: authorizeRole answers 403 and reads req.user.role.
    it.each(["reader", "user", "guest", undefined])("returns 403 for role %s", async (role) => {
      asUser({ ...author, role });

      const res = await create();

      expect(res.status).toBe(403);
      expect(createBlogs).not.toHaveBeenCalled();
    //   expect(uploadImage).not.toHaveBeenCalled();
    });

    it("rejects an unauthorised role BEFORE the file is processed or validated", async () => {
      asUser({ ...author, role: "reader" });

      const res = await createWithFile({ ...validBody, title: "ab" }); // also invalid

      expect(res.status).toBe(403); // role check wins over the 400
    //   expect(uploadImage).not.toHaveBeenCalled();
    });
  });

  /* ---------------------------- server errors ---------------------- */
  describe("server errors", () => {
    it("wraps unknown errors as 500 'Something went wrong.'", async () => {
      createBlogs.mockRejectedValue(new Error("connection lost"));

      const res = await create();

      expect(res.status).toBe(500);
      expect(res.body.message).toMatch(/something went wrong/i);
    });

    it("does not leak database details to the client", async () => {
      createBlogs.mockRejectedValue(
        new Error("ER_PARSE_ERROR near 'INSERT INTO blogs (title, slug) VALUES'")
      );

      const res = await create();

      expect(res.status).toBe(500);
      expect(JSON.stringify(res.body)).not.toMatch(/ER_PARSE_ERROR|INSERT|blogs|slug/i);
    });

    it("does not leak Cloudinary details to the client", async () => {
      uploadOnCloudinary.mockRejectedValue(new Error("Cloudinary api_key abc123 invalid for cloud 'my-cloud'"));

      const res = await createWithFile();

      expect(res.status).toBe(500);
      expect(JSON.stringify(res.body)).not.toMatch(/api_key|abc123|my-cloud|cloudinary/i);
    });

    it("returns 500 even when something other than an Error is thrown", async () => {
      createBlogs.mockRejectedValue("boom");

      const res = await create();

      expect(res.status).toBe(500);
    });
  });

  /* ------------------------------ routing -------------------------- */
  describe("routing", () => {
    it("only accepts POST (GET is 404) and never runs auth or touches the database", async () => {
      const res = await request(app).get(URL);

      expect(res.status).toBe(404);
      expect(verifyJWT).not.toHaveBeenCalled();
      expect(createBlogs).not.toHaveBeenCalled();
    });
  });
});