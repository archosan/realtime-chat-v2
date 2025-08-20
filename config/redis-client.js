import { createClient } from "redis";
import { logger } from "./logger.js";

const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

redisClient.on("connect", () => {
  logger.info("Connecting to Redis...");
});

redisClient.on("ready", () => {
  logger.info("Successfully connected to Redis.");
});

redisClient.on("error", (err) => {
  logger.error("Redis Client Error", err);
});

redisClient.on("end", () => {
  logger.warn("Redis connection closed.");
});

const connectRedis = async () => {
  if (redisClient.isReady) {
    logger.info("Redis client is already connected.");
    return;
  }
  if (redisClient.isOpen && !redisClient.isReady) {
    logger.warn("Redis client is already connecting.");
    return;
  }
  try {
    await redisClient.connect();
  } catch (error) {
    logger.error("Failed to connect to Redis:", error);

    throw error;
  }
};

export { redisClient, connectRedis };
