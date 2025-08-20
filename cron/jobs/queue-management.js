import AutoMessage from "../../models/AutoMessage.js";
import { AUTO_MESSAGE_STATUS } from "../../enums/auto-message-status-enum.js";
import { rabbitmqClient } from "../../config/rabbitmq-client.js";
import { logger } from "../../config/logger.js";
import { QUEUE_NAME } from "../../config/constant.js";

const queueManagement = async () => {
  logger.info("Queue management job started...");

  let channel;
  try {
    channel = await rabbitmqClient();
    await channel.assertQueue(QUEUE_NAME, { durable: true });
  } catch (error) {
    logger.error("Failed to connect to RabbitMQ or assert queue.", { error });
    return;
  }

  try {
    const now = new Date();
    const filter = {
      sendDate: { $lte: now },
      status: AUTO_MESSAGE_STATUS.PENDING,
    };

    const updateResult = await AutoMessage.updateMany(filter, {
      $set: { status: AUTO_MESSAGE_STATUS.QUEUED },
    });

    if (updateResult.matchedCount === 0) {
      logger.info("No pending messages to queue.");
      return;
    }

    logger.info(
      `${updateResult.matchedCount} messages' status updated to QUEUED.`
    );

    const messagesToQueue = await AutoMessage.find({
      sendDate: { $lte: now },
      status: AUTO_MESSAGE_STATUS.QUEUED,
    });

    if (messagesToQueue.length === 0) {
      logger.warn(
        "Messages were updated to QUEUED but not found for processing. This might indicate an issue."
      );
      return;
    }

    for (const message of messagesToQueue) {
      try {
        channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(message)), {
          persistent: true,
        });
        logger.info(`Message with ID ${message._id} sent to the queue.`);
      } catch (sendError) {
        logger.error(
          `Failed to send message ${message._id} to queue. Reverting status to PENDING.`,
          { error: sendError }
        );

        await AutoMessage.updateOne(
          { _id: message._id },
          { $set: { status: AUTO_MESSAGE_STATUS.PENDING } }
        );
      }
    }

    logger.info("Queue management job finished successfully.");
  } catch (error) {
    logger.error("An error occurred during queue management.", { error });
  }
};

export default queueManagement;
