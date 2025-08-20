import mongoose from "mongoose";
import { redisClient } from "./config/redis-client.js";
import {
  getRabbitMQChannel,
  closeRabbitMQConnection,
} from "./config/rabbitmq-client.js";
import { httpServer } from "./socket/socket.js";
import { stopCronJobs } from "./cron/init-jobs.js";
import { logger } from "./config/logger.js";

const cleanup = async () => {
  logger.info("Starting graceful shutdown...");

  stopCronJobs();
  logger.info("Cron jobs stopped.");

  await closeRabbitMQConnection();
  logger.info("RabbitMQ connection closed.");

  await redisClient.quit();
  logger.info("Redis connection closed.");

  await mongoose.disconnect();
  logger.info("MongoDB connection closed.");
};

export const configureGracefulShutdown = () => {
  const handleShutdown = async (signal) => {
    logger.warn(`Received ${signal}. Closing connections...`);

    httpServer.close(async () => {
      logger.info("HTTP server closed.");
      try {
        await cleanup();
        logger.info("Graceful shutdown complete.");
        process.exit(0);
      } catch (error) {
        logger.error("Error during cleanup:", error);
        process.exit(1);
      }
    });

    setTimeout(() => {
      logger.error(
        "Could not close connections in time, forcefully shutting down"
      );
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", () => handleShutdown("SIGTERM"));
  process.on("SIGINT", () => handleShutdown("SIGINT"));
};
