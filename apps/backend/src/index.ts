import express from "express";
import cors from "cors";
import { startDailyCron } from "./core/ops.scheduler";
import { router } from "./routes/api";

const app = express();
app.use(express.json());
app.use(cors()); // Allow frontend access

// API Routes
app.use("/api", router);

// 07-Ops: Schedule the 6:00 AM Daily Run
startDailyCron();

app.listen(8080, () => {
    console.log("🚀 Market Writer SaaS API running on port 8080");
});
