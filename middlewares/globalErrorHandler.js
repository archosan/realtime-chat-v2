import { logger } from "../config/logger.js";
import { RequestValidationError } from "../errors/RequestValidationError.js";
import { DatabaseConnectionError } from "../errors/DatabaseConnectionError.js";
import { CustomError } from "../errors/CustomError.js";
import { NotAuthorizedError } from "../errors/NotAuthorized.js";
import { BadRequestError } from "../errors/BadRequestError.js";
import { ForbiddenError } from "../errors/ForbiddenError.js";

export const globalErrorHandler = (err, req, res, next) => {
  if (err instanceof RequestValidationError) {
    return res.status(err.statusCode).send({ errors: err.serializeErrors() });
  }

  if (err instanceof DatabaseConnectionError) {
    return res
      .status(err.statusCode)
      .send({ errors: [{ message: err.serializeErrors() }] });
  }

  if (err instanceof NotAuthorizedError) {
    return res
      .status(err.statusCode)
      .send({ errors: [{ message: err.message }] });
  }

  if (err instanceof BadRequestError) {
    return res.status(err.statusCode).send({ errors: err.serializeErrors() });
  }

  if (err instanceof ForbiddenError) {
    return res
      .status(err.statusCode)
      .send({ errors: [{ message: err.message }] });
  }

  if (err instanceof TypeError) {
    return res
      .status(400)
      .send({ errors: [{ message: `TypeError: ${err.message}` }] });
  }

  if (err instanceof CustomError) {
    return res.status(err.statusCode).send({ errors: err.serializeErrors() });
  }

  logger.error(err);

  res.status(500).send({
    errors: [
      { message: err && err.message ? err.message : "Something went wrong" },
    ],
  });
};
