import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";


vi.mock("../../../modules/repository.js", () => ({
  getUserByEmailRepo: vi.fn(),
  updateForgotPasswordToken: vi.fn(),
  clearForgotPasswordToken: vi.fn(),
  verifyEmailRepo: vi.fn(),
}));

// ASSUMPTION: sendFogotPasswordEmail (sic) lives in the email service file.
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
  getUserByEmailRepo,
  updateForgotPasswordToken,
  clearForgotPasswordToken,
} from "../../../modules/repository.js";
import { sendFogotPasswordEmail } from "../../../infrastructure/email/email.services.js";
// Real helper: lets us prove the emailed token hashes to the stored one.
import { hashToken } from "../../../utils/helper.js";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const URL = "/api/v1/user/forgot-password"; // <- change to your real route
const EMAIL = "rohail@example.com";

const forgot = (body = { email: EMAIL }) => request(app).post(URL).send(body);

const user = {
  id: 1,
  name: "Rohail",
  email: EMAIL,
  password: "$2b$10$thisHashMustNeverBeReturned",
  is_active: 1,
  is_verified: 1,
};

// Pulls what the service stored and what it emailed.
const stored = () => {
  const [id, hashedToken, tokenExpiry] = updateForgotPasswordToken.mock.calls[0];
  return { id, hashedToken, tokenExpiry };
};
const emailed = () => {
  const [userArg, reqArg, unHashedToken] = sendFogotPasswordEmail.mock.calls[0];
  return { userArg, reqArg, unHashedToken };
};

let consoleErrorSpy;

