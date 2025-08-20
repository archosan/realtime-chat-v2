import mongoose from "mongoose";
import dotenv from "dotenv";
import { initializeSocket, httpServer, io } from "./socket/socket.js";

import { initCronJobs } from "./cron/init-jobs.js";
import { connectRedis } from "./config/redis-client.js";
import { rabbitmqClient } from "./config/rabbitmq-client.js";
import { logger } from "./config/logger.js";
import { startMessageConsumer } from "./consumers/message.consumer.js";
import { configureGracefulShutdown } from "./graceful-shutdown.js";
dotenv.config();

const PORT = process.env.PORT || 3000;

const start = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI must be defined");
    }

    if (!process.env.REDIS_URL) {
      throw new Error("REDIS_URL must be defined");
    }

    if (!process.env.RABBITMQ_URL) {
      throw new Error("RABBITMQ_URL must be defined");
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET must be defined");
    }

    await connectRedis();

    await rabbitmqClient();

    await mongoose.connect(process.env.MONGO_URI);

    logger.info("Connected to MongoDB");

    initializeSocket(io);

    httpServer.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);

      initCronJobs();
      startMessageConsumer();
    });

    configureGracefulShutdown();
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
};

start();
