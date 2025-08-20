import User from "../../models/User.js";
import AutoMessage from "../../models/AutoMessage.js";
import { sampleMessages } from "../../data/sampleMessages.js";
import { logger } from "../../config/logger.js";

const MAX_DELAY_IN_MINUTES = 10;
const MILLISECONDS_IN_A_MINUTE = 60 * 1000;

const messagePlanning = async () => {
  logger.info("Message planning job started...");
  try {
    const allUsers = await User.find({}).select("_id").lean();

    if (!allUsers || allUsers.length === 0) {
      logger.info("No users found for message planning.");
      return;
    }

    logger.info(`Found ${allUsers.length} users for message planning.`);

    const shuffledUsers = allUsers.sort(() => Math.random() - 1);
    const userPairs = [];
    for (let i = 0; i < shuffledUsers.length; i += 2) {
      if (i + 1 < shuffledUsers.length) {
        userPairs.push([shuffledUsers[i], shuffledUsers[i + 1]]);
      }
    }

    if (userPairs.length === 0) {
      logger.info("No user pairs found for message planning.");
      return;
    }

    logger.info(`Created ${userPairs.length} user pairs for message planning.`);

    const messagesToCreate = userPairs.map((pair) => {
      const [sender, receiver] = pair;

      const randomContent =
        sampleMessages[Math.floor(Math.random() * sampleMessages.length)];

      const randomMinutes =
        Math.floor(Math.random() * MAX_DELAY_IN_MINUTES) + 1;

      const sendDate = new Date(
        Date.now() + randomMinutes * MILLISECONDS_IN_A_MINUTE
      );

      return {
        sender: sender._id,
        receiver: receiver._id,
        content: randomContent,
        sendDate: sendDate,
      };
    });

    logger.info(
      `Preparing to create ${messagesToCreate.length} auto messages.`
    );

    if (messagesToCreate.length === 0) {
      logger.info("No messages to create.");
      return;
    }

    const createdMessages = await AutoMessage.insertMany(messagesToCreate);
    logger.info(
      `Successfully created ${createdMessages.length} auto messages.`
    );
  } catch (error) {
    logger.error("Error creating auto messages:", error);
  }
};

export default messagePlanning;
