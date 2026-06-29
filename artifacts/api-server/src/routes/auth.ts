import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { authMiddleware, type AuthRequest } from "../middlewares/auth";

const router = Router();

const JWT_SECRET = process.env["JWT_SECRET"] || "codesync-secret";

function signToken(userId: string) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
}

function userToJSON(user: InstanceType<typeof User>) {
  return {
    id: user._id.toString(),
    email: user.email,
    display_name: user.display_name,
    avatar_url: user.avatar_url,
    created_at: user.createdAt.toISOString(),
    updated_at: user.updatedAt.toISOString(),
  };
}

router.post("/auth/signup", async (req, res) => {
  try {
    const { email, password, display_name } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      res.status(400).json({ error: "Email already registered" });
      return;
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await User.create({
      email: email.toLowerCase(),
      password: hashed,
      display_name: display_name || email.split("@")[0],
    });

    const token = signToken(user._id.toString());
    res.json({ token, user: userToJSON(user) });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/auth/signin", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const token = signToken(user._id.toString());
    res.json({ token, user: userToJSON(user) });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/auth/me", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({ user: userToJSON(user) });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/auth/profile", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { display_name, avatar_url } = req.body;
    const user = await User.findByIdAndUpdate(
      req.userId,
      { display_name, avatar_url },
      { new: true }
    );
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({ user: userToJSON(user) });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
