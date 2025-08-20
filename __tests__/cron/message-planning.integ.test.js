import mongoose from "mongoose";
import User from "../../models/User.js";
import AutoMessage from "../../models/AutoMessage.js";
import messagePlanning from "../../cron/jobs/message-planning";

describe("Cron Job: messagePlanning", () => {
  beforeAll(async () => {
    await mongoose.disconnect();

    await mongoose.connect(
      process.env.MONGO_URI_TEST ||
        "mongodb://admin:password123@localhost:27017/realtime_chat_test?authSource=admin"
    );
  });
  afterAll(async () => {
    await mongoose.disconnect();
  });
  afterEach(async () => {
    await User.deleteMany({});
    await AutoMessage.deleteMany({});
  });

  it("should create auto messages for pairs of users", async () => {
    await User.create([
      { username: "user1", email: "user1@test.com", password: "password" },
      { username: "user2", email: "user2@test.com", password: "password" },
      { username: "user3", email: "user3@test.com", password: "password" },
      { username: "user4", email: "user4@test.com", password: "password" },
    ]);

    await messagePlanning();

    const createdMessages = await AutoMessage.find({});

    expect(createdMessages.length).toBe(2);

    const firstMessage = createdMessages[0];
    expect(firstMessage.sender).toBeDefined();
    expect(firstMessage.receiver).toBeDefined();
    expect(firstMessage.sender).not.toEqual(firstMessage.receiver);
    expect(firstMessage.content).not.toBeNull();

    expect(firstMessage.sendDate).toBeInstanceOf(Date);
  });

  it("should handle an odd number of users correctly", async () => {
    await User.create([
      { username: "userA", email: "userA@test.com", password: "password" },
      { username: "userB", email: "userB@test.com", password: "password" },
      { username: "userC", email: "userC@test.com", password: "password" },
    ]);

    await messagePlanning();

    const createdMessages = await AutoMessage.find({});

    expect(createdMessages.length).toBe(1);
  });

  it("should not create any messages if there are less than two users", async () => {
    await User.create({
      username: "lonelyUser",
      email: "lonely@test.com",
      password: "password",
    });

    await messagePlanning();

    const createdMessages = await AutoMessage.find({});
    expect(createdMessages.length).toBe(0);
  });
});
