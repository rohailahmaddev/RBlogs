import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

/* ------------------------------------------------------------------ */
/*  Mocks (paths are relative to this file; keep it next to service.js) */
/* ------------------------------------------------------------------ */
vi.mock("../../../modules/repository.js", () => ({
  getUserByEmailRepo: vi.fn(),
  updateVerificationEmailTokenRepo: vi.fn(),
  verifyEmailRepo: vi.fn(),
}));


// ASSUMPTION: it is exported from this module. Change the path if not.
vi.mock("../../../infrastructure/email/email.services.js", () => ({
  sendVerificationEmail: vi.fn(),
}));

vi.mock("../../../infrastructure/storage/cloudinary.storage.js", () => ({
  uploadOnCloudinary: vi.fn(),
  deleteFromCloudinary: vi.fn(),
}));

import app from "../../../app.js";
import { getUserByEmailRepo } from "../../../modules/repository.js";
import { sendVerificationEmail } from "../../../infrastructure/email/email.services.js";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const URL = "/api/v1/user/resend-verification-email"; // <- change to your real route
const EMAIL = "rohail@example.com";

const resend = (body = { email: EMAIL }) => request(app).post(URL).send(body);

// A full DB row, including fields that must NEVER reach the client.
const unverifiedUser = {
  id: 1,
  name: "Rohail",
  email: EMAIL,
  password_hash: "$2b$10$thisMustNeverBeReturned",
  is_verified: false,
  verify_token: "stored-hash",
  verify_token_expiry: new Date(Date.now() + 3600_000),
};

beforeEach(() => {
  vi.resetAllMocks();
  getUserByEmailRepo.mockResolvedValue(unverifiedUser);
  sendVerificationEmail.mockResolvedValue(undefined);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */
describe("POST /resend-verification-email", () => {
  describe("success", () => {
    it("returns 200 with a success message", async () => {
      const res = await resend();

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/resent successfully/i);
    });

    it("looks the user up by the submitted email", async () => {
      await resend();

      expect(getUserByEmailRepo).toHaveBeenCalledTimes(1);
      expect(getUserByEmailRepo).toHaveBeenCalledWith(EMAIL);
    });

    it("sends exactly one email, for the user that was found", async () => {
      await resend();

      expect(sendVerificationEmail).toHaveBeenCalledTimes(1);
      const [userArg, reqArg] = sendVerificationEmail.mock.calls[0];
      expect(userArg).toEqual(unverifiedUser);
      expect(reqArg).toBeDefined(); // the express req is forwarded
    });

    it("never returns the user row, password hash or tokens", async () => {
      const res = await resend();
      const body = JSON.stringify(res.body);

      expect(body).not.toContain("thisMustNeverBeReturned");
      expect(body).not.toContain("stored-hash");
      expect(body).not.toContain("password_hash");
    });
  });

  describe("input validation", () => {
    // NOTE: the original service throws 402 ("Payment Required") for a blank
    // email. These tests expect 400. They pass once you apply the fix.
    it.each([
      ["empty string", ""],
      ["whitespace only", "   "],
    ])("returns 400 when email is %s, without touching DB or email", async (_label, email) => {
      const res = await resend({ email });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Please provide register email/i);
      expect(getUserByEmailRepo).not.toHaveBeenCalled();
      expect(sendVerificationEmail).not.toHaveBeenCalled();
    });

    // NOTE: the original code calls email.trim() on undefined / non-strings,
    // which throws a TypeError -> 500. These tests expect a proper 400.
    it.each([
      ["email missing from the body", {}],
      ["email is null", { email: null }],
      ["email is a number", { email: 12345 }],
      ["email is an object", { email: { $ne: "" } }],
      ["email is an array", { email: [EMAIL] }],
    ])("returns 400 when %s", async (_label, body) => {
      const res = await resend(body);

      expect(res.status).toBe(400);
      expect(getUserByEmailRepo).not.toHaveBeenCalled();
      expect(sendVerificationEmail).not.toHaveBeenCalled();
    });

    it("returns 400 when no body is sent at all", async () => {
      const res = await request(app).post(URL);
      expect(res.status).toBe(400);
      expect(getUserByEmailRepo).not.toHaveBeenCalled();
    });

    it("trims surrounding whitespace before looking the user up", async () => {
      await resend({ email: `  ${EMAIL}  ` });

      expect(getUserByEmailRepo).toHaveBeenCalledWith(EMAIL);
    });
  });

  describe("unknown or already verified users", () => {
    it.each([
      ["null", null],
      ["undefined", undefined],
    ])("returns 400 when no user matches (repository returns %s)", async (_label, value) => {
      getUserByEmailRepo.mockResolvedValue(value);

      const res = await resend();

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/invalid email|register first/i);
      expect(sendVerificationEmail).not.toHaveBeenCalled();
    });

    it("returns 409 when the user is already verified, and sends no email", async () => {
      getUserByEmailRepo.mockResolvedValue({ ...unverifiedUser, is_verified: true });

      const res = await resend();

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/already verified/i);
      expect(sendVerificationEmail).not.toHaveBeenCalled();
    });

    it("treats is_verified = 1 (MySQL tinyint) as verified", async () => {
      getUserByEmailRepo.mockResolvedValue({ ...unverifiedUser, is_verified: 1 });

      const res = await resend();

      expect(res.status).toBe(409);
      expect(sendVerificationEmail).not.toHaveBeenCalled();
    });
  });

  describe("server errors", () => {
    it("returns 500 when the repository throws", async () => {
      getUserByEmailRepo.mockRejectedValue(new Error("connection lost"));

      const res = await resend();

      expect(res.status).toBe(500);
      expect(sendVerificationEmail).not.toHaveBeenCalled();
    });

    it("returns 500 when sending the email fails", async () => {
      sendVerificationEmail.mockRejectedValue(new Error("SMTP 535 auth failed"));

      const res = await resend();

      expect(res.status).toBe(500);
      expect(res.body.message).not.toMatch(/successfully/i);
    });

    it("does not leak database or SMTP error details to the client", async () => {
      getUserByEmailRepo.mockRejectedValue(
        new Error("ER_PARSE_ERROR near 'SELECT * FROM user WHERE email'")
      );
      const dbRes = await resend();

      sendVerificationEmail.mockRejectedValue(new Error("SMTP 535 auth failed for smtp.secret-host.com"));
      getUserByEmailRepo.mockResolvedValue(unverifiedUser);
      const mailRes = await resend();
      
      expect(JSON.stringify(dbRes.body)).not.toMatch(/ER_PARSE_ERROR|SELECT|user/i);
      expect(JSON.stringify(mailRes.body)).not.toMatch(/SMTP|secret-host/i);
    });

    it("returns 500 even when something other than an Error is thrown", async () => {
      getUserByEmailRepo.mockRejectedValue("boom");

      const res = await resend();

      expect(res.status).toBe(500);
    });
  });

  describe("routing", () => {
    it("only accepts POST (GET is 404) and never touches the database", async () => {
      const res = await request(app).get(URL);

      expect(res.status).toBe(404);
      expect(getUserByEmailRepo).not.toHaveBeenCalled();
    });
  });
});