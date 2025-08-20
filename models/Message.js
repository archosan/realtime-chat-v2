import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: [],
      },
    ],
  },
  {
    timestamps: true,
  }
);

messageSchema.pre("save", function (next) {
  if (!this.isModified("content") && !this.isModified("readBy")) {
    return next();
  }

  this.updatedAt = new Date();
  next();
});

const Message = mongoose.model("Message", messageSchema);

export default Message;
