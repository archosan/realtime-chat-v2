import rabbitmq from "amqplib";
import { logger } from "./logger.js";
let channel;
let connection;
const rabbitmqClient = async () => {
  if (channel) return channel;

  try {
    connection = await rabbitmq.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();

    logger.info("Connected to RabbitMQ");

    return channel;
  } catch (error) {
    logger.error("RabbitMQ connection error:", error);
    throw error;
  }
};

const getChannel = async () => {
  if (!channel) {
    throw new Error(
      "RabbitMQ channel not available. Call connectRabbitMQ first."
    );
  }
  return channel;
};

const getRabbitMQChannel = () => channel;

const closeRabbitMQConnection = async () => {
  if (channel) {
    await channel.close();
    channel = null;
  }
  if (connection) {
    await connection.close();
    connection = null;
  }
};

export {
  rabbitmqClient,
  getChannel,
  getRabbitMQChannel,
  closeRabbitMQConnection,
};
