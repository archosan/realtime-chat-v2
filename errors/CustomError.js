export class CustomError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }

  serializeErrors() {
    return [
      {
        message: this.message,
      },
    ];
  }
}
