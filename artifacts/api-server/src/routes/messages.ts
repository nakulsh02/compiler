import { Router } from "express";
import { authMiddleware, type AuthRequest } from "../middlewares/auth";
import { ChatMessage } from "../models/ChatMessage";
import { User } from "../models/User";

const router = Router();
router.use(authMiddleware);

async function messageToJSON(m: InstanceType<typeof ChatMessage>) {
  const user = await User.findById(m.user_id).lean();
  return {
    id: m._id.toString(),
    project_id: m.project_id.toString(),
    user_id: m.user_id.toString(),
    content: m.content,
    created_at: m.createdAt.toISOString(),
    user: user
      ? {
          id: user._id.toString(),
          email: user.email,
          display_name: user.display_name,
          avatar_url: user.avatar_url,
        }
      : undefined,
  };
}

router.get("/projects/:projectId/messages", async (req: AuthRequest, res) => {
  try {
    const messages = await ChatMessage.find({ project_id: req.params.projectId }).sort({ createdAt: 1 });
    const json = await Promise.all(messages.map(messageToJSON));
    res.json(json);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/projects/:projectId/messages", async (req: AuthRequest, res) => {
  try {
    const { content } = req.body;
    const msg = await ChatMessage.create({
      project_id: req.params.projectId,
      user_id: req.userId,
      content,
    });
    const json = await messageToJSON(msg);
    res.json(json);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
