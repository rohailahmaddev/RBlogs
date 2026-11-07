import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";


// ASSUMPTION: getBlogById and deleteBlogPost are exported from this file.
vi.mock("../../../modules/repository.js", () => ({
    getBlogById: vi.fn(),
    deleteBlogPost: vi.fn(),
    getBlogs: vi.fn(),
    updateBlogPost: vi.fn(),
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
    deleteFromCloudinary: vi.fn(),
}));
vi.mock("../../../infrastructure/email/email.services.js", () => ({
    sendEmailService: vi.fn(),
    sendVerificationEmail: vi.fn(),
    sendFogotPasswordEmail: vi.fn(),
}));

import app from "../../../app.js";
import { getBlogById, deleteBlogPost } from "../../../modules/repository.js";
import { verifyJWT } from "../../../middleware/auth.middleware.js";
import { deleteFromCloudinary } from "../../../infrastructure/storage/cloudinary.storage.js";
import { ROLES } from "../../../utils/contants.js";
import { ApiError } from "../../../utils/ApiError.js";

/* ------------------------------------------------------------------ */
/*  Fixtures and helpers                                               */
/* ------------------------------------------------------------------ */
const url = (id = 5) => `/api/v1/posts/delete-post/${id}`; // <- change to your real route
const remove = (id = 5) => request(app).delete(url(id));

// The blog as the repository returns it. NOTE the field names: this service
// reads blog.author_id and blog.image_public_id, but your update service reads
// blog.authorId and blog.public_id, and create saves `imagePublicId`.
// Pick ONE spelling for the whole project (see the review notes).
const EXISTING = {
    id: 5,
    author_id: 42,
    title: "My post",
    public_id: "blog/cover_abc",
};

const owner = { id: 42, email: "owner@example.com", role: ROLES.PUBLISHER };
const otherPublisher = { id: 77, email: "other@example.com", role: ROLES.PUBLISHER };
const reader = { id: 9, email: "reader@example.com", role: ROLES.READER };
const admin = { id: 1, email: "admin@example.com", role: ROLES.ADMIN };

const asUser = (user) => {
    verifyJWT.mockImplementation((req, _res, next) => {
        req.user = user;
        next();
    })
};
const rejectsAs401 = () => {
    verifyJWT.mockImplementation((_req, _res, next) =>
        // statusCode: change to `status` if your error handler reads that instead
        next(Object.assign(new ApiError(401, "Unauthorized request")))
    )
};

let consoleErrorSpy;

