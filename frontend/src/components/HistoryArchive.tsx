import React, { useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Stack,
  Paper,
  Chip,
  Button,
  TextField,
  InputAdornment,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import { AnalysisHistoryItem, TestPlanResult } from "../types";
import {
  cleanTitle,
  cleanOverview,
  cleanStepText,
  deduplicateSteps,
} from "../utils/titleCleaner";

interface HistoryArchiveProps {
  history: AnalysisHistoryItem[];
  onInspectPlan: (plan: TestPlanResult) => void;
  onEditPlan: (plan: TestPlanResult) => void;
  onExecutePlan: (plan: TestPlanResult) => void;
  onDeletePlan: (id: string) => void;
  loading: boolean;
  activePersona?: "qa" | "developer";
  isAdmin?: boolean;
}

export function resolveItemPersona(item: { persona?: string; diffSummary?: string; title?: string; category?: string }): "qa" | "developer" {
  if (item.persona === "qa" || item.persona === "developer") {
    return item.persona;
  }
  const s = `${item.diffSummary || ""} ${item.title || ""} ${item.category || ""}`.toLowerCase();
  if (s.includes("qa") || s.includes("test") || s.includes("video") || s.includes("senaryo") || s.includes("functional") || item.category === "none") {
    return "qa";
  }
  return "developer";
}

export const HistoryArchive: React.FC<HistoryArchiveProps> = ({
  history = [],
  onInspectPlan,
  onEditPlan,
  onExecutePlan,
  onDeletePlan,
  loading,
  activePersona,
  isAdmin = false,
}) => {
  const [search, setSearch] = useState("");
  // Silme Onay Modalı State'i (Silinmek istenen planın id ve title'ı)
  const [planToDelete, setPlanToDelete] = useState<{ id: string; title: string } | null>(null);

  const safeHistory = Array.isArray(history) ? history : [];

  // Mod İzolasyonu: Sadece aktif persona (QA ise QA testleri, Developer ise Dev testleri) listelenir
  const modeFilteredHistory = activePersona
    ? safeHistory.filter((item) => resolveItemPersona(item) === activePersona)
    : safeHistory;

  const filteredHistory = modeFilteredHistory.filter((h) => {
    const q = search.toLowerCase();
    const title = (h.title || "").toLowerCase();
    const cat = (h.category || "").toLowerCase();
    const summary = (h.diffSummary || "").toLowerCase();
    return title.includes(q) || cat.includes(q) || summary.includes(q);
  });

  const getPriorityColor = (risk: string = "") => {
    const r = risk.toLowerCase();
    if (r === "critical" || r.includes("kritik") || r.includes("p1")) return "#ef4444";
    if (r === "high" || r.includes("yüksek") || r.includes("p2")) return "#f97316";
    if (r === "medium" || r.includes("orta") || r.includes("normal") || r.includes("p3")) return "#f59e0b";
    return "#10b981";
  };

  const convertToTestPlanResult = (item: AnalysisHistoryItem): TestPlanResult => {
    const rawCases = Array.isArray(item.testCases) ? item.testCases : [];
    const cases = rawCases.map((tc) => ({
      ...tc,
      title: cleanTitle(tc.title || "", isAdmin),
      preconditions: cleanStepText(tc.preconditions || "", isAdmin),
      steps: deduplicateSteps((tc.steps || []).map((s: string) => cleanStepText(s, isAdmin))),
      expectedResult: cleanStepText(tc.expectedResult || "", isAdmin),
    }));
    const resolvedPersona = resolveItemPersona(item);

    return {
      id: item.id,
      title: cleanTitle(item.title || "İsimsiz Test Planı", isAdmin),
      category: item.category || "code",
      overview: cleanOverview(item.diffSummary || "", isAdmin),
      totalTestCount: item.totalTestCount || cases.length,
      criticalTestCount: cases.filter(
        (t) => t?.priority?.includes("Kritik") || t?.priority?.includes("Yüksek") || t?.priority?.includes("P1") || t?.priority?.includes("P2")
      ).length,
      testCases: cases,
      createdAt: item.createdAt || new Date().toISOString(),
      previousContent: item.previousContent || "",
      newContent: item.newContent || "",
      persona: resolvedPersona,
    };
  };

  // Onaylandığında silme işlemini gerçekleştir
  const handleConfirmDelete = () => {
    if (planToDelete) {
      onDeletePlan(planToDelete.id);
      setPlanToDelete(null);
    }
  };

  return (
    <Card sx={{ border: "1px solid rgba(255, 255, 255, 0.1)", backdropFilter: "blur(16px)" }}>
      <CardContent>
        {/* Üst Başlık ve Arama */}
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems="center" spacing={2} sx={{ mb: 3 }}>
          <div>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              🗂️ Önceden Üretilen Test Planları
            </Typography>
            <Typography variant="body2" sx={{ color: "#94a3b8" }}>
              Kayıtlı test planlarını inceleyebilir, adımlarını düzenleyebilir ve canlı test koşumunu başlatabilirsiniz.
            </Typography>
          </div>

          <TextField
            size="small"
            placeholder="Planlarda ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start">🔎</InputAdornment>,
            }}
            sx={{ width: { xs: "100%", sm: 260 } }}
          />
        </Stack>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 4, gap: 1.5 }}>
            <CircularProgress size={24} sx={{ color: "#38bdf8" }} />
            <Typography variant="body2" sx={{ color: "#94a3b8" }}>
              Test planları yükleniyor...
            </Typography>
          </Box>
        ) : filteredHistory.length === 0 ? (
          <Alert severity="info" sx={{ background: "rgba(14, 165, 233, 0.1)", color: "#7dd3fc" }}>
            {modeFilteredHistory.length === 0
              ? activePersona === "qa"
                ? "Henüz QA modunda kaydedilmiş bir test planı bulunmuyor. Yeni bir QA analizi başlattığınızda burada listelenecektir."
                : "Henüz Developer modunda kaydedilmiş bir test planı bulunmuyor. Yeni bir Developer analizi başlattığınızda burada listelenecektir."
              : "Arama kriterinize uygun test planı bulunamadı."}
          </Alert>
        ) : (
          <Stack spacing={2}>
            {filteredHistory.map((item) => {
              const cases = Array.isArray(item.testCases) ? item.testCases : [];
              const testCount = item.totalTestCount || cases.length || 0;
              const formattedDate = item.createdAt ? new Date(item.createdAt).toLocaleString("tr-TR") : "Bilinmiyor";
              const planResult = convertToTestPlanResult(item);
              const displayTitle = cleanTitle(item.title || "", isAdmin);
              const displaySummary = cleanOverview(item.diffSummary || "", isAdmin);

              return (
                <Paper
                  key={item.id}
                  sx={{
                    p: 2.5,
                    background: "rgba(15, 23, 42, 0.6)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 2,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 2,
                    transition: "all 0.2s",
                    "&:hover": {
                      borderColor: "rgba(99, 102, 241, 0.4)",
                      background: "rgba(30, 41, 59, 0.6)",
                    },
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 280 }}>
                    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.5 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#f8fafc" }}>
                        {displayTitle}
                      </Typography>
                      <Chip
                        size="small"
                        label={(item.category || "GENEL").toUpperCase()}
                        sx={{ backgroundColor: "rgba(255,255,255,0.08)", fontSize: "0.72rem" }}
                      />
                    </Stack>

                    <Typography variant="caption" sx={{ color: "#94a3b8", display: "block" }}>
                      Tarih: {formattedDate} • Toplam Test: {testCount}
                    </Typography>

                    {displaySummary && (
                      <Typography variant="body2" sx={{ color: "#cbd5e1", mt: 1, fontSize: "0.86rem" }}>
                        {displaySummary}
                      </Typography>
                    )}
                  </Box>

                  {/* 3 Buton + Silme Butonu */}
                  <Stack direction="row" spacing={1.2} alignItems="center" flexWrap="wrap">
                    <Chip
                      label={`Önem: ${item.riskLevel || "NORMAL"}`}
                      sx={{
                        backgroundColor: `${getPriorityColor(item.riskLevel)}22`,
                        color: getPriorityColor(item.riskLevel),
                        border: `1px solid ${getPriorityColor(item.riskLevel)}`,
                        fontWeight: 700,
                        mr: 0.5,
                      }}
                    />

                    {/* 1. Buton: İncele */}
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => onInspectPlan(planResult)}
                      sx={{
                        textTransform: "none",
                        fontWeight: 700,
                        color: "#38bdf8",
                        borderColor: "rgba(56, 189, 248, 0.3)",
                        "&:hover": {
                          borderColor: "#38bdf8",
                          backgroundColor: "rgba(56, 189, 248, 0.1)",
                        },
                      }}
                    >
                      👁️ İncele
                    </Button>

                    {/* 2. Buton: Düzenle */}
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => onEditPlan(planResult)}
                      sx={{
                        textTransform: "none",
                        fontWeight: 700,
                        color: "#fbbf24",
                        borderColor: "rgba(251, 191, 36, 0.3)",
                        "&:hover": {
                          borderColor: "#fbbf24",
                          backgroundColor: "rgba(251, 191, 36, 0.1)",
                        },
                      }}
                    >
                      ✏️ Düzenle
                    </Button>

                    {/* 3. Buton: Test Etmeye Başla */}
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => onExecutePlan(planResult)}
                      sx={{
                        textTransform: "none",
                        fontWeight: 700,
                        background: "linear-gradient(90deg, #10b981, #06b6d4)",
                        color: "#fff",
                      }}
                    >
                      🚀 Test Etmeye Başla
                    </Button>

                    {/* 4. Buton: Sil */}
                    <Tooltip title="Bu test planını arşivden sil">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => setPlanToDelete({ id: item.id, title: displayTitle })}
                        sx={{
                          p: 0.8,
                          border: "1px solid rgba(239, 68, 68, 0.2)",
                          borderRadius: 1.5,
                          "&:hover": {
                            backgroundColor: "rgba(239, 68, 68, 0.1)",
                            borderColor: "#ef4444",
                          },
                        }}
                      >
                        🗑️
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        )}
      </CardContent>

      {/* Silme Onay Dialogu */}
      <Dialog
        open={Boolean(planToDelete)}
        onClose={() => setPlanToDelete(null)}
        PaperProps={{
          sx: {
            background: "#0f172a",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: 2.5,
            p: 1,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: "#f87171" }}>
          ⚠️ Test Planı Silinsin mi?
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: "#cbd5e1" }}>
            "<strong>{planToDelete?.title}</strong>" başlıklı test planı arşivden kalıcı olarak silinecektir. Bu işlem geri alınamaz.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setPlanToDelete(null)}
            sx={{ color: "#94a3b8", textTransform: "none" }}
          >
            İptal
          </Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            Evet, Kalıcı Olarak Sil
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};
