import mongoose, { Schema, Document } from "mongoose";

export interface IProjectFile extends Document {
  _id: mongoose.Types.ObjectId;
  project_id: mongoose.Types.ObjectId;
  name: string;
  path: string;
  content?: string;
  language?: string;
  is_folder: boolean;
  parent_id?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectFileSchema = new Schema<IProjectFile>(
  {
    project_id: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    name: { type: String, required: true },
    path: { type: String, required: true },
    content: { type: String },
    language: { type: String },
    is_folder: { type: Boolean, default: false },
    parent_id: { type: Schema.Types.ObjectId, ref: "ProjectFile" },
  },
  { timestamps: true }
);

export const ProjectFile = mongoose.model<IProjectFile>("ProjectFile", ProjectFileSchema);
