import { ForbiddenError } from "../errors/ForbiddenError.js";
import { NotFoundError } from "../errors/NotFound.js";
import User from "../models/User.js";
import Message from "../models/Message.js";
import Conversation from "../models/Conversation.js";
import { redisClient } from "../config/redis-client.js";
import { ONLINE_USERS_KEY } from "../config/constant.js";

export const getAllUsersHandler = async (req, res) => {
  const cachedUsers = await redisClient.get("allUsers");
  if (cachedUsers) {
    return res.status(200).json({
      users: JSON.parse(cachedUsers),
      source: "cache",
    });
  }

  const users = await User.find({}, "-password -__v");
  if (!users || users.length === 0) {
    throw new NotFoundError("No users found.");
  }
  await redisClient.set(
    "allUsers",
    JSON.stringify(users),
    "EX",
    process.env.REDIS_CACHE_TTL || 3600 // 1 hour default expiration
  );

  res.status(200).json(users);
};
export const updateUserHandler = async (req, res) => {
  const { userId } = req.params;
  const { username, email } = req.body;

  const userIdFromToken = req.user.userId;
  if (userId !== userIdFromToken) {
    throw new ForbiddenError("You can only update your own profile.");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError("User not found.");
  }

  user.username = username || user.username;
  user.email = email || user.email;
  user.updatedAt = new Date();
  await user.save();

  await redisClient.del(`user:${userId}`);

  res.status(201).json({
    message: "User updated successfully",
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  });
};

export const getUserHandler = async (req, res) => {
  const { userId } = req.params;

  const cachedUser = await redisClient.get(`user:${userId}`);
  if (cachedUser) {
    return res.status(200).json({
      user: JSON.parse(cachedUser),
      source: "cache",
    });
  }
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError("User not found.");
  }

  const userIdFromToken = req.user.userId;
  if (userId !== userIdFromToken) {
    throw new ForbiddenError("You can only view your own profile.");
  }

  await redisClient.set(
    `user:${userId}`,
    JSON.stringify(user),
    "EX",
    process.env.REDIS_CACHE_TTL || 3600
  );

  res.status(200).json({
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  });
};

export const getAllMessagesByUserId = async (req, res) => {
  const { userId } = req.params;

  const userIdFromToken = req.user.userId;
  if (userId !== userIdFromToken) {
    throw new ForbiddenError("You can only view your own messages.");
  }

  const messages = await Message.find({ senderId: userId });
  if (!messages || messages.length === 0) {
    throw new NotFoundError("No messages found for this user.");
  }

  res.status(200).json(messages);
};

export const getConversationByUserId = async (req, res) => {
  const { userId } = req.params;

  const userIdFromToken = req.user.userId;
  if (userId !== userIdFromToken) {
    throw new ForbiddenError("You can only view your own conversations.");
  }

  const conversations = await Conversation.find({
    participants: userId,
  }).populate("messages", "content senderId createdAt");
  if (!conversations || conversations.length === 0) {
    throw new NotFoundError("No conversations found for this user.");
  }

  res.status(200).json(conversations);
};

export const getOnlineUsers = async (req, res) => {
  const onlineUserIds = await redisClient.sMembers(ONLINE_USERS_KEY);
  res.status(200).json({ onlineUsers: onlineUserIds });
};

export const getOnlineUserCount = async (req, res) => {
  const count = await redisClient.sCard(ONLINE_USERS_KEY);
  res.status(200).json({ onlineUserCount: count });
};

export const getIsUserOnline = async (req, res) => {
  const { userId } = req.params;

  const isOnline = await redisClient.sIsMember(ONLINE_USERS_KEY, userId);
  res.status(200).json({ userId, isOnline });
};
