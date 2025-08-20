import mongoose from "mongoose";
import AutoMessage from "../../models/AutoMessage.js";
import Message from "../../models/Message.js";
import Conversation from "../../models/Conversation.js";
import { io } from "../../socket/socket.js";
import { AUTO_MESSAGE_STATUS } from "../../enums/auto-message-status-enum.js";
import { processMessage } from "../../consumers/message.consumer.js";

jest.mock("../../socket/socket.js", () => ({
  io: {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn().mockReturnThis(),
  },
}));

describe("Message Consumer", () => {
  const senderId = new mongoose.Types.ObjectId();
  const receiverId = new mongoose.Types.ObjectId();

  beforeAll(async () => {
    await mongoose.disconnect();

    await mongoose.connect(
      process.env.MONGO_URI_TEST ||
        "mongodb://admin:password123@localhost:27017/realtime_chat_test?authSource=admin"
    );
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  afterEach(async () => {
    await AutoMessage.deleteMany({});
    await Message.deleteMany({});
    await Conversation.deleteMany({});
    jest.clearAllMocks();
  });

  it("should create a new conversation and message if one does not exist", async () => {
    const autoMessageData = await AutoMessage.create({
      sender: senderId,
      receiver: receiverId,
      content: "Hello, this is a test message",
      status: AUTO_MESSAGE_STATUS.PENDING,
      sendDate: new Date(),
    });

    await processMessage(autoMessageData);

    const conversation = await Conversation.findOne({
      participants: {
        $all: [senderId, receiverId],
      },
    });

    expect(conversation).not.toBeNull();
    expect(conversation.messages.length).toBe(1);

    const message = await Message.findOne({
      senderId: senderId,
      content: "Hello, this is a test message",
    });
    expect(message).not.toBeNull();
    expect(conversation.messages[0]).toEqual(message._id);

    const updatedAutoMessage = await AutoMessage.findById(autoMessageData._id);
    expect(updatedAutoMessage.status).toBe(AUTO_MESSAGE_STATUS.SENT);

    const expectedRoomName = [senderId.toString(), receiverId.toString()]
      .sort()
      .join("--");
    expect(io.to).toHaveBeenCalledWith(expectedRoomName);
    expect(io.emit).toHaveBeenCalledWith(
      "message_received",
      expect.any(Object)
    );
  });

  it("should add a message to an existing conversation", async () => {
    const existingConversation = await Conversation.create({
      participants: [senderId, receiverId],
    });

    const autoMessageData = await AutoMessage.create({
      sender: senderId,
      receiver: receiverId,
      content: "Hello again!",
      status: AUTO_MESSAGE_STATUS.PENDING,
      sendDate: new Date(),
    });

    await processMessage(autoMessageData);

    const conversation = await Conversation.findById(existingConversation._id);
    expect(conversation.messages.length).toBe(1);

    const message = await Message.findOne({
      senderId: senderId,
      content: "Hello again!",
    });
    expect(message).not.toBeNull();
    expect(conversation.messages[0]).toEqual(message._id);
    expect(conversation.lastMessage).toEqual(message._id);
  });

  it("should not process a message that has already been sent", async () => {
    const autoMessageData = await AutoMessage.create({
      sender: senderId,
      receiver: receiverId,
      content: "This should not be processed",
      status: AUTO_MESSAGE_STATUS.SENT,
      sendDate: new Date(),
    });

    await processMessage(autoMessageData);

    const messageCount = await Message.countDocuments();
    const conversationCount = await Conversation.countDocuments();

    expect(messageCount).toBe(0);
    expect(conversationCount).toBe(0);

    expect(io.emit).not.toHaveBeenCalled();
  });

  it("should throw an error if saving the new message fails", async () => {
    const autoMessageData = await AutoMessage.create({
      sender: senderId,
      receiver: receiverId,
      content: "This will fail to save",
      status: AUTO_MESSAGE_STATUS.PENDING,
      sendDate: new Date(),
    });

    const saveError = new Error("Database save failed");
    jest.spyOn(Message.prototype, "save").mockRejectedValueOnce(saveError);

    await expect(processMessage(autoMessageData)).rejects.toThrow(saveError);

    const conversationCount = await Conversation.countDocuments();
    expect(conversationCount).toBe(0);

    const finalAutoMessage = await AutoMessage.findById(autoMessageData._id);
    expect(finalAutoMessage.status).toBe(AUTO_MESSAGE_STATUS.PENDING);
  });

  it("should throw an error if updating the conversation fails", async () => {
    const existingConversation = await Conversation.create({
      participants: [senderId, receiverId],
    });
    const autoMessageData = await AutoMessage.create({
      sender: senderId,
      receiver: receiverId,
      content: "This will fail to update conversation",
      status: AUTO_MESSAGE_STATUS.PENDING,
      sendDate: new Date(),
    });

    const saveError = new Error("Conversation update failed");
    jest.spyOn(Conversation.prototype, "save").mockRejectedValueOnce(saveError);

    await expect(processMessage(autoMessageData)).rejects.toThrow(saveError);

    const conversation = await Conversation.findById(existingConversation._id);
    expect(conversation.messages.length).toBe(0);
  });
});
