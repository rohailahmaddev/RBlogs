import { prisma} from "../config/database.js"


export const getUserByEmailRepo = async (email) => {

    const user = await prisma.user.findUnique({
        where: { email: email }
    })

    return user;
}

export const getUserById = async (id) => {
    const user = await prisma.user.findUnique({
        where: { id: id }
    })
    return user;
}

export const updateVerificationEmailTokenRepo = async (userId, verifyToken, verifyTokenExpiry) => {
    const result = await prisma.user.update({
        where: { id: userId },
        data: {
            verify_token: verifyToken,
            verify_token_expiry: verifyTokenExpiry
        }
    })

    return result;
}

export const createUser = async ({ name, email, hashedPassword, bio, imageUrl, hashedToken, tokenExpiry }) => {
    const result = await prisma.user.create({
        data: {
            name: name,
            email: email,
            password: hashedPassword,
            avatar_url: imageUrl,
            bio: bio,
            verify_token: hashedToken,
            verify_token_expiry:   tokenExpiry
        }
    })
    return result;
}

export const verifyEmailRepo = async (hashedToken) => {
    const user = await prisma.user.update({
        where: {
            verify_token: hashedToken,
            verify_token_expiry: {
                gt: new Date(),
            },
        },
        data: {
            is_verified: true
        }
    })

    return user;
}

export const logoutUser = async (refreshToken) => {
    await prisma.user.update({
        where: { refresh_token: refreshToken },
        data: {
            refresh_token: null,
        }
    })
}

export const updateForgotPasswordToken = async (userId, hashedToken, tokenExpiry) => {
    const result = await prisma.user.update({
        where: { id: userId },
        data: {
            reset_token: hashedToken,
            reset_token_expiry: tokenExpiry
        }
    })
    return result;
}

export const getUserByResetPasswordToken = async (hashedToken) => {
    const result = await prisma.user.findMany({
        where: {
            reset_token: hashedToken,
            reset_token_expiry: {
                lt: new Date(),
            }
        }
    })

    return result;
}

export const updateUserPasswordById = async (userId, newPassword) => {
    await prisma.user.update({
        where: { id: userId },
        data: { password: newPassword }
    })
}
