import mongoose, { Schema, Document } from "mongoose";

export interface IVersion extends Document {
  _id: mongoose.Types.ObjectId;
  project_id: mongoose.Types.ObjectId;
  file_id?: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  content?: string;
  message?: string;
  createdAt: Date;
  updatedAt: Date;
}

const VersionSchema = new Schema<IVersion>(
  {
    project_id: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    file_id: { type: Schema.Types.ObjectId, ref: "ProjectFile" },
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String },
    message: { type: String },
  },
  { timestamps: true }
);

export const Version = mongoose.model<IVersion>("Version", VersionSchema);
