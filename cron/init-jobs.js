import cron from "node-cron";
import messagePlanning from "./jobs/message-planning.js";
import queueManagement from "./jobs/queue-management.js";
import { logger } from "../config/logger.js";

const scheduledJobs = [];

export const initCronJobs = () => {
  logger.info("Initializing cron jobs...");

  const messagePlanningJob = cron.schedule("00 02 * * *", () => {
    logger.info("Running message planning job...");

    messagePlanning();
  });

  const queueManagementJob = cron.schedule("* * * * *", () => {
    logger.info("Running queue management job...");
    queueManagement();
  });

  scheduledJobs.push(messagePlanningJob, queueManagementJob);

  logger.info("Cron jobs initialized");
};

export const stopCronJobs = () => {
  logger.info("Stopping all scheduled cron jobs...");
  scheduledJobs.forEach((job) => job.stop());
  logger.info("All cron jobs stopped.");
};
