import { execFile, spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import { config } from "../config";

export interface CliExecutionResult {
  success: boolean;
  rawOutput: string;
  parsedJson?: any;
  error?: string;
}

/**
 * Google Antigravity / AGL / AGY CLI ile Gemini 3.8 Flash Yapay Zeka Entegrasyon Servisi.
 * Kullanıcının kurduğu CLI aracılığıyla ek bir API key gerekmeden doğrudan Gemini 3.8 Flash
 * modelini çalıştırır.
 */
export const geminiCliService = {
  /**
   * Sistemde mevcut olan CLI binary yolunu tespit eder.
   */
  resolveCliExecutable(): string | null {
    const candidates = [
      config.agyCliPath,
      path.resolve(__dirname, "../../../agl.cmd"),
      path.resolve(__dirname, "../../../agy.cmd"),
      "C:\\Users\\berkay.kurt\\.gemini\\bin\\agy.exe",
      "C:\\Users\\berkay.kurt\\.gemini\\antigravity\\bin\\agentapi.bat",
      "agy.exe",
      "agl.cmd",
      "agy",
    ];

    for (const candidate of candidates) {
      try {
        if (fs.existsSync(candidate)) {
          return candidate;
        }
      } catch {
        // İzin veya yol hatası durumunda sonraki adaya geç
      }
    }
    return null;
  },

  /**
   * CLI'ın kurulu ve erişilebilir olup olmadığını doğrular.
   */
  async isAvailable(): Promise<boolean> {
    const cliPath = this.resolveCliExecutable();
    return Boolean(cliPath && fs.existsSync(cliPath));
  },

  /**
   * Gemini 3.8 Flash modelini CLI print (-p) moduyla çalıştırır.
   * CLI kullanıcının Google kimliğini kullandığı için AI Studio anahtarı gerektirmez.
   */
  async runPromptWithGemini38Flash(
    prompt: string,
    options: {
      model?: string;
      timeoutMs?: number;
      systemInstruction?: string;
    } = {}
  ): Promise<CliExecutionResult> {
    const cliPath = this.resolveCliExecutable();
    if (!cliPath) {
      return {
        success: false,
        rawOutput: "",
        error: "Antigravity/AGL CLI bulunamadı. Lütfen CLI kurulumunu kontrol edin.",
      };
    }

    const modelName = options.model || config.aiModel || "gemini-3.8-flash";
    const timeout = options.timeoutMs || 25000;

    let fullPrompt = prompt;
    if (options.systemInstruction) {
      fullPrompt = `${options.systemInstruction}\n\n${prompt}`;
    }

    return new Promise<CliExecutionResult>((resolve) => {
      const logFilePath = path.join(os.tmpdir(), "agy-cli-run.log");
      // CLI parametreleri: --model <model> --log-file <logFilePath> -p "<prompt>"
      const args = ["--model", modelName, "--log-file", logFilePath, "-p", fullPrompt];

      const child = spawn(cliPath, args, {
        windowsHide: true,
        env: {
          ...process.env,
          USERPROFILE: process.env.USERPROFILE || "C:\\Users\\berkay.kurt",
          HOME: process.env.HOME || "C:\\Users\\berkay.kurt",
          LOCALAPPDATA: process.env.LOCALAPPDATA || "C:\\Users\\berkay.kurt\\AppData\\Local",
          APPDATA: process.env.APPDATA || "C:\\Users\\berkay.kurt\\AppData\\Roaming",
          TEMP: os.tmpdir(),
          TMP: os.tmpdir(),
        },
      });

      let stdout = "";
      let stderr = "";

      const timer = setTimeout(() => {
        try {
          child.kill();
        } catch {}
        resolve({
          success: false,
          rawOutput: stdout,
          error: `Gemini 3.8 Flash CLI çağrısı zaman aşımına uğradı (${timeout}ms)`,
        });
      }, timeout);

      child.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      child.on("close", (code) => {
        clearTimeout(timer);

        if (code !== 0 && !stdout.trim()) {
          return resolve({
            success: false,
            rawOutput: stdout,
            error: stderr || `CLI process exited with code ${code}`,
          });
        }

        // Çıktıyı temizle ve JSON ise ayrıştır
        const raw = stdout.trim();
        let parsed: any = null;
        try {
          const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
          parsed = JSON.parse(cleaned);
        } catch {
          // JSON değilse metin olarak kalsın
        }

        resolve({
          success: true,
          rawOutput: raw,
          parsedJson: parsed,
        });
      });

      child.on("error", (err) => {
        clearTimeout(timer);
        resolve({
          success: false,
          rawOutput: "",
          error: err.message,
        });
      });
    });
  },
};

