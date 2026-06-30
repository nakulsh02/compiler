import { Router } from "express";
import { authMiddleware, type AuthRequest } from "../middlewares/auth";
import { findAll, findById, insertOne } from "../lib/filedb";

const router = Router();
router.use(authMiddleware);

interface MessageRecord {
  id: string;
  project_id: string;
  user_id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface UserRecord {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string;
}

function messageToJSON(m: MessageRecord) {
  const user = findById<UserRecord>("users", m.user_id);
  return {
    id: m.id,
    project_id: m.project_id,
    user_id: m.user_id,
    content: m.content,
    created_at: m.createdAt,
    user: user
      ? { id: user.id, email: user.email, display_name: user.display_name, avatar_url: user.avatar_url }
      : undefined,
  };
}

router.get("/projects/:projectId/messages", (req: AuthRequest, res) => {
  try {
    const messages = findAll<MessageRecord>("messages", { project_id: req.params.projectId });
    messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    res.json(messages.map(messageToJSON));
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/projects/:projectId/messages", (req: AuthRequest, res) => {
  try {
    const { content } = req.body;
    const msg = insertOne<MessageRecord>("messages", {
      project_id: req.params.projectId,
      user_id: req.userId!,
      content,
    });
    res.json(messageToJSON(msg));
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
