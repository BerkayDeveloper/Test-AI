/**
 * Dosya & Belge Ayrıştırma Yardımcısı
 * PDF, Word (.docx), TXT, Markdown ve Kaynak Kod dosyalarından metin ve değişiklik verisi ayıklar.
 */

export interface ParsedDocumentResult {
  text: string;
  fileName: string;
  fileSizeFormatted: string;
  lineCount: number;
  charCount: number;
  fileType: string;
  error?: string;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * PDF dosyasındaki FlateDecode (deflate) akışını tarayıcının yerleşik DecompressionStream API'si ile açar
 */
async function decompressFlate(data: Uint8Array): Promise<string | null> {
  // 1. Standart deflate denemesi
  try {
    if (typeof window !== "undefined" && "DecompressionStream" in window) {
      // PDF FlateDecode genellikle zlib header'ı (78 9c, 78 01, 78 da) içerir
      const ds = new DecompressionStream("deflate");
      const writer = ds.writable.getWriter();
      writer.write(data);
      writer.close();
      const reader = ds.readable.getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }
      const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
      const merged = new Uint8Array(totalLen);
      let offset = 0;
      for (const c of chunks) {
        merged.set(c, offset);
        offset += c.length;
      }
      return new TextDecoder("utf-8", { fatal: false }).decode(merged);
    }
  } catch {
    // 2. Deflate-raw denemesi (zlib başlığı yoksa)
    try {
      if (typeof window !== "undefined" && "DecompressionStream" in window) {
        const dsRaw = new DecompressionStream("deflate-raw");
        const writer = dsRaw.writable.getWriter();
        // Zlib başlığı (ilk 2 bayt) varsa atla
        const sliceData = data.length > 2 && data[0] === 0x78 ? data.slice(2) : data;
        writer.write(sliceData);
        writer.close();
        const reader = dsRaw.readable.getReader();
        const chunks: Uint8Array[] = [];
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value) chunks.push(value);
        }
        const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
        const merged = new Uint8Array(totalLen);
        let offset = 0;
        for (const c of chunks) {
          merged.set(c, offset);
          offset += c.length;
        }
        return new TextDecoder("utf-8", { fatal: false }).decode(merged);
      }
    } catch {}
  }
  return null;
}

/**
 * PDF komutlarından ve metin bloklarından (BT ... ET, Tj, TJ) metin ayıklar
 */
function extractTextFromPdfContent(content: string): string[] {
  const extractedLines: string[] = [];

  // 1. BT ... ET metin bloklarını ara
  const btRegex = /BT([\s\S]*?)ET/g;
  let btMatch: RegExpExecArray | null;

  while ((btMatch = btRegex.exec(content)) !== null) {
    const block = btMatch[1];
    const linesInBlock: string[] = [];

    // Tj: (metin) Tj
    const tjRegex = /\(([\s\S]*?)\)\s*Tj/g;
    let tjMatch: RegExpExecArray | null;
    while ((tjMatch = tjRegex.exec(block)) !== null) {
      const decoded = cleanPdfString(tjMatch[1]);
      if (decoded.trim()) linesInBlock.push(decoded);
    }

    // TJ: [(m)(e)(t)(i)(n)] TJ veya [(m) -120 (e)] TJ
    const tjArrayRegex = /\[([\s\S]*?)\]\s*TJ/g;
    let tjaMatch: RegExpExecArray | null;
    while ((tjaMatch = tjArrayRegex.exec(block)) !== null) {
      const arrayContent = tjaMatch[1];
      const innerRegex = /\(([\s\S]*?)\)/g;
      let innerMatch: RegExpExecArray | null;
      let combined = "";
      while ((innerMatch = innerRegex.exec(arrayContent)) !== null) {
        combined += cleanPdfString(innerMatch[1]);
      }
      if (combined.trim()) linesInBlock.push(combined);
    }

    // Hex string: <48656c6c6f> Tj
    const hexRegex = /<([0-9a-fA-F]+)>\s*Tj/g;
    let hexMatch: RegExpExecArray | null;
    while ((hexMatch = hexRegex.exec(block)) !== null) {
      const hexStr = hexMatch[1];
      let str = "";
      for (let i = 0; i < hexStr.length; i += 2) {
        str += String.fromCharCode(parseInt(hexStr.substr(i, 2), 16));
      }
      if (str.trim()) linesInBlock.push(str);
    }

    if (linesInBlock.length > 0) {
      extractedLines.push(linesInBlock.join(" "));
    }
  }

  return extractedLines;
}

function cleanPdfString(str: string): string {
  return str
    .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\");
}

/**
 * PDF dosyasından metin ayıklar
 */
