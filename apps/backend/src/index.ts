import express from "express";
import cors from "cors";
import { startDailyCron } from "./core/ops.scheduler";
import { router } from "./routes/api";
import superadminRouter from "./routes/superadmin";

const app = express();
app.use(express.json());
app.use(cors()); // Allow frontend access

// API Routes
app.use("/api", router);
app.use("/api/superadmin", superadminRouter);

// Health check
app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 07-Ops: Schedule the 6:00 AM Daily Run
startDailyCron();

app.listen(8080, () => {
    console.log("🚀 Market Writer SaaS API running on port 8080");
    console.log("📍 API Routes: http://localhost:8080/api");
    console.log("🔐 Superadmin: http://localhost:8080/api/superadmin");
});

