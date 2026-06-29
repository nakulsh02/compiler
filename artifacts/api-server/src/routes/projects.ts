import { Router } from "express";
import { authMiddleware, type AuthRequest } from "../middlewares/auth";
import { Project } from "../models/Project";
import { ProjectFile } from "../models/ProjectFile";

const router = Router();
router.use(authMiddleware);

function projectToJSON(p: InstanceType<typeof Project>) {
  return {
    id: p._id.toString(),
    name: p.name,
    description: p.description,
    owner_id: p.owner_id.toString(),
    is_template: p.is_template,
    is_public: p.is_public,
    starred: p.starred,
    language: p.language,
    created_at: p.createdAt.toISOString(),
    updated_at: p.updatedAt.toISOString(),
  };
}

router.get("/projects", async (req: AuthRequest, res) => {
  try {
    const projects = await Project.find({ owner_id: req.userId }).sort({ updatedAt: -1 });
    res.json(projects.map(projectToJSON));
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/projects", async (req: AuthRequest, res) => {
  try {
    const { name, description, language } = req.body;
    const project = await Project.create({
      name,
      description,
      language: language || "javascript",
      owner_id: req.userId,
    });
    res.json(projectToJSON(project));
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.patch("/projects/:id", async (req: AuthRequest, res) => {
  try {
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, owner_id: req.userId },
      req.body,
      { new: true }
    );
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    res.json(projectToJSON(project));
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/projects/:id", async (req: AuthRequest, res) => {
  try {
    await Project.findOneAndDelete({ _id: req.params.id, owner_id: req.userId });
    await ProjectFile.deleteMany({ project_id: req.params.id });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
