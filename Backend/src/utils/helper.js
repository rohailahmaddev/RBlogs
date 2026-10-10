import { Prisma } from "../generated/prisma/client.ts";
import { env } from "../config/env.js";
import bcrypt from "bcrypt";
import crypto from "crypto"
import { ApiError } from "./ApiError.js";
import { getAccessToken, getRefreshToken } from "./jwt.js";
import { prisma } from "../config/database.js";
import z from "zod";

export const hashToken = (token) => {    
  return crypto.createHmac("sha256",env.TEMPORARY_TOKEN_SECRET).update(token).digest("hex");
}

export const hashPassword = async (password) => {
  const hashedPassword = await bcrypt.hash(password,10)
  return hashedPassword;
}

export const comparePassword = async (newPassword, userPassword) => {
  const isPassword = await bcrypt.compare(newPassword,userPassword)
  return isPassword;
}

export const getAccessAndRefreshToken = async (userId) => {

  const user = await prisma.user.findUnique({
    where:{id:userId},
  })

  if (!user) {
    throw new ApiError(404, `User with id ${userId} not found`, undefined);
  }

  try {

    const accessToken = getAccessToken(user);
    const refreshToken = getRefreshToken(user)
    // const refreshTokenExpiryMs = ms(env.REFRESH_TOKEN_EXPIRY);
    // const refreshTokenExpiry = new Date(Date.now() + refreshTokenExpiryMs);

    await prisma.$transaction( async (tx) => {
        await tx.user.update({
          where:{id:userId},
            data:{
              refresh_token:refreshToken, 
            }
        })
    })

    return { accessToken, refreshToken };

  } catch (error) {
    const message = error instanceof Error ? error.message: String(error)
    throw new ApiError(500, `Something went wrong. ${message}`)
  }
}

export function getErrorMessage(error) {
  // --- Prisma errors ---
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002": {
        const meta = error.meta 

        // Newer driver-adapter shape (e.g. MySQL via Prisma driver adapters)
        const constraintIndex = meta?.driverAdapterError?.cause?.constraint?.index;
        const originalMessage = meta?.driverAdapterError?.cause?.originalMessage;

        if (constraintIndex) {
          // e.g. "products_sku_key" -> "sku"
          const match = constraintIndex.match(/^[a-zA-Z0-9]+_(.+)_key$/);
          const field = match ? match[1] : constraintIndex;

          // Try to extract the actual duplicate value from originalMessage
          const valueMatch = originalMessage?.match(/Duplicate entry '(.+)' for key/);
          const value = valueMatch?.[1];

          return value
            ? `${field} "${value}" already exists`
            : `Duplicate value for: ${field}`;
        }

        // Fallback: older/standard Prisma shape (Postgres/SQLite, or older connector)
        const target = meta?.target;
        let fieldNames;
        if (Array.isArray(target)) {
          fieldNames = target.join(", ");
        } else if (typeof target === "string") {
          fieldNames = target;
        } else {
          fieldNames = "unknown field";
        }

        return `Duplicate value for: ${fieldNames}`;
      }

      case "P2003": {
        const field = error.meta?.field_name;
        return `Invalid reference: ${field ?? "related record"} does not exist`;
      }

      case "P2025":
        return "Record not found";

      case "P2000":
        return "Value too long for field";

      default:
        return `Database error (${error.code})`;
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return "Invalid data provided to database query";
  }

  // --- Cloudinary errors ---
  if (isCloudinaryError(error)) {
    return error.error?.message ?? "Image upload failed";
  }

  // --- Nodemailer / Mailtrap (SMTP) errors ---
  if (isSmtpError(error)) {
    switch (error.code) {
      case "EAUTH":
        return "Email authentication failed";
      case "ECONNECTION":
        return "Could not connect to email server";
      case "EENVELOPE":
        return "Invalid sender or recipient email address";
      case "ETIMEDOUT":
        return "Email server connection timed out";
      default:
        return "Failed to send email";
    }
  }

  // --- Axios / fetch-based HTTP errors ---
  if (isAxiosLikeError(error)) {
    return error.response?.data?.message ?? `Request failed (${error.response?.status ?? "unknown"})`;
  }

  // --- Zod validation errors (fallback, if one slips through unformatted) ---
  if (error instanceof Error && error.name === "ZodError") {
    return "Validation failed";
  }

  // --- Generic JS errors ---
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

// --- Type guards ---

function isCloudinaryError(
  error
){
  return typeof error === "object" && error !== null && "http_code" in error;
}

function isSmtpError(
  error
){
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (ErrorEvent).code === "string" &&
    ["EAUTH", "ECONNECTION", "EENVELOPE", "ETIMEDOUT"].includes((Error).code)
  );
}

function isAxiosLikeError(
  error
) {
  return typeof error === "object" && error !== null && "isAxiosError" in error;
}

export const isDuplicateError = (error) => error?.code === "ER_DUP_ENTRY" || error?.code === "P2002";

export const requiredString = (label) =>
  z.string({
    error: (issue) =>
      issue.input === undefined ? `Please provide register ${label}` : `${label} must be text`,
  });