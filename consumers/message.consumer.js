import { rabbitmqClient } from "../config/rabbitmq-client.js";
import { QUEUE_NAME } from "../config/constant.js";
import { logger } from "../config/logger.js";
import { AUTO_MESSAGE_STATUS } from "../enums/auto-message-status-enum.js";
import AutoMessage from "../models/AutoMessage.js";
import Message from "../models/Message.js";
import Conversation from "../models/Conversation.js";
import { io } from "../socket/socket.js";

const processMessage = async (autoMessageData) => {
  const existingAutoMessage = await AutoMessage.findById(autoMessageData._id);
  if (existingAutoMessage.status === AUTO_MESSAGE_STATUS.SENT) {
    logger.warn(
      `Message ${autoMessageData._id} has already been processed. Skipping.`
    );
    return;
  }

  let conversation = await Conversation.findOne({
    participants: {
      $all: [autoMessageData.sender, autoMessageData.receiver],
      $size: 2,
    },
  });

  if (!conversation) {
    conversation = new Conversation({
      participants: [autoMessageData.sender, autoMessageData.receiver],
      messages: [],
    });
  }

  const newMessage = new Message({
    senderId: autoMessageData.sender,
    conversationId: conversation._id,
    content: autoMessageData.content,
    readBy: [autoMessageData.sender],
  });
  await newMessage.save();

  conversation.messages.push(newMessage._id);
  conversation.lastMessage = newMessage._id;
  await conversation.save();

  const roomName = [
    autoMessageData.sender.toString(),
    autoMessageData.receiver.toString(),
  ]
    .sort()
    .join("--");

  io.to(roomName).emit("message_received", {
    message: newMessage.content,
    senderId: newMessage.senderId,
    messageId: newMessage._id,
    conversationId: conversation._id,
  });
  logger.info(`[->] Emitted 'message_received' to room: ${roomName}`);

  await AutoMessage.findByIdAndUpdate(autoMessageData._id, {
    status: AUTO_MESSAGE_STATUS.SENT,
  });
  logger.info(
    `[v] Processed and updated message ${autoMessageData._id} to SENT.`
  );
};

const startMessageConsumer = async () => {
  try {
    const channel = await rabbitmqClient();
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    channel.prefetch(1);
    logger.info(`Waiting for messages in queue: ${QUEUE_NAME}`);

    channel.consume(
      QUEUE_NAME,
      async (msg) => {
        if (msg === null) return;

        const autoMessageData = JSON.parse(msg.content.toString());
        logger.info(`Received message: ${autoMessageData._id}`);

        try {
          await processMessage(autoMessageData);

          channel.ack(msg);
        } catch (error) {
          logger.error(`Error processing message ${autoMessageData._id}:`, {
            error,
          });

          channel.nack(msg, false, true);
        }
      },
      { noAck: false }
    );
  } catch (error) {
    logger.error("Failed to start message consumer:", { error });
  }
};

export { startMessageConsumer, processMessage };
