import { Router } from "express"
// import { addBlog, deleteBlog, getBlogs, getSingleBlog, loginUser, logoutUser, registerUser, updateBlog } from "../modules/index.controllers.js";
import { verifyJWT, verifyAdmin, authorizeRole } from "../middleware/auth.middleware.js"
import upload from "../middleware/multer.middleware.js";
import { forgotPasswordSchema, loginSchema, registerSchema, resendVerificationEmailSchema, resetPasswordSchema } from "../validator/auth.validations.js";
import { addBlogPostController, forgotPasswordController, loginUserController, logoutUserController, registerUserController, resendVerificationEmailController, resetPasswordController, verifyEmailController } from "../modules/controller.js";
import { validateSchema } from "../middleware/validate.middleware.js";
import { ROLES } from "../utils/contants.js";
import { createPostSchema } from "../validator/post.validations.js";

const router = Router();


router.route("/register").post(
  upload.single("avatar"),
  validateSchema(registerSchema),
  registerUserController
)

router.route("/email-verify/:token").post(
  verifyEmailController
)

router.route("/resend-verification-email").post(
  validateSchema(resendVerificationEmailSchema),
  resendVerificationEmailController
)

router.route("/login").post(
  validateSchema(loginSchema),
  loginUserController
)

router.route("/logout").post(
  logoutUserController
)

router.route("/forgot-password").post(
  validateSchema(forgotPasswordSchema),
  forgotPasswordController
)

router.route("/reset-password/:token").post(
  validateSchema(resetPasswordSchema),
  resetPasswordController
)


//post routes
router.route("/create-post").post(
  verifyJWT,
  authorizeRole(ROLES.PUBLISHER, ROLES.ADMIN),
  upload.single("file"),
  validateSchema(createPostSchema),
  addBlogPostController
)






// router.route("/login").post(loginUser)
// router.route("/blogs").get(getBlogs)
// router.route("/blogs/:id").get(getSingleBlog)
// router.route("/logout").post(logoutUser)

// //protect route

// router.route("/me").get(verifyToken,(req, res) => { res.json({ id: req.user.id, name: req.user.name, role: req.user.role })})
// router.route("/add-blogs").post(
//     verifyAdmin,
//     upload.single("image"),
//     addBlog
//   );
// router.route("/blogs/:id").delete(verifyAdmin, deleteBlog)
// router.route("/update-blog/:id").put(
//     verifyAdmin,
//     upload.single("image"),
//     updateBlog
//   );

export default router