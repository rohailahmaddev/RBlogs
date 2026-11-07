import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// ASSUMPTION: getBlogs is exported from this file.
vi.mock("../../../modules/repository.js", () => ({
    getBlogs: vi.fn(),
    getBlogById: vi.fn(),
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
import { getBlogs } from "../../../modules/repository.js";
import { optionalAuth, verifyJWT } from "../../../middleware/auth.middleware.js";
import { ROLES } from "../../../utils/contants.js";

/* ------------------------------------------------------------------ */
/*  Fixtures and helpers                                               */
/* ------------------------------------------------------------------ */
const URL = "/api/v1/posts/get-posts"; // <- change to your real route
const get = (qs = "") => request(app).get(`${URL}${qs}`);

const admin = { id: 1, name: "Admin", email: "admin@example.com", role: ROLES.ADMIN };
const publisher = { id: 42, name: "Pub", email: "pub@example.com", role: ROLES.PUBLISHER };
const reader = { id: 9, name: "Reader", email: "reader@example.com", role: ROLES.READER };

const anonymous = () => optionalAuth.mockImplementation((_req, _res, next) => next());
const asUser = (user) => {
    optionalAuth.mockImplementation((req, _res, next) => {
        req.user = user;
        next();
    })
};

// A repository row (Prisma shape) that ALSO carries fields that must never
// reach the client: the card mapper has to strip them.
const dbRow = (i = 1) => ({
    id: i,
    title: `Post ${i}`,
    slug: `post-${i}`,
    excerpt: `Excerpt ${i}`,
    cover_url: `https://res.cloudinary.com/demo/image/upload/v1/${i}.png`,
    read_time: 3,
    status: "PUBLISHED",
    published_at: new Date("2026-01-01T00:00:00.000Z"),
    created_at: new Date("2025-12-31T00:00:00.000Z"),
    category: { id: 2, name: "Tech" },
    author: { id: 5, name: "Author", email: "author@secret.example", password: "$2b$10$neverReturned" },
    // never part of a card:
    content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "FULL BODY" }] }] },
    public_id: "secret/public_id",
});

const returns = (rows, total = rows.length) => getBlogs.mockResolvedValue({ rows, total });
const repoArg = (call = 0) => getBlogs.mock.calls[call][0];

