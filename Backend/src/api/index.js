import app from "../app.js";
import { Scheme } from "../model/index.model.js";


let initialized = false;

export default async function handler(req, res) {
  console.log("📥 handler called, initialized:", initialized);
  if (!initialized) {
    try {
      await Scheme();
      initialized = true;
      console.log("✅ Schema initialized");
    } catch (err) {
      console.error("❌ Schema init failed:", err.message);
    }
  }
  return app(req, res);
}