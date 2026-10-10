import Mailgen from "mailgen";
import { passwordResetMailGenerator, verificationMailGenerator } from "./email.templates.js"
import { transporter } from "./email.config.js";
import { ApiError } from "../../utils/ApiError.js";
import { getErrorMessage } from "../../utils/helper.js";



const sendEmail = async ( options ) => {

  const mailGenerator = new Mailgen({
    theme: "default",
    product: {
      name: "3R Store",
      link: "https://3rstore.com"
    }
  })

  const emailTextual = mailGenerator.generatePlaintext(options.mailgenContent)
  const emailHTML = mailGenerator.generate(options.mailgenContent)

  try {
    await transporter.sendMail({
      from: "https://3rstore.com",
      to: options.email,
      subject: options.subject,
      text: emailTextual,
      html: emailHTML
    });
  } catch (error) {
    throw new ApiError(500, `Failed to send email. ${getErrorMessage(error)}`);
  }
  
};

export const sendVerificationEmail = async (user, req, unHashedToken) => {
    try {
      await sendEmail({
        email: user?.email,
        subject: "Please verify your email",
        mailgenContent: verificationMailGenerator(
          user?.full_name,
          `${req.protocol}://${req.get("host")}/api/auth/verify-email/${unHashedToken}`
        ),
      })
    } catch (error) {
      throw new ApiError(500, `Failed to send verification email. ${getErrorMessage(error)}`)
    }
}

export const sendFogotPasswordEmail = async (user, req, unHashedToken) => {
    try {
      await sendEmail({
        email: user?.email,
        subject: "Please reset your password.",
        mailgenContent: passwordResetMailGenerator(
          user?.full_name,
          `${req.protocol}://${req.get("host")}/api/auth/reset-password/${unHashedToken}`
        ),
      })
    } catch (error) {
      throw new ApiError(500, `Failed to reset password email. ${getErrorMessage(error)}`)
    }
}

