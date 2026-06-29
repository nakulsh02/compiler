import { Router } from "express";
import { exec } from "node:child_process";
import { writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { authMiddleware, type AuthRequest } from "../middlewares/auth";

const router = Router();
router.use(authMiddleware);

const TIMEOUT_MS = 10000;

const LANGUAGE_CONFIG: Record<string, { ext: string; cmd: (file: string) => string }> = {
  python: { ext: "py", cmd: (f) => `python3 ${f}` },
  python3: { ext: "py", cmd: (f) => `python3 ${f}` },
  javascript: { ext: "js", cmd: (f) => `node ${f}` },
  nodejs: { ext: "js", cmd: (f) => `node ${f}` },
};

router.post("/execute", async (req: AuthRequest, res) => {
  const { language, code } = req.body as { language: string; code: string };

  const config = LANGUAGE_CONFIG[language?.toLowerCase()];
  if (!config) {
    res.json({ output: `Language "${language}" is not supported for execution.\nSupported: python, python3, javascript`, error: true });
    return;
  }

  if (!code?.trim()) {
    res.json({ output: "No code to run.", error: true });
    return;
  }

  const id = randomUUID();
  const filePath = join(tmpdir(), `codesync_${id}.${config.ext}`);

  try {
    await writeFile(filePath, code, "utf8");

    const output = await new Promise<{ stdout: string; stderr: string; timedOut?: boolean }>((resolve) => {
      const timer = setTimeout(() => {
        resolve({ stdout: "", stderr: "", timedOut: true });
      }, TIMEOUT_MS);

      exec(config.cmd(filePath), { timeout: TIMEOUT_MS }, (err, stdout, stderr) => {
        clearTimeout(timer);
        resolve({ stdout, stderr: err?.message && !stderr ? err.message : stderr });
      });
    });

    await unlink(filePath).catch(() => {});

    if (output.timedOut) {
      res.json({ output: "Execution timed out after 10 seconds.", error: true });
      return;
    }

    const combined = [output.stdout, output.stderr].filter(Boolean).join("\n").trim();
    res.json({ output: combined || "(no output)", error: !!output.stderr });
  } catch (err) {
    await unlink(filePath).catch(() => {});
    res.status(500).json({ output: `Execution error: ${(err as Error).message}`, error: true });
  }
});

export default router;
