const path = require("path");

// Reuse the existing backend app inside a Vercel serverless function.
// This keeps the frontend and API under a single Vercel project.
const backend = require(path.join(__dirname, "..", "backend", "server"));

module.exports = backend.default || backend.app || backend;
