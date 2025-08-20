import { io } from "socket.io-client";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { logger } from "../config/logger.js";

const SERVER_URL = "http://localhost:3000";
const JWT_SECRET = process.env.JWT_ACCESS_SECRET || "dev-access-secret-456";

function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "1h" });
}

function getConversationRoomName(userId1, userId2) {
  return [userId1.toString(), userId2.toString()].sort().join("--");
}

function createClient(userId, roomToJoin) {
  const token = generateToken(userId);
  logger.info(`[${userId}] Connecting...`);

  const socket = io(SERVER_URL, {
    auth: { token },
    transports: ["websocket"],
  });

  socket.on("connect", () => {
    logger.info(`[${userId}] ✅ Connected. Joining room: ${roomToJoin}`);
    socket.emit("join_room", roomToJoin);
  });

  socket.on("connect_error", (err) =>
    logger.error(`[${userId}] ❌ Connection Error: ${err.message}`)
  );

  socket.on("message_received", (data) => {
    logger.info(
      `[${userId}] 📬 Received message from ${data.senderId}: "${data.message}"`
    );

    logger.info(
      `[${userId}] ➡️ Emitting 'message_read' for message ${data.messageId}`
    );
    socket.emit("message_read", {
      roomName: roomToJoin,
      messageId: data.messageId,
    });
  });

  socket.on("message_was_read", (data) => {
    logger.info(
      `[${userId}] 👀 Message ${data.messageId} was read by ${data.readerId}.`
    );
  });

  socket.on("error", (errorMessage) => {
    logger.error(`[${userId}] SERVER ERROR: ${errorMessage}`);
  });

  return socket;
}

async function runMessageTest() {
  logger.info("--- Starting Socket Message Test ---");

  const userA_Id = new mongoose.Types.ObjectId();
  const userB_Id = new mongoose.Types.ObjectId();
  const roomName = getConversationRoomName(userA_Id, userB_Id);

  const socketA = createClient(userA_Id.toString(), roomName);
  const socketB = createClient(userB_Id.toString(), roomName);

  await new Promise((resolve) => setTimeout(resolve, 1000));

  const messageToSend = "This is a test message to be saved and read.";
  const tempMessageId = new mongoose.Types.ObjectId();

  logger.info(
    `\n[${userA_Id}] ➡️ Emitting 'send_message' (ID: ${tempMessageId})`
  );
  socketA.emit("send_message", {
    roomName: roomName,
    message: messageToSend,
    receiverId: userB_Id,
    // conversationId: null,
  });

  setTimeout(() => {
    logger.log("\n--- Test Finished ---");
    socketA.disconnect();
    socketB.disconnect();
  }, 10000);
}

runMessageTest();
