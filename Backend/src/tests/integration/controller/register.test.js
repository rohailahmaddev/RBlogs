import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import fs from "node:fs/promises";

/* ------------------------------------------------------------------ */
/*  Mock everything that talks to the outside world                    */
/*  (database, Cloudinary, email). Paths are relative to THIS file,    */
/*  so keep it next to service.js.                                     */
/* ------------------------------------------------------------------ */
vi.mock("../../../modules/repository.js", () => ({
  getUserByEmailRepo: vi.fn(),
  createUser : vi.fn(),
  updateVerificationEmailTokenRepo: vi.fn(),
}));

vi.mock("../../../infrastructure/email/email.services.js", () => ({
  sendVerificationEmail: vi.fn(),
}));

vi.mock("../../../infrastructure/storage/cloudinary.storage.js", () => ({
  uploadOnCloudinary: vi.fn(),
  deleteFromCloudinary: vi.fn(),
}));

// Imported AFTER the mocks above (vi.mock is hoisted by Vitest)
import app from "../../../app.js";

import {
  getUserByEmailRepo,
  createUser ,
  updateVerificationEmailTokenRepo,
} from "../../../modules/repository.js";
import { sendVerificationEmail } from "../../../infrastructure/email/email.services.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../../../infrastructure/storage/cloudinary.storage.js";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const REGISTER_URL = "/api/v1/user/register"; // <- change to your real route

const validBody = {
  name: "Rohail",
  email: "rohail@example.com",
  password: "Password12",
  bio: "Full-stack developer",
};

// 1x1 transparent PNG
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64"
);

/** Sends a multipart request (your route uses multer, so it must be multipart). */
function register(fields = validBody, { avatar = false } = {}) {
  let req = request(app).post(REGISTER_URL);
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) req = req.field(key, value);
  }
  if (avatar) {
    req = req.attach("avatar", PNG, { filename: "avatar.png", contentType: "image/png" });
  }
  return req;
}

const UPLOADED = { url: "https://res.cloudinary.com/demo/avatar.png", public_id: "avatars/abc123" };

beforeEach(() => {
  vi.resetAllMocks();
  // Happy-path defaults; individual tests override what they need
  getUserByEmailRepo.mockResolvedValue(null);
  createUser.mockResolvedValue({ id: 1 });
  updateVerificationEmailTokenRepo.mockResolvedValue(undefined);
  sendVerificationEmail.mockResolvedValue(undefined);
  uploadOnCloudinary.mockResolvedValue(UPLOADED);
  deleteFromCloudinary.mockResolvedValue(undefined);
});

