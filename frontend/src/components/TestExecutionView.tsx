import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  Typography,
  Stack,
  Box,
  Button,
  Chip,
  Paper,
  Checkbox,
  LinearProgress,
  TextField,
  Tooltip,
  Alert,
  Divider,
} from "@mui/material";
import { TestPlanResult } from "../types";
import { cleanTitle } from "../utils/titleCleaner";

interface TestExecutionViewProps {
  plan: TestPlanResult;
  onBack: () => void;
  onGoToEdit: () => void;
}

type TestStatus = "pending" | "passed" | "failed" | "blocked";

interface ExecutionState {
  [tcId: string]: {
    status: TestStatus;
    completedSteps: number[];
    notes: string;
    executedAt?: string;
  };
}

export const TestExecutionView: React.FC<TestExecutionViewProps> = ({
  plan,
  onBack,
  onGoToEdit,
}) => {
  const storageKey = `test_exec_${plan.id}`;

  // Koşum durumunu yerel depolamadan yükle
  const [execState, setExecState] = useState<ExecutionState>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    const initial: ExecutionState = {};
    plan.testCases.forEach((tc) => {
      initial[tc.id] = { status: "pending", completedSteps: [], notes: "" };
    });
    return initial;
  });

  const [filter, setFilter] = useState<"all" | "pending" | "passed" | "failed" | "blocked">("all");
  const [reportCopied, setReportCopied] = useState(false);

  // Değişiklikleri otomatik yerel hafızaya kaydet
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(execState));
    } catch {}
  }, [execState, storageKey]);

  // Durum Güncelleme
  const setStatus = (tcId: string, status: TestStatus) => {
    setExecState((prev) => ({
      ...prev,
      [tcId]: {
        ...(prev[tcId] || { completedSteps: [], notes: "" }),
        status,
        executedAt: new Date().toLocaleTimeString("tr-TR"),
      },
    }));
  };

  // Adım Checklist Onaylama
  const toggleStep = (tcId: string, stepIndex: number) => {
    setExecState((prev) => {
      const current = prev[tcId] || { status: "pending", completedSteps: [], notes: "" };
      const steps = current.completedSteps || [];
      const newSteps = steps.includes(stepIndex)
        ? steps.filter((i) => i !== stepIndex)
        : [...steps, stepIndex];
      return {
        ...prev,
        [tcId]: {
          ...current,
          completedSteps: newSteps,
        },
      };
    });
  };

  // Not Güncelleme
  const setNotes = (tcId: string, notes: string) => {
    setExecState((prev) => ({
      ...prev,
      [tcId]: {
        ...(prev[tcId] || { status: "pending", completedSteps: [] }),
        notes,
      },
    }));
  };

  // İstatistikler
  const total = plan.testCases.length;
  const passedCount = plan.testCases.filter((tc) => execState[tc.id]?.status === "passed").length;
  const failedCount = plan.testCases.filter((tc) => execState[tc.id]?.status === "failed").length;
  const blockedCount = plan.testCases.filter((tc) => execState[tc.id]?.status === "blocked").length;
  const pendingCount = total - passedCount - failedCount - blockedCount;
  const executedCount = total - pendingCount;
  const progressPercent = total > 0 ? Math.round((executedCount / total) * 100) : 0;

  // Filtrelenmiş liste
  const filteredCases = plan.testCases.filter((tc) => {
    if (filter === "all") return true;
    return (execState[tc.id]?.status || "pending") === filter;
  });

  const formatPriority = (priority: string = "") => {
    const match = priority.match(/\((.*?)\)/);
    if (match && match[1]) return match[1].trim();
    return priority.replace(/^P\d+\s*-?\s*/i, "").trim() || priority;
  };

  // Test Raporu Üret ve İndir
  const handleExportExecutionReport = () => {
    let report = `# Test Koşum Raporu: ${plan.title}\n\n`;
    report += `**Tarih:** ${new Date().toLocaleString("tr-TR")}\n`;
    report += `**İlerleme:** %${progressPercent} (${executedCount}/${total} Test Tamamlandı)\n`;
    report += `- 🟢 **Başarılı (Passed):** ${passedCount}\n`;
    report += `- 🔴 **Başarısız (Failed):** ${failedCount}\n`;
    report += `- 🟡 **Engellendi (Blocked):** ${blockedCount}\n`;
    report += `- ⚪ **Bekleyen (Pending):** ${pendingCount}\n\n---\n\n`;

    report += `## Test Senaryoları Koşum Detayları\n\n`;
    plan.testCases.forEach((tc, idx) => {
      const state = execState[tc.id] || { status: "pending", completedSteps: [], notes: "" };
      const statusIcon =
        state.status === "passed"
          ? "🟢 BAŞARILI"
          : state.status === "failed"
          ? "🔴 BAŞARISIZ"
          : state.status === "blocked"
          ? "🟡 ENGELLENDİ"
          : "⚪ BEKLİYOR";

      report += `### ${idx + 1}. [${tc.id}] ${cleanTitle(tc.title)} — ${statusIcon}\n`;
      report += `- **Öncelik:** ${formatPriority(tc.priority)} | **Tür:** ${tc.type}\n`;
      report += `- **Tamamlanan Adım Sayısı:** ${state.completedSteps?.length || 0} / ${tc.steps.length}\n`;
      if (state.notes) report += `- **Test Notu / Hata:** ${state.notes}\n`;
      if (state.executedAt) report += `- **Koşulma Saati:** ${state.executedAt}\n`;
      report += `\n`;
    });

    navigator.clipboard.writeText(report);
    setReportCopied(true);
    setTimeout(() => setReportCopied(false), 3000);
  };

  // Tümünü Sıfırla
  const handleResetAll = () => {
    if (window.confirm("Tüm test koşum durumlarını sıfırlamak istediğinize emin misiniz?")) {
      const initial: ExecutionState = {};
      plan.testCases.forEach((tc) => {
        initial[tc.id] = { status: "pending", completedSteps: [], notes: "" };
      });
      setExecState(initial);
      localStorage.removeItem(storageKey);
    }
  };

  return (
    <Box>
      {/* Üst Bar */}
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
            "&:hover": { borderColor: "#38bdf8", color: "#38bdf8" },
          }}
        >
          ← Üretilen Test Planlarına Geri Dön
        </Button>

        <Stack direction="row" spacing={1.5} flexWrap="wrap">
          <Button
            size="small"
            variant="outlined"
            onClick={handleResetAll}
            sx={{ textTransform: "none", color: "#94a3b8", borderColor: "rgba(255,255,255,0.15)" }}
          >
            🔄 Sonuçları Sıfırla
          </Button>

          <Button
            variant="contained"
            onClick={handleExportExecutionReport}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              background: "linear-gradient(90deg, #6366f1, #06b6d4)",
            }}
          >
            {reportCopied ? "✓ Rapor Kopyalandı!" : "📊 Koşum Raporunu Kopyala"}
          </Button>
        </Stack>
      </Stack>

      {/* Canlı İlerleme ve İstatistik Kartı */}
      <Card
        sx={{
          mb: 3,
          border: "1px solid rgba(255, 255, 255, 0.1)",
          backdropFilter: "blur(16px)",
          background: "linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%)",
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems="center" spacing={2} sx={{ mb: 2 }}>
            <Box>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <span style={{ fontSize: "1.6rem" }}>🚀</span>
                <div>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: "#f8fafc" }}>
                    {plan.title} — Test Koşumu
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                    Test adımlarını doğrulayın, sonuçları işaretleyin ve koşum raporunu oluşturun.
                  </Typography>
                </div>
              </Stack>
            </Box>

            <Box sx={{ textAlign: { xs: "left", sm: "right" } }}>
              <Typography variant="h4" sx={{ fontWeight: 800, color: progressPercent === 100 ? "#34d399" : "#38bdf8" }}>
                %{progressPercent}
              </Typography>
              <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                {executedCount} / {total} Test Tamamlandı
              </Typography>
            </Box>
          </Stack>

          {/* İlerleme Çubuğu */}
          <LinearProgress
            variant="determinate"
            value={progressPercent}
            sx={{
              height: 10,
              borderRadius: 5,
              backgroundColor: "rgba(255, 255, 255, 0.08)",
              mb: 2.5,
              "& .MuiLinearProgress-bar": {
                borderRadius: 5,
                background:
                  failedCount > 0
                    ? "linear-gradient(90deg, #ef4444, #f97316)"
                    : "linear-gradient(90deg, #6366f1, #10b981)",
              },
            }}
          />

          {/* Sayaç Rozetleri */}
          <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
            <Chip
              label={`🟢 Başarılı: ${passedCount}`}
              clickable
              onClick={() => setFilter(filter === "passed" ? "all" : "passed")}
              sx={{
                fontWeight: 700,
                background: filter === "passed" ? "rgba(16, 185, 129, 0.3)" : "rgba(16, 185, 129, 0.12)",
                color: "#34d399",
                border: "1px solid rgba(16, 185, 129, 0.3)",
              }}
            />
            <Chip
              label={`🔴 Başarısız: ${failedCount}`}
              clickable
              onClick={() => setFilter(filter === "failed" ? "all" : "failed")}
              sx={{
                fontWeight: 700,
                background: filter === "failed" ? "rgba(239, 68, 68, 0.3)" : "rgba(239, 68, 68, 0.12)",
                color: "#f87171",
                border: "1px solid rgba(239, 68, 68, 0.3)",
              }}
            />
            <Chip
              label={`🟡 Engellendi: ${blockedCount}`}
              clickable
              onClick={() => setFilter(filter === "blocked" ? "all" : "blocked")}
              sx={{
                fontWeight: 700,
                background: filter === "blocked" ? "rgba(245, 158, 11, 0.3)" : "rgba(245, 158, 11, 0.12)",
                color: "#fbbf24",
                border: "1px solid rgba(245, 158, 11, 0.3)",
              }}
            />
            <Chip
              label={`⚪ Bekleyen: ${pendingCount}`}
              clickable
              onClick={() => setFilter(filter === "pending" ? "all" : "pending")}
              sx={{
                fontWeight: 700,
                background: filter === "pending" ? "rgba(255, 255, 255, 0.2)" : "rgba(255, 255, 255, 0.08)",
                color: "#cbd5e1",
              }}
            />
            {filter !== "all" && (
              <Chip
                label="Filtreyi Temizle"
                size="small"
                onClick={() => setFilter("all")}
                sx={{ background: "rgba(255,255,255,0.1)", color: "#94a3b8" }}
              />
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Test Senaryoları Listesi */}
      <Stack spacing={2.5}>
        {filteredCases.map((tc, index) => {
          const currentExec = execState[tc.id] || { status: "pending", completedSteps: [], notes: "" };
          const status = currentExec.status;

          const borderColor =
            status === "passed"
              ? "#10b981"
              : status === "failed"
              ? "#ef4444"
              : status === "blocked"
              ? "#f59e0b"
              : "rgba(255, 255, 255, 0.08)";

          return (
            <Paper
              key={tc.id || index}
              sx={{
                p: 2.5,
                background: "rgba(15, 23, 42, 0.6)",
                border: `1px solid ${borderColor}`,
                borderRadius: 2,
                borderLeft: `5px solid ${borderColor}`,
                transition: "all 0.2s",
              }}
            >
              {/* Senaryo Başlığı ve Durum Rozeti */}
              <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={1} sx={{ mb: 1.5 }}>
                <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap">
                  <Chip
                    label={tc.id}
                    size="small"
                    sx={{ fontWeight: 800, backgroundColor: "rgba(99, 102, 241, 0.2)", color: "#818cf8" }}
                  />
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#f8fafc" }}>
                    {cleanTitle(tc.title)}
                  </Typography>
                </Stack>

                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip
                    label={formatPriority(tc.priority)}
                    size="small"
                    sx={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      backgroundColor: "rgba(255, 255, 255, 0.08)",
                      color: "#cbd5e1",
                    }}
                  />
                  {currentExec.executedAt && (
                    <Typography variant="caption" sx={{ color: "#94a3b8", fontSize: "0.72rem" }}>
                      🕒 {currentExec.executedAt}
                    </Typography>
                  )}
                </Stack>
              </Stack>

              {/* Ön Koşul */}
              <Box sx={{ mb: 1.5, p: 1.2, background: "rgba(0, 0, 0, 0.2)", borderRadius: 1.5 }}>
                <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 700, display: "block" }}>
                  Ön Koşul:
                </Typography>
                <Typography variant="body2" sx={{ color: "#cbd5e1", fontSize: "0.85rem" }}>
                  {tc.preconditions || "Özel bir ön koşul tanımlanmadı."}
                </Typography>
              </Box>

              {/* Adımlar (Checklist) */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" sx={{ color: "#38bdf8", fontWeight: 700, display: "block", mb: 0.5 }}>
                  Çalıştırılacak Test Adımları (Tamamladıkça işaretleyin):
                </Typography>
                <Stack spacing={0.5}>
                  {tc.steps.map((step, sIdx) => {
                    const isChecked = currentExec.completedSteps?.includes(sIdx);
                    return (
                      <Stack
                        key={sIdx}
                        direction="row"
                        alignItems="flex-start"
                        spacing={1}
                        onClick={() => toggleStep(tc.id, sIdx)}
                        sx={{
                          cursor: "pointer",
                          p: 0.6,
                          borderRadius: 1,
                          "&:hover": { background: "rgba(255, 255, 255, 0.04)" },
                        }}
                      >
                        <Checkbox
                          size="small"
                          checked={isChecked}
                          sx={{
                            p: 0,
                            color: "rgba(255,255,255,0.3)",
                            "&.Mui-checked": { color: "#34d399" },
                          }}
                        />
                        <Typography
                          variant="body2"
                          sx={{
                            fontSize: "0.85rem",
                            color: isChecked ? "#94a3b8" : "#f1f5f9",
                            textDecoration: isChecked ? "line-through" : "none",
                            lineHeight: 1.5,
                          }}
                        >
                          {step}
                        </Typography>
                      </Stack>
                    );
                  })}
                </Stack>
              </Box>

              {/* Beklenen Sonuç */}
              <Box sx={{ p: 1.2, mb: 2, background: "rgba(16, 185, 129, 0.06)", border: "1px solid rgba(16, 185, 129, 0.15)", borderRadius: 1.5 }}>
                <Typography variant="caption" sx={{ color: "#34d399", fontWeight: 700, display: "block" }}>
                  ✓ Beklenen Sonuç:
                </Typography>
                <Typography variant="body2" sx={{ color: "#a7f3d0", fontSize: "0.85rem" }}>
                  {tc.expectedResult}
                </Typography>
              </Box>

              {/* Test Karar Butonları */}
              <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems="center" spacing={1.5}>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Button
                    size="small"
                    variant={status === "passed" ? "contained" : "outlined"}
                    color="success"
                    onClick={() => setStatus(tc.id, "passed")}
                    sx={{
                      textTransform: "none",
                      fontWeight: 700,
                      background: status === "passed" ? "#10b981" : "transparent",
                    }}
                  >
                    ✓ Başarılı (Passed)
                  </Button>

                  <Button
                    size="small"
                    variant={status === "failed" ? "contained" : "outlined"}
                    color="error"
                    onClick={() => setStatus(tc.id, "failed")}
                    sx={{
                      textTransform: "none",
                      fontWeight: 700,
                      background: status === "failed" ? "#ef4444" : "transparent",
                    }}
                  >
                    ✕ Başarısız (Failed)
                  </Button>

                  <Button
                    size="small"
                    variant={status === "blocked" ? "contained" : "outlined"}
                    color="warning"
                    onClick={() => setStatus(tc.id, "blocked")}
                    sx={{
                      textTransform: "none",
                      fontWeight: 700,
                      background: status === "blocked" ? "#f59e0b" : "transparent",
                    }}
                  >
                    ⚠ Engellendi (Blocked)
                  </Button>

                  {status !== "pending" && (
                    <Button
                      size="small"
                      variant="text"
                      onClick={() => setStatus(tc.id, "pending")}
                      sx={{ textTransform: "none", color: "#94a3b8", fontSize: "0.75rem" }}
                    >
                      Sıfırla
                    </Button>
                  )}
                </Stack>

                <Box sx={{ width: { xs: "100%", sm: "40%" } }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Test notu, hata mesajı veya log..."
                    value={currentExec.notes || ""}
                    onChange={(e) => setNotes(tc.id, e.target.value)}
                    sx={{
                      "& .MuiInputBase-input": { fontSize: "0.78rem", py: 0.8 },
                    }}
                  />
                </Box>
              </Stack>
            </Paper>
          );
        })}
      </Stack>
    </Box>
  );
};

