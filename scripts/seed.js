import mongoose from "mongoose";
import dotenv from "dotenv";
import Message from "../models/Message.js";
import User from "../../models/User.js";
import Conversation from "../models/Conversation.js";

import { saveMessage } from "../controllers/message.controller.js";
import { elasticsearchClient } from "../config/elasticsearch.js";
import { logger } from "../config/logger.js";

dotenv.config();
const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    logger.info("Connected to MongoDB");

    await User.deleteMany({});
    await Message.deleteMany({});
    await Conversation.deleteMany({});

    const indexExists = await elasticsearchClient.indices.exists({
      index: "messages",
    });
    if (indexExists) {
      await elasticsearchClient.indices.delete({
        index: "messages",
      });
      logger.info("Deleted existing Elasticsearch index: messages");
    }

    logger.info("Database and Elasticsearch index cleared");

    logger.info("Createing sample users...");
    const users = await User.create([
      { username: "user1", email: "user1@gmail.com", password: "password1" },
      { username: "user2", email: "user2@gmail.com ", password: "password2" },
      { username: "user3", email: "user3@gmail.com", password: "password3" },
    ]);
    logger.info("Sample users created");
    const [user1, user2, user3] = users;

    logger.info("Seeding messages");

    await saveMessage({
      senderId: user1._id,
      receiverId: user2._id,
      message: "Hello User2!",
    });
    await saveMessage({
      senderId: user2._id,
      receiverId: user1._id,
      message: "Hi User1! How are you?",
    });

    await saveMessage({
      senderId: user1._id,
      receiverId: user2._id,
      message: "I'm good, thanks! And you?",
    });

    await saveMessage({
      senderId: user2._id,
      receiverId: user1._id,
      message: "Doing well, thanks for asking!",
    });

    await saveMessage({
      senderId: user1._id,
      receiverId: user3._id,
      message: "Hey User3! Long time no see!",
    });
    await saveMessage({
      senderId: user3._id,
      receiverId: user1._id,
      message: "Hi User1! Yes, it's been a while!",
    });
    await saveMessage({
      senderId: user1._id,
      receiverId: user3._id,
      message: "Let's catch up soon!",
    });
    await saveMessage({
      senderId: user3._id,
      receiverId: user1._id,
      message: "Absolutely! Looking forward to it!",
    });
    logger.info("Messages seeded successfully");
  } catch (error) {
    logger.error("Error seeding database:", error);
  } finally {
    await mongoose.disconnect();
    logger.info("Disconnected from MongoDB");
    process.exit(0);
  }
};

seedDatabase();
