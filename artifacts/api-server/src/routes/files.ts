import { Router } from "express";
import { authMiddleware, type AuthRequest } from "../middlewares/auth";
import { ProjectFile } from "../models/ProjectFile";

const router = Router();
router.use(authMiddleware);

function fileToJSON(f: InstanceType<typeof ProjectFile>) {
  return {
    id: f._id.toString(),
    project_id: f.project_id.toString(),
    name: f.name,
    path: f.path,
    content: f.content,
    language: f.language,
    is_folder: f.is_folder,
    parent_id: f.parent_id?.toString(),
    created_at: f.createdAt.toISOString(),
    updated_at: f.updatedAt.toISOString(),
  };
}

router.get("/projects/:projectId/files", async (req: AuthRequest, res) => {
  try {
    const files = await ProjectFile.find({ project_id: req.params.projectId }).sort({ name: 1 });
    res.json(files.map(fileToJSON));
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/projects/:projectId/files", async (req: AuthRequest, res) => {
  try {
    const { name, path, content, language, is_folder, parent_id } = req.body;
    const file = await ProjectFile.create({
      project_id: req.params.projectId,
      name,
      path,
      content: content ?? "",
      language,
      is_folder: is_folder ?? false,
      parent_id: parent_id || undefined,
    });
    res.json(fileToJSON(file));
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/projects/:projectId/files/bulk", async (req: AuthRequest, res) => {
  try {
    const { files } = req.body;
    const created = await ProjectFile.insertMany(
      files.map((f: Record<string, unknown>) => ({ ...f, project_id: req.params.projectId }))
    );
    res.json(created.map(fileToJSON));
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.patch("/files/:id", async (req: AuthRequest, res) => {
  try {
    const file = await ProjectFile.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }
    res.json(fileToJSON(file));
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/files/:id", async (req: AuthRequest, res) => {
  try {
    await ProjectFile.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
