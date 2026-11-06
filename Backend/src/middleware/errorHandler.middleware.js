import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

import { getErrorMessage } from "../utils/helper.js";

export const errorHandler = ( err, req, res, next ) => {
  let error;

  if (err instanceof ApiError) {
    error = err;
  } else {
    const customErr = err;

    console.log(err);
    let statusCode = 500;
    let message = `Something went wrong.`;
    let code;
    let errors;

    // --- MySQL-specific errors ---
    if (customErr.code === "ER_DUP_ENTRY") {
      statusCode = 409;
      code="ER_DUP_ENTRY"
      message = "Duplicate entry. This record already exists.";
    } else if (
      customErr.code === "ER_NO_REFERENCED_ROW_2" ||
      customErr.code === "ER_NO_REFERENCED_ROW"
    ) {
      statusCode = 400;
      code = "ER_NO_REFERENCED_ROW"
      message = "Referenced record does not exist.";
    } else if (customErr.code === "ER_BAD_NULL_ERROR") {
      statusCode = 400;
      code = "ER_BAD_NULL_ERROR"
      message = "Missing required field.";
    } else if (customErr.code === "ER_DATA_TOO_LONG") {
      statusCode = 400;
      code = "ER_DATA_TOO_LONG"
      message = "One of the fields exceeds the allowed length.";
    }

    // auth errors
    else if (customErr.name === "TokenMissingError") {
      statusCode = 401;
      code = "TOKEN_MISSING"
      message = "Token is missing from the request.";
    } else if (customErr.name === "JsonWebTokenError") {
      statusCode = 401;
      code = "TOKEN_INVALID"
      message = "Token is invalid.";
    } else if (customErr.name === "TokenExpiredError") {
      statusCode = 401;
      code = "TOKEN_EXPIRED"
      message = "Token has expired.";
    } else if (customErr.name === "UserNotFoundError") {
      statusCode = 404;
      code = "USER_NOT_FOUND"
      message = "User not found.";
    } else if (customErr.name === "RoleNotAllowedError") {
      statusCode = 403;
      code = "ROLE_NOT_ALLOWED"
      message = "You do not have permission to perform this action.";
    } else if (customErr.name === "NotResourceOwnerError") {
      statusCode = 403;
      code = "NOT_RESOURCE_OWNER"
      message = "You are not the owner of this resource.";
    }

    // // --- JWT-specific errors (in case any slip through un-caught) ---
    // else if (customErr.name === "JsonWebTokenError") {
    //   statusCode = 401;
    //   code="JSON_WEBTOKEN_ERROR"
    //   message = "Invalid token";
    // } else if (customErr.name === "TokenExpiredError") {
    //   statusCode = 401;
    //   code = "TOKEN_EXPIRED_ERROR"
    //   message = "Token expired";
    // }

    error = new ApiError(statusCode, message, errors, err.stack);
  }

  const response = {
    success: false,
    statusCode: error.statusCode,
    message: error.message,
    // code:error.code,
    // errors: error.errors,
    // Only leak stack trace in development
    ...(env.NODE_ENV === "development" && { stack: error.stack }),
  };
  return res.status(error.statusCode).json(response);
};