import { Router } from "express";
import { authMiddleware, type AuthRequest } from "../middlewares/auth";
import { findAll, findById, insertOne, updateById, deleteById, deleteManyWhere } from "../lib/filedb";

const router = Router();
router.use(authMiddleware);

interface ProjectRecord {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  is_template: boolean;
  is_public: boolean;
  starred: boolean;
  language: string;
  createdAt: string;
  updatedAt: string;
}

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

function projectToJSON(p: ProjectRecord) {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    owner_id: p.owner_id,
    is_template: p.is_template,
    is_public: p.is_public,
    starred: p.starred,
    language: p.language,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  };
}

const MAIN_FILE_DEFAULTS: Record<string, { name: string; language: string; content: string }> = {
  javascript: { name: "main.js",    language: "javascript", content: 'console.log("Hello, World!");\n' },
  typescript: { name: "main.ts",    language: "typescript", content: 'console.log("Hello, World!");\n' },
  python:     { name: "main.py",    language: "python",     content: 'print("Hello, World!")\n' },
  java: {
    name: "Main.java", language: "java",
    content: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}\n',
  },
  c: {
    name: "main.c", language: "c",
    content: '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}\n',
  },
  cpp: {
    name: "main.cpp", language: "cpp",
    content: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}\n',
  },
  html: {
    name: "index.html", language: "html",
    content: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <title>My Page</title>\n</head>\n<body>\n  <h1>Hello, World!</h1>\n</body>\n</html>\n',
  },
  css:  { name: "style.css", language: "css",  content: "body {\n  margin: 0;\n  padding: 0;\n}\n" },
  go:   { name: "main.go",   language: "go",   content: 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World!")\n}\n' },
  rust: { name: "main.rs",   language: "rust", content: 'fn main() {\n    println!("Hello, World!");\n}\n' },
};

function getMainFileDefaults(language: string) {
  return MAIN_FILE_DEFAULTS[language] || MAIN_FILE_DEFAULTS["javascript"];
}

router.get("/projects", (req: AuthRequest, res) => {
  try {
    const projects = findAll<ProjectRecord>("projects", { owner_id: req.userId! });
    projects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    res.json(projects.map(projectToJSON));
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/projects", (req: AuthRequest, res) => {
  try {
    const { name, description, language } = req.body;
    const lang = language || "javascript";
    const project = insertOne<ProjectRecord>("projects", {
      name,
      description,
      language: lang,
      owner_id: req.userId!,
      is_template: false,
      is_public: false,
      starred: false,
    });

    const defaults = getMainFileDefaults(lang);
    insertOne<FileRecord>("files", {
      project_id: project.id,
      name: defaults.name,
      path: `/${defaults.name}`,
      content: defaults.content,
      language: defaults.language,
      is_folder: false,
      is_main: true,
    });

    res.json(projectToJSON(project));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.patch("/projects/:id", (req: AuthRequest, res) => {
  try {
    const project = findById<ProjectRecord>("projects", req.params.id);
    if (!project || project.owner_id !== req.userId) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    const updated = updateById<ProjectRecord>("projects", req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    res.json(projectToJSON(updated));
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/projects/:id", (req: AuthRequest, res) => {
  try {
    const project = findById<ProjectRecord>("projects", req.params.id);
    if (!project || project.owner_id !== req.userId) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    deleteById("projects", req.params.id);
    deleteManyWhere("files", { project_id: req.params.id });
    deleteManyWhere("messages", { project_id: req.params.id });
    deleteManyWhere("versions", { project_id: req.params.id });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
