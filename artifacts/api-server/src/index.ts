import { createServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import app from "./app";
import { logger } from "./lib/logger";
import { connectDB } from "./lib/db";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const httpServer = createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

io.on("connection", (socket) => {
  socket.on("join-project", (projectId: string) => {
    socket.join(`project:${projectId}`);
  });

  socket.on("leave-project", (projectId: string) => {
    socket.leave(`project:${projectId}`);
  });

  socket.on("chat-message", (data: { projectId: string; message: unknown }) => {
    socket.to(`project:${data.projectId}`).emit("chat-message", data.message);
  });

  socket.on("file-change", (data: { projectId: string; fileId: string; content: string }) => {
    socket.to(`project:${data.projectId}`).emit("file-change", {
      fileId: data.fileId,
      content: data.content,
    });
  });
});

connectDB()
  .then(() => {
    httpServer.listen(port, () => {
      logger.info({ port }, "Server listening");
    });
  })
  .catch((err) => {
    logger.error({ err }, "Failed to connect to MongoDB");
    process.exit(1);
  });
