import mongoose from "mongoose";
import { AUTO_MESSAGE_STATUS } from "../enums/auto-message-status-enum.js";

const autoMessageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    sendDate: {
      type: Date,
      required: true,
      index: true,
    },
    isQueued: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: Object.values(AUTO_MESSAGE_STATUS),
      required: true,
      default: AUTO_MESSAGE_STATUS.PENDING,
    },
  },
  {
    timestamps: true,
  }
);

autoMessageSchema.pre("save", function (next) {
  if (!this.isModified("content") && !this.isModified("sendDate")) {
    return next();
  }
  this.updatedAt = new Date();

  next();
});

const AutoMessage = mongoose.model("AutoMessage", autoMessageSchema);
export default AutoMessage;
