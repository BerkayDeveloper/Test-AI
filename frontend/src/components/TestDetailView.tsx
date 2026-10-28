import React, { useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Stack,
  Box,
  Button,
  Chip,
  Paper,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
} from "@mui/material";
import { TestPlanResult } from "../types";

interface TestDetailViewProps {
  plan: TestPlanResult;
  onBack: () => void;
  onGoToEdit: () => void;
  onGoToExecute: () => void;
}

export const TestDetailView: React.FC<TestDetailViewProps> = ({
  plan,
  onBack,
  onGoToEdit,
  onGoToExecute,
}) => {
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  const getPriorityColor = (priority: string = "") => {
    if (priority.includes("P1") || priority.includes("Kritik")) return "#ef4444";
    if (priority.includes("P2") || priority.includes("Yüksek")) return "#f97316";
    if (priority.includes("P3") || priority.includes("Orta")) return "#f59e0b";
    return "#10b981";
  };

  const copyToClipboard = (text: string, format: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFormat(format);
    setTimeout(() => setCopiedFormat(null), 2500);
  };

  const exportAsMarkdown = () => {
    let md = `# Test Planı: ${plan.title}\n\n`;
    md += `**Kategori:** ${plan.category} | **Oluşturulma Tarihi:** ${new Date(plan.createdAt).toLocaleString("tr-TR")}\n`;
    md += `**Toplam Test Sayısı:** ${plan.totalTestCount} | **Kritik Test:** ${plan.criticalTestCount}\n\n`;
    md += `## Analiz Özeti\n${plan.overview}\n\n---\n\n## Test Senaryoları\n\n`;

    plan.testCases.forEach((tc, idx) => {
      md += `### ${idx + 1}. [${tc.id}] ${tc.title}\n`;
      md += `- **Öncelik:** ${tc.priority}\n`;
      md += `- **Test Türü:** ${tc.type}\n`;
      if (tc.targetComponent) md += `- **Bileşen:** ${tc.targetComponent}\n`;
      md += `- **Ön Koşul:** ${tc.preconditions}\n`;
      md += `- **Adımlar:**\n`;
      tc.steps.forEach((s) => (md += `  - ${s}\n`));
      md += `- **Beklenen Sonuç:** ${tc.expectedResult}\n\n`;
    });

    copyToClipboard(md, "Markdown");
  };

  const exportAsJson = () => {
    const jsonStr = JSON.stringify(plan, null, 2);
    copyToClipboard(jsonStr, "JSON");
  };

  const exportAsCsv = () => {
    const headers = ["Test ID", "Başlık", "Öncelik", "Tür", "Ön Koşul", "Adımlar", "Beklenen Sonuç"];
    const rows = plan.testCases.map((tc) => [
      `"${tc.id}"`,
      `"${tc.title.replace(/"/g, '""')}"`,
      `"${tc.priority}"`,
      `"${tc.type}"`,
      `"${tc.preconditions.replace(/"/g, '""')}"`,
      `"${tc.steps.join(" | ").replace(/"/g, '""')}"`,
      `"${tc.expectedResult.replace(/"/g, '""')}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${plan.title.replace(/[^a-zA-Z0-9]/g, "_")}_test_plani.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Box>
      {/* Üst Navigasyon ve Eylem Barı */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Button
          variant="outlined"
          onClick={onBack}
          sx={{
            color: "#94a3b8",
            borderColor: "rgba(255, 255, 255, 0.15)",
            textTransform: "none",
            fontWeight: 700,
            "&:hover": { borderColor: "#38bdf8", color: "#38bdf8", background: "rgba(56, 189, 248, 0.05)" },
          }}
        >
          ← Üretilen Test Planlarına Geri Dön
        </Button>

        <Stack direction="row" spacing={1.5} flexWrap="wrap">
          <Button
            variant="outlined"
            color="secondary"
            onClick={onGoToEdit}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              borderColor: "rgba(6, 182, 212, 0.5)",
              "&:hover": { borderColor: "#06b6d4", background: "rgba(6, 182, 212, 0.1)" },
            }}
          >
            ✏️ Bu Planı Düzenle
          </Button>

          <Button
            variant="contained"
            onClick={onGoToExecute}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              background: "linear-gradient(90deg, #10b981, #06b6d4)",
              boxShadow: "0 4px 14px rgba(16, 185, 129, 0.35)",
              "&:hover": { background: "linear-gradient(90deg, #059669, #0891b2)" },
            }}
          >
            🚀 Test Etmeye Başla
          </Button>
        </Stack>
      </Stack>

      {/* Plan Ana Başlık Kartı */}
      <Card
        sx={{
          mb: 3,
          border: "1px solid rgba(255, 255, 255, 0.1)",
          backdropFilter: "blur(16px)",
          background: "linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%)",
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
            <span style={{ fontSize: "1.5rem" }}>🔍</span>
            <Typography variant="h5" sx={{ fontWeight: 800, color: "#f8fafc" }}>
              {plan.title}
            </Typography>
            <Chip
              label={plan.category.toUpperCase()}
              size="small"
              sx={{
                background: "rgba(99, 102, 241, 0.2)",
                color: "#818cf8",
                fontWeight: 700,
                fontSize: "0.75rem",
              }}
            />
          </Stack>

          <Typography variant="caption" sx={{ color: "#94a3b8", display: "block", mb: 2 }}>
            Kayıt ID: {plan.id} • Oluşturulma: {new Date(plan.createdAt).toLocaleString("tr-TR")} • Toplam: {plan.totalTestCount} Test Senaryosu ({plan.criticalTestCount} Kritik)
          </Typography>

          <Paper
            variant="outlined"
            sx={{
              p: 2,
              mb: 2,
              background: "rgba(15, 23, 42, 0.5)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 2,
            }}
          >
            <Typography variant="caption" sx={{ color: "#38bdf8", fontWeight: 700, display: "block", mb: 0.5 }}>
              📌 Analiz ve Değişiklik Özeti:
            </Typography>
            <Typography variant="body2" sx={{ color: "#e2e8f0", lineHeight: 1.6 }}>
              {plan.overview}
            </Typography>
          </Paper>

          {/* Dışa Aktarma Butonları */}
          <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
            <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 600, mr: 1 }}>
              Dışa Aktar:
            </Typography>
            <Button
              size="small"
              variant="outlined"
              onClick={exportAsMarkdown}
              sx={{ textTransform: "none", fontSize: "0.78rem", borderColor: "rgba(255,255,255,0.15)", color: "#c7d2fe" }}
            >
              📋 Markdown Kopyala
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={exportAsJson}
              sx={{ textTransform: "none", fontSize: "0.78rem", borderColor: "rgba(255,255,255,0.15)", color: "#c7d2fe" }}
            >
              { } JSON Kopyala
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={exportAsCsv}
              sx={{ textTransform: "none", fontSize: "0.78rem", borderColor: "rgba(255,255,255,0.15)", color: "#34d399" }}
            >
              📊 Excel / CSV İndir
            </Button>
            {copiedFormat && (
              <Typography variant="caption" sx={{ color: "#34d399", fontWeight: 700, ml: 1 }}>
                ✓ {copiedFormat} panoya kopyalandı!
              </Typography>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Test Senaryoları Başlığı */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          📋 Test Senaryoları ({plan.testCases.length})
        </Typography>
      </Stack>

      {/* Test Senaryoları Listesi */}
      <Stack spacing={2}>
        {plan.testCases.map((tc, index) => (
          <Paper
            key={tc.id || index}
            sx={{
              p: 2.5,
              background: "rgba(15, 23, 42, 0.6)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 2,
              borderLeft: `4px solid ${getPriorityColor(tc.priority)}`,
            }}
          >
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={1} sx={{ mb: 1.5 }}>
              <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap">
                <Chip
                  label={tc.id}
                  size="small"
                  sx={{
                    fontWeight: 800,
                    fontSize: "0.75rem",
                    backgroundColor: "rgba(99, 102, 241, 0.2)",
                    color: "#818cf8",
                  }}
                />
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#f8fafc" }}>
                  {tc.title}
                </Typography>
              </Stack>

              <Stack direction="row" spacing={1} alignItems="center">
                <Chip
                  label={tc.priority}
                  size="small"
                  sx={{
                    fontWeight: 700,
                    fontSize: "0.72rem",
                    backgroundColor: `${getPriorityColor(tc.priority)}22`,
                    color: getPriorityColor(tc.priority),
                    border: `1px solid ${getPriorityColor(tc.priority)}`,
                  }}
                />
                <Chip
                  label={tc.type}
                  size="small"
                  sx={{
                    fontSize: "0.72rem",
                    backgroundColor: "rgba(255, 255, 255, 0.06)",
                    color: "#94a3b8",
                  }}
                />
              </Stack>
            </Stack>

            {tc.targetComponent && (
              <Typography variant="caption" sx={{ color: "#38bdf8", display: "block", mb: 1 }}>
                🎯 Hedef Bileşen / Modül: <b>{tc.targetComponent}</b>
              </Typography>
            )}

            {/* Ön Koşul */}
            <Box sx={{ mb: 1.5, p: 1.2, background: "rgba(0, 0, 0, 0.2)", borderRadius: 1.5 }}>
              <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 700, display: "block" }}>
                Ön Koşul (Preconditions):
              </Typography>
              <Typography variant="body2" sx={{ color: "#cbd5e1", fontSize: "0.85rem" }}>
                {tc.preconditions || "Özel bir ön koşul tanımlanmadı."}
              </Typography>
            </Box>

            {/* Adım Adım Talimatlar */}
            <Box sx={{ mb: 1.5 }}>
              <Typography variant="caption" sx={{ color: "#38bdf8", fontWeight: 700, display: "block", mb: 0.5 }}>
                Test Adımları:
              </Typography>
              <Stack spacing={0.5}>
                {tc.steps.map((step, sIdx) => (
                  <Box
                    key={sIdx}
                    sx={{
                      display: "flex",
                      alignItems: "flex-start",
                      fontSize: "0.85rem",
                      color: "#e2e8f0",
                      lineHeight: 1.5,
                    }}
                  >
                    <span style={{ color: "#6366f1", marginRight: 8, fontWeight: 700 }}>•</span>
                    <span>{step}</span>
                  </Box>
                ))}
              </Stack>
            </Box>

            {/* Beklenen Sonuç */}
            <Box sx={{ p: 1.2, background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: 1.5 }}>
              <Typography variant="caption" sx={{ color: "#34d399", fontWeight: 700, display: "block" }}>
                ✓ Beklenen Sonuç (Expected Result):
              </Typography>
              <Typography variant="body2" sx={{ color: "#a7f3d0", fontSize: "0.85rem" }}>
                {tc.expectedResult}
              </Typography>
            </Box>
          </Paper>
        ))}
      </Stack>
    </Box>
  );
};

