import mongoose from "mongoose";
import AutoMessage from "../../models/AutoMessage.js";
import { AUTO_MESSAGE_STATUS } from "../../enums/auto-message-status-enum.js";
import Conversation from "../../models/Conversation.js";
import Message from "../../models/Message.js";
import { processMessage } from "../../consumers/message.consumer.js";
import { io } from "../../socket/socket.js";

jest.mock("../../models/AutoMessage.js");
jest.mock("../../models/Conversation.js");
jest.mock("../../models/Message");
jest.mock("../../socket/socket.js", () => ({
  io: {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn().mockReturnThis(),
  },
}));

describe("Message Consumer", () => {
  describe("processMessage - unit", () => {
    it("should process an new message and update database records", async () => {
      const autoMessageId = new mongoose.Types.ObjectId();
      const senderId = new mongoose.Types.ObjectId();
      const receiverId = new mongoose.Types.ObjectId();
      const conversationId = new mongoose.Types.ObjectId();
      const messageId = new mongoose.Types.ObjectId();

      const autoMessageData = {
        _id: autoMessageId,
        sender: senderId,
        receiver: receiverId,
        content: "Test message content",
        status: AUTO_MESSAGE_STATUS.QUEUED,
      };

      AutoMessage.findById = jest.fn().mockResolvedValue({
        _id: autoMessageId,
        status: AUTO_MESSAGE_STATUS.QUEUED,
      });

      Conversation.findOne = jest.fn().mockResolvedValue(null);

      const mockConversation = {
        _id: conversationId,
        participants: [senderId, receiverId],
        messages: [],
        lastMessage: null,
        save: jest.fn().mockResolvedValue(true),
      };

      Conversation.mockImplementation(() => mockConversation);

      const mockMessage = {
        _id: messageId,
        senderId,
        conversationId,
        content: "Test message content",
        readBy: [senderId],
        save: jest.fn().mockResolvedValue(true),
      };

      Message.mockImplementation(() => mockMessage);

      AutoMessage.findByIdAndUpdate = jest.fn().mockResolvedValue({
        _id: autoMessageId,
        status: AUTO_MESSAGE_STATUS.SENT,
      });

      await processMessage(autoMessageData);

      expect(AutoMessage.findById).toHaveBeenCalledWith(autoMessageId);
      expect(Conversation.findOne).toHaveBeenCalledWith({
        participants: {
          $all: [senderId, receiverId],
          $size: 2,
        },
      });

      expect(Conversation).toHaveBeenCalledWith({
        participants: [senderId, receiverId],
        messages: [],
      });

      expect(Message).toHaveBeenCalledWith({
        senderId,
        conversationId,
        content: "Test message content",
        readBy: [senderId],
      });

      expect(mockMessage.save).toHaveBeenCalled();

      expect(mockConversation.messages).toContain(messageId);
      expect(mockConversation.lastMessage).toBe(messageId);
      expect(mockConversation.save).toHaveBeenCalled();

      const expectedRoomName = [senderId.toString(), receiverId.toString()]
        .sort()
        .join("--");

      expect(io.to).toHaveBeenCalledWith(expectedRoomName);
      expect(io.emit).toHaveBeenCalledWith("message_received", {
        message: "Test message content",
        senderId: senderId,
        messageId: messageId,
        conversationId: conversationId,
      });

      expect(AutoMessage.findByIdAndUpdate).toHaveBeenCalledWith(
        autoMessageId,
        {
          status: AUTO_MESSAGE_STATUS.SENT,
        }
      );
    });

    it("should skip processing if message is already marked as SENT", async () => {
      const autoMessageData = {
        _id: new mongoose.Types.ObjectId(),
        status: AUTO_MESSAGE_STATUS.SENT,
      };

      AutoMessage.findById = jest.fn().mockResolvedValue({
        _id: autoMessageData._id,
        status: AUTO_MESSAGE_STATUS.SENT,
      });

      await processMessage(autoMessageData);

      expect(AutoMessage.findById).toHaveBeenCalledWith(autoMessageData._id);
      expect(Conversation.findOne).not.toHaveBeenCalled();
      expect(Message).not.toHaveBeenCalled();
      expect(io.to).not.toHaveBeenCalled();
      expect(io.emit).not.toHaveBeenCalled();
      expect(AutoMessage.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it("should use existing conversation when avaliable", async () => {
      const senderId = "sender-Id";
      const receiverId = "receiver-Id";
      const autoMessageId = "auto-message-id";
      const existingConversationId = "existing-conversation-id";
      const messageId = "new-message-id";

      const autoMessageData = {
        _id: autoMessageId,
        sender: senderId,
        receiver: receiverId,
        content: "Test with existing conversation",
        status: AUTO_MESSAGE_STATUS.QUEUED,
      };

      AutoMessage.findById = jest.fn().mockResolvedValue({
        _id: autoMessageId,
        status: AUTO_MESSAGE_STATUS.QUEUED,
      });

      const mockExistingConversation = {
        _id: existingConversationId,
        participants: [senderId, receiverId],
        messages: ["old-message-id"],
        lastMessage: "old-message-id",
        save: jest.fn().mockResolvedValue(true),
      };

      Conversation.findOne = jest
        .fn()
        .mockResolvedValue(mockExistingConversation);

      const mockMessage = {
        _id: messageId,
        senderId: senderId,
        conversationId: existingConversationId,
        content: "test with existing conversation id",
        readBy: [senderId],
        save: jest.fn().mockResolvedValue(true),
      };

      Message.mockImplementation(() => mockMessage);

      AutoMessage.findByIdAndUpdate = jest.fn().mockResolvedValue(true);

      await processMessage(autoMessageData);

      expect(Conversation).not.toHaveBeenCalled();

      expect(Message).toHaveBeenCalledWith({
        senderId: senderId,
        conversationId: existingConversationId,
        content: "Test with existing conversation",
        readBy: [senderId],
      });

      expect(mockExistingConversation.messages).toContain(messageId);
      expect(mockExistingConversation.lastMessage).toBe(messageId);
      expect(mockExistingConversation.save).toHaveBeenCalled();
    });

    it("should handle errors during message processing", async () => {
      const autoMessageData = {
        _id: "error-message-id",
        sender: "sender-id",
        receiver: "receiver-id",
        content: "Message that will fail",
        status: AUTO_MESSAGE_STATUS.QUEUED,
      };

      AutoMessage.findById = jest.fn().mockResolvedValue({
        status: AUTO_MESSAGE_STATUS.QUEUED,
      });

      Conversation.findOne = jest
        .fn()
        .mockRejectedValue(new Error("Database connection error"));

      await expect(processMessage(autoMessageData)).rejects.toThrow(
        "Database connection error"
      );

      expect(Message).not.toHaveBeenCalled();
      expect(io.to).not.toHaveBeenCalled();
      expect(AutoMessage.findByIdAndUpdate).not.toHaveBeenCalled();
    });
  });
});
