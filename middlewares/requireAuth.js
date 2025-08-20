import jwt from "jsonwebtoken";
import { NotAuthorizedError } from "../errors/NotAuthorized.js";
import { redisClient } from "../config/redis-client.js";

export const requireAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      throw new NotAuthorizedError("No token provided or invalid token format");
    }
    const token = header.split(" ")[1];

    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    const isRevoked = await redisClient.get(`denylist:${payload.jti}`);
    if (isRevoked) {
      throw new NotAuthorizedError(
        "Token has been revoked. Please log in again."
      );
    }

    req.user = {
      userId: payload.userId,
      jti: payload.jti,
      exp: payload.exp,
    };
    next();
  } catch (error) {
    next(error);
  }
};
