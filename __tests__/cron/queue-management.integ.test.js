import mongoose from "mongoose";
import { rabbitmqClient } from "../../config/rabbitmq-client.js";
import AutoMessage from "../../models/AutoMessage.js";
import queueManagement from "../../cron/jobs/queue-management.js";
import { AUTO_MESSAGE_STATUS } from "../../enums/auto-message-status-enum";
import { mockChannel } from "../../__mocks__/rabbitmq-client.js";

describe("Cron Job: queueManagement - Integration Test", () => {
  beforeAll(async () => {
    await mongoose.disconnect();

    await mongoose.connect(
      process.env.MONGO_URI_TEST ||
        "mongodb://admin:password123@localhost:27017/realtime_chat_test?authSource=admin"
    );
  });
  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    rabbitmqClient.mockResolvedValue(mockChannel);
  });

  afterEach(async () => {
    await AutoMessage.deleteMany({});
  });

  it("should queue messages whose sendDate has passed", async () => {
    const pastDate = new Date(Date.now() - 10000);
    const futureDate = new Date(Date.now() + 60000);

    const messageToQueue = await AutoMessage.create({
      sender: new mongoose.Types.ObjectId(),
      receiver: new mongoose.Types.ObjectId(),
      content: "This should be queued",
      sendDate: pastDate,
      status: AUTO_MESSAGE_STATUS.PENDING,
    });

    const messageToWait = await AutoMessage.create({
      sender: new mongoose.Types.ObjectId(),
      receiver: new mongoose.Types.ObjectId(),
      content: "This should wait",
      sendDate: futureDate,
      status: AUTO_MESSAGE_STATUS.PENDING,
    });

    await queueManagement();

    expect(rabbitmqClient).toHaveBeenCalled();
    expect(mockChannel.sendToQueue).toHaveBeenCalledTimes(1);
    const sentMessageArg = JSON.parse(
      mockChannel.sendToQueue.mock.calls[0][1].toString()
    );
    expect(sentMessageArg._id).toBe(messageToQueue._id.toString());

    const updatedMessage = await AutoMessage.findById(messageToQueue._id);
    expect(updatedMessage.status).toBe(AUTO_MESSAGE_STATUS.QUEUED);

    const notUpdatedMessage = await AutoMessage.findById(messageToWait._id);
    expect(notUpdatedMessage.status).toBe(AUTO_MESSAGE_STATUS.PENDING);
  });

  it("should not do anything if no messages are due", async () => {
    await AutoMessage.create({
      sender: new mongoose.Types.ObjectId(),
      receiver: new mongoose.Types.ObjectId(),
      content: "This is for the future",
      sendDate: new Date(Date.now() + 60000),
      status: AUTO_MESSAGE_STATUS.PENDING,
    });

    await queueManagement();

    expect(mockChannel.sendToQueue).not.toHaveBeenCalled();
  });
});
