import {Router} from "express"
// import { addBlog, deleteBlog, getBlogs, getSingleBlog, loginUser, logoutUser, registerUser, updateBlog } from "../modules/index.controllers.js";
import {verifyJWT, verifyAdmin} from "../middleware/auth.middleware.js"
import upload from "../middleware/multer.middleware.js";
import { loginSchema, registerSchema, resetPasswordSchema } from "../validator/auth.validations.js";
import { loginUserController, logoutUserController, registerUserController, resendVerificationEmailController, resetPasswordController, verifyEmailController } from "../modules/controller.js";
import { validateSchema } from "../middleware/validate.middleware.js";

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
  resendVerificationEmailController
)

router.route("/login").post(
  validateSchema(loginSchema),
  loginUserController
)

router.route("/logout").post(
  verifyJWT,
  logoutUserController
)

router.route("/reset-password/:token").post(
  validateSchema(resetPasswordSchema),
  resetPasswordController
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