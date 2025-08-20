import { jest } from "@jest/globals";

export const mockChannel = {
  assertQueue: jest.fn().mockResolvedValue({}),
  prefetch: jest.fn(),
  consume: jest.fn(),
  ack: jest.fn(),
  nack: jest.fn(),
  sendToQueue: jest.fn(),
};

export let consumeCallback = null;

mockChannel.consume.mockImplementation((queueName, callback, options) => {
  consumeCallback = callback;
  return Promise.resolve();
});

export const rabbitmqClient = jest.fn().mockResolvedValue(mockChannel);
export const getChannel = jest.fn().mockResolvedValue(mockChannel);

export const simulateMessage = async (messageData) => {
  if (!consumeCallback) {
    throw new Error("Consumer hasn't been initialized yet");
  }

  const message = {
    content: Buffer.from(JSON.stringify(messageData)),
  };

  return consumeCallback(message);
};

export const simulateNullMessage = async () => {
  if (!consumeCallback) {
    throw new Error("Consumer hasn't been initialized yet");
  }

  return consumeCallback(null);
};
