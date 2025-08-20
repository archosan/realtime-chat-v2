import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    messages: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
        default: [],
      },
    ],
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
  },
  {
    timestamps: true,
  }
);

conversationSchema.pre("save", function (next) {
  if (!this.isModified("participants") && !this.isModified("messages")) {
    return next();
  }

  this.updatedAt = new Date();
  next();
});

const Conversation = mongoose.model("Conversation", conversationSchema);

export default Conversation;
