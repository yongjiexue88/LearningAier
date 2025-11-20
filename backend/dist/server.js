"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const loadEnv_1 = require("./config/loadEnv");
const runtime_1 = require("./config/runtime");
require("./services/firebaseAdmin");
const routes_1 = require("./routes");
const errorHandler_1 = require("./middleware/errorHandler");
(0, loadEnv_1.loadEnvironment)();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.options("*", (0, cors_1.default)());
app.use(express_1.default.json({
    limit: "10mb",
}));
app.get("/healthz", (_req, res) => {
    res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
    });
});
(0, routes_1.registerRoutes)(app);
app.use(errorHandler_1.errorHandler);
app.listen(runtime_1.runtimeConfig.port, () => {
    console.log(`🚀 API server listening on port ${runtime_1.runtimeConfig.port}`);
});
