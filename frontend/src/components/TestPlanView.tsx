import React, { useState, useEffect } from "react";
import {
  Stack,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  Paper,
  FormControlLabel,
  Checkbox,
  LinearProgress,
} from "@mui/material";
import { TestPlanResult } from "../types";

interface TestPlanViewProps {
  testPlan: TestPlanResult;
}

export const TestPlanView: React.FC<TestPlanViewProps> = ({ testPlan }) => {
  const [completedSteps, setCompletedSteps] = useState<{ [key: string]: boolean }>(() => {
    try {
      const saved = localStorage.getItem(`plan_progress_${testPlan.id}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [copiedMd, setCopiedMd] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  // İlerleme durumunu localStorage'a kaydet
  useEffect(() => {
    try {
      localStorage.setItem(`plan_progress_${testPlan.id}`, JSON.stringify(completedSteps));
    } catch {}
  }, [completedSteps, testPlan.id]);

  const toggleStep = (stepKey: string) => {
    setCompletedSteps((prev) => ({
      ...prev,
      [stepKey]: !prev[stepKey],
    }));
  };

  // Toplam adım ve tamamlanan adım sayısı
  const totalStepsCount = testPlan.testCases.reduce((acc, tc) => acc + tc.steps.length, 0);
  const completedStepsCount = Object.values(completedSteps).filter(Boolean).length;
  const progressPercent = totalStepsCount > 0 ? Math.round((completedStepsCount / totalStepsCount) * 100) : 0;

  const copyMarkdown = () => {
    let md = `# Test Planı: ${testPlan.title}\n\n`;
    md += `> ${testPlan.overview}\n\n`;
    md += `Toplam Test: ${testPlan.totalTestCount} | Kritik Test: ${testPlan.criticalTestCount}\n\n`;

    testPlan.testCases.forEach((tc) => {
      md += `### [${tc.id}] ${tc.title}\n`;
      md += `- **Öncelik:** ${tc.priority} | **Tür:** ${tc.type}\n`;
      md += `- **Ön Koşul:** ${tc.preconditions}\n`;
      md += `- **Test Adımları:**\n`;
      tc.steps.forEach((s) => {
        md += `  1. ${s}\n`;
      });
      md += `- **Beklenen Sonuç:** ${tc.expectedResult}\n\n`;
    });

    navigator.clipboard.writeText(md);
    setCopiedMd(true);
    setTimeout(() => setCopiedMd(false), 2000);
  };

  const copyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(testPlan, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const downloadCsv = () => {
    const headers = ["ID", "Baslik", "Oncelik", "Tur", "On Kosul", "Adimlar", "Beklenen Sonuc"];
    const rows = testPlan.testCases.map((tc) => [
      `"${tc.id}"`,
      `"${tc.title.replace(/"/g, '""')}"`,
      `"${tc.priority}"`,
      `"${tc.type}"`,
      `"${tc.preconditions.replace(/"/g, '""')}"`,
      `"${tc.steps.join(" | ").replace(/"/g, '""')}"`,
      `"${tc.expectedResult.replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `test-plani-${testPlan.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getPriorityColor = (priority: string) => {
    if (priority.includes("P1")) return "#ef4444";
    if (priority.includes("P2")) return "#f97316";
    if (priority.includes("P3")) return "#f59e0b";
    return "#10b981";
  };

  return (
    <Stack spacing={3}>
      {/* Test Planı Özet Kartı */}
      <Card
        sx={{
          border: "1px solid rgba(99, 102, 241, 0.4)",
          backdropFilter: "blur(16px)",
          background: "rgba(23, 31, 51, 0.85)",
        }}
      >
        <CardContent>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems="flex-start"
            spacing={2}
            sx={{ mb: 2 }}
          >
            <div>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                📋 {testPlan.title}
              </Typography>
              <Typography variant="body2" sx={{ color: "#38bdf8", mt: 0.5 }}>
                {testPlan.overview}
              </Typography>
            </div>

            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Button
                variant="outlined"
                size="small"
                onClick={copyMarkdown}
                sx={{ textTransform: "none", borderColor: "rgba(255,255,255,0.2)" }}
              >
                {copiedMd ? "✅ Kopyalandı" : "📄 Markdown"}
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={copyJson}
                sx={{ textTransform: "none", borderColor: "rgba(255,255,255,0.2)" }}
              >
                {copiedJson ? "✅ Kopyalandı" : "📦 JSON"}
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={downloadCsv}
                sx={{ textTransform: "none", borderColor: "rgba(255,255,255,0.2)" }}
              >
                📊 CSV İndir
              </Button>
            </Stack>
          </Stack>

          <Stack direction="row" spacing={1.5} sx={{ mt: 2, mb: 2 }}>
            <Chip label={`Toplam: ${testPlan.totalTestCount} Test`} color="primary" sx={{ fontWeight: 700 }} />
            <Chip
              label={`${testPlan.criticalTestCount} Adet Kritik / P1-P2`}
              color="warning"
              sx={{ fontWeight: 700 }}
            />
            {testPlan.detectedLanguage && (
              <Chip label={testPlan.detectedLanguage} variant="outlined" sx={{ fontWeight: 600 }} />
            )}
          </Stack>

          {/* Test Tamamlama İlerleme Çubuğu */}
          <Box sx={{ mt: 2, p: 1.5, background: "rgba(0,0,0,0.2)", borderRadius: 1.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
              <Typography variant="caption" sx={{ color: "#a5b4fc", fontWeight: 700 }}>
                Test Koşum İlerlemesi ({completedStepsCount} / {totalStepsCount} Adım Tamamlandı)
              </Typography>
              <Typography variant="caption" sx={{ color: "#34d399", fontWeight: 800 }}>
                %{progressPercent}
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={progressPercent}
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: "rgba(255,255,255,0.1)",
                "& .MuiLinearProgress-bar": {
                  background: "linear-gradient(90deg, #6366f1, #10b981)",
                },
              }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Test Senaryoları */}
      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        ✅ Uygulanacak Test Adımları ve Senaryolar
      </Typography>

      {testPlan.testCases.map((tc, idx) => (
        <Accordion
          key={tc.id}
          defaultExpanded={idx === 0}
          sx={{
            background: "rgba(30, 41, 59, 0.7)",
            border: `1px solid ${getPriorityColor(tc.priority)}44`,
            borderRadius: "8px !important",
            mb: 1.5,
            "&:before": { display: "none" },
          }}
        >
          <AccordionSummary>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              alignItems={{ sm: "center" }}
              sx={{ width: "100%", pr: 2 }}
              spacing={1}
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Chip
                  label={tc.id}
                  size="small"
                  sx={{ backgroundColor: "rgba(255,255,255,0.1)", fontWeight: 800, fontFamily: "monospace" }}
                />
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {tc.title}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1}>
                <Chip
                  label={tc.priority}
                  size="small"
                  sx={{
                    backgroundColor: `${getPriorityColor(tc.priority)}22`,
                    color: getPriorityColor(tc.priority),
                    fontWeight: 700,
                  }}
                />
                <Chip label={tc.type} size="small" variant="outlined" sx={{ borderColor: "rgba(255,255,255,0.15)" }} />
              </Stack>
            </Stack>
          </AccordionSummary>

          <AccordionDetails sx={{ pt: 1, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            {/* Ön Koşul */}
            <Box sx={{ mb: 2, background: "rgba(0,0,0,0.25)", p: 1.5, borderRadius: 1.5, borderLeft: "3px solid #06b6d4" }}>
              <Typography variant="caption" sx={{ color: "#06b6d4", fontWeight: 800, display: "block" }}>
                ÖN KOŞUL (PRE-CONDITIONS):
              </Typography>
              <Typography variant="body2" sx={{ color: "#cbd5e1" }}>
                {tc.preconditions}
              </Typography>
            </Box>

            {/* Test Adımları */}
            <Typography variant="caption" sx={{ color: "#818cf8", fontWeight: 800, display: "block", mb: 1 }}>
              UYGULAMA ADIMLARI (TEST STEPS):
            </Typography>
            <Stack spacing={1} sx={{ mb: 2.5 }}>
              {tc.steps.map((step, sIdx) => {
                const stepKey = `${tc.id}-step-${sIdx}`;
                const isChecked = !!completedSteps[stepKey];

                return (
                  <Paper
                    key={sIdx}
                    sx={{
                      p: 1.2,
                      background: isChecked ? "rgba(16, 185, 129, 0.08)" : "rgba(15, 23, 42, 0.6)",
                      border: isChecked ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(255,255,255,0.05)",
                      borderRadius: 1.5,
                      transition: "all 0.2s",
                    }}
                  >
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={isChecked}
                          onChange={() => toggleStep(stepKey)}
                          color="success"
                          size="small"
                        />
                      }
                      label={
                        <Typography
                          variant="body2"
                          sx={{
                            color: isChecked ? "#a7f3d0" : "#f1f5f9",
                            textDecoration: isChecked ? "line-through" : "none",
                            fontSize: "0.88rem",
                          }}
                        >
                          {step}
                        </Typography>
                      }
                    />
                  </Paper>
                );
              })}
            </Stack>

            {/* Beklenen Sonuç */}
            <Box sx={{ background: "rgba(16, 185, 129, 0.1)", p: 1.5, borderRadius: 1.5, borderLeft: "3px solid #10b981" }}>
              <Typography variant="caption" sx={{ color: "#34d399", fontWeight: 800, display: "block" }}>
                🎯 BEKLENEN SONUÇ (EXPECTED RESULT):
              </Typography>
              <Typography variant="body2" sx={{ color: "#e2e8f0", mt: 0.5 }}>
                {tc.expectedResult}
              </Typography>
            </Box>

            {/* Otomasyon Test Kodu (Varsa) */}
            {tc.automationSnippet && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 700, display: "block", mb: 0.5 }}>
                  💻 Otomatik Test Kodu Taslağı:
                </Typography>
                <Paper sx={{ p: 1.5, background: "#05070d", borderRadius: 1, border: "1px solid rgba(255,255,255,0.08)" }}>
                  <Typography variant="caption" component="pre" sx={{ fontFamily: "monospace", color: "#38bdf8", whiteSpace: "pre-wrap", m: 0 }}>
                    {tc.automationSnippet}
                  </Typography>
                </Paper>
              </Box>
            )}
          </AccordionDetails>
        </Accordion>
      ))}
    </Stack>
  );
};
