/**
 * Büyük Doküman ve Kod Parçalama (Chunking) Servisi
 * 8.000 karakterden uzun PDF, Word veya kaynak kodları
 * anlamsal bütünlüklerini bozmadan yönetilebilir parçalara böler.
 */

export interface DocumentChunk {
  index: number;
  totalChunks: number;
  content: string;
  charCount: number;
}

export function chunkDocument(
  text: string,
  maxChunkSize = 7000,
  overlap = 300
): DocumentChunk[] {
  if (!text || text.length <= maxChunkSize) {
    return [
      {
        index: 1,
        totalChunks: 1,
        content: text || "",
        charCount: (text || "").length,
      },
    ];
  }

  const chunks: DocumentChunk[] = [];
  let startIndex = 0;
  let chunkIndex = 1;

  while (startIndex < text.length) {
    let endIndex = startIndex + maxChunkSize;

    if (endIndex >= text.length) {
      endIndex = text.length;
    } else {
      // Doğal bir sınır noktası bul (paragraf sonu, fonksiyon sonu veya satır sonu)
      const lookbackLimit = Math.max(startIndex, endIndex - 500);
      const sub = text.substring(lookbackLimit, endIndex);

      // 1. İki satır arası boşluk (paragraf)
      const paragraphBreak = sub.lastIndexOf("\n\n");
      // 2. Fonksiyon / Sınıf kapanışı veya blok sonu
      const blockBreak = sub.lastIndexOf("\n}");
      // 3. Tek satır sonu
      const lineBreak = sub.lastIndexOf("\n");

      if (paragraphBreak !== -1) {
        endIndex = lookbackLimit + paragraphBreak + 2;
      } else if (blockBreak !== -1) {
        endIndex = lookbackLimit + blockBreak + 2;
      } else if (lineBreak !== -1) {
        endIndex = lookbackLimit + lineBreak + 1;
      }
    }

    const chunkText = text.substring(startIndex, endIndex).trim();
    if (chunkText.length > 0) {
      chunks.push({
        index: chunkIndex,
        totalChunks: 1, // Daha sonra güncellenir
        content: chunkText,
        charCount: chunkText.length,
      });
      chunkIndex++;
    }

    if (endIndex >= text.length) break;

    // Overlap ile bağlam kaybını önle
    startIndex = Math.max(startIndex + 1, endIndex - overlap);
  }

  // totalChunks sayısını güncelle
  chunks.forEach((c) => {
    c.totalChunks = chunks.length;
  });

  return chunks;
}

