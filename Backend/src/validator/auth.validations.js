import { z } from "zod";

//register
export const registerSchema = z.object({
 name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must not exceed 50 characters"),
 
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Invalid email address"),
 
  password: z
    .string()
    .trim()
    .min(8, "Password must be at least 8 characters")
    .max(10, "Password must not exceed 10 characters"),
 
  bio: z
    .string()
    .trim()
    .max(300, "Bio must not exceed 300 characters")
    .optional(),
});

//login
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Invalid email address"),

  password: z
    .string()
    .trim()
    .min(1, "Password is required"),
});

//forgotPassword
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Invalid email address"),
});

//reset password
export const resetPasswordSchema = z.object({
  token: z
    .string()
    .trim()
    .min(1, "Reset token is required"),

  password: z
    .string()
    .trim()
    .min(8, "Password must be at least 8 characters")
    .max(10, "Password must not exceed 10 characters"),
});

// changePassword
export const changePasswordSchema = z
  .object({
    current_password: z
      .string()
      .trim()
      .min(1, "Current password is required"),

    new_password: z
      .string()
      .trim()
      .min(8, "New password must be at least 8 characters")
      .max(10),

    confirm_password: z
      .string()
      .trim()
      .min(1, "Confirm password is required"),
  })
  .refine(
    (data) => data.new_password === data.confirm_password,
    {
      message: "Passwords do not match",
      path: ["confirm_password"],
    }
  );