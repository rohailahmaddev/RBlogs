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
                verify_token: hashedToken,
                verify_token_expiry: { gt: new Date() },
            },
            data: { is_verified: true, verify_token: null, verify_token_expiry: null },
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
export const getBlogById = async(id) => {
    return prisma.posts.findUnique({
        where:{id:id}
    })
}

export const createBlogs = async({ userId, title, slug, content, coverImage, categoryId, status, read_time, excerpt, imagePublicId }) => {
    await prisma.posts.create({
            data:{
            author_id:userId,
            category_id:categoryId,
            title:title,
            slug:slug,
            excerpt:excerpt,
            content:content,
            cover_url:coverImage,
            public_id:imagePublicId,
            status:status,
            read_time:read_time,
            notify_at:null,
        }
})
}

export const deleteBlogById = async(id) => {
    return await prisma.posts.delete({
        where:{id:id}
    })
}

export const updateBlogById = async({ blogId, data }) => {
    console.log("blogid",blogId)
    console.log("data",data);
    return await prisma.posts.update({
        where:{id:blogId},
        data: data
    })
}

export const getBlogs = async({categoryId, authorId, status, search, page, limit, offset}) => {
    const where = {
        ...(categoryId && { category_id: categoryId }),
        ...(authorId && { author_id: authorId }),
        ...(status && { status: status }),
        ...(search && {
            OR: [
                {title:{contains: search}},
                {excerpt:{contains: search}},
            ]
        })
    }

    const orderBy = 
    status === "draft" ?[ { created_at: "desc" }, { id: "desc" } ] : [{ published_at: "desc" } , { id: "desc" }];

    const [rows,total] = await prisma.$transaction([
    prisma.posts.findMany({
        where,
        orderBy,
        skip: offset,
        take: limit,
        select: {
            id: true,
            title: true,
            slug: true,
            excerpt: true,
            cover_url: true,
            read_time: true,
            status: true,
            published_at: true,
            created_at: true,
            category: { select: { id: true, name: true } },
            author: { select: { id: true, name: true } },
        },
    }),
     prisma.posts.count({ where }),
    ]);
     
    return {rows, total};
}

export const deleteBlogPost = async(blogId) => {
    await prisma.posts.delete({
        where:{id:blogId}
    })
}


//category
export const getCategory = async(categoryId) => {
    return await prisma.categories.findUnique({
        where:{id:categoryId}
    })
}

