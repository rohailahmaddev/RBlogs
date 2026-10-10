import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";


vi.mock("../../../modules/repository.js", () => ({
  getUserByEmailRepo: vi.fn(),
  verifyEmailRepo: vi.fn(),
  updateVerificationEmailTokenRepo: vi.fn(),
}));

// ASSUMPTION: comparePassword and getAccessAndRefreshToken live in helper.js.
// If getAccessAndRefreshToken is inside service.js, see the note at the bottom.
vi.mock("../../../utils/helper.js", async (importOriginal) => ({
  ...(await importOriginal()),
  comparePassword: vi.fn(),
  getAccessAndRefreshToken: vi.fn(),
}));

vi.mock("../../../infrastructure/email/email.services.js", () => ({
  sendVerificationEmail: vi.fn(),
}));
vi.mock("../../../infrastructure/storage/cloudinary.storage.js", () => ({
  uploadOnCloudinary: vi.fn(),
  deleteFromCloudinary: vi.fn(),
}));

import app from "../../../app.js";
import { getUserByEmailRepo } from "../../../modules/repository.js";
import { comparePassword, getAccessAndRefreshToken } from "../../../utils/helper.js";
import { sendVerificationEmail } from "../../../infrastructure/email/email.services.js";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const URL = "/api/v1/user/login"; 
const EMAIL = "rohail@example.com";
const PASSWORD = "Str0ng!Pa";

const login = (body = { email: EMAIL, password: PASSWORD }) =>
  request(app).post(URL).send(body);

// Realistic DB row: includes fields that must NEVER reach the client.
const activeUser = {
  id: 1,
  name: "Rohail",
  email: EMAIL,
  password: "$2b$10$thisHashMustNeverBeReturned",
  is_verified: 1,
  refresh_token: "stored-refresh-secret",
  verify_token: null,
};

const TOKENS = { accessToken: "access.jwt.value", refreshToken: "refresh.jwt.value" };

const cookiesOf = (res) => res.headers["set-cookie"] ?? [];
const cookie = (res, name) => cookiesOf(res).find((c) => c.startsWith(`${name}=`));

