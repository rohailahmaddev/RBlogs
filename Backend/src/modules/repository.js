import { prisma } from "../config/database.js"


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

export const createUser = async ({ name, email, hashedPassword, bio, role, imageUrl, hashedToken, tokenExpiry }) => {
    const result = await prisma.user.create({
        data: {
            name: name,
            email: email,
            password: hashedPassword,
            avatar_url: imageUrl,
            bio: bio,
            role:role,
            verify_token: hashedToken,
            verify_token_expiry: tokenExpiry
        }
    })
    return result;
}

export const verifyEmailRepo = async (hashedToken) => {
    try {
        return await prisma.user.update({
            where: {
                verifyToken: hashedToken,
                verifyTokenExpiry: { gt: new Date() },
            },
            data: { isVerified: true, verifyToken: null, verifyTokenExpiry: null },
            select: { id: true, name: true, email: true },
        });
    } catch (error) {
        if (error.code === "P2025") return null;
        throw error;
    }
};

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

export const clearForgotPasswordToken = async (userId) => {
    return prisma.user.update({
        where: { id: userId },
        data: {
            reset_token: null,
            reset_token_expiry: null,
        },
    });
};

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


//blog posts
export const createBlogs = async({ userId, title, content, coverImage, categoryId, status, read_time, excerpt, imagePublicId, tx }) => {
    await tx.posts.create({
        user_id:userId,
        category_id:categoryId,
        title:title,
        slug:slug,
        excerpt:excerpt,
        content:content,
        cover_url:coverImage,
        public_id:imagePublicId,
        status:status,
        read_time:read_time,
        notity_at:null,
    })
}

//category
export const getCategory = async(categroy,tx) => {
    return await tx.categories.findUnique({
        where:{name:categroy}
    })
}