import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

/* ------------------------------------------------------------------ */
/*  Mocks (paths are relative to this file; keep it next to service.js) */
/* ------------------------------------------------------------------ */
vi.mock("../../../modules/repository.js", () => ({
  verifyEmailRepo: vi.fn(),
}));

// The app also loads the register service, so stub its outside-world
// dependencies. This only keeps importing the app free of side effects.
vi.mock("../../../infrastructure/email/email.services.js", () => ({
  sendVerificationEmail: vi.fn(),
}));
vi.mock("../../../infrastructure/storage/cloudinary.storage.js", () => ({
  uploadOnCloudinary: vi.fn(),
  deleteFromCloudinary: vi.fn(),
}));

import app from "../../../app.js";
import { verifyEmailRepo } from "../../../modules/repository.js";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const BASE = "/api/v1/user/email-verify"; // <- change to your real route
const RAW_TOKEN = "3f9c1b7a5e2d4c8b9a0e6f1d2c3b4a59";

const verify = (token = RAW_TOKEN) =>
  request(app).post(`${BASE}/${encodeURIComponent(token)}`);

// What the repository might return: a full row, including fields that
// must NEVER reach the client.
const dbRow = {
  id: 1,
  name: "Rohail",
  email: "rohail@example.com",
  password_hash: "$2b$10$thisMustNeverBeReturned",
  is_verified: true,
  verify_token: null,
  verify_token_expiry: null,
};

beforeEach(() => {
  vi.resetAllMocks();
  verifyEmailRepo.mockResolvedValue(dbRow);
  // The service logs real failures; keep test output clean
  vi.spyOn(console, "error").mockImplementation(() => {});
});

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */
describe("POST /email-verify/:token", () => {
  describe("success", () => {
    it("verifies the user and returns 200 with a success message", async () => {
      const res = await verify();

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/verified successfully/i);
      expect(verifyEmailRepo).toHaveBeenCalledTimes(1);
    });

    it("returns only id, name and email, never the rest of the row", async () => {
      const res = await verify();

      expect(res.body.data.user).toEqual({
        id: 1,
        name: "Rohail",
        email: "rohail@example.com",
      });
      expect(JSON.stringify(res.body)).not.toContain("thisMustNeverBeReturned");
    });
  });

  describe("token handling", () => {
    it("looks the token up by its hash, never the raw value", async () => {
      await verify();

      const [lookupValue] = verifyEmailRepo.mock.calls[0];
      expect(lookupValue).toBeTypeOf("string");
      expect(lookupValue).not.toBe(RAW_TOKEN);
      expect(lookupValue).not.toContain(RAW_TOKEN);
    });

    it("hashes deterministically: same token -> same hash, different token -> different hash", async () => {
      await verify(RAW_TOKEN);
      await verify(RAW_TOKEN);
      await verify("another-token-value");

      const [first, second, third] = verifyEmailRepo.mock.calls.map(([h]) => h);
      expect(first).toBe(second);
      expect(first).not.toBe(third);
    });
  });

  describe("invalid, expired or reused tokens", () => {
    it.each([
      ["null", null],
      ["undefined", undefined],
    ])("returns 400 (not 500) when no user matches: repository returns %s", async (_label, value) => {
      verifyEmailRepo.mockResolvedValue(value);

      const res = await verify();

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/invalid|verification time is over/i);
    });

    it("fails gracefully when the same link is used a second time", async () => {
      verifyEmailRepo.mockResolvedValueOnce(dbRow).mockResolvedValueOnce(null);

      const first = await verify();
      const second = await verify();

      expect(first.status).toBe(200);
      expect(second.status).toBe(400);
    });

    it("returns 400 for a whitespace-only token without querying the database", async () => {
      const res = await verify("   ");

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/token is not present/i);
      expect(verifyEmailRepo).not.toHaveBeenCalled();
    });
  });

  describe("server errors", () => {
    it("returns 500 (not 400) when the repository throws", async () => {
      verifyEmailRepo.mockRejectedValue(new Error("connection lost"));

      const res = await verify();

      expect(res.status).toBe(500);
      expect(res.body.message).toMatch(/something went wrong/i);
    });

    it("does not leak database error details to the client", async () => {
      verifyEmailRepo.mockRejectedValue(
        new Error("ER_PARSE_ERROR near 'SELECT * FROM users WHERE verify_token'")
      );

      const res = await verify();

      expect(res.status).toBe(500);
      expect(JSON.stringify(res.body)).not.toMatch(/ER_PARSE_ERROR|SELECT|users|verify_token/i);
    });

    it("returns 500 even when something other than an Error is thrown", async () => {
      verifyEmailRepo.mockRejectedValue("boom");

      const res = await verify();

      expect(res.status).toBe(500);
    });
  });

  describe("routing", () => {
    it("only accepts POST (a GET to the same URL is 404) and never touches the database", async () => {
      const res = await request(app).get(`${BASE}/${RAW_TOKEN}`);

      expect(res.status).toBe(404);
      expect(verifyEmailRepo).not.toHaveBeenCalled();
    });
  });
});