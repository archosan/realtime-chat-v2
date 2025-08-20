import { io } from "socket.io-client";
import jwt from "jsonwebtoken";
import { logger } from "../config/logger.js";
import mongoose from "mongoose";
const SERVER_URL = "http://localhost:3000";

const JWT_SECRET = process.env.JWT_ACCESS_SECRET || "dev-access-secret-456";

function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "1h" });
}

function connectClient(userId, roomToJoin) {
  const token = generateToken(userId);
  logger.info(`[${userId}] Connecting with token...`);

  const socket = io(SERVER_URL, {
    auth: {
      token: token,
    },
  });

  socket.on("connect", () => {
    logger.info(`[${userId}] ✅ Connected to server. Socket ID: ${socket.id}`);

    socket.emit("join_room", roomToJoin);
    logger.info(`[${userId}] ➡️ Emitted 'join_room' for room: ${roomToJoin}`);
  });

  socket.on("connect_error", (err) => {
    logger.error(`[${userId}] ❌ Connection Error: ${err.message}`);
  });

  socket.on("disconnect", (reason) => {
    logger.info(`[${userId}] 🔌 Disconnected from server. Reason: ${reason}`);
  });

  socket.on("user_online", (data) => {
    logger.info(
      `[${userId}] 📢 Received 'user_online': User ${data.userId} is now online.`
    );
  });

  socket.on("user_offline", (data) => {
    logger.info(
      `[${userId}] 📢 Received 'user_offline': User ${data.userId} has gone offline.`
    );
  });

  socket.on("user_typing", (data) => {
    logger.info(
      `[${userId}] ✍️  Received 'user_typing': User ${data.userId} is typing...`
    );
  });

  socket.on("user_stopped_typing", (data) => {
    logger.info(
      `[${userId}] 🛑 Received 'user_stopped_typing': User ${data.userId} stopped typing.`
    );
  });

  socket.on("message_was_read", (data) => {
    logger.info(
      `[${userId}] 👀 Received 'message_was_read': Message ${data.messageId} was read by ${data.readerId}.`
    );
  });

  socket.on("message_received", (data) => {
    logger.info(
      `[${userId}] 📬 Received 'message_received' from ${data.senderId}: "${data.message}"`
    );
    if (data.messageId) {
      logger.info(
        `[${userId}] ➡️ Emitting 'message_read' for message ${data.messageId}`
      );
      socket.emit("message_read", {
        roomName: roomToJoin,
        messageId: data.messageId,
      });
    }
  });

  return socket;
}

function runTest() {
  const userA_Id = new mongoose.Types.ObjectId().toString();
  const userB_Id = new mongoose.Types.ObjectId().toString();

  const chatRoom = [userA_Id, userB_Id].sort().join("--");

  const socketA = connectClient(userA_Id, chatRoom);

  setTimeout(() => {
    const socketB = connectClient(userB_Id, chatRoom);

    setTimeout(() => {
      logger.info(`\n--- Simulating User A typing ---`);

      socketA.emit("start_typing", { roomName: chatRoom });
      logger.info(`[${userA_Id}] ➡️ Emitted 'start_typing'`);

      setTimeout(() => {
        socketA.emit("stop_typing", { roomName: chatRoom });
        logger.info(`[${userA_Id}] ➡️ Emitted 'stop_typing'`);

        const messageId = `msg-${Date.now()}`;
        socketA.emit("send_message", {
          roomName: chatRoom,
          message: "Hello from User A! Did you see me typing?",
          messageId: messageId,
          receiverId: userB_Id,
        });

        logger.info(
          `[${userA_Id}] ➡️ Emitted 'send_message' with ID: ${messageId}`
        );
      }, 2000);
    }, 2000);
  }, 3000);
}

runTest();
