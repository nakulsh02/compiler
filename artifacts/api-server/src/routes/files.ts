import { Router } from "express";
import { authMiddleware, type AuthRequest } from "../middlewares/auth";
import { findAll, findById, insertOne, updateById, deleteById } from "../lib/filedb";

const router = Router();
router.use(authMiddleware);

interface FileRecord {
  id: string;
  project_id: string;
  name: string;
  path: string;
  content: string;
  language?: string;
  is_folder: boolean;
  is_main: boolean;
  parent_id?: string;
  createdAt: string;
  updatedAt: string;
}

function fileToJSON(f: FileRecord) {
  return {
    id: f.id,
    project_id: f.project_id,
    name: f.name,
    path: f.path,
    content: f.content,
    language: f.language,
    is_folder: f.is_folder,
    is_main: f.is_main ?? false,
    parent_id: f.parent_id,
    created_at: f.createdAt,
    updated_at: f.updatedAt,
  };
}

router.get("/projects/:projectId/files", (req: AuthRequest, res) => {
  try {
    const files = findAll<FileRecord>("files", { project_id: req.params.projectId });
    files.sort((a, b) => a.name.localeCompare(b.name));
    res.json(files.map(fileToJSON));
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/projects/:projectId/files", (req: AuthRequest, res) => {
  try {
    const { name, path, content, language, is_folder, parent_id } = req.body;
    const file = insertOne<FileRecord>("files", {
      project_id: req.params.projectId,
      name,
      path,
      content: content ?? "",
      language,
      is_folder: is_folder ?? false,
      is_main: false,
      parent_id: parent_id || undefined,
    });
    res.json(fileToJSON(file));
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/projects/:projectId/files/bulk", (req: AuthRequest, res) => {
  try {
    const { files } = req.body;
    const created = (files as Record<string, unknown>[]).map((f) =>
      insertOne<FileRecord>("files", {
        ...f,
        project_id: req.params.projectId,
        is_main: false,
      } as Omit<FileRecord, "id" | "createdAt" | "updatedAt">)
    );
    res.json(created.map(fileToJSON));
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.patch("/files/:id", (req: AuthRequest, res) => {
  try {
    const file = findById<FileRecord>("files", req.params.id);
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }
    const updated = updateById<FileRecord>("files", req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: "File not found" });
      return;
    }
    res.json(fileToJSON(updated));
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/files/:id", (req: AuthRequest, res) => {
  try {
    const file = findById<FileRecord>("files", req.params.id);
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }
    if (file.is_main) {
      res.status(403).json({ error: "Cannot delete the main file of a project" });
      return;
    }
    deleteById("files", req.params.id);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
