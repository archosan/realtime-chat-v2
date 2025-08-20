import { createServer } from "http";
import { Server } from "socket.io";
import Client from "socket.io-client";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { initializeSocket } from "../../socket/socket.js";
import * as MessageController from "../../controllers/message.controller.js";
import { redisClient } from "../../config/redis-client.js";
import { ONLINE_USERS_KEY } from "../../config/constant.js";

jest.mock("../../controllers/message.controller.js");

describe("Socket.IO Integration Tests", () => {
  let io, serverSocket, clientSocket, httpServer;
  const port = 3001;
  const user1 = { userId: new mongoose.Types.ObjectId().toString() };
  const user2 = { userId: new mongoose.Types.ObjectId().toString() };

  beforeAll((done) => {
    httpServer = createServer();
    io = new Server(httpServer);
    initializeSocket(io);

    httpServer.listen(port, () => {
      done();
    });
  });

  afterAll(() => {
    io.close();
    httpServer.close();
  });

  afterEach(() => {
    if (clientSocket && clientSocket.connected) {
      clientSocket.disconnect();
    }
    jest.clearAllMocks();
  });

  describe("Authentication", () => {
    it("should authenticate a user with a valid token", (done) => {
      const token = jwt.sign(user1, process.env.JWT_ACCESS_SECRET);
      clientSocket = Client(`http://localhost:${port}`, {
        auth: { token },
      });

      clientSocket.on("connect", () => {
        expect(clientSocket.connected).toBe(true);
        done();
      });
    });

    it("should reject a user without a token", (done) => {
      clientSocket = Client(`http://localhost:${port}`);
      clientSocket.on("connect_error", (err) => {
        expect(err.message).toBe("Authentication error");
        done();
      });
    });
  });

  describe("Event Handlers", () => {
    let client1, client2;
    const roomName = [user1.userId, user2.userId].sort().join("--");

    beforeEach((done) => {
      const token1 = jwt.sign(user1, process.env.JWT_ACCESS_SECRET);
      const token2 = jwt.sign(user2, process.env.JWT_ACCESS_SECRET);

      client1 = Client(`http://localhost:${port}`, { auth: { token: token1 } });
      client2 = Client(`http://localhost:${port}`, { auth: { token: token2 } });

      let connectCount = 0;
      const onConnect = () => {
        connectCount++;
        if (connectCount === 2) done();
      };
      client1.on("connect", onConnect);
      client2.on("connect", onConnect);
    });

    afterEach(() => {
      client1.disconnect();
      client2.disconnect();
    });

    it("should handle user connection and disconnection", async () => {
      expect(redisClient.sAdd).toHaveBeenCalledWith(
        ONLINE_USERS_KEY,
        user1.userId
      );
      expect(redisClient.sAdd).toHaveBeenCalledWith(
        ONLINE_USERS_KEY,
        user2.userId
      );

      client1.disconnect();

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(redisClient.sRem).toHaveBeenCalledWith(
        ONLINE_USERS_KEY,
        user1.userId
      );
    });

    it("should allow a user to join a room", (done) => {
      client1.emit("join_room", roomName);

      done();
    });

    it("should handle 'send_message' and emit 'message_received'", (done) => {
      const messageData = {
        message: "Hello there!",
        receiverId: user2.userId,
        roomName: roomName,
      };

      const savedMessageMock = {
        _id: new mongoose.Types.ObjectId(),
        content: messageData.message,
        senderId: user1.userId,
      };

      MessageController.saveMessage.mockResolvedValue(savedMessageMock);

      client2.on("message_received", (receivedData) => {
        expect(receivedData.message).toBe(savedMessageMock.content);
        expect(receivedData.senderId).toBe(savedMessageMock.senderId);
        expect(MessageController.saveMessage).toHaveBeenCalledWith({
          message: messageData.message,
          receiverId: messageData.receiverId,
          senderId: user1.userId,
        });
        done();
      });

      client1.emit("join_room", roomName);
      client2.emit("join_room", roomName);
      client1.emit("send_message", messageData);
    });

    it("should handle 'message_read' and emit 'message_was_read'", (done) => {
      const readData = {
        messageId: new mongoose.Types.ObjectId().toString(),
        roomName: roomName,
      };

      MessageController.markMessageAsRead.mockResolvedValue(true);

      client2.on("message_was_read", (receivedData) => {
        expect(receivedData.messageId).toBe(readData.messageId);
        expect(receivedData.readerId).toBe(user1.userId);
        expect(MessageController.markMessageAsRead).toHaveBeenCalledWith(
          readData.messageId,
          user1.userId
        );
        done();
      });

      client1.emit("join_room", roomName);
      client2.emit("join_room", roomName);
      client1.emit("message_read", readData);
    });
  });
});
