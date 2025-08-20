import mongoose from "mongoose";
import Conversation from "../../models/Conversation.js";

describe("Conversation Model", () => {
  it("should correctly create and save a conversation with valid data", async () => {
    const validConversationData = {
      participants: [
        new mongoose.Types.ObjectId(),
        new mongoose.Types.ObjectId(),
      ],
      messages: [],
    };
    const conversation = new Conversation(validConversationData);
    const savedConversation = await conversation.save();

    expect(savedConversation._id).toBeDefined();
    expect(savedConversation.participants.length).toBe(2);
    expect(savedConversation.messages).toEqual([]);
    expect(savedConversation.createdAt).toBeDefined();
  });

  it("should update the updatedAt field on save", async () => {
    const conversation = new Conversation({
      participants: [
        new mongoose.Types.ObjectId(),
        new mongoose.Types.ObjectId(),
      ],
      messages: [],
    });

    const savedConversation = await conversation.save();
    const initialUpdatedAt = savedConversation.updatedAt;

    savedConversation.participants.push(new mongoose.Types.ObjectId());
    const updatedConversation = await savedConversation.save();

    expect(updatedConversation.updatedAt).toBeDefined();
    expect(updatedConversation.updatedAt).not.toEqual(initialUpdatedAt);
  });

  it("should set default values correctly", async () => {
    const conversation = new Conversation({
      participants: [
        new mongoose.Types.ObjectId(),
        new mongoose.Types.ObjectId(),
      ],
    });

    const savedConversation = await conversation.save();
    expect(savedConversation.messages).toEqual([]);
    expect(savedConversation.lastMessage).toBeUndefined();
  });
});
