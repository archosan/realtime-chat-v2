import { CustomError } from "./CustomError.js";

export class NotFoundError extends CustomError {
  constructor(message = "Route not found", statusCode = 404) {
    super(message);
    this.statusCode = statusCode;
    this.message = message;
  }

  serializeErrors() {
    return [{ message: this.message || "Not Found" }];
  }
}
