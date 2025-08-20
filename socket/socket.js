import { Server } from "socket.io";
import http from "http";
import app from "../app.js";
import jwt from "jsonwebtoken";
import { BadRequestError } from "../errors/BadRequestError.js";
import {
  saveMessage,
  markMessageAsRead,
} from "../controllers/message.controller.js";
import { logger } from "../config/logger.js";
import { redisClient } from "../config/redis-client.js";
import { ONLINE_USERS_KEY } from "../config/constant.js";

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});
const withErrorHandling = (socket, handler, customErrorMessage) => {
  return async (data, callback) => {
    try {
      await handler(data, callback);
    } catch (error) {
      logger.error(`Socket Event Error: ${error.message}`, {
        eventName: handler.name,
        data,
      });

      socket.emit("error", {
        message: customErrorMessage || "An unexpected error occurred.",
      });

      if (callback) {
        callback({
          error: true,
          message: customErrorMessage || "Operation failed.",
        });
      }
    }
  };
};
const initializeSocket = (io) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new BadRequestError("Authentication error"));
    }

    try {
      const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      socket.user = { userId: payload.userId, jti: payload.jti };
      next();
    } catch (error) {
      logger.error("JWT Verification Error:", error.message);
      return next(new BadRequestError("Invalid token"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.user.userId;

    if (!userId) {
      logger.error("Socket connection attempt with undefined userId.");
      socket.disconnect();
      return;
    }

    logger.info(`User connected: ${userId}`);

    try {
      await redisClient.sAdd(ONLINE_USERS_KEY, String(userId));
      socket.broadcast.emit("user_online", { userId });
    } catch (error) {
      logger.error(`Redis sadd error for user ${userId}:`, error);
      socket.emit("error", { message: "Could not register online status." });
    }

    socket.on("join_room", (roomName) => {
      if (roomName) {
        socket.join(roomName);
        logger.info(`User ${userId} joined room: ${roomName}`);
      }
    });

    socket.on(
      "send_message",
      withErrorHandling(
        socket,
        async (data) => {
          const { message, receiverId, roomName } = data;
          const { userId } = socket.user;

          logger.info(
            `\n[${userId}] ➡️ Emitting 'send_message' for
            room: ${roomName}, message: "${message}", receiverId: ${receiverId}`
          );

          if (!roomName || !message || !receiverId) {
            throw new Error("Missing required data for sending message.");
          }

          const savedMessage = await saveMessage({
            message,
            receiverId,
            senderId: userId,
            //conversationId: roomName,
          });

          socket.to(roomName).emit("message_received", {
            message: savedMessage.content,
            senderId: savedMessage.senderId,
            messageId: savedMessage._id,
          });
          logger.info(
            `Message sent by ${userId} to room ${roomName}: ${message}`
          );
        },
        "Could not send message."
      )
    );

    socket.on("start_typing", (data) => {
      const { roomName } = data;
      if (roomName) {
        socket.to(roomName).emit("user_typing", { userId });
        logger.info(`User ${userId} is typing in room: ${roomName}`);
      }
    });

    socket.on("stop_typing", (data) => {
      const { roomName } = data;
      if (roomName) {
        socket.to(roomName).emit("user_stopped_typing", { userId });
        logger.info(`User ${userId} stopped typing in room: ${roomName}`);
      }
    });

    socket.on(
      "message_read",
      withErrorHandling(
        socket,
        async (data) => {
          const { roomName, messageId } = data;
          if (!roomName || !messageId) {
            throw new Error(
              "Missing roomName or messageId for marking message as read."
            );
          }

          await markMessageAsRead(messageId, userId);

          socket.to(roomName).emit("message_was_read", {
            messageId,
            readerId: userId,
          });
          logger.info(
            `Message ${messageId} read by ${userId} in room ${roomName}`
          );
        },
        "Could not mark message as read."
      )
    );

    socket.on("disconnect", async () => {
      logger.info(`User disconnected: ${userId}`);

      try {
        await redisClient.sRem(ONLINE_USERS_KEY, String(userId));
        socket.broadcast.emit("user_offline", { userId });
      } catch (error) {
        logger.error(
          `Redis srem error for user ${userId} on disconnect:`,
          error
        );
      }
    });
  });
};

export { initializeSocket, server as httpServer, io };
