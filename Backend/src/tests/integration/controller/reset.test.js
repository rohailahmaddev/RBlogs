import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

vi.mock("../../../modules/repository.js", () => ({
  getUserByResetPasswordToken: vi.fn(),
  updateUserPasswordById: vi.fn(),
  getUserByEmailRepo: vi.fn(),
  verifyEmailRepo: vi.fn(),
}));

// ASSUMPTION: hashPassword lives in helper.js next to hashToken.
// importOriginal keeps hashToken REAL so we can verify token hashing.
vi.mock("../../../utils/helper.js", async (importOriginal) => ({
  ...(await importOriginal()),
  hashPassword: vi.fn(),
}));

vi.mock("../../../infrastructure/email/email.services.js", () => ({
  sendFogotPasswordEmail: vi.fn(),
  sendVerificationEmail: vi.fn(),
}));
vi.mock("../../../infrastructure/storage/cloudinary.storage.js", () => ({
  uploadOnCloudinary: vi.fn(),
  deleteFromCloudinary: vi.fn(),
}));

import app from "../../../app.js";
import {
  getUserByResetPasswordToken,
  updateUserPasswordById,
} from "../../../modules/repository.js";
import { hashPassword, hashToken } from "../../../utils/helper.js";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const BASE = "/api/v1/user/reset-password"; // <- change to your real route
const RAW_TOKEN = "9d2f6c1e4b7a8035c1d9e2f4a6b8c0d1";
const NEW_PASSWORD = "N3w!Str0n"; // must satisfy your resetPasswordSchema
const HASHED_PASSWORD = "$2b$10$mockedHashOfTheNewPassword";

// ASSUMPTION: body is { newPassword }. Add confirmPassword here if your schema needs it.
const reset = (token = RAW_TOKEN, body = { newPassword: NEW_PASSWORD }) =>
  request(app).post(`${BASE}/${encodeURIComponent(token)}`).send(body);

// The repository returns an ARRAY of rows (service uses user.length / user[0]).
const row = { id: 7, email: "rohail@example.com", name: "Rohail" };

