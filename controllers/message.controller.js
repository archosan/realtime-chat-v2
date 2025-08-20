import { elasticsearchClient } from "../config/elasticsearch.js";
import { logger } from "../config/logger.js";
import Message from "../models/Message.js";
import Conversation from "../models/Conversation.js";

export const saveMessage = async (data) => {
  const { message, receiverId, senderId } = data;

  let conversation = await Conversation.findOne({
    participants: { $all: [senderId, receiverId], $size: 2 },
  });

  if (!conversation) {
    conversation = new Conversation({
      participants: [senderId, receiverId],
      messages: [],
    });
  }

  const newMessage = new Message({
    senderId,
    conversationId: conversation._id,
    content: message,
    readBy: [senderId],
  });

  await newMessage.save();

  conversation.messages.push(newMessage._id);
  conversation.lastMessage = newMessage._id;
  await conversation.save();

  await newMessage.populate("senderId", "username email");

  await elasticsearchClient.index({
    index: "messages",
    id: newMessage._id.toString(),
    document: {
      content: newMessage.content,
      senderId: newMessage.senderId._id.toString(),
      conversationId: conversation._id.toString(),
      createdAt: newMessage.createdAt,
    },
  });
  logger.info("Message saved and indexed in Elasticsearch", {
    messageId: newMessage._id,
    conversationId: conversation._id,
  });

  return newMessage;
};

export const markMessageAsRead = async (messageId, readerId) => {
  const message = await Message.findById(messageId).populate(
    "senderId",
    "username email"
  );
  if (!message) {
    throw new Error("Message not found");
  }

  if (message.readBy.includes(readerId)) {
    return message;
  }
  message.readBy.push(readerId);
  await message.save();
  return message;
};
