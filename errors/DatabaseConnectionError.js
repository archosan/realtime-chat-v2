import { CustomError } from "./CustomError.js";

export class DatabaseConnectionError extends CustomError {
  constructor() {
    super("Error connecting to database");
    this.statusCode = 500;
    this.message = "Error connecting to database";
  }

  serializeErrors() {
    return [{ message: this.message, field: "database" }];
  }
}
