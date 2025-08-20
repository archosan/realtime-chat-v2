import { redisClient } from "@config/redis-client.js";
import {
  getAllUsersHandler,
  updateUserHandler,
  getUserHandler,
  getAllMessagesByUserId,
  getConversationByUserId,
  getOnlineUsers,
  getOnlineUserCount,
  getIsUserOnline,
} from "../../controllers/user.controller.js";
import { NotFoundError } from "../../errors/NotFound.js";
import { ForbiddenError } from "../../errors/ForbiddenError.js";
import User from "../../models/User.js";
import Message from "../../models/Message.js";
import Conversation from "../../models/Conversation.js";

describe("User Controller Tests", () => {
  let mockReq, mockRes, mockNext;

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

  describe("getAllUsersHandler", () => {
    it("should return cached users when cache exists", async () => {
      const mockUsers = [
        { id: "1", username: "user1" },
        { id: "2", username: "user2" },
      ];
      jest
        .spyOn(redisClient, "get")
        .mockResolvedValue(JSON.stringify(mockUsers));

      await getAllUsersHandler(mockReq, mockRes, mockNext);

      expect(redisClient.get).toHaveBeenCalledWith("allUsers");
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        users: mockUsers,
        source: "cache",
      });
    });

    it("should return users from database when cache does not exist", async () => {
      const mockUsers = [
        { id: "1", username: "user1" },
        { id: "2", username: "user2" },
      ];

      jest.spyOn(redisClient, "get").mockResolvedValue(null);
      jest.spyOn(User, "find").mockResolvedValue(mockUsers);

      await getAllUsersHandler(mockReq, mockRes, mockNext);

      expect(redisClient.get).toHaveBeenCalledWith("allUsers");
      expect(User.find).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockUsers);
    });

    it("should handle no users found", async () => {
      redisClient.get.mockResolvedValue(null);
      User.find.mockResolvedValue([]);

      jest.spyOn(redisClient, "set").mockImplementation(() => {});

      await expect(
        getAllUsersHandler(mockReq, mockRes, mockNext)
      ).rejects.toThrow(new NotFoundError("No users found."));

      expect(User.find).toHaveBeenCalledWith({}, "-password -__v");
      expect(redisClient.set).not.toHaveBeenCalled();
    });

    it("should cache users after fetching from database", async () => {
      const mockUsers = [
        { id: "1", username: "user1" },
        { id: "2", username: "user2" },
      ];

      jest.spyOn(redisClient, "get").mockResolvedValue(null);
      jest.spyOn(User, "find").mockResolvedValue(mockUsers);
      await getAllUsersHandler(mockReq, mockRes, mockNext);
      expect(redisClient.set).toHaveBeenCalledWith(
        "allUsers",
        JSON.stringify(mockUsers),
        "EX",
        process.env.REDIS_CACHE_TTL || 3600
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockUsers);
    });

    it("should handle database errors properly", async () => {
      redisClient.get.mockResolvedValue(null);
      User.find.mockRejectedValue(new Error("Database connection failed"));

      await expect(getAllUsersHandler(mockReq, mockRes)).rejects.toThrow(
        "Database connection failed"
      );
    });

    it("should handle redis errors gracefully", async () => {
      redisClient.get.mockRejectedValue(new Error("Redis connection failed"));
      const dbUsers = [{ _id: "1", username: "user1" }];
      User.find.mockResolvedValue(dbUsers);

      await expect(getAllUsersHandler(mockReq, mockRes)).rejects.toThrow(
        "Redis connection failed"
      );
    });
  });

  describe("updateUserHandler", () => {
    beforeEach(() => {
      mockReq.params.userId = "mockUserId123";
      mockReq.body = { username: "newUsername", email: "new@email.com" };
    });

    it("should update user successfully with valid data", async () => {
      const mockUser = {
        _id: "mockUserId123",
        username: "oldUsername",
        email: "old@email.com",
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(User, "findById").mockResolvedValue(mockUser);
      jest.spyOn(redisClient, "del").mockResolvedValue(1);

      await updateUserHandler(mockReq, mockRes, mockNext);

      expect(User.findById).toHaveBeenCalledWith("mockUserId123");
      expect(mockUser.username).toBe("newUsername");
      expect(mockUser.email).toBe("new@email.com");
      expect(mockUser.save).toHaveBeenCalled();
      expect(redisClient.del).toHaveBeenCalledWith("user:mockUserId123");
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "User updated successfully",
        user: expect.objectContaining({
          username: "newUsername",
          email: "new@email.com",
        }),
      });
    });

    it("should throw ForbiddenError when user tries to update another user", async () => {
      mockReq.params.userId = "differentUserId";

      const findByIdSpy = jest.spyOn(User, "findById");

      await expect(updateUserHandler(mockReq, mockRes)).rejects.toThrow(
        ForbiddenError
      );

      expect(findByIdSpy).not.toHaveBeenCalled();
    });
  });

  describe("getUserByHandler", () => {
    it("should return user by Id", async () => {
      const mockUser = {
        _id: "mockUserId123",
        username: "testUser",
        email: "test@example.com",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      jest.spyOn(redisClient, "get").mockResolvedValue(null);
      jest.spyOn(User, "findById").mockResolvedValue(mockUser);
      jest.spyOn(redisClient, "set").mockResolvedValue("OK");

      mockReq.params.userId = "mockUserId123";

      await getUserHandler(mockReq, mockRes);

      expect(redisClient.get).toHaveBeenCalledWith("user:mockUserId123");
      expect(User.findById).toHaveBeenCalledWith("mockUserId123");
      expect(redisClient.set).toHaveBeenCalledWith(
        "user:mockUserId123",
        JSON.stringify(mockUser),
        "EX",
        3600
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        user: {
          id: "mockUserId123",
          username: "testUser",
          email: "test@example.com",
          createdAt: mockUser.createdAt,
          updatedAt: mockUser.updatedAt,
        },
      });
    });

    it("should return cached user when exists in cache", async () => {
      const mockUser = {
        id: "mockUserId123",
        username: "testUser",
        email: "test@example.com",
      };

      mockReq.params.userId = "mockUserId123";

      jest
        .spyOn(redisClient, "get")
        .mockResolvedValue(JSON.stringify(mockUser));

      await getUserHandler(mockReq, mockRes);

      expect(redisClient.get).toHaveBeenCalledWith("user:mockUserId123");
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        user: mockUser,
        source: "cache",
      });
    });

    it("should throw ForbiddenError when user tries to access another user's data", async () => {
      mockReq.params.userId = "differentUserId";
      mockUser = {
        _id: "mockUserId123",
        username: "testUser",
        email: "test@example.com",
      };

      jest.spyOn(redisClient, "get").mockResolvedValue(null);
      jest.spyOn(User, "findById").mockResolvedValue(mockUser);
      await expect(getUserHandler(mockReq, mockRes)).rejects.toThrow(
        ForbiddenError
      );

      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it("should handle user not found", async () => {
      mockReq.params.userId = "nonExistentUserId";
      jest.spyOn(redisClient, "get").mockResolvedValue(null);
      jest.spyOn(User, "findById").mockResolvedValue(null);

      await expect(getUserHandler(mockReq, mockRes)).rejects.toThrow(
        new NotFoundError("User not found.")
      );

      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });
  });

  describe("getAllMessagesByUserIdHandler", () => {
    it("should return all messages for a user", async () => {
      const mockMessages = [
        { id: "1", content: "Hello", senderId: "mockUserId123" },
        { id: "2", content: "Hi", senderId: "mockUserId123" },
      ];

      mockReq.params.userId = "mockUserId123";

      jest.spyOn(Message, "find").mockResolvedValue(mockMessages);

      await getAllMessagesByUserId(mockReq, mockRes);

      expect(Message.find).toHaveBeenCalledWith({ senderId: "mockUserId123" });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockMessages);
    });

    it("should handle no messages found for a user", async () => {
      mockReq.params.userId = "mockUserId123";

      jest.spyOn(Message, "find").mockResolvedValue([]);

      await expect(getAllMessagesByUserId(mockReq, mockRes)).rejects.toThrow(
        new NotFoundError("No messages found for this user.")
      );

      expect(Message.find).toHaveBeenCalledWith({ senderId: "mockUserId123" });
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it("should handle ForbiddenError when user tries to access another user's messages", async () => {
      mockReq.params.userId = "differentUserId";

      jest.spyOn(Message, "find").mockResolvedValue([]);

      await expect(getAllMessagesByUserId(mockReq, mockRes)).rejects.toThrow(
        ForbiddenError
      );

      expect(Message.find).not.toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });
  });

  describe("getConversationByUserIdHandler", () => {
    it("should return conversation with another user", async () => {
      const mockConversation = {
        id: "conversationId123",
        participants: ["mockUserId123", "otherUserId456"],
        messages: [],
      };

      mockReq.params.userId = "mockUserId123";
      mockReq.user.userId = "mockUserId123";

      jest.spyOn(Conversation, "find").mockImplementation(() => ({
        populate: jest.fn().mockResolvedValue(mockConversation),
      }));

      await getConversationByUserId(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockConversation);
    });

    it("should throw ForbiddenError when user tries to access another user's conversation", async () => {
      mockReq.params.userId = "differentUserId";
      mockReq.user.userId = "mockUserId123";

      await expect(getConversationByUserId(mockReq, mockRes)).rejects.toThrow(
        ForbiddenError
      );

      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it("should handle no conversation found for a user", async () => {
      mockReq.params.userId = "mockUserId123";
      mockReq.user.userId = "mockUserId123";

      jest.spyOn(Conversation, "find").mockImplementation(() => ({
        populate: jest.fn().mockResolvedValue(null),
      }));

      await expect(getConversationByUserId(mockReq, mockRes)).rejects.toThrow(
        new NotFoundError("No conversations found for this user.")
      );

      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });
  });

  describe("getOnlineUsersHandler", () => {
    it("should return online users ids", async () => {
      const mockOnlineUsers = ["user1", "user2", "user3"];

      jest.spyOn(redisClient, "sMembers").mockResolvedValue(mockOnlineUsers);

      await getOnlineUsers(mockReq, mockRes, mockNext);

      expect(redisClient.sMembers).toHaveBeenCalledWith("onlineUsers");
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        onlineUsers: mockOnlineUsers,
      });
    });
  });

  describe("getOnlineUserCountHandler", () => {
    it("should return the count of online users", async () => {
      const mockOnlineUserCount = 5;

      jest.spyOn(redisClient, "sCard").mockResolvedValue(mockOnlineUserCount);

      await getOnlineUserCount(mockReq, mockRes, mockNext);

      expect(redisClient.sCard).toHaveBeenCalledWith("onlineUsers");
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        onlineUserCount: mockOnlineUserCount,
      });
    });
  });

  describe("getIsUserOnlineHandler", () => {
    it("should return true if user is online", async () => {
      const mockUserId = "mockUserId123";
      mockReq.params.userId = mockUserId;

      jest.spyOn(redisClient, "sIsMember").mockResolvedValue(true);
      await getIsUserOnline(mockReq, mockRes, mockNext);
      expect(redisClient.sIsMember).toHaveBeenCalledWith(
        "onlineUsers",
        mockUserId
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        isOnline: true,
        userId: mockUserId,
      });
    });
  });
});
