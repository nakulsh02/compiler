import mongoose, { Schema, Document } from "mongoose";

export interface IProject extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  owner_id: mongoose.Types.ObjectId;
  is_template: boolean;
  is_public: boolean;
  starred: boolean;
  language: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    name: { type: String, required: true },
    description: { type: String },
    owner_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    is_template: { type: Boolean, default: false },
    is_public: { type: Boolean, default: false },
    starred: { type: Boolean, default: false },
    language: { type: String, default: "javascript" },
  },
  { timestamps: true }
);

export const Project = mongoose.model<IProject>("Project", ProjectSchema);
