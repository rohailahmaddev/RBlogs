import { ROLES } from "../utils/contants"
import { asyncHandler } from "../utils/asyncHandler"

const canManagePost = (user, post) => {
    return user.role === ROLES.ADMIN || post.author_id === user.id
}




export const requirePostOwnerOrAdmin = (getPostById, param = "id") => 
    asyncHandler( async (req, res, next) => {
        
        const id = req.params[param];

        if(!Number.isInteger(id)) throw new ApiError(404, "Post not found.");

        const post = await getPostById(id);

        if(!post) throw new ApiError(404, "Post not found.");

        if(!canManagePost(req.user, post))  {
            throw new ApiError(403, "You can only manage your own posts.");
        }

        req.post = post;
        next();
    })