import mongoose, { Schema, Document } from "mongoose";

export interface IChatMessage extends Document {
  _id: mongoose.Types.ObjectId;
  project_id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    project_id: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true },
  },
  { timestamps: true }
);

export const ChatMessage = mongoose.model<IChatMessage>("ChatMessage", ChatMessageSchema);
