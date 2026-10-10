import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { forgotPasswordService, loginUserService, logoutUserService, resendVerificationEmailService, resetPasswordService, userRegisterService, verifyEmailService } from "./service.js";

export const registerUserController = asyncHandler(async (req,res) => {
    const { name, email, password, bio } = req.body;

    const avatarLocalPath = req.file?.path;
    const user = await userRegisterService({
        name,
        email,
        password,
        bio,
        req,
        avatarLocalPath
    })

    return res
        .status(201)
        .json(new ApiResponse(
            201,
            "Verification Email sent to your registered email. Please verify your email.",
            { user: user }
        ))
})

export const verifyEmailController = asyncHandler(async (req, res) => {
    const { token: unhashedToken } = req.params;

    const verifiedUser = await verifyEmailService(unhashedToken);

    return res.status(200)
        .json(new ApiResponse(200, "User verified successfully. Please login to continue.",
            { user: verifiedUser }
        ))
})

// without testing
export const resendVerificationEmailController = asyncHandler(async (req, res) => {
    const { email } = req.body;
    await resendVerificationEmailService(email, req)
    return res
        .status(200)
        .json(new ApiResponse(200, "Verification email resent successfully. Please check your email for the verification link."))
})

export const loginUserController = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const loginResult = await loginUserService(email, password, req);

    const { loggedInUser, cookieOptions, accessToken, refreshToken } = loginResult;

    return res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(new ApiResponse(200, "User logged in successfully.", {
            user: loggedInUser,
            accessToken,
            refreshToken,
        }));
})

export const logoutUserController = asyncHandler(async (req, res) => {
    const { accessToken, refreshToken } = req.cookies;

    await logoutUserService(accessToken, refreshToken)

    // Clear the cookies
    return res
        .clearCookie("accessToken")
        .clearCookie("refreshToken")
        .json(new ApiResponse(200, "Logout successfully"))

})

export const forgotPasswordController = asyncHandler(async (req, res) => {
    const { email } = req.body

    await forgotPasswordService(email, req)

    return res
        .status(200)
        .json(new ApiResponse(200, "Please check your email for the reset link."))
})

export const resetPasswordController = asyncHandler(async (req, res) => {
    const { token: unhashedToken } = req.params;
    const { newPassword } = req.body;

    await resetPasswordService(unhashedToken, newPassword)

    return res
        .status(200)
        .json(new ApiResponse(200, "Password reset successfully. Please login with your new password."))
})
