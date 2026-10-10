import { z } from "zod";
import { requiredString } from "../utils/helper";

//register
export const registerSchema = z.object({
 name: requiredString("name")
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must not exceed 50 characters"),
 
  email: requiredString("email")
    .trim()
    .toLowerCase()
    .min(1, "Please provide register email.")
    .email("Invalid email address"),
 
  password: requiredString("password")
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
  email:requiredString("email")
    .trim()
    .toLowerCase()
    .min(1,"Please provide register email")
    .email("Invalid email address"),

  password: requiredString("password")
    .trim()
    .min(8, "Password must be at least 8 characters")
    .max(10, "Password must not exceed 10 characters"),
});

//forgotPassword
export const forgotPasswordSchema = z.object({
  email:requiredString("email")
    .trim()
    .toLowerCase()
    .min(1, "Please provide register email") 
    .email("Invalid email address"),
});

//resendVerificationEmail
export const resendVerificationEmailSchema = z.object({
  email: requiredString("email")
    .trim()
    .toLowerCase()
    .min(1, "Please provide register email")   // "" or "   " counts as missing
    .email("Invalid email address"),
});

//reset 
export const resetPasswordSchema = z.object({
  token: z
    .string()
    .trim()
    .min(1, "Reset token is required"),

  password: requiredString("password")
    .trim()
    .min(8, "Password must be at least 8 characters")
    .max(10, "Password must not exceed 10 characters"),
});

// changePassword
export const changePasswordSchema = z
  .object({
    current_password: requiredString("Current password")
    .trim()
    .min(8, "Password must be at least 8 characters")
    .max(10, "Password must not exceed 10 characters"),

    new_password: requiredString("New password")
    .trim()
    .min(8, "Password must be at least 8 characters")
    .max(10, "Password must not exceed 10 characters"),

    confirm_password: requiredString("Confirm password")
    .trim()
    .min(8, "Password must be at least 8 characters")
    .max(10, "Password must not exceed 10 characters"),
  })
  .refine(
    (data) => data.new_password === data.confirm_password,
    {
      message: "Passwords do not match",
      path: ["confirm_password"],
    }
  );