beforeEach(() => {
    vi.resetAllMocks();
    anonymous();
    returns([dbRow(1), dbRow(2)], 2);
    vi.spyOn(console, "error").mockImplementation(() => { });
});

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */
describe("GET /get-posts", () => {
    /* ---------------------------- success --------------------------- */
    describe("success", () => {
        it("returns 200 with the message and a list of items", async () => {
            const res = await get();

            expect(res.status).toBe(200);
            expect(res.body.message).toMatch(/blogs fetched successfully/i);
            expect(res.body.data.items).toHaveLength(2);
        });

        it("runs optionalAuth first and needs no login", async () => {
            const res = await get();

            expect(res.status).toBe(200);
            expect(optionalAuth).toHaveBeenCalledTimes(1);
        });
        it("returns each post as a card with only the public fields", async () => {
            const res = await get();
            const [card] = res.body.data.items;

            expect(card).toMatchObject({
                id: 1,
                title: "Post 1",
                slug: "post-1",
                excerpt: "Excerpt 1",
                coverUrl: "https://res.cloudinary.com/demo/image/upload/v1/1.png",
                readTime: 3,
                publishedAt: "2026-01-01T00:00:00.000Z",
                createdAt: "2025-12-31T00:00:00.000Z",
                category: { id: 2, name: "Tech" },
                author: { id: 5, name: "Author" },
            });
            expect(card.status).toMatch(/^published$/i);
        });

        it("never returns the post body, Cloudinary public id, author email or password hash", async () => {
            const res = await get();
            const body = JSON.stringify(res.body);

            expect(body).not.toContain("FULL BODY");
            expect(body).not.toContain("secret/public_id");
            expect(body).not.toContain("author@secret.example");
            expect(body).not.toContain("neverReturned");
            expect(res.body.data.items[0]).not.toHaveProperty("content");
            expect(res.body.data.items[0]).not.toHaveProperty("publicId");
        });

        it("handles a post without a cover image or excerpt", async () => {
            returns([{
                ...dbRow(1), category: {
                    id: 2,
                    name: "Technology",
                }, cover_url: null, excerpt: null
            }]);

            const res = await get();
            console.log(res.body)
            expect(res.status).toBe(200);
            expect(res.body.data.items[0]).toMatchObject({ coverUrl: null, excerpt: "" });
        });

        it("returns an empty list (not an error) when nothing matches", async () => {
            returns([], 0);

            const res = await get("?search=nothing-matches-this");

            expect(res.status).toBe(200);
            expect(res.body.data.items).toEqual([]);
            expect(res.body.data.pagination).toMatchObject({
                totalCount: 0,
                totalPage: 0,
                hasNext: false,
                hasPrev: false,
            });
        });

        it.each([null, undefined, {}])("treats a malformed repository result (%j) as empty", async (value) => {
            getBlogs.mockResolvedValue(value);

            const res = await get();

            expect(res.status).toBe(200);
            expect(res.body.data.items).toEqual([]);
            expect(res.body.data.pagination.totalCount).toBe(0);
        });

        it("converts a string/bigint COUNT to a number", async () => {
            getBlogs.mockResolvedValue({ rows: [dbRow(1)], total: "23" });

            const res = await get();

            expect(res.body.data.pagination.totalCount).toBe(23);
            expect(res.body.data.pagination.totalPage).toBe(3);
        });

    });
    /* --------------------------- pagination -------------------------- */
    describe("pagination", () => {
        it("defaults to page 1, limit 10, offset 0", async () => {
            await get();

            expect(getBlogs).toHaveBeenCalledTimes(1);
            expect(repoArg()).toMatchObject({ pageNumber: 1, limit: 10, offset: 0 });
        });

        it("computes the offset: page 3, limit 20 -> offset 40 (numbers, not strings)", async () => {
            await get("?page=3&limit=20");

            expect(repoArg()).toMatchObject({ pageNumber: 3, limit: 20, offset: 40 });
            expect(typeof repoArg().limit).toBe("number");
        });

        it("accepts the maximum limit of 50", async () => {
            const res = await get("?limit=50&page=2");

            expect(res.status).toBe(200);
            expect(repoArg()).toMatchObject({ limit: 50, offset: 50 });
        });

        // BUG: the service puts the raw repository `rows` inside `pagination`.
        // That sends every row TWICE and, worse, the second copy skips toBlogCard(),
        // so whatever the repository selected (content, publicId, emails...) leaks.
        // Remove `rows` from the pagination object.
        it("returns EXACTLY the pagination fields (no raw rows hiding inside)", async () => {
            returns([dbRow(1), dbRow(2)], 25);

            const res = await get("?page=2&limit=10");

            expect(res.body.data.pagination).toEqual({
                totalCount: 25,
                totalPage: 3,
                currentPage: 2,
                limit: 10,
                hasNext: true,
                hasPrev: true,
            });
        });

        it("first page: hasPrev false, hasNext true", async () => {
            returns([dbRow(1)], 25);

            const { body } = await get("?page=1&limit=10");

            expect(body.data.pagination).toMatchObject({ currentPage: 1, hasPrev: false, hasNext: true });
        });

        it("last page: hasNext false, hasPrev true", async () => {
            returns([dbRow(1)], 25);

            const { body } = await get("?page=3&limit=10");

            expect(body.data.pagination).toMatchObject({ currentPage: 3, hasNext: false, hasPrev: true });
        });

        it("a total that divides evenly does not add an empty page (20 / 10 = 2)", async () => {
            returns([dbRow(1)], 20);

            const { body } = await get("?limit=10");

            expect(body.data.pagination.totalPage).toBe(2);
        });

        it("a page past the end returns 200 with no items and hasNext false", async () => {
            returns([], 25);

            const res = await get("?page=99&limit=10");

            expect(res.status).toBe(200);
            expect(res.body.data.items).toEqual([]);
            expect(res.body.data.pagination).toMatchObject({ currentPage: 99, totalPage: 3, hasNext: false });
        });
    });
    /* ----------------------------- filters --------------------------- */
    // ASSUMPTION: resolveFilterOptions hands the repository { categoryId,
    // authorId, status, search }. Rename the keys below if yours differ.
    describe("filters", () => {
        it("passes category and search to the repository as a number and a trimmed string", async () => {
            const res = await get("?category=2&search=%20%20node%20%20");
            expect(repoArg()).toMatchObject({ categoryId: 2, search: "node" });
        });

        it("applies no category or search filter when none is sent", async () => {
            await get();

            expect(repoArg().categoryId).toBeUndefined();
            expect(repoArg().search).toBeUndefined();
        });

        it("keeps special characters in search as plain text (the repository escapes them)", async () => {
            await get(`?search=${encodeURIComponent("100% 'quoted' _x_; DROP TABLE blogs")}`);

            expect(repoArg().search).toBe("100% 'quoted' _x_; DROP TABLE blogs");
        });

        // If you make the schema .strict(), this becomes a 400; flip the test then.
        it("ignores unknown parameters such as `authorId` (the parameter is `author`)", async () => {
            const res = await get("?authorId=5&foo=bar");

            expect(res.status).toBe(200);
            expect(repoArg().authorId).toBeUndefined();
        });

        it("operator-style query keys can never widen access (400, or ignored and still published-only)", async () => {
            const res = await get("?status[$ne]=published&status[$ne]=");

            expect([200, 400]).toContain(res.status);
            for (const [arg] of getBlogs.mock.calls) {
                expect(String(arg.status)).toMatch(/^published$/i);
            }
        });
    });
    /* --------------------- who sees what (visibility) ----------------- */
    // ASSUMPTION: resolveFilterOptions keeps the rules from the first version:
    //   admin: any filter | everyone else: published only |
    // status=draft: publisher -> own drafts, anonymous 401, reader 403.
    describe("visibility", () => {
        describe("anonymous", () => {
            it("sees published posts only", async () => {
                await get();

                expect(String(repoArg().status)).toMatch(/^published$/i);
            });

            it("can filter published posts by author (author pages)", async () => {
                await get("?author=5");

                expect(repoArg()).toMatchObject({ authorId: 5 });
                expect(String(repoArg().status)).toMatch(/^published$/i);
            });

            it("explicit status=published is fine", async () => {
                const res = await get("?status=published");

                expect(res.status).toBe(200);
                expect(String(repoArg().status)).toMatch(/^published$/i);
            });

            it("gets 401 for status=draft, with no database call", async () => {
                const res = await get("?status=draft");

                expect(res.status).toBe(401);
                expect(res.body.message).toMatch(/login/i);
                expect(getBlogs).not.toHaveBeenCalled();
            });
        });

        describe("reader", () => {
            beforeEach(() => asUser(reader));

            it("sees published posts only", async () => {
                const res = await get();
                console.log(res.body);
                expect(String(repoArg().status)).toMatch(/^published$/i);
            });

            it("gets 403 for status=draft, with no database call", async () => {
                const res = await get("?status=draft");

                expect(res.status).toBe(403);
                expect(getBlogs).not.toHaveBeenCalled();
            });
        });

        describe("publisher", () => {
            beforeEach(() => asUser(publisher));

            it("without a status filter sees the public (published) list, not other people's drafts", async () => {
                await get();

                expect(String(repoArg().status)).toMatch(/^published$/i);
                expect(repoArg().authorId).toBeUndefined();
            });

            it("status=draft returns ONLY their own drafts (author forced from the login, not the URL)", async () => {
                await get("?status=draft");

                expect(String(repoArg().status)).toMatch(/^draft$/i);
                expect(repoArg().authorId).toBe(publisher.id);
            });

            it("status=draft&author=<own id> is allowed", async () => {
                const res = await get(`?status=draft&author=${publisher.id}`);

                expect(res.status).toBe(200);
                expect(repoArg().authorId).toBe(publisher.id);
            });

            it("status=draft&author=<someone else> is 403, with no database call", async () => {
                const res = await get("?status=draft&author=5");

                expect(res.status).toBe(403);
                expect(res.body.message).toMatch(/Forbidden. You can only view your own draft posts/i);
                expect(getBlogs).not.toHaveBeenCalled();
            });

            it("can still browse another author's PUBLISHED posts", async () => {
                const res = await get("?author=5&status=published");

                expect(res.status).toBe(200);
                expect(repoArg().authorId).toBe(5);
                expect(String(repoArg().status)).toMatch(/^published$/i);
            });
        });

        describe("admin", () => {
            beforeEach(() => asUser(admin));

            it("without a status filter sees every status", async () => {
                await get();

                expect(repoArg().status).toBeUndefined();
            });

            it("status=draft without an author sees drafts of everyone", async () => {
                await get("?status=draft");

                expect(String(repoArg().status)).toMatch(/^draft$/i);
                expect(repoArg().authorId).toBeUndefined();
            });

            it("status=draft&author=9 sees that author's drafts", async () => {
                await get("?status=draft&author=9");

                expect(repoArg()).toMatchObject({ authorId: 9 });
                expect(String(repoArg().status)).toMatch(/^draft$/i);
            });
        });
    });
    /* ----------------------- query validation ------------------------ */
    describe("query validation (listPostsQuerySchema)", () => {
        it.each([
            ["page is 0", "?page=0"],
            ["page is negative", "?page=-1"],
            ["page is not a number", "?page=abc"],
            ["page is a decimal", "?page=1.5"],
            ["page is repeated (array)", "?page=1&page=2"],
            ["limit is 0", "?limit=0"],
            ["limit is above 50", "?limit=51"],
            ["limit is not a number", "?limit=abc"],
            ["limit is a decimal", "?limit=2.5"],
            ["category is 0", "?category=0"],
            ["category is not a number", "?category=abc"],
            ["category is negative", "?category=-2"],
            ["author is 0", "?author=0"],
            ["author is not a number", "?author=abc"],
            ["status is unknown", "?status=archived"],
            ["status is empty", "?status="],
            ["search is empty", "?search="],
            ["search is only spaces", "?search=%20%20%20"],
            ["search is longer than 100 chars", `?search=${"x".repeat(101)}`],
        ])("rejects when %s with 400 and no database call", async (_label, qs) => {
            const res = await get(qs);

            expect(res.status).toBe(400);
            expect(res.body.message).toBeTypeOf("string");
            expect(res.body.message.length).toBeGreaterThan(0);
            expect(getBlogs).not.toHaveBeenCalled();
        });

        it("reports every problem at once, joined with ', '", async () => {
            const res = await get("?page=0&limit=0");

            expect(res.status).toBe(400);
            expect(res.body.message).toContain(", ");
        });

        it("validates before checking visibility (a bad query is 400, not 401)", async () => {
            const res = await get("?status=draft&page=0");

            expect(res.status).toBe(400);
        });
    });
    /* ---------------------------- server errors ---------------------- */
    describe("server errors", () => {
        it("returns 500 'Something went wrong.' when the repository throws", async () => {
            getBlogs.mockRejectedValue(new Error("connection lost"));

            const res = await get();

            expect(res.status).toBe(500);
            expect(res.body.message).toMatch(/something went wrong/i);
        });

        it("does not leak database details to the client", async () => {
            getBlogs.mockRejectedValue(
                new Error("PrismaClientKnownRequestError: Invalid `prisma.blog.findMany()` SELECT * FROM blogs")
            );

            const res = await get();

            expect(res.status).toBe(500);
            expect(JSON.stringify(res.body)).not.toMatch(/prisma|findMany|SELECT|blogs/i);
        });

        it("returns 500 even when something other than an Error is thrown", async () => {
            getBlogs.mockRejectedValue("boom");

            const res = await get();

            expect(res.status).toBe(500);
        });

        it("returns 500 (and queries nothing) when optionalAuth itself fails, e.g. the user lookup is down", async () => {
            optionalAuth.mockImplementation((_req, _res, next) => next(new Error("db down")));

            const res = await get();

            expect(res.status).toBe(500);
            expect(getBlogs).not.toHaveBeenCalled();
        });
    });
    /* ------------------------------ routing -------------------------- */
    describe("routing", () => {
        it.each(["post", "put", "patch", "delete"])("does not answer %s on the same URL (404)", async (method) => {
            const res = await request(app)[method](URL);

            expect(res.status).toBe(404);
            expect(getBlogs).not.toHaveBeenCalled();
        });

        it("returns 404 for an extra path segment", async () => {
            const res = await request(app).get(`${URL}/123`);

            expect(res.status).toBe(404);
            expect(getBlogs).not.toHaveBeenCalled();
        });
    });
});