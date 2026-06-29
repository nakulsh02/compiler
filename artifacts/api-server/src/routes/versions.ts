import { Router } from "express";
import { authMiddleware, type AuthRequest } from "../middlewares/auth";
import { Version } from "../models/Version";
import { User } from "../models/User";

const router = Router();
router.use(authMiddleware);

async function versionToJSON(v: InstanceType<typeof Version>) {
  const user = await User.findById(v.user_id).lean();
  return {
    id: v._id.toString(),
    project_id: v.project_id.toString(),
    file_id: v.file_id?.toString(),
    user_id: v.user_id.toString(),
    content: v.content,
    message: v.message,
    created_at: v.createdAt.toISOString(),
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

router.get("/projects/:projectId/versions", async (req: AuthRequest, res) => {
  try {
    const versions = await Version.find({ project_id: req.params.projectId })
      .sort({ createdAt: -1 })
      .limit(50);
    const json = await Promise.all(versions.map(versionToJSON));
    res.json(json);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/projects/:projectId/versions", async (req: AuthRequest, res) => {
  try {
    const { file_id, content, message } = req.body;
    const version = await Version.create({
      project_id: req.params.projectId,
      file_id: file_id || undefined,
      user_id: req.userId,
      content,
      message,
    });
    const json = await versionToJSON(version);
    res.json(json);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
