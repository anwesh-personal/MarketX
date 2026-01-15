import dotenv from "dotenv";

dotenv.config();

export const config = {
    databaseUrl: process.env.DATABASE_URL || "postgres://user:pass@localhost:5432/market_writer",
    nodeEnv: process.env.NODE_ENV || "development",
    port: parseInt(process.env.PORT || "8080", 10),
    dailyRunTime: process.env.DAILY_RUN_TIME || "06:00",
};