beforeEach(() => {
  vi.resetAllMocks();
  getUserByEmailRepo.mockResolvedValue(user);
  updateForgotPasswordToken.mockResolvedValue(undefined);
  clearForgotPasswordToken.mockResolvedValue(undefined);
  sendFogotPasswordEmail.mockResolvedValue(undefined);
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */
describe("POST /forgot-password", () => {
  describe("success", () => {
    it("returns 200 with the check-your-email message", async () => {
      const res = await forgot();

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/check your email for the reset link/i);
    });

    it("looks the user up by email", async () => {
      await forgot();

      expect(getUserByEmailRepo).toHaveBeenCalledTimes(1);
      expect(getUserByEmailRepo).toHaveBeenCalledWith(EMAIL);
    });

    it("stores a token for the right user id and sends exactly one email to that user", async () => {
      await forgot();

      expect(updateForgotPasswordToken).toHaveBeenCalledTimes(1);
      expect(stored().id).toBe(user.id);

      expect(sendFogotPasswordEmail).toHaveBeenCalledTimes(1);
      expect(emailed().userArg).toEqual(user);
      expect(emailed().reqArg).toBeDefined(); // express req is forwarded
    });

    it("does NOT clear the token when the email was sent successfully", async () => {
      await forgot();

      expect(clearForgotPasswordToken).not.toHaveBeenCalled();
    });

    it("never returns the token, its hash, or any user data in the response", async () => {
      const res = await forgot();
      const body = JSON.stringify(res.body);

      expect(body).not.toContain(emailed().unHashedToken);
      expect(body).not.toContain(stored().hashedToken);
      expect(body).not.toContain("thisHashMustNeverBeReturned");
      expect(res.body.data ?? null).toBeNull();
    });
  });

  describe("reset token security", () => {
    it("stores only the HASH; the emailed raw token is different from what is stored", async () => {
      await forgot();

      expect(emailed().unHashedToken).toBeTypeOf("string");
      expect(stored().hashedToken).toBeTypeOf("string");
      expect(stored().hashedToken).not.toBe(emailed().unHashedToken);
    });

    it("the stored hash is exactly hashToken(emailed token), so the reset link will match later", async () => {
      await forgot();

      expect(hashToken(emailed().unHashedToken)).toBe(stored().hashedToken);
    });

    it("sets an expiry in the future", async () => {
      await forgot();

      expect(new Date(stored().tokenExpiry).getTime()).toBeGreaterThan(Date.now());
    });

    it("generates a fresh, unique token on every request", async () => {
      await forgot();
      await forgot();

      const [a, b] = sendFogotPasswordEmail.mock.calls.map((c) => c[2]);
      expect(a).not.toBe(b);
      const [ha, hb] = updateForgotPasswordToken.mock.calls.map((c) => c[1]);
      expect(ha).not.toBe(hb);
    });

    it("saves the token BEFORE emailing it", async () => {
      await forgot();

      const saveOrder = updateForgotPasswordToken.mock.invocationCallOrder[0];
      const mailOrder = sendFogotPasswordEmail.mock.invocationCallOrder[0];
      expect(saveOrder).toBeLessThan(mailOrder);
    });
  });

  describe("schema validation (forgotPasswordSchema)", () => {
    // ASSUMPTION: validateSchema answers 400. Change the status if you use 422.
    it.each([
      ["email missing", {}],
      ["empty email", { email: "" }],
      ["whitespace-only email", { email: "   " }],
      ["not an email address", { email: "not-an-email" }],
      ["email without domain", { email: "rohail@" }],
      ["email is a number", { email: 12345 }],
      ["email is null", { email: null }],
      ["email is an object (NoSQL-style injection)", { email: { $ne: "" } }],
      ["email is an array", { email: [EMAIL] }],
    ])("rejects %s with 400 before any DB or mail call", async (_label, body) => {
      const res = await forgot(body);

      expect(res.status).toBe(400);
      expect(getUserByEmailRepo).not.toHaveBeenCalled();
      expect(updateForgotPasswordToken).not.toHaveBeenCalled();
      expect(clearForgotPasswordToken).not.toHaveBeenCalled();
      expect(sendFogotPasswordEmail).not.toHaveBeenCalled();
    });

    it("rejects a request with no body at all", async () => {
      const res = await request(app).post(URL);

      expect(res.status).toBe(400);
      expect(getUserByEmailRepo).not.toHaveBeenCalled();
    });

    it("trims and lower-cases the email before the lookup (zod .trim().toLowerCase())", async () => {
      await forgot({ email: "  RoHaIl@Example.COM  " });

      expect(getUserByEmailRepo).toHaveBeenCalledWith(EMAIL);
    });
  });

  describe("unknown email", () => {
    // CURRENT behaviour: 401 "Invalid user." (this tells attackers which emails
    // are registered, and 401 is the wrong status). Recommended fix: return the
    // same 200 message as success and send nothing. If you apply it, change
    // `toBe(401)` to `toBe(200)` below.
    it.each([null, undefined])("returns 401 and sends nothing when no user matches (%s)", async (value) => {
      getUserByEmailRepo.mockResolvedValue(value);

      const res = await forgot();

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/invalid user/i);
      expect(updateForgotPasswordToken).not.toHaveBeenCalled();
      expect(clearForgotPasswordToken).not.toHaveBeenCalled();
      expect(sendFogotPasswordEmail).not.toHaveBeenCalled();
    });
  });

//   describe("blocked accounts", () => {
//     // HARDENING CHECK: the service does not look at is_active, so a blocked
//     // user can still get a reset link. This test FAILS until you add a check
//     // (e.g. throw 403, or silently send nothing).
//     it.each([0, false])("does not send a reset email when is_active is %j", async (flag) => {
//       getUserByEmailRepo.mockResolvedValue({ ...user, is_active: flag });

//       await forgot();

//       expect(sendFogotPasswordEmail).not.toHaveBeenCalled();
//       expect(updateForgotPasswordToken).not.toHaveBeenCalled();
//     });
//   });

  describe("server errors: user lookup and token saving", () => {
    it("returns 500 'Failed to fetch user info' when the user lookup throws", async () => {
      getUserByEmailRepo.mockRejectedValue(new Error("connection lost"));

      const res = await forgot();

      expect(res.status).toBe(500);
      expect(res.body.message).toMatch(/failed to fetch user info/i);
      expect(updateForgotPasswordToken).not.toHaveBeenCalled();
      expect(sendFogotPasswordEmail).not.toHaveBeenCalled();
    });

    it("returns 500 'Failed to generate the tokens' when saving the token throws, with no email and no cleanup", async () => {
      updateForgotPasswordToken.mockRejectedValue(new Error("deadlock"));

      const res = await forgot();

      expect(res.status).toBe(500);
      expect(res.body.message).toMatch(/failed to generate the tokens/i);
      expect(sendFogotPasswordEmail).not.toHaveBeenCalled();
      expect(clearForgotPasswordToken).not.toHaveBeenCalled();
    });
  });

  describe("email sending fails (token cleanup path)", () => {
    beforeEach(() => {
      sendFogotPasswordEmail.mockRejectedValue(new Error("SMTP 535 auth failed for smtp.secret-host.com"));
    });

    // BUG CHECK: in the current service the `throw new ApiError(500, ...)` sits
    // INSIDE the cleanup `catch`. When the email fails but cleanup succeeds, no
    // error is thrown, the service returns null, and the user gets a 200
    // "check your email" for an email that was never sent.
    // These tests FAIL until the throw is moved out of the inner catch, e.g.:
    //
    //   } catch (error) {
    //     try { await clearForgotPasswordToken(user.id) }
    //     catch (cleanupError) { console.error("...", cleanupError) }
    //     throw new ApiError(500, "Unable to send the password reset email. Please try again.")
    //   }
    it("returns 500 (not 200) when the email fails and the cleanup succeeds", async () => {
      const res = await forgot();

      expect(res.status).toBe(500);
      expect(res.body.message).toMatch(/unable to send the password reset email/i);
      expect(res.body.message).not.toMatch(/check your email/i);
    });

    it("removes the token the user never received (called once, for the right user)", async () => {
      await forgot();

      expect(clearForgotPasswordToken).toHaveBeenCalledTimes(1);
      expect(clearForgotPasswordToken).toHaveBeenCalledWith(user.id);
    });

    it("clears the token AFTER saving it and AFTER the failed email attempt", async () => {
      await forgot();

      const saveOrder = updateForgotPasswordToken.mock.invocationCallOrder[0];
      const mailOrder = sendFogotPasswordEmail.mock.invocationCallOrder[0];
      const clearOrder = clearForgotPasswordToken.mock.invocationCallOrder[0];
      expect(saveOrder).toBeLessThan(mailOrder);
      expect(mailOrder).toBeLessThan(clearOrder);
    });

    it("returns 500 with the same message when the cleanup ALSO fails", async () => {
      clearForgotPasswordToken.mockRejectedValue(new Error("db down during cleanup"));

      const res = await forgot();

      expect(res.status).toBe(500);
      expect(res.body.message).toMatch(/unable to send the password reset email/i);
    });

    it("logs the cleanup failure server-side", async () => {
      const cleanupError = new Error("db down during cleanup");
      clearForgotPasswordToken.mockRejectedValue(cleanupError);

      await forgot();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringMatching(/failed to clear password reset token/i),
        cleanupError
      );
    });

    it("does not leak SMTP or cleanup error details to the client", async () => {
      clearForgotPasswordToken.mockRejectedValue(new Error("ER_LOCK_DEADLOCK on users.reset_token"));

      const res = await forgot();

      const body = JSON.stringify(res.body);
      expect(body).not.toMatch(/SMTP|secret-host/i);
      expect(body).not.toMatch(/ER_LOCK_DEADLOCK|reset_token|users/i);
    });

    it("never sends the raw token back to the client", async () => {
      const res = await forgot();

      // the token generated for this request was passed to the (failed) mail call
      expect(JSON.stringify(res.body)).not.toContain(emailed().unHashedToken);
    });
  });

  describe("server errors: other", () => {
    it("does not leak database details from the lookup or the save step", async () => {
      getUserByEmailRepo.mockRejectedValue(new Error("ER_PARSE_ERROR near 'SELECT * FROM users'"));
      const lookupRes = await forgot();

      getUserByEmailRepo.mockResolvedValue(user);
      updateForgotPasswordToken.mockRejectedValue(new Error("ER_LOCK_DEADLOCK on users.reset_token"));
      const saveRes = await forgot();

      expect(JSON.stringify(lookupRes.body)).not.toMatch(/ER_PARSE_ERROR|SELECT|users/i);
      expect(JSON.stringify(saveRes.body)).not.toMatch(/ER_LOCK_DEADLOCK|reset_token|users/i);
    });

    it("returns 500 even when something other than an Error is thrown by the mail call", async () => {
      sendFogotPasswordEmail.mockRejectedValue("boom");

      const res = await forgot();

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