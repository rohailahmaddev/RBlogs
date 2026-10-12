export class ApiError extends Error {
  constructor(
    statusCode,
    message = "Something went wrong",
    code,
    errors,
    stack
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.data = null;
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}