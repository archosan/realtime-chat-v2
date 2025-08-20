import { CustomError } from "./CustomError.js";

export class NotAuthorizedError extends CustomError {
  constructor(message = "Not Authorized") {
    super(message);
    this.statusCode = 401;
    this.message = message;
  }

  serializeErrors() {
    return [{ message: this.message }];
  }
}
