import { env } from "../config/env.js";
import crypto from "crypto";

export const getAccessToken = (user) => {
  return jwt.sign({
    id:user.id,
    email:user.email,
    fullname:user.full_name,
  },
  env.ACCESS_TOKEN_SECRET,
  { expiresIn:env.ACCESS_TOKEN_EXPIRY });
}

export const getRefreshToken = (user)=> {

  return jwt.sign({
    id:user.id,
  },
  env.REFRESH_TOKEN_SECRET,
  { expiresIn:env.REFRESH_TOKEN_EXPIRY}
  );
}

export const getTemporaryToken = () => {

  const unHashedToken = crypto.randomBytes(20).toString("hex")

  const hashedToken = crypto.createHmac('sha256', env.TEMPORARY_TOKEN_SECRET)
               .update(unHashedToken)
               .digest('hex');
  
  const tokenExpiry = new Date(Date.now() + 20 * 60 * 1000);

  return { unHashedToken, hashedToken, tokenExpiry }

}
