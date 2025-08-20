import mongoose from "mongoose";
import Message from "../../models/Message.js";

describe("Message Model", () => {
  it("should correctly create and save a message with valid data", async () => {
    const validMessageData = {
      conversationId: new mongoose.Types.ObjectId(),
      senderId: new mongoose.Types.ObjectId(),
      content: "Hello, this is a test message.",
    };
    const message = new Message(validMessageData);
    const savedMessage = await message.save();

    expect(savedMessage._id).toBeDefined();
    expect(savedMessage.conversationId.toString()).toBe(
      validMessageData.conversationId.toString()
    );
    expect(savedMessage.senderId.toString()).toBe(
      validMessageData.senderId.toString()
    );
    expect(savedMessage.content).toBe(validMessageData.content);
    expect(savedMessage.createdAt).toBeDefined();
  });

  it("should return validation errors for missing required fields", async () => {
    const message = new Message({
      conversationId: new mongoose.Types.ObjectId(),
      // senderId is missing
      content: "This message has no sender.",
    });

    let error;
    try {
      await message.save();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.name).toBe("ValidationError");
    expect(error.errors.senderId).toBeDefined();
  });

  it("should update the updatedAt field on save", async () => {
    const message = new Message({
      conversationId: new mongoose.Types.ObjectId(),
      senderId: new mongoose.Types.ObjectId(),
      content: "This is a message to test updatedAt.",
    });

    const savedMessage = await message.save();
    const initialUpdatedAt = savedMessage.updatedAt;

    savedMessage.content = "Updated content for testing.";
    const updatedMessage = await savedMessage.save();

    expect(updatedMessage.updatedAt).toBeDefined();
    expect(updatedMessage.updatedAt).not.toEqual(initialUpdatedAt);
  });
  it("should set default values correctly", async () => {
    const message = new Message({
      conversationId: new mongoose.Types.ObjectId(),
      senderId: new mongoose.Types.ObjectId(),
      content: "Default values test",
    });

    const savedMessage = await message.save();
    expect(savedMessage.readBy).toEqual([]);
  });
});