beforeEach(() => {
  vi.resetAllMocks();
  getUserByEmailRepo.mockResolvedValue(activeUser);
  comparePassword.mockResolvedValue(true);
  getAccessAndRefreshToken.mockResolvedValue(TOKENS);
  sendVerificationEmail.mockResolvedValue(undefined);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */
describe("POST /login", () => {
  describe("success", () => {
    it("returns 200 with a success message and both tokens", async () => {
      const res = await login();

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/logged in successfully/i);
      expect(res.body.data.accessToken).toBe(TOKENS.accessToken);
      expect(res.body.data.refreshToken).toBe(TOKENS.refreshToken);
    });

    it("looks the user up by email, compares the password and issues tokens for that user id", async () => {
      await login();

      expect(getUserByEmailRepo).toHaveBeenCalledWith(EMAIL);
      expect(comparePassword).toHaveBeenCalledWith(PASSWORD, activeUser.password);
      expect(getAccessAndRefreshToken).toHaveBeenCalledWith(activeUser.id);
      expect(sendVerificationEmail).not.toHaveBeenCalled();
    });

    it("returns the user's email and name", async () => {
      const res = await login();
      const { user } = res.body.data;

      expect(user.email).toBe(EMAIL);
      // BUG CHECK: the service reads user.full_name, but the users table column
      // is `name`. With a real row, full_name is undefined and is dropped from
      // the JSON. Fix the service to use user.name (or alias it in the query).
      expect(user.full_name ?? user.name).toBe("Rohail");
    });

    it("never leaks the password hash, stored refresh token or full DB row", async () => {
      const res = await login();
      const body = JSON.stringify(res.body);

      expect(body).not.toContain("thisHashMustNeverBeReturned");
      expect(body).not.toContain("stored-refresh-secret");
      expect(res.body.data.user).not.toHaveProperty("password");
      expect(res.body.data.user).not.toHaveProperty("id");
    });
  });

  describe("cookies", () => {
    it("sets accessToken and refreshToken cookies with the token values", async () => {
      const res = await login();

      expect(cookie(res, "accessToken")).toContain(`accessToken=${TOKENS.accessToken}`);
      expect(cookie(res, "refreshToken")).toContain(`refreshToken=${TOKENS.refreshToken}`);
    });

    it.each(["accessToken", "refreshToken"])("%s cookie is HttpOnly, SameSite=Strict, 7 days", async (name) => {
      const res = await login();
      const c = cookie(res, name);

      expect(c).toMatch(/HttpOnly/i);
      expect(c).toMatch(/SameSite=Strict/i);
      expect(c).toMatch(/Max-Age=604800/i); // 7 * 24 * 60 * 60
    });

    it("does not mark cookies Secure outside production", async () => {
      // NODE_ENV is "test" under Vitest. A production Secure-flag test needs
      // the env module re-imported with NODE_ENV=production (separate file).
      const res = await login();

      expect(cookie(res, "accessToken")).not.toMatch(/;\s*Secure/i);
    });

    it("sets no cookies on failed logins", async () => {
      comparePassword.mockResolvedValue(false);

      const res = await login();

      expect(res.status).toBe(401);
      expect(cookiesOf(res)).toHaveLength(0);
    });
  });

  describe("schema validation (validateSchema(loginSchema))", () => {
    // ASSUMPTION: your validator answers 400 and loginSchema requires a valid
    // email and a non-empty password. Change the status if you use 422.
    it.each([
      ["email missing", { password: PASSWORD }],
      ["password missing", { email: EMAIL }],
      ["empty body", {}],
      ["email not a valid address", { email: "not-an-email", password: PASSWORD }],
      ["empty password", { email: EMAIL, password: "" }],
      ["email is a number", { email: 123, password: PASSWORD }],
      ["email is an object (NoSQL-style injection)", { email: { $ne: "" }, password: PASSWORD }],
      ["password is an object", { email: EMAIL, password: { $ne: "" } }],
    ])("rejects %s with 400 before reaching DB, bcrypt or tokens", async (_label, body) => {
      const res = await login(body);

      expect(res.status).toBe(400);
      expect(getUserByEmailRepo).not.toHaveBeenCalled();
      expect(comparePassword).not.toHaveBeenCalled();
      expect(getAccessAndRefreshToken).not.toHaveBeenCalled();
    });

    it("rejects a request with no body at all", async () => {
      const res = await request(app).post(URL);

      expect(res.status).toBe(400);
      expect(getUserByEmailRepo).not.toHaveBeenCalled();
    });
  });

  describe("credential failures", () => {
    it.each([null, undefined])("returns 400 when no user matches (repository returns %s)", async (value) => {
      getUserByEmailRepo.mockResolvedValue(value);

      const res = await login();

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/invalid login credentials./i);
      expect(comparePassword).not.toHaveBeenCalled();
      expect(getAccessAndRefreshToken).not.toHaveBeenCalled();
    });

    it("returns 401 for a wrong password and issues no tokens", async () => {
      comparePassword.mockResolvedValue(false);

      const res = await login();

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/invalid login credentials/i);
      expect(getAccessAndRefreshToken).not.toHaveBeenCalled();
      expect(sendVerificationEmail).not.toHaveBeenCalled();
      expect(JSON.stringify(res.body)).not.toContain(TOKENS.accessToken);
    });

    it("does not reveal whether the password or the account was wrong in the 401 body", async () => {
      comparePassword.mockResolvedValue(false);

      const res = await login();

      expect(res.body.message).not.toMatch(/password (is )?(wrong|incorrect)|email/i);
    });
  });

  // describe("blocked accounts", () => {
  //   it.each([0, false])("returns 403 when is_active is %j, without checking the password", async (flag) => {
  //     getUserByEmailRepo.mockResolvedValue({ ...activeUser, is_active: flag });

  //     const res = await login();

  //     expect(res.status).toBe(403);
  //     expect(res.body.message).toMatch(/blocked/i);
  //     expect(comparePassword).not.toHaveBeenCalled();
  //     expect(getAccessAndRefreshToken).not.toHaveBeenCalled();
  //     expect(cookiesOf(res)).toHaveLength(0);
  //   });
  // });

  describe("unverified accounts", () => {
    beforeEach(() => {
      getUserByEmailRepo.mockResolvedValue({ ...activeUser, is_verified: 0 });
    });

    it("returns 409, re-sends the verification email, and issues no tokens or cookies", async () => {
      const res = await login();

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/not verified|verification link/i);
      expect(sendVerificationEmail).toHaveBeenCalledTimes(1);
      expect(getAccessAndRefreshToken).not.toHaveBeenCalled();
      expect(cookiesOf(res)).toHaveLength(0);
    });

    it("sends the email to the right user and forwards the request object", async () => {
      await login();

      const [userArg, reqArg] = sendVerificationEmail.mock.calls[0];
      expect(userArg.email).toBe(EMAIL);
      expect(reqArg).toBeDefined();
    });

    it("does NOT send an email when the password is wrong (no mail-bombing by guessing)", async () => {
      comparePassword.mockResolvedValue(false);

      const res = await login();

      expect(res.status).toBe(401);
      expect(sendVerificationEmail).not.toHaveBeenCalled();
    });
  });

  describe("server errors", () => {
    it("returns 500 when the repository throws", async () => {
      getUserByEmailRepo.mockRejectedValue(new Error("connection lost"));

      const res = await login();

      expect(res.status).toBe(500);
      expect(cookiesOf(res)).toHaveLength(0);
    });

    it("returns 500 when bcrypt throws", async () => {
      comparePassword.mockRejectedValue(new Error("bcrypt: data and hash arguments required"));

      const res = await login();

      expect(res.status).toBe(500);
      expect(getAccessAndRefreshToken).not.toHaveBeenCalled();
    });

    it("returns 500 when token generation fails, with no cookies set", async () => {
      getAccessAndRefreshToken.mockRejectedValue(new Error("JWT secret missing"));

      const res = await login();

      expect(res.status).toBe(500);
      expect(cookiesOf(res)).toHaveLength(0);
    });

    it("returns 500 when sending the verification email fails for an unverified user", async () => {
      getUserByEmailRepo.mockResolvedValue({ ...activeUser, is_verified: 0 });
      sendVerificationEmail.mockRejectedValue(new Error("SMTP down"));

      const res = await login();

      expect(res.status).toBe(500);
    });

    it("does not leak DB, JWT or SMTP internals to the client", async () => {
      getUserByEmailRepo.mockRejectedValue(new Error("ER_PARSE_ERROR near 'SELECT * FROM users'"));
      const dbRes = await login();

      getUserByEmailRepo.mockResolvedValue(activeUser);
      getAccessAndRefreshToken.mockRejectedValue(new Error("JWT secret missing: ACCESS_TOKEN_SECRET"));
      const jwtRes = await login();

      expect(JSON.stringify(dbRes.body)).not.toMatch(/ER_PARSE_ERROR|SELECT|users/i);
      expect(JSON.stringify(jwtRes.body)).not.toMatch(/ACCESS_TOKEN_SECRET|JWT secret/i);
    });

    it("returns 500 even when something other than an Error is thrown", async () => {
      getUserByEmailRepo.mockRejectedValue("boom");

      const res = await login();

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

/*
 * If getAccessAndRefreshToken is defined INSIDE service.js (not helper.js):
 * you cannot mock it separately. Delete it from the helper.js mock above, and
 * instead mock what it uses, e.g. the repository call that stores the refresh
 * token (updateRefreshTokenRepo) and your jwt/sign helper. Then assert on
 * those mocks instead of getAccessAndRefreshToken. Send me that function and
 * I'll adapt this block.
 */