beforeEach(() => {
  vi.resetAllMocks();
  getUserByResetPasswordToken.mockResolvedValue([row]);
  hashPassword.mockResolvedValue(HASHED_PASSWORD);
  updateUserPasswordById.mockResolvedValue(undefined);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */
describe("POST /reset-password/:token", () => {
  describe("success", () => {
    it("returns 200 with the success message", async () => {
      const res = await reset();

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/password reset successfully/i);
      expect(res.body.message).toMatch(/login/i);
    });

    it("updates the password of the user the token belongs to, exactly once", async () => {
      await reset();

      expect(updateUserPasswordById).toHaveBeenCalledTimes(1);
      expect(updateUserPasswordById).toHaveBeenCalledWith(row.id, HASHED_PASSWORD);
    });

    it("hashes the new password and never stores or passes the plain text", async () => {
      await reset();

      expect(hashPassword).toHaveBeenCalledWith(NEW_PASSWORD);
      const [, passwordArg] = updateUserPasswordById.mock.calls[0];
      expect(passwordArg).not.toBe(NEW_PASSWORD);
      expect(JSON.stringify(updateUserPasswordById.mock.calls)).not.toContain(NEW_PASSWORD);
    });

    it("does not log the user in: no cookies, no tokens in the response", async () => {
      const res = await reset();

      expect(res.headers["set-cookie"] ?? []).toHaveLength(0);
      expect(JSON.stringify(res.body)).not.toMatch(/accessToken|refreshToken/i);
    });

    it("never echoes the password, its hash, the token or user data back", async () => {
      const res = await reset();
      const body = JSON.stringify(res.body);

      expect(body).not.toContain(NEW_PASSWORD);
      expect(body).not.toContain(HASHED_PASSWORD);
      expect(body).not.toContain(RAW_TOKEN);
      expect(body).not.toContain(row.email);
      expect(res.body.data ?? null).toBeNull();
    });
  });

  describe("token handling", () => {
    it("looks the user up by the HASH of the token, never the raw value", async () => {
      await reset();

      expect(getUserByResetPasswordToken).toHaveBeenCalledTimes(1);
      const [lookup] = getUserByResetPasswordToken.mock.calls[0];
      expect(lookup).toBe(hashToken(RAW_TOKEN));
      expect(lookup).not.toBe(RAW_TOKEN);
      expect(lookup).not.toContain(RAW_TOKEN);
    });

    it("hashes deterministically: same token -> same hash, different token -> different hash", async () => {
      await reset(RAW_TOKEN);
      await reset(RAW_TOKEN);
      await reset("another-token-value");

      const [first, second, third] = getUserByResetPasswordToken.mock.calls.map(([h]) => h);
      expect(first).toBe(second);
      expect(first).not.toBe(third);
    });

    it("URL-decodes the token before hashing", async () => {
      const weird = "ab+cd/ef=gh";
      await reset(weird);

      expect(getUserByResetPasswordToken).toHaveBeenCalledWith(hashToken(weird));
    });
  });

  describe("invalid, expired or reused tokens", () => {
    // Expiry itself is enforced by your SQL (verify with a real-DB test).
    // Here the repository simply returns no row, as it would for an unknown or expired token.
    it("returns 400 when no user matches (empty array)", async () => {
      getUserByResetPasswordToken.mockResolvedValue([]);

      const res = await reset();

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/invalid user or reset time is over/i);
      expect(hashPassword).not.toHaveBeenCalled();
      expect(updateUserPasswordById).not.toHaveBeenCalled();
    });

    // BUG CHECK: the service does `user.length` on the repository result. If the
    // repository returns null/undefined (some query helpers do) that is a
    // TypeError -> 500 instead of a clean 400. FAILS until you guard it:
    //   if (!user || user.length === 0) { ... }
    it.each([
      ["null", null],
      ["undefined", undefined],
    ])("returns 400 (not 500) when the repository returns %s", async (_label, value) => {
      getUserByResetPasswordToken.mockResolvedValue(value);

      const res = await reset();

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/invalid user or reset time is over/i);
      expect(updateUserPasswordById).not.toHaveBeenCalled();
    });

    it("returns 400 when the matched row has no id, and updates nothing", async () => {
      getUserByResetPasswordToken.mockResolvedValue([{ email: "rohail@example.com" }]);

      const res = await reset();

      expect(res.status).toBe(400);
      expect(updateUserPasswordById).not.toHaveBeenCalled();
    });

    // PERFORMANCE/TIMING CHECK: the service runs hashPassword (slow bcrypt)
    // BEFORE checking user[0].id. FAILS until you move the id check above it.
    it("does not waste a bcrypt hash on an invalid row", async () => {
      getUserByResetPasswordToken.mockResolvedValue([{ email: "rohail@example.com" }]);

      await reset();

      expect(hashPassword).not.toHaveBeenCalled();
    });

    it("fails with 400 when the same link is used a second time", async () => {
      getUserByResetPasswordToken
        .mockResolvedValueOnce([row])
        .mockResolvedValueOnce([]); // your SQL must clear the token on the first use

      const first = await reset();
      const second = await reset();

      expect(first.status).toBe(200);
      expect(second.status).toBe(400);
      expect(updateUserPasswordById).toHaveBeenCalledTimes(1);
    });

    it("returns 400 for a whitespace-only token (no row matches)", async () => {
      getUserByResetPasswordToken.mockResolvedValue([]);

      const res = await reset("   ");

      expect(res.status).toBe(400);
      expect(updateUserPasswordById).not.toHaveBeenCalled();
    });

    it("does not reveal whether the token was unknown or expired", async () => {
      getUserByResetPasswordToken.mockResolvedValue([]);

      const res = await reset();

      expect(res.body.message).toMatch(/invalid user or reset time is over/i);
      expect(res.body.message).not.toMatch(/not found|no such|does not exist/i);
    });
  });

  describe("schema validation (resetPasswordSchema)", () => {
    // ASSUMPTIONS: validateSchema answers 400, and your schema requires a
    // string newPassword with a minimum strength. Adjust the weak examples
    // to your real rules.
    it.each([
      ["newPassword missing", {}],
      ["empty password", { newPassword: "" }],
      ["whitespace-only password", { newPassword: "        " }],
      ["too short", { newPassword: "Ab1!" }],
      ["password is a number", { newPassword: 12345678 }],
      ["password is null", { newPassword: null }],
      ["password is an object (NoSQL-style injection)", { newPassword: { $ne: "" } }],
      ["password is an array", { newPassword: [NEW_PASSWORD] }],
    ])("rejects %s with 400 before any DB or bcrypt call", async (_label, body) => {
      const res = await reset(RAW_TOKEN, body);

      expect(res.status).toBe(400);
      expect(getUserByResetPasswordToken).not.toHaveBeenCalled();
      expect(hashPassword).not.toHaveBeenCalled();
      expect(updateUserPasswordById).not.toHaveBeenCalled();
    });

    it("rejects a request with no body at all", async () => {
      const res = await request(app).post(`${BASE}/${RAW_TOKEN}`);

      expect(res.status).toBe(400);
      expect(getUserByResetPasswordToken).not.toHaveBeenCalled();
    });

    it("does not echo the rejected password in the error response", async () => {
      const res = await reset(RAW_TOKEN, { newPassword: "Ab1!" });

      expect(JSON.stringify(res.body)).not.toContain("Ab1!");
    });
  });

  describe("routing", () => {
    it("returns 404 when the token segment is missing", async () => {
      const res = await request(app).post(BASE).send({ newPassword: NEW_PASSWORD });

      expect(res.status).toBe(404);
      expect(getUserByResetPasswordToken).not.toHaveBeenCalled();
    });

    it("only accepts POST (GET is 404) and never touches the database", async () => {
      const res = await request(app).get(`${BASE}/${RAW_TOKEN}`);

      expect(res.status).toBe(404);
      expect(getUserByResetPasswordToken).not.toHaveBeenCalled();
    });
  });

  describe("server errors", () => {
    it("returns 500 'Failed to found the user' when the lookup throws, and changes nothing", async () => {
      getUserByResetPasswordToken.mockRejectedValue(new Error("connection lost"));

      const res = await reset();

      expect(res.status).toBe(500);
      expect(res.body.message).toMatch(/failed to found the user/i);
      expect(hashPassword).not.toHaveBeenCalled();
      expect(updateUserPasswordById).not.toHaveBeenCalled();
    });

    it("returns 500 when bcrypt throws, and does not update the password", async () => {
      hashPassword.mockRejectedValue(new Error("bcrypt: out of memory"));

      const res = await reset();

      expect(res.status).toBe(500);
      expect(updateUserPasswordById).not.toHaveBeenCalled();
    });

    it("returns 500 'Failed to update the password' when the update throws, and never claims success", async () => {
      updateUserPasswordById.mockRejectedValue(new Error("deadlock"));

      const res = await reset();

      expect(res.status).toBe(500);
      expect(res.body.message).toMatch(/failed to update the password/i);
      expect(res.body.message).not.toMatch(/reset successfully/i);
    });

    it("does not leak database or bcrypt internals to the client", async () => {
      getUserByResetPasswordToken.mockRejectedValue(
        new Error("ER_PARSE_ERROR near 'SELECT * FROM users WHERE reset_token'")
      );
      const lookupRes = await reset();

      getUserByResetPasswordToken.mockResolvedValue([row]);
      hashPassword.mockRejectedValue(new Error("bcrypt: salt rounds env BCRYPT_ROUNDS missing"));
      const hashRes = await reset();

      hashPassword.mockResolvedValue(HASHED_PASSWORD);
      updateUserPasswordById.mockRejectedValue(new Error("ER_LOCK_DEADLOCK on users.password"));
      const updateRes = await reset();

      expect(JSON.stringify(lookupRes.body)).not.toMatch(/ER_PARSE_ERROR|SELECT|users|reset_token/i);
      expect(JSON.stringify(hashRes.body)).not.toMatch(/bcrypt|BCRYPT_ROUNDS|salt/i);
      expect(JSON.stringify(updateRes.body)).not.toMatch(/ER_LOCK_DEADLOCK|users|password_hash/i);
    });

    it("returns 500 even when something other than an Error is thrown", async () => {
      updateUserPasswordById.mockRejectedValue("boom");

      const res = await reset();

      expect(res.status).toBe(500);
    });
  });
});