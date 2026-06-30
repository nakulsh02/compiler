import { Router } from "express";
import { exec } from "node:child_process";
import { writeFile, unlink, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { authMiddleware, type AuthRequest } from "../middlewares/auth";

const router = Router();
router.use(authMiddleware);

const TIMEOUT_MS = 15000;

type LangConfig =
  | { type: "interpret"; ext: string; cmd: (file: string) => string }
  | { type: "compile"; ext: string; compile: (src: string, out: string) => string; run: (out: string) => string }
  | { type: "compile_dir"; ext: string; compile: (src: string, dir: string) => string; run: (dir: string, className: string) => string };

const LANGUAGE_CONFIG: Record<string, LangConfig> = {
  python:     { type: "interpret", ext: "py",   cmd: (f) => `python3 "${f}"` },
  python3:    { type: "interpret", ext: "py",   cmd: (f) => `python3 "${f}"` },
  javascript: { type: "interpret", ext: "js",   cmd: (f) => `node "${f}"` },
  nodejs:     { type: "interpret", ext: "js",   cmd: (f) => `node "${f}"` },
  typescript: { type: "interpret", ext: "ts",   cmd: (f) => `node --experimental-strip-types "${f}"` },
  c:          { type: "compile",   ext: "c",    compile: (src, out) => `gcc "${src}" -o "${out}" -lm`, run: (out) => `"${out}"` },
  cpp:        { type: "compile",   ext: "cpp",  compile: (src, out) => `g++ "${src}" -o "${out}" -lm -std=c++17`, run: (out) => `"${out}"` },
  "c++":      { type: "compile",   ext: "cpp",  compile: (src, out) => `g++ "${src}" -o "${out}" -lm -std=c++17`, run: (out) => `"${out}"` },
  java:       { type: "compile_dir", ext: "java", compile: (src, dir) => `javac -d "${dir}" "${src}"`, run: (dir, cls) => `java -cp "${dir}" "${cls}"` },
};

function runCommand(cmd: string, timeout: number): Promise<{ stdout: string; stderr: string; timedOut?: boolean }> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ stdout: "", stderr: "", timedOut: true }), timeout);
    exec(cmd, { timeout }, (err, stdout, stderr) => {
      clearTimeout(timer);
      resolve({ stdout, stderr: err?.message && !stderr ? err.message : stderr });
    });
  });
}

router.post("/execute", async (req: AuthRequest, res) => {
  const { language, code } = req.body as { language: string; code: string };
  const langKey = language?.toLowerCase();
  const config = LANGUAGE_CONFIG[langKey];

  if (!config) {
    res.json({
      output: `❌ Language "${language}" is not supported for execution.\n\nSupported: Python, JavaScript, TypeScript, C, C++, Java`,
      error: true,
    });
    return;
  }

  if (!code?.trim()) {
    res.json({ output: "No code to run.", error: true });
    return;
  }

  const id = randomUUID();
  const tmpBase = join(tmpdir(), `codesync_${id}`);

  try {
    if (config.type === "interpret") {
      const filePath = `${tmpBase}.${config.ext}`;
      await writeFile(filePath, code, "utf8");
      const result = await runCommand(config.cmd(filePath), TIMEOUT_MS);
      await unlink(filePath).catch(() => {});

      if (result.timedOut) {
        res.json({ output: "⏱ Execution timed out after 15 seconds.", error: true });
        return;
      }
      const combined = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
      res.json({ output: combined || "(no output)", error: !!result.stderr });
    }

    else if (config.type === "compile") {
      const srcPath = `${tmpBase}.${config.ext}`;
      const binPath = `${tmpBase}_bin`;
      await writeFile(srcPath, code, "utf8");

      // Compile step
      const compileResult = await runCommand(config.compile(srcPath, binPath), 20000);
      await unlink(srcPath).catch(() => {});

      if (compileResult.timedOut) {
        res.json({ output: "⏱ Compilation timed out.", error: true });
        return;
      }
      if (compileResult.stderr) {
        res.json({ output: `🔴 Compilation Error:\n${compileResult.stderr}`, error: true });
        return;
      }

      // Run step
      const runResult = await runCommand(config.run(binPath), TIMEOUT_MS);
      await unlink(binPath).catch(() => {});

      if (runResult.timedOut) {
        res.json({ output: "⏱ Execution timed out after 15 seconds.", error: true });
        return;
      }
      const combined = [runResult.stdout, runResult.stderr].filter(Boolean).join("\n").trim();
      res.json({ output: combined || "(no output)", error: !!runResult.stderr });
    }

    else if (config.type === "compile_dir") {
      // Check if javac exists
      const javaCheck = await runCommand("which javac", 3000);
      if (!javaCheck.stdout.trim()) {
        res.json({ output: "❌ Java is not installed on this server.\n\nTip: Use Python, JavaScript, TypeScript, C or C++ for execution.", error: true });
        return;
      }

      const dir = `${tmpBase}_java`;
      await mkdir(dir, { recursive: true });

      // Extract class name from code
      const classMatch = code.match(/public\s+class\s+(\w+)/);
      const className = classMatch?.[1] || "Main";
      const srcPath = join(dir, `${className}.java`);
      await writeFile(srcPath, code, "utf8");

      // Compile
      const compileResult = await runCommand(config.compile(srcPath, dir), 20000);
      if (compileResult.timedOut) {
        await rm(dir, { recursive: true }).catch(() => {});
        res.json({ output: "⏱ Compilation timed out.", error: true });
        return;
      }
      if (compileResult.stderr) {
        await rm(dir, { recursive: true }).catch(() => {});
        res.json({ output: `🔴 Compilation Error:\n${compileResult.stderr}`, error: true });
        return;
      }

      // Run
      const runResult = await runCommand(config.run(dir, className), TIMEOUT_MS);
      await rm(dir, { recursive: true }).catch(() => {});

      if (runResult.timedOut) {
        res.json({ output: "⏱ Execution timed out after 15 seconds.", error: true });
        return;
      }
      const combined = [runResult.stdout, runResult.stderr].filter(Boolean).join("\n").trim();
      res.json({ output: combined || "(no output)", error: !!runResult.stderr });
    }
  } catch (err) {
    await rm(tmpBase, { force: true, recursive: true }).catch(() => {});
    res.status(500).json({ output: `Execution error: ${(err as Error).message}`, error: true });
  }
});

export default router;
