import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT ?? "5001", 10),
  nodeEnv: process.env.NODE_ENV ?? "development",
  databaseUrl: process.env.DATABASE_URL ?? "",
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
  aiApiKey: process.env.AI_API_KEY ?? process.env.GEMINI_API_KEY ?? "",
  aiModel: process.env.DEFAULT_AI_MODEL ?? "gemini-3.8-flash",
  useCliAi: process.env.USE_CLI_AI !== "false",
  agyCliPath:
    process.env.AGY_CLI_PATH ??
    process.env.AGL_CLI_PATH ??
    "C:\\Users\\berkay.kurt\\.gemini\\bin\\agy.exe",

  // Developer Mode Yapılandırması (Açık ve erişilebilir)
  developerModeEnabled: process.env.DEVELOPER_MODE_ENABLED !== "false",
  cookieSecure: process.env.NODE_ENV === "production",
};