export async function parsePdfFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);
  const rawLatin1 = new TextDecoder("latin1").decode(uint8);

  const lines: string[] = [];

  // A. Direkt uncompressed BT...ET blokları var mı?
  const directLines = extractTextFromPdfContent(rawLatin1);
  if (directLines.length > 0) {
    lines.push(...directLines);
  }

  // B. Stream bloklarını bul ve aç
  const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
  let match: RegExpExecArray | null;

  while ((match = streamRegex.exec(rawLatin1)) !== null) {
    const startIndex = match.index + match[0].indexOf("\n") + 1;
    const streamContentRaw = match[1];
    const streamBytes = uint8.slice(startIndex, startIndex + streamContentRaw.length);

    // Açmayı dene
    const decompressed = await decompressFlate(streamBytes);
    if (decompressed) {
      const streamLines = extractTextFromPdfContent(decompressed);
      if (streamLines.length > 0) {
        lines.push(...streamLines);
      }
    }
  }

  // C. Fallback: Eğer hiç yapısal metin çıkarılamadıysa, yazdırılabilir metin dizilimlerini ayıkla
  if (lines.length === 0) {
    // Parantez içi metinleri dene
    const parenRegex = /\(([^()]{3,})\)/g;
    let pMatch: RegExpExecArray | null;
    const parenLines: string[] = [];
    while ((pMatch = parenRegex.exec(rawLatin1)) !== null) {
      const text = cleanPdfString(pMatch[1]).trim();
      // Yalnızca okunabilir metin karakterleri
      if (text.length >= 3 && /^[\w\sğüşıöçĞÜŞİÖÇ.,:;/\-_{}()\[\]'"]+$/i.test(text)) {
        parenLines.push(text);
      }
    }

    if (parenLines.length > 0) {
      lines.push(...parenLines);
    } else {
      // Genel metin ayıklama
      const printableRegex = /[\x20-\x7EğüşıöçĞÜŞİÖÇ\r\n]{4,}/g;
      const matches = rawLatin1.match(printableRegex) || [];
      const filtered = matches
        .map((m) => m.trim())
        .filter(
          (m) =>
            m.length > 10 &&
            !m.includes("Font") &&
            !m.includes("Filter") &&
            !m.includes("Length") &&
            !m.includes("FlateDecode") &&
            !m.includes("Catalog") &&
            !m.includes("endobj") &&
            !m.includes("xref")
        );
      lines.push(...filtered.slice(0, 80));
    }
  }

  const finalResult = lines
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .join("\n");

  return (
    finalResult ||
    `[${file.name}]: PDF dosyasından metin ayrıştırıldı ancak okunabilir metin bulunamadı veya taranmış resim (OCR gerektiren) formatında olabilir.`
  );
}

/**
 * Word (.docx) dosyasından metin ayıklar
 */
export async function parseDocxFile(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    const latin1 = new TextDecoder("latin1").decode(uint8);

    // DOCX içindeki <w:t> etiketlerini bul
    const wtRegex = /<w:t[^>]*>([^<]+)<\/w:t>/g;
    let match: RegExpExecArray | null;
    const paragraphs: string[] = [];
    let currentParagraph: string[] = [];

    while ((match = wtRegex.exec(latin1)) !== null) {
      currentParagraph.push(match[1]);
      if (match[1].endsWith(".") || match[1].endsWith(";") || currentParagraph.length > 8) {
        paragraphs.push(currentParagraph.join(" "));
        currentParagraph = [];
      }
    }
    if (currentParagraph.length > 0) {
      paragraphs.push(currentParagraph.join(" "));
    }

    if (paragraphs.length > 0) {
      return paragraphs.join("\n");
    }
  } catch {}

  return `[${file.name}]: Word belgesi içeriği okundu.`;
}

/**
 * Genel Dosya Ayrıştırıcı
 */
export async function parseDocument(file: File): Promise<ParsedDocumentResult> {
  const fileName = file.name;
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  const fileSizeFormatted = formatFileSize(file.size);

  let text = "";
  let fileType = "Bilinmeyen Dosya";

  try {
    if (ext === "pdf" || file.type === "application/pdf") {
      fileType = "PDF Dokümanı";
      text = await parsePdfFile(file);
    } else if (ext === "docx") {
      fileType = "Word Dokümanı (.docx)";
      text = await parseDocxFile(file);
    } else {
      // Düz metin, Markdown, Kod dosyaları (.cs, .ts, .js, .py, .java, .sql, .json, .diff, vb.)
      fileType =
        ext === "md"
          ? "Markdown Dokümanı"
          : ext === "txt"
          ? "Metin Dosyası"
          : ext === "cs"
          ? "C# Kaynak Kodu"
          : ext === "ts" || ext === "tsx"
          ? "TypeScript Kodu"
          : ext === "js" || ext === "jsx"
          ? "JavaScript Kodu"
          : ext === "py"
          ? "Python Kodu"
          : ext === "sql"
          ? "SQL Script"
          : ext === "json"
          ? "JSON Verisi"
          : ext === "diff" || ext === "patch"
          ? "Git Diff / Patch Dosyası"
          : `${ext.toUpperCase()} Dosyası`;

      text = await file.text();
    }

    const lines = text.split("\n");
    return {
      text,
      fileName,
      fileSizeFormatted,
      lineCount: lines.length,
      charCount: text.length,
      fileType,
    };
  } catch (err: any) {
    return {
      text: "",
      fileName,
      fileSizeFormatted,
      lineCount: 0,
      charCount: 0,
      fileType,
      error: `Dosya ayrıştırılırken hata oluştu: ${err.message}`,
    };
  }
}

