import express from "express";
import cors from "cors";
import { loadEnvironment } from "./config/loadEnv";
import { runtimeConfig } from "./config/runtime";
import "./services/firebaseAdmin";
import { registerRoutes } from "./routes";
import { errorHandler } from "./middleware/errorHandler";

loadEnvironment();

const app = express();
app.use(cors());
app.options("*", cors());
app.use(
  express.json({
    limit: "10mb",
  })
);

app.get("/healthz", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

registerRoutes(app);

app.use(errorHandler);

app.listen(runtimeConfig.port, () => {
  console.log(`🚀 API server listening on port ${runtimeConfig.port}`);
});
