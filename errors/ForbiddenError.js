import { CustomError } from "./CustomError.js";

export class ForbiddenError extends CustomError {
  constructor(message = "Forbidden") {
    super(message);
    this.statusCode = 403;
    this.message = message;
  }

  serializeErrors() {
    return [{ message: this.message }];
  }
}
