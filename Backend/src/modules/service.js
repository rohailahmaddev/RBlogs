import crypto from "crypto"
import { env } from "../config/env.js";
import fs from "node:fs/promises";
import { sendFogotPasswordEmail, sendVerificationEmail } from "../infrastructure/email/email.services.js";
import { deleteFromCloudinary, uploadOnCloudinary } from "../infrastructure/storage/cloudinary.storage.js";
import { ApiError } from "../utils/ApiError.js";
import { calculateReadTime, comparePassword, createSlug, extractText, generateExcerpt, getAccessAndRefreshToken, getErrorMessage, hashPassword, hashToken, isDuplicateError } from "../utils/helper.js";
import { getTemporaryToken } from "../utils/jwt.js";
import { ROLES, SELF_REGISTER_ROLES } from "../utils/contants.js";
import { clearForgotPasswordToken, createBlogs, createUser, getCategory, getUserByEmailRepo, getUserByResetPasswordToken, logoutUser, updateForgotPasswordToken, updateUserPasswordById, updateVerificationEmailTokenRepo, verifyEmailRepo } from "./repository.js";

const sendEmailService = async (user, req) => {
    const { unHashedToken, hashedToken, tokenExpiry } = getTemporaryToken()

    try {
        await updateVerificationEmailTokenRepo(user.id, hashedToken, tokenExpiry)
    } catch (error) {
        throw new ApiError(500, "Something went wrong.")
    }

    await sendVerificationEmail(user, req, unHashedToken)
}

const uploadImage = async (imageLocalPath) => {

    try {
        return await uploadOnCloudinary(imageLocalPath)
    } catch (error) {
        throw new ApiError(500, `Something went wrong.`)
    }

}

export const userRegisterService = async ({
    name,
    email,
    password,
    bio,
    role = ROLES.READER,
    req,
    avatarLocalPath }) => {

    if (!SELF_REGISTER_ROLES.includes(role)) {
        throw new ApiError(400, "Role must be READER or PUBLISHER");
    }

    const existingUser = await getUserByEmailRepo(email)

    if (existingUser) {
        if (existingUser.is_verified) {
            throw new ApiError(409, "User already exist. Please login.")
        }

        if (!existingUser.is_verified) {
            await sendEmailService(existingUser, req);
            throw new ApiError(409, "User already exist but not verified. Please check your email for verification link.")
        }

    }

    let avatarImage = null;
    if (avatarLocalPath) {
        avatarImage = await uploadImage(avatarLocalPath)
    }

    const { unHashedToken, hashedToken, tokenExpiry } = getTemporaryToken()
    const imageUrl = avatarImage?.url ?? null;
    const hashedPassword = await hashPassword(password)

    let result;
    try {
        result = await createUser({ name, email, hashedPassword, bio, role, imageUrl, hashedToken, tokenExpiry })
    } catch (error) {
        if (avatarImage?.public_id) {
            await deleteFromCloudinary(avatarImage.public_id)
        }

        // duplicate email error check.
        if (isDuplicateError(error)) {
            throw new ApiError(409, "User already exist. Please login.");
        }

        throw new ApiError(500, `Failed to create the user.`)
    }

    const insertedUser = {
        id: result.id,
        name,
        email,
        role
    };

    await sendVerificationEmail(insertedUser, req, unHashedToken);

    return insertedUser;
}

const VERIFY_FAILED_MESSAGE = "Invalid user or verification time is over. Please request a new verification email.";

export const verifyEmailService = async (unhashedToken) => {

    if (unhashedToken.trim() === '') {
        throw new ApiError(400, "Token is not present. Please resend verification email")
    }

    const hashedToken = hashToken(unhashedToken)

    let result;
    try {

        result = await verifyEmailRepo(hashedToken)

    } catch (error) {

        console.error("verifyEmailService failed:", error);
        throw new ApiError(500, `Something went wrong.}`)
    }


    if (!result) {
        throw new ApiError(400, VERIFY_FAILED_MESSAGE)
    }

    const verifiedUser = {
        id: result.id,
        name: result.name,
        email: result.email,
    }

    return verifiedUser;
}

// without testing

export const resendVerificationEmailService = async (email, req) => {

    if (typeof email !== "string" || email.trim() === "") {
        throw new ApiError(400, "Please provide register email for resend verification email.")
    }

    let user;
    try {
        user = await getUserByEmailRepo(email.trim())
    } catch (error) {
        throw new ApiError(500, "Something went wrong.")
    }


    if (!user) {
        throw new ApiError(400, "Invalid email. Please register first.")
    }

    if (user.is_verified) {
        throw new ApiError(409, "User already verified. Please login.")
    }

    await sendEmailService(user, req)

    return null;
}

const passwordCheckService = async (password, user) => {

    const isPasswordMatch = await comparePassword(password, user.password)

    if (!isPasswordMatch) {
        throw new ApiError(401, `Invalid login credentials`)
    }
    return isPasswordMatch;

}

