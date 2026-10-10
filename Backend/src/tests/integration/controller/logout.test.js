import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

vi.mock("../../../modules/repository.js", () => ({
  logoutUser: vi.fn(),
  getUserByEmailRepo: vi.fn(),
  verifyEmailRepo: vi.fn(),
}));

vi.mock("../../../infrastructure/email/email.services.js", () => ({
  sendEmailService: vi.fn(),
  sendVerificationEmail: vi.fn(),
}));
vi.mock("../../../infrastructure/storage/cloudinary.storage.js", () => ({
  uploadOnCloudinary: vi.fn(),
  deleteFromCloudinary: vi.fn(),
}));

import app from "../../../app.js";
import { logoutUser } from "../../../modules/repository.js";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const URL = "/api/v1/user/logout"; 
const ACCESS = "access.jwt.value";
const REFRESH = "refresh-token-raw-value-123";

// Requires cookie-parser in app.js (your controller already relies on req.cookies).
const logout = (cookies = `accessToken=${ACCESS}; refreshToken=${REFRESH}`) => {
  const r = request(app).post(URL);
  return cookies === null ? r : r.set("Cookie", cookies);
};

const setCookies = (res) => res.headers["set-cookie"] ?? [];
const findCookie = (res, name) => setCookies(res).find((c) => c.startsWith(`${name}=`));

beforeEach(() => {
  vi.resetAllMocks();
  logoutUser.mockResolvedValue(undefined);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */
describe("POST /logout", () => {
  describe("success", () => {
    it("returns 200 with a success message", async () => {
      const res = await logout();

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/logout successfully/i);
    });

    it("revokes the refresh token exactly once", async () => {
      await logout();

      expect(logoutUser).toHaveBeenCalledTimes(1);
    });

    it("clears both cookies (empty value, expired in the past)", async () => {
      const res = await logout();

      for (const name of ["accessToken", "refreshToken"]) {
        const c = findCookie(res, name);
        expect(c, `${name} cookie should be cleared`).toBeDefined();
        expect(c).toMatch(new RegExp(`^${name}=;`));
        expect(c).toMatch(/Expires=Thu, 01 Jan 1970/i);
      }
    });

    it("does not echo the tokens back in the response body", async () => {
      const res = await logout();
      const body = JSON.stringify(res.body);

      expect(body).not.toContain(ACCESS);
      expect(body).not.toContain(REFRESH);
    });

    it("can be called twice in a row without error (idempotent from the client's view)", async () => {
      const first = await logout();
      const second = await logout();

      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
    });
  });

  describe("no authentication middleware", () => {
    // These document the new behaviour: the route no longer verifies the access
    // token, so logout works even when the access JWT has expired.
    it("logs out even if the access token is expired or garbage (it is never verified)", async () => {
      const res = await logout(`accessToken=expired.or.garbage; refreshToken=${REFRESH}`);
      expect(res.status).toBe(200);
      expect(logoutUser).toHaveBeenCalledTimes(1);
    });

    it("still returns 200 when the refresh token matches no stored session (nothing to revoke)", async () => {
      // The repository resolves without error even if 0 rows were updated.
      logoutUser.mockResolvedValue({ affectedRows: 0 });

      const res = await logout(`accessToken=${ACCESS}; refreshToken=unknown-token`);

      expect(res.status).toBe(200);
    });

    it("does not need an Authorization header", async () => {
      const res = await logout(); // no Authorization header is ever sent

      expect(res.status).toBe(200);
    });
  });

  describe("token handling", () => {
    it("revokes using the HASH of the refresh token, never the raw value", async () => {
      await logout();

      const [arg] = logoutUser.mock.calls[0];
      expect(arg).toBeTypeOf("string");
      expect(arg).not.toBe(REFRESH);
      expect(arg).not.toContain(REFRESH);
    });

    it("hashes deterministically: same token -> same hash, different token -> different hash", async () => {
      await logout();
      await logout();
      await logout(`accessToken=${ACCESS}; refreshToken=a-completely-different-token`);

      const [first, second, third] = logoutUser.mock.calls.map(([h]) => h);
      expect(first).toBe(second);
      expect(first).not.toBe(third);
    });

    it("never passes the access token to the database layer", async () => {
      await logout();

      expect(JSON.stringify(logoutUser.mock.calls)).not.toContain(ACCESS);
    });
  });

  describe("missing or blank tokens", () => {
    // NOTE: these match your CURRENT service, which requires BOTH cookies.
    // If you also relax the service to need only the refresh token, change
    // the two "accessToken" rows below to expect 200.
    it.each([
      ["no cookies at all", null],
      ["only accessToken", `accessToken=${ACCESS}`],
      ["only refreshToken", `refreshToken=${REFRESH}`],
      ["empty accessToken", `accessToken=; refreshToken=${REFRESH}`],
      ["empty refreshToken", `accessToken=${ACCESS}; refreshToken=`],
      ["whitespace-only accessToken", `accessToken=%20%20; refreshToken=${REFRESH}`],
      ["whitespace-only refreshToken", `accessToken=${ACCESS}; refreshToken=%20%20`],
    ])("returns 400 for %s, without touching the database", async (_label, cookies) => {
      const res = await logout(cookies);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/no tokens found/i);
      expect(logoutUser).not.toHaveBeenCalled();
    });

    it("does not clear cookies when the request is rejected as 400", async () => {
      const res = await logout(`accessToken=${ACCESS}`);

      expect(res.status).toBe(400);
      expect(setCookies(res)).toHaveLength(0);
    });

    it("ignores unrelated cookies", async () => {
      const res = await logout("theme=dark; sessionId=abc");

      expect(res.status).toBe(400);
      expect(logoutUser).not.toHaveBeenCalled();
    });
  });

  describe("server errors", () => {
    it("returns 500 'Failed to logout.' when the repository throws", async () => {
      logoutUser.mockRejectedValue(new Error("connection lost"));

      const res = await logout();

      expect(res.status).toBe(500);
      expect(res.body.message).toMatch(/failed to logout/i);
    });

    it("keeps the cookies when revocation fails, so the user can retry", async () => {
      logoutUser.mockRejectedValue(new Error("connection lost"));

      const res = await logout();

      expect(setCookies(res)).toHaveLength(0);
    });

    it("does not leak database error details to the client", async () => {
      logoutUser.mockRejectedValue(
        new Error("ER_PARSE_ERROR near 'UPDATE users SET refresh_token = NULL'")
      );

      const res = await logout();

      expect(res.status).toBe(500);
      expect(JSON.stringify(res.body)).not.toMatch(/ER_PARSE_ERROR|UPDATE|users|refresh_token/i);
    });

    it("returns 500 even when something other than an Error is thrown", async () => {
      logoutUser.mockRejectedValue("boom");

      const res = await logout();

      expect(res.status).toBe(500);
    });
  });

  describe("routing", () => {
    it("only accepts POST (GET is 404) and never touches the database", async () => {
      const res = await request(app).get(URL);

      expect(res.status).toBe(404);
      expect(logoutUser).not.toHaveBeenCalled();
    });
  });
});