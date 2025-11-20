"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRoutes = registerRoutes;
const functions_1 = require("./functions");
function registerRoutes(app) {
    app.use("/functions/v1", (0, functions_1.createFunctionsRouter)());
}
