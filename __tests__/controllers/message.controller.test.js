import {
  saveMessage,
  markMessageAsRead,
} from "../../controllers/message.controller.js";
import { elasticsearchClient } from "@config/elasticsearch.js";
import Conversation from "../../models/Conversation.js";
import Message from "../../models/Message.js";

jest.mock("../../models/Message.js");
jest.mock("../../models/Conversation.js");

describe("Message Controller Tests", () => {
  beforeEach(() => {
    mockReq = {
      body: {},
      params: {},
      user: { userId: "mockUserId123" },
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
    };
    mockNext = jest.fn();

    jest.clearAllMocks();
  });

  describe("saveMessage", () => {
    it("should save a new message and return it", async () => {
      const testData = {
        message: "Hello, World!",
        receiverId: "receiverId123",
        senderId: "senderId123",
      };

      const mockConversation = {
        _id: "conversationId123",
        participants: ["senderId123", "receiverId123"],
        messages: [],
        lastMessage: null,
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Conversation, "findOne").mockResolvedValue(mockConversation);

      Message.mockImplementation((data) => {
        const messageInstance = {
          _id: "messageId123",
          content: data.content,
          senderId: data.senderId,
          conversationId: data.conversationId,
          readBy: data.readBy || [],
          createdAt: new Date(),
          save: jest.fn().mockResolvedValue(true),
          populate: jest.fn().mockImplementation(() => {
            messageInstance.senderId = {
              _id: data.senderId,
              username: "testUser",
              email: "test@example.com",
            };
            return Promise.resolve(messageInstance);
          }),
        };
        return messageInstance;
      });

      elasticsearchClient.index = jest.fn().mockResolvedValue({
        _id: "messageId123",
      });

      const result = await saveMessage(testData);

      expect(elasticsearchClient.index).toHaveBeenCalledWith({
        index: "messages",
        id: "messageId123",
        document: {
          content: "Hello, World!",
          senderId: "senderId123",
          conversationId: "conversationId123",
          createdAt: expect.any(Date),
        },
      });

      expect(result).toEqual(
        expect.objectContaining({
          _id: "messageId123",
          content: "Hello, World!",
          senderId: expect.objectContaining({
            _id: "senderId123",
            username: "testUser",
            email: "test@example.com",
          }),
        })
      );
    });
  });

  describe("markMessageAsRead", () => {
    it("should mark a message as read", async () => {
      const messageId = "messageId123";
      const readerId = "readerId123";

      const mockMessage = {
        _id: messageId,
        readBy: [],
        senderId: {
          _id: "senderId123",
          username: "testUser",
          email: "test@example.com",
        },
        save: jest.fn().mockResolvedValue(true),
      };

      const mockQuery = {
        populate: jest.fn().mockResolvedValue(mockMessage),
      };
      jest.spyOn(Message, "findById").mockReturnValue(mockQuery);

      const result = await markMessageAsRead(messageId, readerId);

      expect(Message.findById).toHaveBeenCalledWith(messageId);
      expect(mockQuery.populate).toHaveBeenCalledWith(
        "senderId",
        "username email"
      );
      expect(mockMessage.readBy).toContain(readerId);
      expect(result).toEqual(mockMessage);
    });

    it("should throw error when message not found", async () => {
      const messageId = "nonexistentId";
      const readerId = "readerId123";

      const mockQuery = {
        populate: jest.fn().mockResolvedValue(null),
      };

      jest.spyOn(Message, "findById").mockReturnValue(mockQuery);

      await expect(markMessageAsRead(messageId, readerId)).rejects.toThrow(
        "Message not found"
      );
    });

    it("should not duplicate readerId if already exists", async () => {
      const messageId = "messageId123";
      const readerId = "readerId123";

      const mockMessage = {
        _id: messageId,
        readBy: [readerId],
        save: jest.fn(),
        includes: jest.fn().mockReturnValue(true),
      };

      const mockQuery = {
        populate: jest.fn().mockResolvedValue(mockMessage),
      };

      jest.spyOn(Message, "findById").mockReturnValue(mockQuery);

      const result = await markMessageAsRead(messageId, readerId);

      expect(mockMessage.save).not.toHaveBeenCalled();
      expect(result).toEqual(mockMessage);
    });
  });
});