beforeEach(() => {
    vi.resetAllMocks();
    asUser(owner);
    getBlogById.mockResolvedValue(EXISTING);
    deleteBlogPost.mockResolvedValue(undefined);
    deleteFromCloudinary.mockResolvedValue(undefined);
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => { });
});

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */
describe("DELETE /delete-post/:id", () => {
    /* ---------------------------- success --------------------------- */
    describe("success", () => {
        it("returns 200 with the success message", async () => {
            const res = await remove();
            expect(res.status).toBe(200);
            expect(res.body.message).toMatch(/blog post deleted successfully/i);
        });

        it("returns the id of the deleted post", async () => {
            const res = await remove(5);

            expect(res.body.data).toEqual({ deletedPostId: 5 });
        });

        it("looks the blog up by its numeric id and deletes that same id, once", async () => {
            await remove(5);

            expect(getBlogById).toHaveBeenCalledWith(5);
            expect(deleteBlogPost).toHaveBeenCalledTimes(1);
            expect(deleteBlogPost).toHaveBeenCalledWith(5);
            expect(typeof deleteBlogPost.mock.calls[0][0]).toBe("number");
        });

        it("lets the author delete their own post", async () => {
            asUser(owner);

            expect((await remove()).status).toBe(200);
        });

        // BUG: the check reads `user.ROLE` (should be `user.role`) and a bare
        // `ADMIN` (should be `ROLES.ADMIN`), so an admin is rejected with 403 (or
        // // hits a ReferenceError -> 500). Fix: `user.role !== ROLES.ADMIN`.
        it("lets an ADMIN delete anyone's post", async () => {
            asUser(admin);

            const res = await remove();

            expect(res.status).toBe(200);
            expect(deleteBlogPost).toHaveBeenCalledWith(5);
        });

        it("never echoes blog details or the Cloudinary id back to the client", async () => {
            const res = await remove();

            expect(JSON.stringify(res.body)).not.toContain(EXISTING.image_public_id);
            expect(JSON.stringify(res.body)).not.toContain(EXISTING.title);
        });

    });

    /* --------------------------- cover image ------------------------- */
    describe("cover image cleanup", () => {
        it("deletes the post's Cloudinary image once", async () => {
            const res = await remove();

            expect(deleteFromCloudinary).toHaveBeenCalledTimes(1);
            expect(deleteFromCloudinary).toHaveBeenCalledWith(EXISTING.public_id);
        });

        it.each([null, undefined, ""])("does not call Cloudinary when the post has no image (%j)", async (value) => {
            getBlogById.mockResolvedValue({ ...EXISTING, public_id: value });

            const res = await remove();

            expect(res.status).toBe(200);
            expect(deleteFromCloudinary).not.toHaveBeenCalled();
        });

        it("still returns 200 and deletes the post when the image delete fails (and logs it)", async () => {
            deleteFromCloudinary.mockRejectedValue(new Error("cloudinary down"));

            const res = await remove();

            expect(res.status).toBe(200);
            expect(deleteBlogPost).toHaveBeenCalledTimes(1);
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringMatching(/failed to delete image from cloudinary/i),
                expect.any(Error)
            );
        });

        // BUG: the image is deleted BEFORE the row. If the database delete then
        // fails, you have a post whose cover image is gone forever. Delete the row
        // first, then the image (best effort).
        it("deletes the image only AFTER the database row is gone", async () => {
            await remove();

            const dbOrder = deleteBlogPost.mock.invocationCallOrder[0];
            const imageOrder = deleteFromCloudinary.mock.invocationCallOrder[0];
            expect(dbOrder).toBeLessThan(imageOrder);
        });

        it("keeps the image when the database delete fails", async () => {
            deleteBlogPost.mockRejectedValue(new Error("deadlock"));

            const res = await remove();

            expect(res.status).toBe(500);
            expect(deleteFromCloudinary).not.toHaveBeenCalled();
        });
    });

    /* ---------------------------- ownership -------------------------- */
    describe("ownership and roles", () => {
        it("returns 403 when a PUBLISHER deletes someone else's post, and deletes nothing", async () => {
            asUser(otherPublisher);

            const res = await remove();

            expect(res.status).toBe(403);
            expect(res.body.message).toMatch(/only delete your own blogs/i);
            expect(deleteBlogPost).not.toHaveBeenCalled();
            expect(deleteFromCloudinary).not.toHaveBeenCalled();
        });

        it.each([ROLES.PUBLISHER, ROLES.ADMIN])("allows the %s role through the role check", async (role) => {
            asUser({ ...owner, role });

            expect((await remove()).status).toBe(200);
        });

        it.each([ROLES.READER, "guest", undefined])("returns 403 for role %s, before touching the database", async (role) => {
            asUser({ ...reader, role });

            const res = await remove();

            expect(res.status).toBe(403);
            expect(getBlogById).not.toHaveBeenCalled();
            expect(deleteBlogPost).not.toHaveBeenCalled();
            expect(deleteFromCloudinary).not.toHaveBeenCalled();
        });

        it("returns 401 when verifyJWT rejects, and touches nothing", async () => {
            rejectsAs401();

            const res = await remove();

            expect(res.status).toBe(401);
            expect(getBlogById).not.toHaveBeenCalled();
            expect(deleteBlogPost).not.toHaveBeenCalled();
        });

        it("checks the role BEFORE validating the id", async () => {
            asUser(reader);

            const res = await remove("abc");

            expect(res.status).toBe(403);
        });

        it("returns 404 (not 403) for a missing post, so ids can't be probed by non-owners", async () => {
            asUser(otherPublisher);
            getBlogById.mockResolvedValue(null);

            const res = await remove();

            expect(res.status).toBe(404);
        });
    });

    /* ---------------------------- not found -------------------------- */
    describe("blog lookup", () => {
        it.each([null, undefined])("returns 404 when the blog does not exist (%s)", async (value) => {
            getBlogById.mockResolvedValue(value);

            const res = await remove();

            expect(res.status).toBe(404);
            expect(res.body.message).toMatch(/blog not found/i);
            expect(deleteBlogPost).not.toHaveBeenCalled();
            expect(deleteFromCloudinary).not.toHaveBeenCalled();
        });

        it("deleting the same post twice: 200 first, then 404", async () => {
            getBlogById.mockResolvedValueOnce(EXISTING).mockResolvedValueOnce(null);

            const first = await remove();
            const second = await remove();

            expect(first.status).toBe(200);
            expect(second.status).toBe(404);
            expect(deleteBlogPost).toHaveBeenCalledTimes(1);
        });

        it("returns 500 (not 404) when the lookup itself throws, and deletes nothing", async () => {
            getBlogById.mockRejectedValue(new Error("connection lost"));

            const res = await remove();

            expect(res.status).toBe(500);
            expect(res.body.message).toMatch(/something went wrong/i);
            expect(deleteBlogPost).not.toHaveBeenCalled();
            expect(deleteFromCloudinary).not.toHaveBeenCalled();
        });
    });

    /* ----------------------------- id checks ------------------------- */
    describe("blog id validation", () => {
        it.each(["abc", "0", "-5", "1.5", "5abc"])("returns 400 for invalid id %j, without any DB lookup", async (id) => {
            const res = await remove(id);

            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/invalid blog id/i);
            expect(getBlogById).not.toHaveBeenCalled();
            expect(deleteBlogPost).not.toHaveBeenCalled();
        });

        it("returns 404 when the id segment is missing", async () => {
            const res = await request(app).delete("/api/v1/posts/delete-post/");

            expect(res.status).toBe(404);
            expect(getBlogById).not.toHaveBeenCalled();
        });

        // HARDENING: Number() is too forgiving. "1e3" -> 1000, "0x10" -> 16,
        // "+5" and " 5 " -> 5, and 99999999999999999999 is not a safe integer.
        // A destructive endpoint should accept only plain digits: /^\d+$/ plus
        // Number.isSafeInteger. These fail until you tighten the check.
        it.each([
            ["1e3", "1e3"],
            ["0x10", "0x10"],
            ["+5", "%2B5"],
            [" 5 ", "%205%20"],
            ["a number too big to be safe", "99999999999999999999"],
        ])("rejects the odd id form %s with 400", async (_label, id) => {
            const res = await remove(id);

            expect(res.status).toBe(400);
            expect(getBlogById).not.toHaveBeenCalled();
            expect(deleteBlogPost).not.toHaveBeenCalled();
        });
    });

    /* ---------------------------- server errors ---------------------- */
    describe("server errors", () => {
        it("returns 500 'Something went wrong.' when the delete throws", async () => {
            deleteBlogPost.mockRejectedValue(new Error("deadlock"));

            const res = await remove();

            expect(res.status).toBe(500);
            expect(res.body.message).toMatch(/something went wrong/i);
        });

        // HARDENING: if the post vanishes between the lookup and the delete (two
        // admins at once), Prisma throws P2025 "record not found". That is a 404,
        // not a 500. Catch the code in the service.
        it("returns 404 when the post disappears between lookup and delete (P2025)", async () => {
            deleteBlogPost.mockRejectedValue(Object.assign(new Error("Record to delete does not exist."), { code: "P2025" }));

            const res = await remove();

            expect(res.status).toBe(404);
        });

        it("does not leak database details to the client", async () => {
            getBlogById.mockRejectedValue(new Error("PrismaClientKnownRequestError: SELECT * FROM blogs WHERE id"));
            const lookupRes = await remove();

            getBlogById.mockResolvedValue(EXISTING);
            deleteBlogPost.mockRejectedValue(new Error("ER_ROW_IS_REFERENCED_2: DELETE FROM blogs FOREIGN KEY comments"));
            const deleteRes = await remove();

            expect(JSON.stringify(lookupRes.body)).not.toMatch(/prisma|SELECT|blogs/i);
            expect(JSON.stringify(deleteRes.body)).not.toMatch(/ER_ROW_IS_REFERENCED|DELETE FROM|FOREIGN KEY|comments/i);
        });

        it("returns 500 even when something other than an Error is thrown", async () => {
            deleteBlogPost.mockRejectedValue("boom");

            const res = await remove();

            expect(res.status).toBe(500);
        });
    });

    /* ------------------------------ routing -------------------------- */
    describe("routing", () => {
        it.each(["get", "post", "put", "patch"])("does not answer %s on the same URL (404)", async (method) => {
            const res = await request(app)[method](url(5));

            expect(res.status).toBe(404);
            expect(getBlogById).not.toHaveBeenCalled();
            expect(deleteBlogPost).not.toHaveBeenCalled();
        });
    });
});