import { z } from "zod";
import dotenv from "dotenv";
// import { requiredString } from "../utils/helper.js";

dotenv.config({
  path:"../.env"
})

const envSchema = z.object({
  // Application
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  PORT: z
    .coerce
    .number()
    .int()
    .positive()
    .default(8000),

  CORS_ORIGIN: z
    .string()
    .default("*"),

  // Database
  MYSQL_DATABASE: z
    .string()
    .min(1, "DATABASE_NAME is required"),

  MYSQL_HOST: z
    .string()
    .min(1, "DATABASE_HOST is required"),

  MYSQL_PORT: z
    .coerce
    .number()
    .int()
    .positive()
    .default(3306),

  MYSQL_USER: z
    .string()
    .min(1, "DATABASE_USER is required"),

  MYSQL_PASSWORD: z
    .string(),

  // JWT
  ACCESS_TOKEN_SECRET: z
    .string()
    .min(
      32,
      "ACCESS_TOKEN_SECRET must be at least 32 characters"
    ),

  ACCESS_TOKEN_EXPIRY: z
    .string()
    .default("7d"),

  REFRESH_TOKEN_SECRET: z
    .string()
    .min(
      32,
      "REFRESH_TOKEN_SECRET must be at least 32 characters"
    ),

  REFRESH_TOKEN_EXPIRY: z
    .string()
    .default("7d"),

  TEMPORARY_TOKEN_SECRET: z
    .string()
    .min(
      32,
      "TEMPORARY_TOKEN_SECRET must be at least 32 characters"
    ),

  // // Mailtrap
  MAILTRAP_SMTP_HOST: z
    .string()
    .default("sandbox.smtp.mailtrap.io"),

  MAILTRAP_SMTP_PORT: z
    .coerce
    .number()
    .int()
    .positive()
    .default(2525),

  MAILTRAP_SMTP_USER: z
    .string()
    .min(1, "MAILTRAP_SMTP_USER is required"),

  MAILTRAP_SMTP_PASSWORD: z
    .string()
    .min(1, "MAILTRAP_SMTP_PASSWORD is required"),

  // // Cloudinary
  CLOUD_NAME: z
    .string()
    .min(1, "CLOUD_NAME is required"),

  CLOUDINARY_API_KEY: z
    .string()
    .min(1, "CLOUDINARY_API_KEY is required"),

  CLOUDINARY_API_SECRET: z
    .string()
    .min(1, "CLOUDINARY_API_SECRET is required"),

  ADMIN_EMAIL: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Please provide register email")
    .email("Invalid email address"),

  ADMIN_PASSWORD: z
    .string()
    .min(4, "Password must be 4 digits long.")
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.log(typeof process.env.DATABASE_PASSWORD)
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;