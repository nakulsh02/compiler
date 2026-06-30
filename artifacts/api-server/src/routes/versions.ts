import { Router } from "express";
import { authMiddleware, type AuthRequest } from "../middlewares/auth";
import { findAll, findById, insertOne } from "../lib/filedb";

const router = Router();
router.use(authMiddleware);

interface VersionRecord {
  id: string;
  project_id: string;
  file_id?: string;
  user_id: string;
  content?: string;
  message?: string;
  createdAt: string;
  updatedAt: string;
}

interface UserRecord {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string;
}

function versionToJSON(v: VersionRecord) {
  const user = findById<UserRecord>("users", v.user_id);
  return {
    id: v.id,
    project_id: v.project_id,
    file_id: v.file_id,
    user_id: v.user_id,
    content: v.content,
    message: v.message,
    created_at: v.createdAt,
    user: user
      ? { id: user.id, email: user.email, display_name: user.display_name, avatar_url: user.avatar_url }
      : undefined,
  };
}

router.get("/projects/:projectId/versions", (req: AuthRequest, res) => {
  try {
    const versions = findAll<VersionRecord>("versions", { project_id: req.params.projectId });
    versions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(versions.slice(0, 50).map(versionToJSON));
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/projects/:projectId/versions", (req: AuthRequest, res) => {
  try {
    const { file_id, content, message } = req.body;
    const version = insertOne<VersionRecord>("versions", {
      project_id: req.params.projectId,
      file_id: file_id || undefined,
      user_id: req.userId!,
      content,
      message,
    });
    res.json(versionToJSON(version));
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
