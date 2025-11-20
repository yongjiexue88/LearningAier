"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadEnvironment = loadEnvironment;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const dotenv_1 = require("dotenv");
let loaded = false;
function loadEnvironment() {
    if (loaded)
        return;
    // Load default .env if present.
    const root = process.cwd();
    const defaultEnvPath = node_path_1.default.join(root, ".env");
    if (node_fs_1.default.existsSync(defaultEnvPath)) {
        (0, dotenv_1.config)({ path: defaultEnvPath });
    }
    const target = process.env.APP_ENV ??
        process.env.RUNTIME_ENV ??
        process.env.NODE_ENV ??
        "local";
    const targetPath = node_path_1.default.join(root, `.env.${target}`);
    if (node_fs_1.default.existsSync(targetPath)) {
        (0, dotenv_1.config)({ path: targetPath, override: true });
    }
    loaded = true;
}
