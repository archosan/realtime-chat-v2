import mongoose from "mongoose";
import AutoMessage from "../../models/AutoMessage.js";
import { AUTO_MESSAGE_STATUS } from "../../enums/auto-message-status-enum.js";

describe("AutoMessage Model", () => {
  it("should correctly create and save a automessage with valid data", async () => {
    const autoMessage = new AutoMessage({
      sender: new mongoose.Types.ObjectId(),
      receiver: new mongoose.Types.ObjectId(),
      content: "Hello!",
      sendDate: new Date(),
    });

    const savedMessage = await autoMessage.save();
    expect(savedMessage._id).toBeDefined();
    expect(savedMessage.content).toBe("Hello!");
  });

  it("should return validation errors for missing required fields", async () => {
    const autoMessage = new AutoMessage({
      sender: new mongoose.Types.ObjectId(),

      content: "This message has no receiver.",
      sendDate: new Date(),
    });

    let error;
    try {
      await autoMessage.save();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.name).toBe("ValidationError");
    expect(error.errors.receiver).toBeDefined();
  });

  it("should update the updatedAt field on save", async () => {
    const autoMessage = new AutoMessage({
      sender: new mongoose.Types.ObjectId(),
      receiver: new mongoose.Types.ObjectId(),
      content: "This is a message to test updatedAt.",
      sendDate: new Date(),
    });

    const savedMessage = await autoMessage.save();
    const initialUpdatedAt = savedMessage.updatedAt;

    savedMessage.content = "Updated content for testing.";
    const updatedMessage = await savedMessage.save();

    expect(updatedMessage.updatedAt).toBeDefined();
    expect(updatedMessage.updatedAt).not.toEqual(initialUpdatedAt);
  });

  it("should set default values correctly", async () => {
    const autoMessage = new AutoMessage({
      sender: new mongoose.Types.ObjectId(),
      receiver: new mongoose.Types.ObjectId(),
      content: "Default values test",
      sendDate: new Date(),
    });

    const savedMessage = await autoMessage.save();
    expect(savedMessage.isQueued).toBe(false);
    expect(savedMessage.status).toBe(AUTO_MESSAGE_STATUS.PENDING);
  });

  it("should validate status enum values", async () => {
    const autoMessage = new AutoMessage({
      sender: new mongoose.Types.ObjectId(),
      receiver: new mongoose.Types.ObjectId(),
      content: "Test message",
      sendDate: new Date(),
      status: "PENDING",
    });

    let error;
    try {
      await autoMessage.save();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.name).toBe("ValidationError");
    expect(error.errors.status).toBeDefined();
  });
});
