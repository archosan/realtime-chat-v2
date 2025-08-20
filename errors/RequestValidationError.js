import { CustomError } from "./CustomError.js";

export class RequestValidationError extends CustomError {
  constructor(errors) {
    super("Invalid request parameters");
    this.statusCode = 400;
    this.errors = errors;
  }

  serializeErrors() {
    return this.errors.map((err) => {
      if (err.type === "field") {
        return { message: err.msg, field: err.path };
      }
      return { message: err.msg || err.message };
    });
  }
}
