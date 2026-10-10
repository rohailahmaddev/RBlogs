import nodemailer from "nodemailer"
import {env} from "../../config/env.js"


export const transporter = nodemailer.createTransport({
    host: env.MAILTRAP_SMTP_HOST,
    port: env.MAILTRAP_SMTP_PORT,
    auth: {
      user: env.MAILTRAP_SMTP_USER,
      pass: env.MAILTRAP_SMTP_PASSWORD
    }
});