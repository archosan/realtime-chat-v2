import { beforeAll, beforeEach, expect, jest } from "@jest/globals";
import app from "../../app.js";
import request from "supertest";
import { getAuthToken } from "../helpers/auth.helper.js";
import User from "../../models/User.js";
import Message from "../../models/Message.js";
import Conversation from "../../models/Conversation.js";

import { redisClient } from "@config/redis-client.js";
describe("User Routes", () => {
  let authToken;

  beforeAll(async () => {
    authToken = await getAuthToken();
  });

  describe("/api/users", () => {
    it("should return all users with valid token", async () => {
      await User.create([
        {
          username: "user1",
          email: "user1@example.com",
          password: "password1",
        },
        {
          username: "user2",
          email: "user2@example.com",
          password: "password2",
        },
        {
          username: "user3",
          email: "user3@example.com",
          password: "password3",
        },
      ]);

      const response = await request(app)
        .get("/api/users")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(3);

      response.body.forEach((user) => {
        expect(user).toHaveProperty("_id");
        expect(user).toHaveProperty("username");
        expect(user).toHaveProperty("email");
        expect(user).toHaveProperty("createdAt");
        expect(user).toHaveProperty("updatedAt");
        expect(user).not.toHaveProperty("password");
      });
    });

    it("should return 401 for unauthorized access", async () => {
      const response = await request(app).get("/api/users").expect(401);

      expect(response.body).toHaveProperty("errors");
      expect(response.body.errors[0].message).toBe(
        "No token provided or invalid token format"
      );
    });

    it("should return 404 if no users found", async () => {
      const response = await request(app)
        .get("/api/users")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty("errors");
      expect(response.body.errors[0].message).toBe("No users found.");
    });
  });

  describe("/api/users/onlineuser-count", () => {
    it("should return online user count", async () => {
      redisClient.sCard = jest.fn().mockResolvedValue(5);

      const response = await request(app)
        .get("/api/users/onlineuser-count")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("onlineUserCount");
      expect(typeof response.body.onlineUserCount).toBe("number");
    });

    it("should return 401 for unauthorized access", async () => {
      const response = await request(app)
        .get("/api/users/onlineuser-count")
        .expect(401);

      expect(response.body).toHaveProperty("errors");
      expect(response.body.errors[0].message).toBe(
        "No token provided or invalid token format"
      );
    });
  });

  describe("/api/users/online-users", () => {
    it("should return online users", async () => {
      redisClient.sMembers = jest.fn().mockResolvedValue(["user1", "user2"]);

      const response = await request(app)
        .get("/api/users/online-users")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("onlineUsers");
      expect(Array.isArray(response.body.onlineUsers)).toBe(true);
      expect(response.body.onlineUsers.length).toBeGreaterThanOrEqual(2);
    });

    it("should return 401 for unauthorized access", async () => {
      const response = await request(app)
        .get("/api/users/online-users")
        .expect(401);

      expect(response.body).toHaveProperty("errors");
      expect(response.body.errors[0].message).toBe(
        "No token provided or invalid token format"
      );
    });
  });

  describe("/api/users/:userId/edit", () => {
    it("should update user details", async () => {
      const user = {
        username: "testuser",
        email: "testuser@example.com",
        password: "password123",
      };

      await request(app).post("/api/auth/register").send(user);

      const loginResponse = await request(app).post("/api/auth/login").send({
        email: user.email,
        password: user.password,
      });

      authToken = loginResponse.body.accessToken;

      const updatedUser = {
        username: "updatedUser",
        email: "updateduser@example.com",
      };

      const users = await User.findOne({
        email: user.email,
        username: user.username,
      });

      const response = await request(app)
        .put(`/api/users/${users._id}/edit`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(updatedUser)
        .expect(201);

      expect(response.body).toHaveProperty(
        "message",
        "User updated successfully"
      );
      expect(response.body).toHaveProperty("user");

      expect(response.body.user).toHaveProperty(
        "username",
        updatedUser.username
      );
      expect(response.body.user).toHaveProperty("email", updatedUser.email);
      expect(response.body.user).toHaveProperty("createdAt");
    });

    it("should return error when userId param is invalid", async () => {
      const invalidUserId = "invalidUserId";
      const response = await request(app)
        .put(`/api/users/${invalidUserId}/edit`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          username: "ne",
          email: "test @exampl",
        })
        .expect(400);
      expect(response.body).toHaveProperty("errors");
      expect(response.body.errors[0].field).toBe("userId");
      expect(response.body.errors[0].message).toBe(
        "Valid user ID is required."
      );

      expect(response.body.errors[1].field).toBe("username");
      expect(response.body.errors[1].message).toBe(
        "Username must be at least 3 characters long."
      );
      expect(response.body.errors[2].field).toBe("email");
      expect(response.body.errors[2].message).toBe(
        "Email must be a valid email address."
      );
    });

    it("should return 403 when trying to update another user's profile", async () => {
      const anotherUser = await User.create({
        username: "anotherUser",
        email: "anotherUser@example.com",
        password: "password123",
      });

      const response = await request(app)
        .put(`/api/users/${anotherUser._id}/edit`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          username: "hackedUser",
          email: "hackedUser@example.com",
        })
        .expect(403);

      expect(response.body).toHaveProperty("errors");
      expect(response.body.errors[0].message).toBe(
        "You can only update your own profile."
      );
    });
  });

  describe("/api/users/:userId", () => {
    it("should return user details", async () => {
      const testUser = {
        username: "testuser",
        email: "testuser@example.com",
        password: "password123",
      };

      await request(app).post("/api/auth/register").send(testUser);

      const loginResponse = await request(app).post("/api/auth/login").send({
        email: testUser.email,
        password: testUser.password,
      });
      authToken = loginResponse.body.accessToken;

      const user = await User.findOne({
        email: testUser.email,
        username: testUser.username,
      });

      const response = await request(app)
        .get(`/api/users/${user._id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("user");
      expect(response.body.user).toHaveProperty("id", user._id.toString());
      expect(response.body.user).toHaveProperty("username", user.username);
      expect(response.body.user).toHaveProperty("email", user.email);
      expect(response.body.user).toHaveProperty("createdAt");
      expect(response.body.user).toHaveProperty("updatedAt");
    });

    it("should return 403 when trying to view another user's profile", async () => {
      const anotherUser = await User.create({
        username: "anotherUser",
        email: "anotherUser@example.com",
        password: "password123",
      });

      const response = await request(app)
        .get(`/api/users/${anotherUser._id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(403);

      expect(response.body).toHaveProperty("errors");
      expect(response.body.errors[0].message).toBe(
        "You can only view your own profile."
      );
    });

    it("should return 404 if user not found", async () => {
      const nonExistentUserId = "60c72b2f9b1d8c001c8e4f1a"; // Example ID
      const response = await request(app)
        .get(`/api/users/${nonExistentUserId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty("errors");
      expect(response.body.errors[0].message).toBe("User not found.");
    });
  });

  describe("/api/users/:userId/messages", () => {
    beforeEach(async () => {
      const testUser = {
        username: "messageuser",
        email: "messageuser@example.com",
        password: "password123",
      };

      await request(app).post("/api/auth/register").send(testUser);

      const loginResponse = await request(app).post("/api/auth/login").send({
        email: testUser.email,
        password: testUser.password,
      });
      authToken = loginResponse.body.accessToken;
      user = await User.findOne({
        email: testUser.email,
        username: testUser.username,
      });
    });

    it("should return messages of a userId", async () => {
      const testConversation = await Conversation.create({
        participants: [user._id],
      });
      const messages = [
        {
          content: "Hello, this is a test message.",
          senderId: user._id,
          conversationId: testConversation._id,
        },
        {
          content: "Another message from the same user.",
          senderId: user._id,
          conversationId: testConversation._id,
        },
      ];

      await Message.insertMany(messages);

      const response = await request(app)
        .get(`/api/users/${user._id}/messages`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      response.body.forEach((message) => {
        expect(message).toHaveProperty("_id");
        expect(message).toHaveProperty("content");
        expect(message).toHaveProperty("senderId", user._id.toString());
        expect(message).toHaveProperty("conversationId");
        expect(message).toHaveProperty("createdAt");
      });
    });

    it("should return 400 for invalid userId format", async () => {
      const invalidUserId = "invalidUserId";
      const response = await request(app)
        .get(`/api/users/${invalidUserId}/messages`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty("errors");
      expect(response.body.errors[0].field).toBe("userId");
      expect(response.body.errors[0].message).toBe(
        "Valid user ID is required."
      );
    });

    it("should return 401 for unauthorized access", async () => {
      const response = await request(app)
        .get(`/api/users/${user._id}/messages`)
        .expect(401);

      expect(response.body).toHaveProperty("errors");
      expect(response.body.errors[0].message).toBe(
        "No token provided or invalid token format"
      );
    });

    it("should return 403 when trying to access another user's messages", async () => {
      const anotherUser = await User.create({
        username: "anotherUser",
        email: "anotherUser@example.com",
        password: "password123",
      });

      const response = await request(app)
        .get(`/api/users/${anotherUser._id}/messages`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(403);

      expect(response.body).toHaveProperty("errors");
      expect(response.body.errors[0].message).toBe(
        "You can only view your own messages."
      );
    });

    it("should return 404 when no messages found for user", async () => {
      const response = await request(app)
        .get(`/api/users/${user._id}/messages`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty("errors");
      expect(response.body.errors[0].message).toBe(
        "No messages found for this user."
      );
    });
  });
  describe("/api/users/:userId/conversations", () => {
    beforeEach(async () => {
      const testUser = {
        username: "conversationuser",
        email: "conversationuser@example.com",
        password: "password123",
      };

      await request(app).post("/api/auth/register").send(testUser);

      const loginResponse = await request(app).post("/api/auth/login").send({
        email: testUser.email,
        password: testUser.password,
      });
      authToken = loginResponse.body.accessToken;
      user = await User.findOne({
        email: testUser.email,
        username: testUser.username,
      });
    });

    it("should return conversations for a userId", async () => {
      const testConversation = await Conversation.create({
        participants: [user._id],
        messages: [],
      });

      const response = await request(app)
        .get(`/api/users/${user._id}/conversations`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0]).toHaveProperty("_id");
      expect(response.body[0]).toHaveProperty("participants");
      expect(response.body[0].participants).toContain(user._id.toString());
    });

    it("should return 400 for invalid userId format", async () => {
      const invalidUserId = "invalidUserId";
      const response = await request(app)
        .get(`/api/users/${invalidUserId}/conversations`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty("errors");
      expect(response.body.errors[0].field).toBe("userId");
      expect(response.body.errors[0].message).toBe(
        "Valid user ID is required."
      );
    });

    it("should return 401 for unauthorized access", async () => {
      const response = await request(app)
        .get(`/api/users/${user._id}/conversations`)
        .expect(401);

      expect(response.body).toHaveProperty("errors");
      expect(response.body.errors[0].message).toBe(
        "No token provided or invalid token format"
      );
    });

    it("should return 403 when trying to access another user's conversations", async () => {
      const anotherUser = await User.create({
        username: "anotherUser",
        email: "anotherUser@example.com",
        password: "password123",
      });

      const response = await request(app)
        .get(`/api/users/${anotherUser._id}/conversations`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(403);

      expect(response.body).toHaveProperty("errors");
      expect(response.body.errors[0].message).toBe(
        "You can only view your own conversations."
      );
    });

    it("should return 404 when no conversations found for user", async () => {
      const response = await request(app)
        .get(`/api/users/${user._id}/conversations`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty("errors");
      expect(response.body.errors[0].message).toBe(
        "No conversations found for this user."
      );
    });
  });

  describe("/api/users/:userId/is-online", () => {
    beforeEach(async () => {
      const testUser = {
        username: "onlineuser",
        email: "onlineuser@example.com",
        password: "password123",
      };

      await request(app).post("/api/auth/register").send(testUser);

      const loginResponse = await request(app).post("/api/auth/login").send({
        email: testUser.email,
        password: testUser.password,
      });
      authToken = loginResponse.body.accessToken;
      user = await User.findOne({
        email: testUser.email,
        username: testUser.username,
      });
    });

    it("should return online status for a user", async () => {
      redisClient.sIsMember = jest.fn().mockResolvedValue(true);

      const response = await request(app)
        .get(`/api/users/${user._id}/is-online`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("userId", user._id.toString());
      expect(response.body).toHaveProperty("isOnline");
      expect(typeof response.body.isOnline).toBe("boolean");
    });

    it("should return false when user is offline", async () => {
      redisClient.sIsMember = jest.fn().mockResolvedValue(false);

      const response = await request(app)
        .get(`/api/users/${user._id}/is-online`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("userId", user._id.toString());
      expect(response.body).toHaveProperty("isOnline", false);
    });

    it("should return 400 for invalid userId format", async () => {
      const invalidUserId = "invalidUserId";
      const response = await request(app)
        .get(`/api/users/${invalidUserId}/is-online`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty("errors");
      expect(response.body.errors[0].field).toBe("userId");
      expect(response.body.errors[0].message).toBe(
        "Valid user ID is required."
      );
    });

    it("should return 401 for unauthorized access", async () => {
      const response = await request(app)
        .get(`/api/users/${user._id}/is-online`)
        .expect(401);

      expect(response.body).toHaveProperty("errors");
      expect(response.body.errors[0].message).toBe(
        "No token provided or invalid token format"
      );
    });
  });
});
