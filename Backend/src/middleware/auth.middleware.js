import jwt from "jsonwebtoken"
import { asyncHandler } from "../utils/asyncHandler";
import { ROLES } from "../modules/RBAC/role";

//verify user
export const verifyJWT = asyncHandler ( async(req, res, next) => {
    const token = req.cookies.token 
  
    if (!token) {
      throw new ApiError(401, "Please login to continue.");
    }
  
    try {
    
      const decoded = jwt.verify(token, process.env.JWT_SECRET)

      const user = await getUserById(decoded.id);
      if (!user) throw new ApiError(401, "User no longer exists. Please login again.");

      // Only what routes need. Never attach the whole row (it has the password hash).
      req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
      req.user = decoded 
      next()        

    } catch (error) {
      throw new ApiError(
        401,
        error.name === "TokenExpiredError"
          ? "Session expired. Please login again."
          : "Invalid token. Please login again."
      );
    }
})

//verify admin
export const verifyAdmin = (req, res, next) => {
    const token = req.cookies.token
  
    if (!token) throw new ApiError(401, "Please login to continue.");
  
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
  
      if (decoded.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' })
      }

      req.user = decoded
      next()
    } catch (err) {
      return res.status(401).json({ message: 'Invalid token' })
    }
}

export const authorizeRole = (...allowedRoles) => {

  const valid = Object.values(ROLES)

  for(const role of allowedRoles){
    if(!valid.includes(role)) throw new Error(`Unknown role: ${role}`)
  }

  return (req, res, next) => {
    if(!req.user) return next(new ApiError(401, "Please login to continue."));

    if(!allowedRoles.includes(req.user.role)){
      return next(new ApiError(403, "You do not have permission to do this."));
    }

    next();
  }
}
