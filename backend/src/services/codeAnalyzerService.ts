import { CodeEntity } from "../types";

export interface CodeAnalysisMeta {
  detectedLanguage: string;
  isGameDev: boolean;
  entities: CodeEntity[];
  addedLinesCount: number;
  removedLinesCount: number;
  modifiedEntities: string[];
}

export function detectLanguage(code: string): { language: string; isGameDev: boolean } {
  const isGameDev =
    code.includes("UnityEngine") ||
    code.includes("MonoBehaviour") ||
    code.includes("Time.deltaTime") ||
    code.includes("Transform") ||
    code.includes("GameObject") ||
    code.includes("Vector3");

  if (isGameDev || (code.includes("using System") || (code.includes("public class") && code.includes("namespace")))) {
    return {
      language: isGameDev ? "Unity C# (Oyun Geliştirme)" : "C# / .NET",
      isGameDev,
    };
  }
  if (code.includes("def ") || (code.includes("import ") && code.includes(":") && !code.includes("{"))) {
    return { language: "Python", isGameDev: false };
  }
  if (code.includes("func ") || code.includes("package ")) {
    return { language: "Go (Golang)", isGameDev: false };
  }
  if (code.includes("public static void main") || code.includes("System.out.println")) {
    return { language: "Java", isGameDev: false };
  }
  if (code.includes("fn ") || code.includes("impl ") || code.includes("pub fn")) {
    return { language: "Rust", isGameDev: false };
  }
  if (code.includes("import React") || code.includes("interface ") || code.includes(": string") || (code.includes("const ") && code.includes("=>"))) {
    return { language: "TypeScript / JavaScript", isGameDev: false };
  }
  if (code.includes("CREATE TABLE") || code.includes("SELECT ") || code.includes("ALTER TABLE") || code.includes("INSERT INTO")) {
    return { language: "SQL / Veritabanı", isGameDev: false };
  }

  return { language: "Genel Yazılım (General)", isGameDev: false };
}

export function parseCodeEntities(code: string): CodeEntity[] {
  const entities: CodeEntity[] = [];

  // 1. Sınıfları tespit et (C#, Java, Python, TS/JS, C++)
  const classRegex = /(?:public\s+|private\s+|protected\s+|internal\s+)?(?:abstract\s+|sealed\s+|static\s+)?class\s+([A-Za-z0-9_]+)/g;
  let match: RegExpExecArray | null;
  while ((match = classRegex.exec(code)) !== null) {
    const className = match[1];
    const startIndex = match.index;
    const snippet = code.substring(startIndex, startIndex + 800);
    entities.push({
      name: className,
      kind: "class",
      logicSnippet: snippet,
      contextLines: snippet.split(/\r?\n/).slice(0, 10),
    });
  }

  // 2. Fonksiyon / Metotları tespit et (C#, Java, TS, Go)
  const methodRegex = /(?:public|private|protected|internal)?\s*(?:static\s+|async\s+)?([A-Za-z0-9_<>[\]]+)\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)\s*(?:=>|\{)?/g;
  while ((match = methodRegex.exec(code)) !== null) {
    const returnType = match[1];
    const methodName = match[2];
    const params = match[3];

    const ignoredNames = ["if", "while", "for", "switch", "catch", "using", "lock", "foreach"];
    if (!ignoredNames.includes(methodName) && methodName.length > 2 && returnType !== "new") {
      const startIndex = match.index;
      const snippet = code.substring(startIndex, startIndex + 400);
      entities.push({
        name: methodName,
        kind: "method",
        signature: `${returnType} ${methodName}(${params})`,
        logicSnippet: snippet,
        contextLines: snippet.split(/\r?\n/).slice(0, 5),
      });
    }
  }

  // 3. Python fonksiyonları: def method_name(...)
  const pyFuncRegex = /def\s+([A-Za-z0-9_]+)\s*\(([^)]*)\):/g;
  while ((match = pyFuncRegex.exec(code)) !== null) {
    const funcName = match[1];
    const params = match[2];
    entities.push({
      name: funcName,
      kind: "function",
      signature: `def ${funcName}(${params})`,
      contextLines: [],
    });
  }

  return entities;
}

export function computeDiffStats(oldText: string, newText: string): {
  addedLinesCount: number;
  removedLinesCount: number;
} {
  const oldLines = oldText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const newLines = newText.split(/\r?\n/).filter((l) => l.trim().length > 0);

  const oldSet = new Set(oldLines);
  const newSet = new Set(newLines);

  let added = 0;
  for (const line of newLines) {
    if (!oldSet.has(line)) added++;
  }

  let removed = 0;
  for (const line of oldLines) {
    if (!newSet.has(line)) removed++;
  }

  return { addedLinesCount: added, removedLinesCount: removed };
}
