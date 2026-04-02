import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve pulse-master path — adjust if yours is elsewhere
const PULSE_PATH = path.join(
  process.env.HOME || process.env.USERPROFILE,
  "Downloads/pulse-master/data"
);

export default defineConfig({
  plugins: [
    react(),
    {
      // Custom plugin: serve PhonePe local JSON files via /pulse-data/...
      name: "pulse-local-server",
      configureServer(server) {
        server.middlewares.use("/pulse-data", (req, res, next) => {
          const filePath = path.join(PULSE_PATH, req.url);
          if (fs.existsSync(filePath) && filePath.endsWith(".json")) {
            res.setHeader("Content-Type", "application/json");
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.end(fs.readFileSync(filePath));
          } else {
            res.statusCode = 404;
            res.end(JSON.stringify({ error: "Not found", path: filePath }));
          }
        });
      },
    },
  ],
  server: { port: 3000 },
});