export const loginUserService = async (email, password, req) => {

    const user = await getUserByEmailRepo(email)

    if (!user) {
        throw new ApiError(400, "Invalid login credentials.")
    }

    // if (!user.is_active) {
    //     throw new ApiError(403, "Your account is blocked please contact support service.")
    // }
    const isPasswordMatch = await passwordCheckService(password, user)

    if (isPasswordMatch) {
        if (!user.is_verified) {
            await sendEmailService(user, req);
            throw new ApiError(409, "User already exist but not verified. Please check your email for verification link.")
        }

        const { accessToken, refreshToken } = await getAccessAndRefreshToken(user.id);

        const cookieOptions = {
            httpOnly: true,
            secure: env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        };

        const loggedInUser = {
            full_name: user.name,
            email: user.email,
        };

        return { loggedInUser, cookieOptions, accessToken, refreshToken };
    }
}

export const logoutUserService = async (accessToken, refreshToken) => {
    if (typeof accessToken !== "string" || !accessToken || accessToken.trim() === '' || !refreshToken || refreshToken.trim() === '') {
        throw new ApiError(400, "No tokens found in cookies")
    }

    const hashedRefreshToken = hashToken(refreshToken)

    try {
        await logoutUser(hashedRefreshToken)
    } catch (error) {
        console.error(error)
        throw new ApiError(500, "Failed to logout.")
    }

}

export const forgotPasswordService = async (email, req) => {

    let user;
    try {
        user = await getUserByEmailRepo(email)
    } catch (error) {
        throw new ApiError(500, "Failed to fetch user info try again.")
    }

    if (!user) {
        throw new ApiError(401, "Invalid user.")
    }

    const { unHashedToken, hashedToken, tokenExpiry } = getTemporaryToken()

    try {
        await updateForgotPasswordToken(user?.id, hashedToken, tokenExpiry);
    } catch (error) {
        throw new ApiError(500, "Failed to generate the tokens try again")
    }

    try {
        await sendFogotPasswordEmail(user, req, unHashedToken);
    } catch (error) {
        // Remove the token that the user never received.
        try {
            await clearForgotPasswordToken(user.id);
        } catch (cleanupError) {
            console.error("Failed to clear password reset token:", cleanupError);
        }
        throw new ApiError(500, "Unable to send the password reset email. Please try again.");
    }

    return null;
}

export const resetPasswordService = async (unhashedToken, newPassword) => {
    const hashedToken = hashToken(unhashedToken)

    let user;
    try {
        user = await getUserByResetPasswordToken(hashedToken)
    } catch (error) {
        throw new ApiError(500, "Failed to found the user try again.")
    }

    if (!user || user.length === 0) {
        throw new ApiError(400, "Invalid user or reset time is over. Please request a new password reset link.")
    }

    if (!user[0]?.id) {
        throw new ApiError(400, "Invalid user or reset time is over. Please request a new password reset link.")
    }

    const hashedPassword = await hashPassword(newPassword)

    try {
        await updateUserPasswordById(user[0]?.id, hashedPassword)
    } catch (error) {
        throw new ApiError(500, "Failed to update the password try again.")
    }

    return;

}

export const getAllUserService = async (req) => {

}



//blogs posts

const postStatus = {
    draft: "draft",
    published: "published"
}

export const addBlogPostService = async (req) => {
    const { title, excerpt, content, category, status = "draft" } = req.body;
    const userId = req?.user.id;
    const fileLocalPath = req?.file?.path;

    const allowedStatus = Object.values(postStatus)
    const MAX_SLUG_ATTEMPTS = 5;

    // if (
    //   typeof category === "string" &&
    //   category.trim() !== "" &&
    //   !Number.isNaN(Number(category))
    // ) {
    //   throw new ApiError(400, "Provided category must not be a number.");
    // }

    if (!allowedStatus.includes(status)) throw new ApiError(400, `Unknown status:${status}`)

    let coverImage = null;
    try {

        const categoryRecord = await getCategory(category);
        if (!categoryRecord) throw new ApiError(404, "Category not found.");

        if (fileLocalPath) {
            coverImage = await uploadImage(fileLocalPath)
        }

        const excerptContent = excerpt || generateExcerpt(extractText(content));
        const read_time = calculateReadTime(content);
        const baseSlug = createSlug(title) || "untitled";

        for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
            const slug = attempt === 0 ? baseSlug : `${baseSlug}-${crypto.randomBytes(3).toString("hex")}`;
            try {
                return await createBlogs({
                    userId,
                    title,
                    slug,
                    content,
                    excerpt: excerptContent,
                    read_time,
                    status,
                    categoryId: categoryRecord.id,
                    coverImage: coverImage?.url ?? null,
                    imagePublicId: coverImage?.public_id ?? null,
                });
            } catch (error) {
               
                if (error?.code !== "P2002") throw error; // only retry unique violations
            }
        }

        throw new ApiError(409, "Could not generate a unique slug. Please try again.");

    } catch (error) {

        if (coverImage?.public_id) {
            try {
                await deleteFromCloudinary(coverImage?.public_id);
            } catch (cleanupError) {
                console.error("Failed to clean up uploaded image:", cleanupError);
            }
        }

        if (error instanceof ApiError) throw error
        throw new ApiError(500, `Something went wrong.`)
    }  finally {
       if (fileLocalPath) await fs.unlink(fileLocalPath).catch(() => {});
    }

}