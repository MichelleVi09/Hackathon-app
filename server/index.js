import express from "express";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";
import burnoutRoutes from "./routes/burnout.js";
import fatigueRoutes from "./routes/fatigue.js";
import healthRoutes from "./routes/health.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

async function createApp() {
  const app = express();
  const isProd = process.env.NODE_ENV === "production";

  app.use(express.json());
  app.use("/api/health", healthRoutes);
  app.use("/api/burnout", burnoutRoutes);
  app.use("/api/fatigue", fatigueRoutes);

  if (!isProd) {
    const vite = await createViteServer({
      root: path.join(rootDir, "client"),
      server: { middlewareMode: true },
      appType: "spa"
    });

    app.use(vite.middlewares);

    app.use("*", async (req, res, next) => {
      try {
        const url = req.originalUrl;
        const templatePath = path.join(rootDir, "client", "index.html");
        const transformed = await vite.transformIndexHtml(
          url,
          await readFile(templatePath, "utf-8")
        );
        res.status(200).set({ "Content-Type": "text/html" }).end(transformed);
      } catch (error) {
        vite.ssrFixStacktrace(error);
        next(error);
      }
    });
  } else {
    const distPath = path.join(rootDir, "dist");
    app.use(express.static(distPath));
    app.use("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  return app;
}

createApp().then((app) => {
  const port = Number(process.env.PORT ?? 3000);
  app.listen(port, () => {
    console.log(`Wellby listening on http://localhost:${port}`);
  });
});