// multer saves uploads to disk; the mocked uploader never deletes them
afterEach(async () => {
  const paths = uploadOnCloudinary.mock.calls.map(([p]) => p).filter(Boolean);
  await Promise.all(paths.map((p) => fs.rm(p, { force: true })));
});

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */
describe("POST /register", () => {
  describe("success", () => {
    it("creates the user, hashes the password and sends a verification email", async () => {
      const res = await register();

      expect(res.status).toBe(201);
      expect(res.body.message).toMatch(/verification email sent/i);
      expect(res.body.data.user).toMatchObject({
        id: 1,
      });

      // The DB gets a HASH, never the plain password
      const saved = createUser.mock.calls[0][0];
      expect(saved.hashedPassword).toBeTypeOf("string");
      expect(saved.hashedPassword).not.toBe(validBody.password);
      expect(saved.hashedPassword.length).toBeGreaterThan(20);

      // The DB gets the HASHED token, the email gets the RAW one
      const [, , rawToken] = sendVerificationEmail.mock.calls[0];
      expect(rawToken).toBeTruthy();
      expect(saved.hashedToken).toBeTruthy();
      expect(rawToken).not.toBe(saved.hashedToken);

      // Token expires in the future
      expect(new Date(saved.tokenExpiry).getTime()).toBeGreaterThan(Date.now());

      expect(uploadOnCloudinary).not.toHaveBeenCalled();
    });

    it("never leaks the password or tokens in the response", async () => {
      const res = await register();
      const body = JSON.stringify(res.body);

      expect(res.body.data.user).not.toHaveProperty("password");
      expect(res.body.data.user).not.toHaveProperty("hashedPassword");
      expect(body).not.toContain(validBody.password);
      expect(body).not.toMatch(/token/i);
    });

    it("works without bio and without avatar", async () => {
      const res = await register({ ...validBody, bio: undefined });

      expect(res.status).toBe(201);
      expect(createUser).toHaveBeenCalledTimes(1);
    });

    it("uploads the avatar and stores its URL", async () => {
      const res = await register(validBody, { avatar: true });
      expect(res.status).toBe(201);
      expect(uploadOnCloudinary).toHaveBeenCalledTimes(1);
      expect(createUser).toHaveBeenCalledWith(
        expect.objectContaining({ imageUrl: UPLOADED.url })
      );
    });
  });

  describe("validation", () => {
    it.each([
      ["invalid email", { email: "not-an-email" }],
      ["missing email", { email: undefined }],
      ["password shorter than 8", { password: "short" }],
      ["password longer than 10", { password: "x".repeat(11) }],
      ["missing password", { password: undefined }],
      ["one-letter name", { name: "A" }],
      ["missing name", { name: undefined }],
      ["bio longer than 300", { bio: "b".repeat(301) }],
    ])("rejects %s with 400 and touches nothing", async (_label, override) => {
      const res = await register({ ...validBody, ...override });

      expect(res.status).toBe(400); // use 422 if your validate() middleware does
      expect(getUserByEmailRepo).not.toHaveBeenCalled();
      expect(createUser).not.toHaveBeenCalled();
      expect(sendVerificationEmail).not.toHaveBeenCalled();
    });
  });

  describe("existing users", () => {
    it("returns 409 for an already verified user and sends nothing", async () => {
      getUserByEmailRepo.mockResolvedValue({ id: 7, email: validBody.email, is_verified: true });

      const res = await register();
      
      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/already exist/i);
      expect(createUser).not.toHaveBeenCalled();
      expect(sendVerificationEmail).not.toHaveBeenCalled();
    });

    it("returns 409 for an unverified user and re-sends the verification email", async () => {
      getUserByEmailRepo.mockResolvedValue({ id: 7, email: validBody.email, is_verified: false });

      const res = await register();

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/not verified/i);
      expect(updateVerificationEmailTokenRepo).toHaveBeenCalledWith(
        7,
        expect.any(String), // hashed token
        expect.anything() // expiry
      );
      expect(sendVerificationEmail).toHaveBeenCalledTimes(1);
      expect(createUser).not.toHaveBeenCalled();
    });

    it("returns 500 if the new verification token cannot be saved", async () => {
      getUserByEmailRepo.mockResolvedValue({ id: 7, email: validBody.email, is_verified: false });
      updateVerificationEmailTokenRepo.mockRejectedValue(new Error("db down"));

      const res = await register();

      expect(res.status).toBe(500);
      expect(sendVerificationEmail).not.toHaveBeenCalled();
    });
  });

  describe("failures", () => {
    it("returns 502 when the avatar upload fails and creates no user", async () => {
      uploadOnCloudinary.mockRejectedValue(new Error("network down"));

      const res = await register(validBody, { avatar: true });

      expect(res.status).toBe(502);
      expect(res.body.message).toMatch(/failed to upload avatar/i);
      expect(createUser).not.toHaveBeenCalled();
      expect(sendVerificationEmail).not.toHaveBeenCalled();
    });

    it("deletes the uploaded avatar when creating the user fails", async () => {
      createUser.mockRejectedValue(new Error("db down"));

      const res = await register(validBody, { avatar: true });

      expect(res.status).toBe(500);
      expect(deleteFromCloudinary).toHaveBeenCalledWith(UPLOADED.public_id);
      expect(sendVerificationEmail).not.toHaveBeenCalled();
    });

    it("does not call Cloudinary delete when there was no avatar", async () => {
      createUser.mockRejectedValue(new Error("db down"));

      const res = await register();

      expect(res.status).toBe(500);
      expect(deleteFromCloudinary).not.toHaveBeenCalled();
    });

    it("returns 409 and cleans up when the email is taken between check and insert (race)", async () => {
      createUser.mockRejectedValue(Object.assign(new Error("dup"), { code: "ER_DUP_ENTRY" }));

      const res = await register(validBody, { avatar: true });

      expect(res.status).toBe(409);
      expect(deleteFromCloudinary).toHaveBeenCalledWith(UPLOADED.public_id);
      expect(sendVerificationEmail).not.toHaveBeenCalled();
    });

    it("returns 500 when the email cannot be sent (user stays unverified and can retry)", async () => {
      sendVerificationEmail.mockRejectedValue(new Error("smtp down"));

      const res = await register();

      expect(res.status).toBe(500);
      expect(createUser).toHaveBeenCalledTimes(1);
    });
  });
});