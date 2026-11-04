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
  Alert,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
} from "@mui/material";
import { TestPlanResult, TestCase } from "../types";
import { cleanTitle, cleanStepText, cleanOverview, formatStepForDisplay } from "../utils/titleCleaner";

interface TestPlanViewProps {
  testPlan: TestPlanResult;
  isSaved?: boolean;
  saving?: boolean;
  onSave?: () => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
  onDeleteTestCase?: (testCaseId: string) => void;
  onUpdateTestPlan?: (updatedPlan: TestPlanResult) => void;
  isAdmin?: boolean;
  onRequestAdminAccess?: () => void;
}

export const TestPlanView: React.FC<TestPlanViewProps> = ({
  testPlan,
  isSaved = false,
  saving = false,
  onSave,
  onDelete,
  onDeleteTestCase,
  onUpdateTestPlan,
  isAdmin = false,
  onRequestAdminAccess,
}) => {
  const [testCases, setTestCases] = useState<TestCase[]>(testPlan.testCases || []);

  useEffect(() => {
    setTestCases(testPlan.testCases || []);
  }, [testPlan.testCases]);

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
  const [selectedFramePreview, setSelectedFramePreview] = useState<{ url: string; title: string } | null>(null);

  // Test Senaryosu Düzenleme Modalı State
  const [editingTestCase, setEditingTestCase] = useState<TestCase | null>(null);
  const [editForm, setEditForm] = useState<{
    title: string;
    priority: string;
    type: string;
    targetComponent: string;
    preconditions: string;
    expectedResult: string;
  }>({
    title: "",
    priority: "Kritik",
    type: "Fonksiyonel Test",
    targetComponent: "",
    preconditions: "",
    expectedResult: "",
  });

  // Uygulama Adımı Düzenleme State
  const [editingStepKey, setEditingStepKey] = useState<string | null>(null);
  const [editingStepValue, setEditingStepValue] = useState<string>("");

  // Yeni Test Senaryosu Ekleme Modalı State
  const [isAddingTestCase, setIsAddingTestCase] = useState(false);
  const [newTcForm, setNewTcForm] = useState<{
    title: string;
    priority: string;
    type: string;
    targetComponent: string;
    preconditions: string;
    stepsText: string;
    expectedResult: string;
  }>({
    title: "",
    priority: "Yüksek",
    type: "Fonksiyonel Test",
    targetComponent: "",
    preconditions: "Sistem ve test ortamı hazır olmalıdır.",
    stepsText: "Adım 1: Arayüzü açın ve bileşenleri doğrulayın.\nAdım 2: İşlem adımlarını gerçekleştirin.",
    expectedResult: "Tüm işlemler hatasız ve kararlı şekilde tamamlanmalıdır.",
  });

  // Adım Taşıma State
  const [movingStep, setMovingStep] = useState<{
    sourceTcId: string;
    stepIndex: number;
    stepText: string;
  } | null>(null);
  const [targetTcIdForMove, setTargetTcIdForMove] = useState<string>("");

  const handleOpenAddTestCaseModal = () => {
    setIsAddingTestCase(true);
    setNewTcForm({
      title: "",
      priority: "Yüksek",
      type: "Fonksiyonel Test",
      targetComponent: "",
      preconditions: "Sistem ve test ortamı hazır olmalıdır.",
      stepsText: "Adım 1: Arayüzü açın ve bileşenleri doğrulayın.\nAdım 2: İşlem adımlarını gerçekleştirin.",
      expectedResult: "Tüm işlemler hatasız ve kararlı şekilde tamamlanmalıdır.",
    });
  };

  const handleCreateTestCase = () => {
    if (!newTcForm.title.trim()) return;
    const nextNum = testCases.length + 1;
    const rawSteps = newTcForm.stepsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const steps = rawSteps.length > 0 ? rawSteps : ["Adım 1: Test işlemini başlatın ve doğrulayın."];

    const newCase: TestCase = {
      id: `QA-TC-${String(nextNum).padStart(3, "0")}`,
      title: newTcForm.title.trim(),
      priority: newTcForm.priority,
      type: newTcForm.type.trim() || "Fonksiyonel Test",
      testType: newTcForm.type.trim() || "Fonksiyonel Test",
      targetComponent: newTcForm.targetComponent.trim() || "Ana Arayüz Bileşenleri",
      preconditions: newTcForm.preconditions.trim() || "Sistem hazır olmalıdır.",
      steps,
      expectedResult: newTcForm.expectedResult.trim() || "İşlem başarıyla tamamlanmalıdır.",
      status: "Beklemede",
    };

    const updated = [...testCases, newCase];
    setTestCases(updated);
    notifyPlanUpdate(updated);
    setIsAddingTestCase(false);
  };

  const handleOpenMoveStepModal = (sourceTcId: string, stepIndex: number, stepText: string) => {
    setMovingStep({ sourceTcId, stepIndex, stepText });
    const availableTargets = testCases.filter((t) => t.id !== sourceTcId);
    setTargetTcIdForMove(availableTargets[0]?.id || "");
  };

  const handleConfirmMoveStep = () => {
    if (!movingStep || !targetTcIdForMove) return;
    const { sourceTcId, stepIndex, stepText } = movingStep;

    const updatedCases = testCases.map((tc) => {
      if (tc.id === sourceTcId) {
        // Kaynaktan çıkar
        const newSteps = tc.steps.filter((_, i) => i !== stepIndex);
        return { ...tc, steps: newSteps };
      }
      if (tc.id === targetTcIdForMove) {
        // Hedefe ekle
        return { ...tc, steps: [...tc.steps, stepText] };
      }
      return tc;
    });

    setTestCases(updatedCases);
    notifyPlanUpdate(updatedCases);
    setMovingStep(null);
    setTargetTcIdForMove("");
  };

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

  const notifyPlanUpdate = (newCases: TestCase[]) => {
    const criticalCount = newCases.filter(
      (t) =>
        t.priority?.includes("Kritik") ||
        t.priority?.includes("Yüksek") ||
        t.priority?.includes("P1") ||
        t.priority?.includes("P2")
    ).length;

    const updatedPlan: TestPlanResult = {
      ...testPlan,
      testCases: newCases,
      totalTestCount: newCases.length,
      criticalTestCount: criticalCount,
    };

    if (onUpdateTestPlan) {
      onUpdateTestPlan(updatedPlan);
    }
  };

  const handleOpenEditTestCaseModal = (tc: TestCase) => {
    setEditingTestCase(tc);
    setEditForm({
      title: tc.title || "",
      priority: formatPriority(tc.priority) || "Kritik",
      type: tc.type || "Fonksiyonel Test",
      targetComponent: tc.targetComponent || "",
      preconditions: tc.preconditions || "",
      expectedResult: tc.expectedResult || "",
    });
  };

  const handleSaveTestCaseEdit = () => {
    if (!editingTestCase) return;
    const updatedCases = testCases.map((tc) => {
      if (tc.id !== editingTestCase.id) return tc;
      return {
        ...tc,
        title: editForm.title.trim() || tc.title,
        priority: editForm.priority,
        type: editForm.type.trim() || tc.type,
        testType: editForm.type.trim() || tc.testType,
        targetComponent: editForm.targetComponent.trim(),
        preconditions: editForm.preconditions.trim(),
        expectedResult: editForm.expectedResult.trim(),
      };
    });
    setTestCases(updatedCases);
    notifyPlanUpdate(updatedCases);
    setEditingTestCase(null);
  };

  const handleDeleteTestCase = (tcId: string) => {
    if (onDeleteTestCase) {
      onDeleteTestCase(tcId);
    }
    const remaining = testCases.filter((tc) => tc.id !== tcId);
    setTestCases(remaining);
    notifyPlanUpdate(remaining);
  };

  const handleStartEditStep = (stepKey: string, initialText: string) => {
    setEditingStepKey(stepKey);
    setEditingStepValue(initialText);
  };

  const handleCancelEditStep = () => {
    setEditingStepKey(null);
    setEditingStepValue("");
  };

  const handleSaveEditStep = (tcId: string, sIdx: number) => {
    if (!editingStepValue.trim()) return;
    const updatedCases = testCases.map((tc) => {
      if (tc.id !== tcId) return tc;
      const newSteps = [...tc.steps];
      newSteps[sIdx] = editingStepValue.trim();
      return { ...tc, steps: newSteps };
    });
    setTestCases(updatedCases);
    notifyPlanUpdate(updatedCases);
    setEditingStepKey(null);
    setEditingStepValue("");
  };

  const handleDeleteStep = (tcId: string, sIdx: number) => {
    const updatedCases = testCases.map((tc) => {
      if (tc.id !== tcId) return tc;
      const newSteps = tc.steps.filter((_, i) => i !== sIdx);
      return { ...tc, steps: newSteps };
    });
    setTestCases(updatedCases);
    notifyPlanUpdate(updatedCases);
  };

  const handleAddStep = (tcId: string) => {
    const targetCase = testCases.find((tc) => tc.id === tcId);
    const nextStepNum = (targetCase?.steps?.length || 0) + 1;
    const newStepText = `Adım ${nextStepNum}: `;

    const updatedCases = testCases.map((tc) => {
      if (tc.id !== tcId) return tc;
      return { ...tc, steps: [...(tc.steps || []), newStepText] };
    });
    setTestCases(updatedCases);
    notifyPlanUpdate(updatedCases);

    setEditingStepKey(`${tcId}-step-${nextStepNum - 1}`);
    setEditingStepValue(newStepText);
  };

  // Toplam adım ve tamamlanan adım sayısı
  const totalStepsCount = testCases.reduce((acc, tc) => acc + (tc.steps?.length || 0), 0);
  const completedStepsCount = Object.values(completedSteps).filter(Boolean).length;
  const progressPercent = totalStepsCount > 0 ? Math.round((completedStepsCount / totalStepsCount) * 100) : 0;

  const formatPriority = (priority: string = "") => {
    const match = priority.match(/\((.*?)\)/);
    if (match && match[1]) return match[1].trim();
    return priority.replace(/^P\d+\s*-?\s*/i, "").trim() || priority;
  };

  const getTestTypeBadgeProps = (typeStr: string = "") => {
    const lower = typeStr.toLowerCase();
    if (lower.includes("oyun") || lower.includes("gameplay")) {
      return {
        label: typeStr.startsWith("🎮") ? typeStr : `🎮 ${typeStr}`,
        sx: { background: "rgba(99, 102, 241, 0.2)", color: "#a5b4fc", borderColor: "rgba(99, 102, 241, 0.4)", fontWeight: 700 },
      };
    }
    if (lower.includes("yapay zeka") || lower.includes("ai")) {
      return {
        label: typeStr.startsWith("🤖") ? typeStr : `🤖 ${typeStr}`,
        sx: { background: "rgba(6, 182, 212, 0.2)", color: "#67e8f9", borderColor: "rgba(6, 182, 212, 0.4)", fontWeight: 700 },
      };
    }
    if (lower.includes("güvenlik") || lower.includes("mükerrer") || lower.includes("özel karakter")) {
      return {
        label: typeStr.startsWith("🔒") ? typeStr : `🔒 ${typeStr}`,
        sx: { background: "rgba(245, 158, 11, 0.15)", color: "#fcd34d", borderColor: "rgba(245, 158, 11, 0.35)", fontWeight: 700 },
      };
    }
    return {
      label: typeStr,
      sx: { borderColor: "rgba(255,255,255,0.15)", color: "#cbd5e1" },
    };
  };

  const copyMarkdown = () => {
    let md = `# Test Planı: ${cleanTitle(testPlan.title, isAdmin)}\n\n`;
    md += `> ${cleanOverview(testPlan.overview, isAdmin)}\n\n`;
    md += `Toplam Test: ${testCases.length} | Kritik Test: ${testCases.filter((t) => t.priority?.includes("Kritik") || t.priority?.includes("Yüksek") || t.priority?.includes("P1")).length}\n\n`;

    testCases.forEach((tc) => {
      md += `### ${tc.id}: ${cleanTitle(tc.title, isAdmin)}\n`;
      md += `- **Öncelik:** ${formatPriority(tc.priority)} | **Tür:** ${tc.type}\n`;
      md += `- **Ön Koşul:** ${cleanStepText(tc.preconditions, isAdmin)}\n`;
      md += `- **Test Adımları:**\n`;
      tc.steps.forEach((s, sIdx) => {
        const stepInfo = formatStepForDisplay(s, isAdmin);
        const timePrefix = isAdmin && stepInfo.timestamp ? `[⏱ ${stepInfo.timestamp}] ` : "";
        md += `  ${sIdx + 1}. ${timePrefix}${stepInfo.text}\n`;
      });
      md += `- **Beklenen Sonuç:** ${cleanStepText(tc.expectedResult, isAdmin)}\n\n`;
    });

    navigator.clipboard.writeText(md);
    setCopiedMd(true);
    setTimeout(() => setCopiedMd(false), 2000);
  };

  const copyJson = () => {
    const cleanedPlan = {
      ...testPlan,
      title: cleanTitle(testPlan.title, isAdmin),
      overview: cleanOverview(testPlan.overview, isAdmin),
      testCases: testCases.map((tc) => ({
        ...tc,
        title: cleanTitle(tc.title, isAdmin),
        priority: formatPriority(tc.priority),
        preconditions: cleanStepText(tc.preconditions, isAdmin),
        steps: tc.steps.map((s) => cleanStepText(s, isAdmin)),
        expectedResult: cleanStepText(tc.expectedResult, isAdmin),
      })),
    };
    navigator.clipboard.writeText(JSON.stringify(cleanedPlan, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const downloadCsv = () => {
    const headers = ["ID", "Baslik", "Oncelik", "Tur", "On Kosul", "Adimlar", "Beklenen Sonuc"];
    const rows = testCases.map((tc) => [
      `"${tc.id}"`,
      `"${cleanTitle(tc.title, isAdmin).replace(/"/g, '""')}"`,
      `"${formatPriority(tc.priority)}"`,
      `"${tc.type}"`,
      `"${cleanStepText(tc.preconditions, isAdmin).replace(/"/g, '""')}"`,
      `"${tc.steps.map((s) => cleanStepText(s, isAdmin)).join(" | ").replace(/"/g, '""')}"`,
      `"${cleanStepText(tc.expectedResult, isAdmin).replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `test-plani-${testPlan.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getPriorityColor = (priority: string = "") => {
    const p = priority.toLowerCase();
    if (p.includes("kritik") || p.includes("p1") || p.includes("blocker")) return "#ef4444";
    if (p.includes("yüksek") || p.includes("p2") || p.includes("high")) return "#f97316";
    if (p.includes("orta") || p.includes("normal") || p.includes("p3") || p.includes("medium")) return "#f59e0b";
    return "#10b981";
  };

  return (
    <Stack spacing={2.5}>
      {/* Kayıt & Taslak Bilgi Çubuğu ve Ana İşlem Butonları */}
      <Alert
        severity={isSaved ? "success" : "info"}
        variant="outlined"
        sx={{
          borderRadius: 2,
          borderWidth: 1.5,
          backgroundColor: isSaved ? "rgba(16, 185, 129, 0.08)" : "rgba(99, 102, 241, 0.08)",
          borderColor: isSaved ? "rgba(16, 185, 129, 0.4)" : "rgba(99, 102, 241, 0.4)",
          "& .MuiAlert-message": { width: "100%" },
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={2}
        >
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.3 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 800,
                  color: isSaved ? "#34d399" : "#a5b4fc",
                  fontSize: "0.95rem",
                }}
              >
                {isSaved ? "✅ Test Planı Kaydedildi" : "⚠️ Oluşturulan Test Planı (Taslak Önizleme)"}
              </Typography>
              <Chip
                label={isSaved ? "Arşive Eklendi" : "Henüz Eklenmedi"}
                size="small"
                color={isSaved ? "success" : "warning"}
                variant="outlined"
                sx={{ height: 20, fontSize: "0.72rem", fontWeight: 700 }}
              />
            </Stack>
            <Typography variant="body2" sx={{ color: "#94a3b8", fontSize: "0.83rem" }}>
              {isSaved
                ? "Bu test planı başarıyla 'Test Planları' sekmesine kaydedildi. İnceleyebilir veya uygulayabilirsiniz."
                : "Test adımları henüz test planlarına eklenmedi. İnceleyip onaylamak için 'Kaydet'e basabilir veya 'Sil' ile kaldırabilirsiniz."}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1.2} flexShrink={0} sx={{ alignSelf: { xs: "stretch", sm: "center" } }}>
            {onSave && !isSaved && (
              <Button
                variant="contained"
                color="success"
                size="medium"
                onClick={onSave}
                disabled={saving}
                sx={{
                  fontWeight: 800,
                  textTransform: "none",
                  px: 2.2,
                  boxShadow: "0 0 15px rgba(16, 185, 129, 0.3)",
                  whiteSpace: "nowrap",
                }}
              >
                {saving ? "Kaydediliyor..." : "💾 Test Planlarına Kaydet"}
              </Button>
            )}

            {isSaved && (
              <Chip
                label="✓ Kayıtlı"
                color="success"
                sx={{ fontWeight: 800, px: 1, py: 0.5, height: 36, fontSize: "0.85rem" }}
              />
            )}

            {onDelete && (
              <Button
                variant="outlined"
                color="error"
                size="medium"
                onClick={onDelete}
                sx={{
                  fontWeight: 700,
                  textTransform: "none",
                  borderColor: "rgba(239, 68, 68, 0.5)",
                  color: "#f87171",
                  whiteSpace: "nowrap",
                  "&:hover": {
                    backgroundColor: "rgba(239, 68, 68, 0.15)",
                    borderColor: "#ef4444",
                  },
                }}
              >
                🗑️ Planı Sil
              </Button>
            )}
          </Stack>
        </Stack>
      </Alert>

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
                📋 {cleanTitle(testPlan.title, isAdmin)}
              </Typography>
              <Typography variant="body2" sx={{ color: "#38bdf8", mt: 0.5, whiteSpace: "pre-line" }}>
                {cleanOverview(testPlan.overview, isAdmin)}
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

          <Stack direction="row" spacing={1.5} sx={{ mt: 2, mb: 2 }} flexWrap="wrap">
            <Chip label={`Toplam: ${testCases.length} Test`} color="primary" sx={{ fontWeight: 700 }} />
            <Chip
              label={`${testCases.filter((t) => t.priority?.includes("Kritik") || t.priority?.includes("Yüksek") || t.priority?.includes("P1")).length} Adet Kritik / Yüksek Öncelikli`}
              color="warning"
              sx={{ fontWeight: 700 }}
            />
            {testPlan.detectedLanguage && (
              <Chip label={testPlan.detectedLanguage} variant="outlined" sx={{ fontWeight: 600 }} />
            )}
            <Chip
              label={testPlan.accuracyLabel || "🎯 %100 Kesin Ölçekle Doğrulandı"}
              sx={{
                background: "linear-gradient(90deg, rgba(16, 185, 129, 0.2), rgba(6, 182, 212, 0.2))",
                color: "#34d399",
                border: "1px solid rgba(52, 211, 153, 0.45)",
                fontWeight: 800,
              }}
            />
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


      {/* Video Analiz Bulguları Paneli (Yalnızca Yönetici / Admin modunda gösterilir) */}
      {isAdmin && testPlan.videoInsights && Array.isArray(testPlan.videoInsights) && testPlan.videoInsights.length > 0 && (
        <Card
          sx={{
            border: "1px solid rgba(245, 158, 11, 0.45)",
            background: "rgba(245, 158, 11, 0.04)",
            borderRadius: 2,
          }}
        >
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }} flexWrap="wrap">
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip
                  size="small"
                  label="👑 Admin Görünümü"
                  sx={{
                    background: "linear-gradient(90deg, #f59e0b, #d97706)",
                    color: "#ffffff",
                    fontWeight: 800,
                    fontSize: "0.72rem",
                  }}
                />
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#38bdf8" }}>
                  🎥 Saniye Saniye Video & Medya Analiz Bulguları ({testPlan.videoInsights.length} Dosya)
                </Typography>
              </Stack>
              <Chip
                size="small"
                label={`Toplam ${testPlan.videoInsights.reduce((s, v) => s + (v.analyzedSecondsCount || (v.secondBySecondTimeline?.length ?? 1)), 0)} Saniye Karesi İncelendi`}
                sx={{
                  background: "rgba(6, 182, 212, 0.2)",
                  color: "#67e8f9",
                  fontWeight: 700,
                  fontSize: "0.74rem",
                }}
              />
            </Stack>

            <Stack spacing={2}>
              {testPlan.videoInsights.map((insight, vi) => (
                <Box
                  key={vi}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    background: "rgba(15, 23, 42, 0.75)",
                    border: "1px solid rgba(6, 182, 212, 0.25)",
                  }}
                >
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    justifyContent="space-between"
                    alignItems={{ xs: "flex-start", sm: "center" }}
                    spacing={1}
                    sx={{ mb: 1 }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                      <Chip
                        label={insight.mediaType === "image" ? `Görsel ${vi + 1}` : `Video ${vi + 1}`}
                        size="small"
                        sx={{
                          background: "rgba(6,182,212,0.25)",
                          color: "#38bdf8",
                          fontWeight: 800,
                          fontSize: "0.74rem",
                        }}
                      />
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#f1f5f9" }}>
                        {insight.videoName}
                      </Typography>
                      {insight.duration && (
                        <Chip
                          size="small"
                          label={`⏱ Süre: ${insight.duration}`}
                          sx={{ height: 20, fontSize: "0.7rem", background: "rgba(255,255,255,0.08)", color: "#cbd5e1" }}
                        />
                      )}
                      {insight.resolution && (
                        <Chip
                          size="small"
                          label={`📐 ${insight.resolution}`}
                          sx={{ height: 20, fontSize: "0.7rem", background: "rgba(99,102,241,0.15)", color: "#a5b4fc" }}
                        />
                      )}
                    </Stack>

                    {insight.generatedTestCount && (
                      <Chip
                        size="small"
                        label={`✅ ${insight.generatedTestCount} Test Senaryosu Üretildi`}
                        color="success"
                        variant="outlined"
                        sx={{ height: 22, fontSize: "0.72rem", fontWeight: 700 }}
                      />
                    )}
                  </Stack>

                  <Typography variant="body2" sx={{ color: "#cbd5e1", fontSize: "0.84rem", mb: 1.5, lineHeight: 1.5 }}>
                    {insight.flowSummary}
                  </Typography>

                  {/* Saniye Saniye Zaman Çizelgesi (Her Saniyenin Detaylı Analizi) */}
                  {insight.secondBySecondTimeline && insight.secondBySecondTimeline.length > 0 && (
                    <Box
                      sx={{
                        mb: 1.5,
                        p: 1.5,
                        borderRadius: 1.5,
                        background: "rgba(0, 0, 0, 0.35)",
                        border: "1px solid rgba(6, 182, 212, 0.18)",
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{ color: "#38bdf8", fontWeight: 800, display: "block", mb: 1 }}
                      >
                        ⏱️ Saniye Saniye Detaylı Analiz Dökümü ({insight.secondBySecondTimeline.length} Saniye):
                      </Typography>
                      <Stack
                        spacing={0.8}
                        sx={{
                          maxHeight: 280,
                          overflowY: "auto",
                          pr: 0.5,
                        }}
                      >
                        {insight.secondBySecondTimeline.map((secItem, sIdx) => (
                          <Box
                            key={sIdx}
                            sx={{
                              p: 1,
                              borderRadius: 1.2,
                              background: "rgba(15, 23, 42, 0.85)",
                              borderLeft:
                                secItem.eventType === "screen_transition" || secItem.eventType === "modal_open"
                                  ? "3px solid #38bdf8"
                                  : secItem.eventType === "error_visual" || secItem.eventType === "freeze_or_blank"
                                  ? "3px solid #ef4444"
                                  : secItem.eventType === "user_interaction"
                                  ? "3px solid #818cf8"
                                  : "3px solid rgba(255,255,255,0.2)",
                              display: "flex",
                              gap: 1.2,
                              alignItems: "flex-start",
                            }}
                          >
                            {secItem.thumbnailDataUrl && (
                              <Tooltip title="Ekran karesini tam boyutta açmak için tıklayın">
                                <Box
                                  component="img"
                                  src={secItem.thumbnailDataUrl}
                                  alt={secItem.timestamp}
                                  onClick={() =>
                                    setSelectedFramePreview({
                                      url: secItem.thumbnailDataUrl || "",
                                      title: `${secItem.timestamp} • ${secItem.screenName} (${secItem.activeRegion})`,
                                    })
                                  }
                                  sx={{
                                    width: 64,
                                    height: 38,
                                    objectFit: "cover",
                                    borderRadius: 1,
                                    border: "1px solid rgba(6, 182, 212, 0.4)",
                                    flexShrink: 0,
                                    mt: 0.2,
                                    cursor: "pointer",
                                    transition: "all 0.2s ease",
                                    "&:hover": {
                                      transform: "scale(1.1)",
                                      borderColor: "#38bdf8",
                                      boxShadow: "0 0 10px rgba(6, 182, 212, 0.5)",
                                    },
                                  }}
                                />
                              </Tooltip>
                            )}
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Stack direction="row" spacing={0.8} alignItems="center" flexWrap="wrap" sx={{ mb: 0.3 }}>
                                <Chip
                                  size="small"
                                  label={secItem.timestamp}
                                  sx={{
                                    height: 18,
                                    fontFamily: "monospace",
                                    fontWeight: 800,
                                    fontSize: "0.7rem",
                                    background: "rgba(6, 182, 212, 0.25)",
                                    color: "#67e8f9",
                                  }}
                                />
                                <Typography variant="caption" sx={{ fontWeight: 700, color: "#e2e8f0" }}>
                                  {secItem.screenName} • {secItem.activeRegion}
                                </Typography>
                                {secItem.second > 0 && (
                                  <Typography variant="caption" sx={{ color: "#94a3b8", fontSize: "0.7rem" }}>
                                    (Değişim: %{secItem.diffPercent})
                                  </Typography>
                                )}
                              </Stack>
                              <Typography variant="caption" sx={{ display: "block", color: "#cbd5e1", lineHeight: 1.4 }}>
                                {secItem.whatHappened}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{ display: "block", color: "#34d399", fontSize: "0.72rem", mt: 0.2 }}
                              >
                                🎯 Test Adımı Odağı: {secItem.qaCheckRequirement}
                              </Typography>
                            </Box>
                          </Box>
                        ))}
                      </Stack>
                    </Box>
                  )}

                  {/* Tespit Edilen Ekranlar */}
                  {insight.screens && insight.screens.length > 0 && (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="caption" sx={{ color: "#38bdf8", fontWeight: 700 }}>
                        🖥️ Tespit Edilen Ekran Fazları ({insight.screens.length}):
                      </Typography>
                      {insight.screens.map((scr: string, si: number) => (
                        <Typography
                          key={si}
                          variant="caption"
                          sx={{ display: "block", color: "#bae6fd", pl: 1.5, mt: 0.2, fontSize: "0.78rem" }}
                        >
                          • {scr}
                        </Typography>
                      ))}
                    </Box>
                  )}

                  {/* Tespit Edilen Sorunlar / QA Odak Noktaları */}
                  {insight.issues && insight.issues.length > 0 && (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="caption" sx={{ color: "#f87171", fontWeight: 700 }}>
                        ⚠️ Tespit Edilen Sorunlar & QA Odak Noktaları:
                      </Typography>
                      {insight.issues.map((issue: string, ii: number) => (
                        <Typography
                          key={ii}
                          variant="caption"
                          sx={{ display: "block", color: "#fca5a5", pl: 1.5, mt: 0.2, fontSize: "0.78rem" }}
                        >
                          • {issue}
                        </Typography>
                      ))}
                    </Box>
                  )}

                  {/* Kullanıcı Eylemleri */}
                  {insight.userActions && insight.userActions.length > 0 && (
                    <Box sx={{ mt: 0.8 }}>
                      <Typography variant="caption" sx={{ color: "#a5b4fc", fontWeight: 700 }}>
                        🖱️ Zaman Damgalı Kullanıcı Eylemleri ({insight.userActions.length} adet):
                      </Typography>
                      {insight.userActions.map((action: string, ai: number) => (
                        <Typography
                          key={ai}
                          variant="caption"
                          sx={{ display: "block", color: "#c7d2fe", pl: 1.5, mt: 0.2, fontSize: "0.78rem" }}
                        >
                          • {action}
                        </Typography>
                      ))}
                    </Box>
                  )}
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Standart Kullanıcı Görünümü: Saniye Saniye Video & Medya Analiz Bulguları Gizlidir (Yalnızca Admin Görür) */}
      {!isAdmin && testPlan.videoInsights && Array.isArray(testPlan.videoInsights) && testPlan.videoInsights.length > 0 && (
        <Paper
          variant="outlined"
          sx={{
            p: 1.6,
            mb: 2,
            background: "rgba(15, 23, 42, 0.6)",
            border: "1px dashed rgba(245, 158, 11, 0.35)",
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 1.5,
          }}
        >
          <Stack direction="row" spacing={1.2} alignItems="center">
            <span style={{ fontSize: "1.2rem" }}>🔒</span>
            <Box>
              <Typography variant="subtitle2" sx={{ color: "#f8fafc", fontWeight: 700, fontSize: "0.85rem" }}>
                Saniye Saniye Video & Medya Analiz Bulguları Gizlendi
              </Typography>
              <Typography variant="caption" sx={{ color: "#94a3b8", display: "block" }}>
                Detaylı saniye saniye video analizi ve görsel dökümler yalnızca Yönetici (Admin) yetkisine sahip kullanıcılara açıktır.
              </Typography>
            </Box>
          </Stack>
          {onRequestAdminAccess && (
            <Button
              size="small"
              variant="outlined"
              onClick={onRequestAdminAccess}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                fontSize: "0.78rem",
                borderColor: "rgba(245, 158, 11, 0.5)",
                color: "#fbbf24",
                "&:hover": {
                  background: "rgba(245, 158, 11, 0.12)",
                  borderColor: "#f59e0b",
                },
              }}
            >
              👑 Admin Girişi
            </Button>
          )}
        </Paper>
      )}

      {/* Test Senaryoları Başlığı */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          ✅ Uygulanacak Test Adımları ve Senaryolar ({testCases.length})
        </Typography>
        <Button
          variant="contained"
          size="small"
          onClick={handleOpenAddTestCaseModal}
          sx={{
            textTransform: "none",
            fontWeight: 700,
            background: "linear-gradient(90deg, #6366f1, #06b6d4)",
            color: "#ffffff",
            boxShadow: "0 2px 10px rgba(99, 102, 241, 0.35)",
            "&:hover": {
              background: "linear-gradient(90deg, #4f46e5, #0891b2)",
            },
          }}
        >
          ➕ Yeni Test Senaryosu Ekle
        </Button>
      </Stack>

      {testCases.length === 0 && (
        <Paper
          sx={{
            p: 4,
            textAlign: "center",
            background: "rgba(30, 41, 59, 0.4)",
            border: "1px dashed rgba(255,255,255,0.15)",
            borderRadius: 2,
          }}
        >
          <Typography variant="body1" sx={{ color: "#94a3b8" }}>
            Plandaki tüm test senaryoları silindi. Formu kullanarak yeniden test adımları oluşturabilirsiniz.
          </Typography>
        </Paper>
      )}

      {testCases.map((tc, idx) => (
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
              sx={{ width: "100%", pr: 1 }}
              spacing={1}
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Chip
                  label={tc.id}
                  size="small"
                  sx={{ backgroundColor: "rgba(255,255,255,0.1)", fontWeight: 800, fontFamily: "monospace" }}
                />
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {cleanTitle(tc.title, isAdmin)}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip
                  label={formatPriority(tc.priority)}
                  size="small"
                  sx={{
                    backgroundColor: `${getPriorityColor(tc.priority)}22`,
                    color: getPriorityColor(tc.priority),
                    fontWeight: 700,
                  }}
                />
                {(() => {
                  const badge = getTestTypeBadgeProps(tc.type);
                  return <Chip label={badge.label} size="small" variant="outlined" sx={badge.sx} />;
                })()}

                {/* Test Senaryosunu Düzenle (Sağ Üst Kalem İkonu) */}
                <Tooltip title="Bu test senaryosunu düzenle">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEditTestCaseModal(tc);
                    }}
                    sx={{
                      color: "#38bdf8",
                      p: 0.6,
                      ml: 0.5,
                      backgroundColor: "rgba(6, 182, 212, 0.1)",
                      "&:hover": { backgroundColor: "rgba(6, 182, 212, 0.25)" },
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                  </IconButton>
                </Tooltip>

                {/* Test Senaryosunu Sil (Sağ Üst Çöp İkonu) */}
                <Tooltip title="Bu test senaryosunu sil">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTestCase(tc.id);
                    }}
                    sx={{
                      color: "#f87171",
                      p: 0.6,
                      ml: 0.5,
                      backgroundColor: "rgba(239, 68, 68, 0.1)",
                      "&:hover": { backgroundColor: "rgba(239, 68, 68, 0.25)" },
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      <line x1="10" y1="11" x2="10" y2="17"></line>
                      <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                  </IconButton>
                </Tooltip>
              </Stack>
            </Stack>
          </AccordionSummary>

          <AccordionDetails sx={{ pt: 1, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            {tc.targetComponent && (
              <Typography variant="caption" sx={{ color: "#38bdf8", fontWeight: 700, display: "block", mb: 1 }}>
                🎯 Kaynak / Hedef Bileşen: {cleanStepText(tc.targetComponent, isAdmin)}
              </Typography>
            )}
            {/* Ön Koşul */}
            <Box
              sx={{
                mb: 2,
                background: "rgba(0,0,0,0.25)",
                p: 1.5,
                borderRadius: 1.5,
                borderLeft: "3px solid #06b6d4",
              }}
            >
              <Typography variant="caption" sx={{ color: "#06b6d4", fontWeight: 800, display: "block" }}>
                ÖN KOŞUL:
              </Typography>
              <Typography variant="body2" sx={{ color: "#cbd5e1" }}>
                {cleanStepText(tc.preconditions, isAdmin)}
              </Typography>
            </Box>

            {/* Test Adımları */}
            <Typography variant="caption" sx={{ color: "#818cf8", fontWeight: 800, display: "block", mb: 1 }}>
              UYGULAMA ADIMLARI:
            </Typography>
            <Stack spacing={1} sx={{ mb: 1.5 }}>
              {tc.steps && tc.steps.map((step, sIdx) => {
                const stepKey = `${tc.id}-step-${sIdx}`;
                const isChecked = !!completedSteps[stepKey];
                const isEditing = editingStepKey === stepKey;
                const stepInfo = formatStepForDisplay(step, isAdmin);

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
                    {isEditing ? (
                      <Box sx={{ width: "100%", p: 0.5 }}>
                        <TextField
                          fullWidth
                          multiline
                          size="small"
                          value={editingStepValue}
                          onChange={(e) => setEditingStepValue(e.target.value)}
                          autoFocus
                          sx={{
                            backgroundColor: "rgba(0, 0, 0, 0.4)",
                            borderRadius: 1,
                            "& .MuiOutlinedInput-root": {
                              color: "#f8fafc",
                              "& fieldset": { borderColor: "#38bdf8" },
                            },
                            mb: 1,
                          }}
                        />
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={handleCancelEditStep}
                            sx={{
                              textTransform: "none",
                              fontSize: "0.75rem",
                              color: "#94a3b8",
                              borderColor: "rgba(255,255,255,0.2)",
                            }}
                          >
                            İptal
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => handleSaveEditStep(tc.id, sIdx)}
                            sx={{
                              textTransform: "none",
                              fontSize: "0.75rem",
                              backgroundColor: "#10b981",
                              "&:hover": { backgroundColor: "#059669" },
                              fontWeight: 700,
                            }}
                          >
                            ✓ Kaydet
                          </Button>
                        </Stack>
                      </Box>
                    ) : (
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
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
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                              {isAdmin && stepInfo.timestamp && (
                                <Chip
                                  size="small"
                                  label={`⏱ ${stepInfo.timestamp}`}
                                  sx={{
                                    height: 18,
                                    fontSize: "0.68rem",
                                    fontWeight: 800,
                                    background: "rgba(6, 182, 212, 0.2)",
                                    color: "#38bdf8",
                                    fontFamily: "monospace",
                                  }}
                                />
                              )}
                              <Typography
                                variant="body2"
                                sx={{
                                  color: isChecked ? "#a7f3d0" : "#f1f5f9",
                                  textDecoration: isChecked ? "line-through" : "none",
                                  fontSize: "0.88rem",
                                }}
                              >
                                {stepInfo.text}
                              </Typography>
                            </Box>
                          }
                        />

                        <Stack direction="row" spacing={0.5} sx={{ ml: 1, flexShrink: 0 }}>
                          <Tooltip title="Bu adımı düzenle">
                            <IconButton
                              size="small"
                              onClick={() => handleStartEditStep(stepKey, step)}
                              sx={{
                                color: "#38bdf8",
                                p: 0.5,
                                backgroundColor: "rgba(56, 189, 248, 0.1)",
                                "&:hover": { backgroundColor: "rgba(56, 189, 248, 0.25)" },
                              }}
                            >
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                            </IconButton>
                          </Tooltip>

                          <Tooltip title={testCases.length > 1 ? "Bu adımı başka bir test senaryosuna taşı" : "Taşımak için en az 2 test senaryosu olmalıdır"}>
                            <span>
                              <IconButton
                                size="small"
                                disabled={testCases.length <= 1}
                                onClick={() => handleOpenMoveStepModal(tc.id, sIdx, step)}
                                sx={{
                                  color: "#a78bfa",
                                  p: 0.5,
                                  backgroundColor: "rgba(167, 139, 250, 0.1)",
                                  "&:hover": { backgroundColor: "rgba(167, 139, 250, 0.25)" },
                                  "&.Mui-disabled": { opacity: 0.3 },
                                }}
                              >
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <polyline points="15 3 21 3 21 9"></polyline>
                                  <line x1="10" y1="14" x2="21" y2="3"></line>
                                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                </svg>
                              </IconButton>
                            </span>
                          </Tooltip>

                          <Tooltip title="Bu adımı sil">
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteStep(tc.id, sIdx)}
                              sx={{
                                color: "#f87171",
                                p: 0.5,
                                backgroundColor: "rgba(239, 68, 68, 0.1)",
                                "&:hover": { backgroundColor: "rgba(239, 68, 68, 0.25)" },
                              }}
                            >
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                <line x1="14" y1="11" x2="14" y2="17"></line>
                              </svg>
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Box>
                    )}
                  </Paper>
                );
              })}
            </Stack>

            {/* Yeni Uygulama Adımı Ekleme Butonu */}
            <Box sx={{ mb: 2 }}>
              <Button
                size="small"
                variant="outlined"
                onClick={() => handleAddStep(tc.id)}
                sx={{
                  textTransform: "none",
                  fontSize: "0.78rem",
                  borderColor: "rgba(99, 102, 241, 0.4)",
                  color: "#a5b4fc",
                  "&:hover": {
                    borderColor: "#818cf8",
                    backgroundColor: "rgba(99, 102, 241, 0.1)",
                  },
                }}
              >
                ➕ Yeni Uygulama Adımı Ekle
              </Button>
            </Box>

            {/* Beklenen Sonuç */}
            <Box
              sx={{
                background: "rgba(16, 185, 129, 0.1)",
                p: 1.5,
                borderRadius: 1.5,
                borderLeft: "3px solid #10b981",
              }}
            >
              <Typography variant="caption" sx={{ color: "#34d399", fontWeight: 800, display: "block" }}>
                🎯 BEKLENEN SONUÇ:
              </Typography>
              <Typography variant="body2" sx={{ color: "#e2e8f0", mt: 0.5 }}>
                {cleanStepText(tc.expectedResult, isAdmin)}
              </Typography>
            </Box>

            {/* Otomasyon Test Kodu (Varsa) */}
            {tc.automationSnippet && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 700, display: "block", mb: 0.5 }}>
                  💻 Otomatik Test Kodu Taslağı:
                </Typography>
                <Paper
                  sx={{ p: 1.5, background: "#05070d", borderRadius: 1, border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <Typography
                    variant="caption"
                    component="pre"
                    sx={{ fontFamily: "monospace", color: "#38bdf8", whiteSpace: "pre-wrap", m: 0 }}
                  >
                    {tc.automationSnippet}
                  </Typography>
                </Paper>
              </Box>
            )}
          </AccordionDetails>
        </Accordion>
      ))}

      {testCases.length > 0 && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 1, mb: 1 }}>
          <Button
            variant="outlined"
            onClick={handleOpenAddTestCaseModal}
            sx={{
              textTransform: "none",
              borderColor: "rgba(99, 102, 241, 0.4)",
              color: "#a5b4fc",
              fontWeight: 700,
              px: 3,
              py: 1,
              borderRadius: 2,
              "&:hover": {
                borderColor: "#818cf8",
                backgroundColor: "rgba(99, 102, 241, 0.1)",
              },
            }}
          >
            ➕ Plana Yeni Test Senaryosu Ekle
          </Button>
        </Box>
      )}

      {/* Test Senaryosu Düzenleme Modalı */}
      {editingTestCase && (
        <Dialog
          open={!!editingTestCase}
          onClose={() => setEditingTestCase(null)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              background: "rgba(15, 23, 42, 0.98)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(56, 189, 248, 0.4)",
              borderRadius: 2.5,
              color: "#f8fafc",
            },
          }}
        >
          <DialogTitle sx={{ fontWeight: 800, color: "#38bdf8", borderBottom: "1px solid rgba(255,255,255,0.1)", pb: 1.5 }}>
            ✏️ Test Senaryosunu Düzenle ({editingTestCase.id})
          </DialogTitle>
          <DialogContent sx={{ pt: 2.5 }}>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Test Senaryosu Başlığı"
                fullWidth
                size="small"
                value={editForm.title}
                onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                sx={{
                  "& .MuiOutlinedInput-root": { color: "#f8fafc", "& fieldset": { borderColor: "rgba(255,255,255,0.2)" } },
                  "& .MuiInputLabel-root": { color: "#94a3b8" },
                }}
              />
              <Stack direction="row" spacing={2}>
                <TextField
                  select
                  label="Öncelik"
                  size="small"
                  sx={{
                    flex: 1,
                    "& .MuiOutlinedInput-root": { color: "#f8fafc", "& fieldset": { borderColor: "rgba(255,255,255,0.2)" } },
                    "& .MuiInputLabel-root": { color: "#94a3b8" },
                  }}
                  value={editForm.priority}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, priority: e.target.value }))}
                >
                  <MenuItem value="Kritik">Kritik</MenuItem>
                  <MenuItem value="Yüksek">Yüksek</MenuItem>
                  <MenuItem value="Orta">Orta</MenuItem>
                  <MenuItem value="Düşük">Düşük</MenuItem>
                </TextField>
                <TextField
                  label="Test Türü"
                  size="small"
                  sx={{
                    flex: 1.5,
                    "& .MuiOutlinedInput-root": { color: "#f8fafc", "& fieldset": { borderColor: "rgba(255,255,255,0.2)" } },
                    "& .MuiInputLabel-root": { color: "#94a3b8" },
                  }}
                  value={editForm.type}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, type: e.target.value }))}
                />
              </Stack>
              {/* Yalnızca Admin Görebilsin: Hedef/Kaynak Bileşen, Ön Koşul, Beklenen Sonuç */}
              {isAdmin && (
                <>
                  <TextField
                    label="Hedef / Kaynak Bileşen"
                    fullWidth
                    size="small"
                    value={editForm.targetComponent}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, targetComponent: e.target.value }))}
                    sx={{
                      "& .MuiOutlinedInput-root": { color: "#f8fafc", "& fieldset": { borderColor: "rgba(255,255,255,0.2)" } },
                      "& .MuiInputLabel-root": { color: "#94a3b8" },
                    }}
                  />
                  <TextField
                    label="Ön Koşul"
                    fullWidth
                    multiline
                    rows={2}
                    size="small"
                    value={editForm.preconditions}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, preconditions: e.target.value }))}
                    sx={{
                      "& .MuiOutlinedInput-root": { color: "#f8fafc", "& fieldset": { borderColor: "rgba(255,255,255,0.2)" } },
                      "& .MuiInputLabel-root": { color: "#94a3b8" },
                    }}
                  />
                  <TextField
                    label="Beklenen Sonuç"
                    fullWidth
                    multiline
                    rows={2}
                    size="small"
                    value={editForm.expectedResult}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, expectedResult: e.target.value }))}
                    sx={{
                      "& .MuiOutlinedInput-root": { color: "#f8fafc", "& fieldset": { borderColor: "rgba(255,255,255,0.2)" } },
                      "& .MuiInputLabel-root": { color: "#94a3b8" },
                    }}
                  />
                </>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <Button onClick={() => setEditingTestCase(null)} sx={{ color: "#94a3b8", textTransform: "none" }}>
              İptal
            </Button>
            <Button
              variant="contained"
              onClick={handleSaveTestCaseEdit}
              sx={{
                background: "linear-gradient(90deg, #0284c7, #2563eb)",
                color: "#fff",
                fontWeight: 700,
                textTransform: "none",
              }}
            >
              Değişiklikleri Kaydet
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Yeni Test Senaryosu Ekleme Modalı */}
      {isAddingTestCase && (
        <Dialog
          open={isAddingTestCase}
          onClose={() => setIsAddingTestCase(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              background: "rgba(15, 23, 42, 0.98)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(99, 102, 241, 0.45)",
              borderRadius: 2.5,
              color: "#f8fafc",
            },
          }}
        >
          <DialogTitle sx={{ fontWeight: 800, color: "#818cf8", borderBottom: "1px solid rgba(255,255,255,0.1)", pb: 1.5 }}>
            ➕ Plana Yeni Test Senaryosu Ekle
          </DialogTitle>
          <DialogContent sx={{ pt: 2.5 }}>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Test Senaryosu Başlığı"
                placeholder="Örn: Kullanıcı Giriş ve Şifre Güvenlik Doğrulaması"
                fullWidth
                size="small"
                value={newTcForm.title}
                onChange={(e) => setNewTcForm((prev) => ({ ...prev, title: e.target.value }))}
                sx={{
                  "& .MuiOutlinedInput-root": { color: "#f8fafc", "& fieldset": { borderColor: "rgba(255,255,255,0.2)" } },
                  "& .MuiInputLabel-root": { color: "#94a3b8" },
                }}
              />
              <Stack direction="row" spacing={2}>
                <TextField
                  select
                  label="Öncelik"
                  size="small"
                  sx={{
                    flex: 1,
                    "& .MuiOutlinedInput-root": { color: "#f8fafc", "& fieldset": { borderColor: "rgba(255,255,255,0.2)" } },
                    "& .MuiInputLabel-root": { color: "#94a3b8" },
                  }}
                  value={newTcForm.priority}
                  onChange={(e) => setNewTcForm((prev) => ({ ...prev, priority: e.target.value }))}
                >
                  <MenuItem value="Kritik">Kritik</MenuItem>
                  <MenuItem value="Yüksek">Yüksek</MenuItem>
                  <MenuItem value="Orta">Orta</MenuItem>
                  <MenuItem value="Düşük">Düşük</MenuItem>
                </TextField>
                <TextField
                  label="Test Türü"
                  size="small"
                  sx={{
                    flex: 1.5,
                    "& .MuiOutlinedInput-root": { color: "#f8fafc", "& fieldset": { borderColor: "rgba(255,255,255,0.2)" } },
                    "& .MuiInputLabel-root": { color: "#94a3b8" },
                  }}
                  value={newTcForm.type}
                  onChange={(e) => setNewTcForm((prev) => ({ ...prev, type: e.target.value }))}
                />
              </Stack>
              {/* Yalnızca Admin Görebilsin: Hedef/Kaynak Bileşen, Ön Koşul, Beklenen Sonuç */}
              {isAdmin && (
                <>
                  <TextField
                    label="Hedef / Kaynak Bileşen"
                    fullWidth
                    size="small"
                    placeholder="Örn: Kimlik Doğrulama ve Giriş Paneli"
                    value={newTcForm.targetComponent}
                    onChange={(e) => setNewTcForm((prev) => ({ ...prev, targetComponent: e.target.value }))}
                    sx={{
                      "& .MuiOutlinedInput-root": { color: "#f8fafc", "& fieldset": { borderColor: "rgba(255,255,255,0.2)" } },
                      "& .MuiInputLabel-root": { color: "#94a3b8" },
                    }}
                  />
                  <TextField
                    label="Ön Koşul"
                    fullWidth
                    multiline
                    rows={2}
                    size="small"
                    value={newTcForm.preconditions}
                    onChange={(e) => setNewTcForm((prev) => ({ ...prev, preconditions: e.target.value }))}
                    sx={{
                      "& .MuiOutlinedInput-root": { color: "#f8fafc", "& fieldset": { borderColor: "rgba(255,255,255,0.2)" } },
                      "& .MuiInputLabel-root": { color: "#94a3b8" },
                    }}
                  />
                </>
              )}
              <TextField
                label="Uygulama Adımları (Her satıra bir adım yazın)"
                fullWidth
                multiline
                rows={3}
                size="small"
                value={newTcForm.stepsText}
                onChange={(e) => setNewTcForm((prev) => ({ ...prev, stepsText: e.target.value }))}
                sx={{
                  "& .MuiOutlinedInput-root": { color: "#f8fafc", "& fieldset": { borderColor: "rgba(255,255,255,0.2)" } },
                  "& .MuiInputLabel-root": { color: "#94a3b8" },
                }}
              />
              {isAdmin && (
                <TextField
                  label="Beklenen Sonuç"
                  fullWidth
                  multiline
                  rows={2}
                  size="small"
                  value={newTcForm.expectedResult}
                  onChange={(e) => setNewTcForm((prev) => ({ ...prev, expectedResult: e.target.value }))}
                  sx={{
                    "& .MuiOutlinedInput-root": { color: "#f8fafc", "& fieldset": { borderColor: "rgba(255,255,255,0.2)" } },
                    "& .MuiInputLabel-root": { color: "#94a3b8" },
                  }}
                />
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <Button onClick={() => setIsAddingTestCase(false)} sx={{ color: "#94a3b8", textTransform: "none" }}>
              İptal
            </Button>
            <Button
              variant="contained"
              disabled={!newTcForm.title.trim()}
              onClick={handleCreateTestCase}
              sx={{
                background: "linear-gradient(90deg, #6366f1, #06b6d4)",
                color: "#fff",
                fontWeight: 700,
                textTransform: "none",
              }}
            >
              ➕ Test Senaryosunu Plana Ekle
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Adım Taşıma Modalı */}
      {movingStep && (
        <Dialog
          open={!!movingStep}
          onClose={() => setMovingStep(null)}
          maxWidth="xs"
          fullWidth
          PaperProps={{
            sx: {
              background: "rgba(15, 23, 42, 0.98)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(167, 139, 250, 0.4)",
              borderRadius: 2.5,
              color: "#f8fafc",
            },
          }}
        >
          <DialogTitle sx={{ fontWeight: 800, color: "#a78bfa", borderBottom: "1px solid rgba(255,255,255,0.1)", pb: 1.5 }}>
            🚚 Uygulama Adımını Başka Senaryoya Taşı
          </DialogTitle>
          <DialogContent sx={{ pt: 2.5 }}>
            <Typography variant="caption" sx={{ color: "#94a3b8", display: "block", mb: 0.5 }}>
              Taşınacak Uygulama Adımı:
            </Typography>
            <Paper sx={{ p: 1.2, mb: 2, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <Typography variant="body2" sx={{ color: "#e2e8f0" }}>
                {movingStep.stepText}
              </Typography>
            </Paper>

            <Typography variant="caption" sx={{ color: "#a78bfa", fontWeight: 700, display: "block", mb: 0.8 }}>
              Hedef Test Senaryosunu Seçin:
            </Typography>
            <TextField
              select
              fullWidth
              size="small"
              value={targetTcIdForMove}
              onChange={(e) => setTargetTcIdForMove(e.target.value)}
              sx={{
                "& .MuiOutlinedInput-root": { color: "#f8fafc", "& fieldset": { borderColor: "rgba(255,255,255,0.2)" } },
                "& .MuiInputLabel-root": { color: "#94a3b8" },
              }}
            >
              {testCases
                .filter((t) => t.id !== movingStep.sourceTcId)
                .map((target) => (
                  <MenuItem key={target.id} value={target.id}>
                    {target.id} - {cleanTitle(target.title, isAdmin)}
                  </MenuItem>
                ))}
            </TextField>
          </DialogContent>
          <DialogActions sx={{ p: 2, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <Button onClick={() => setMovingStep(null)} sx={{ color: "#94a3b8", textTransform: "none" }}>
              İptal
            </Button>
            <Button
              variant="contained"
              disabled={!targetTcIdForMove}
              onClick={handleConfirmMoveStep}
              sx={{
                background: "linear-gradient(90deg, #7c3aed, #6366f1)",
                color: "#fff",
                fontWeight: 700,
                textTransform: "none",
              }}
            >
              Adımı Taşı ve Ekle
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Kare Yakalama Tam Boyut İnceleme Dialogu */}
      {selectedFramePreview && (
        <Dialog
          open={!!selectedFramePreview}
          onClose={() => setSelectedFramePreview(null)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              background: "rgba(10, 15, 30, 0.98)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(6, 182, 212, 0.45)",
              borderRadius: 3,
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.8)",
              overflow: "hidden",
            },
          }}
        >
          <DialogTitle
            sx={{
              p: 2,
              background: "rgba(15, 23, 42, 0.95)",
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#38bdf8" }}>
              📸 {selectedFramePreview.title}
            </Typography>
            <IconButton
              size="small"
              onClick={() => setSelectedFramePreview(null)}
              sx={{ color: "#94a3b8", "&:hover": { color: "#fff", background: "rgba(239,68,68,0.2)" } }}
            >
              ✕
            </IconButton>
          </DialogTitle>
          <DialogContent
            sx={{
              p: 2,
              background: "#030712",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: 320,
            }}
          >
            <Box
              component="img"
              src={selectedFramePreview.url}
              alt={selectedFramePreview.title}
              sx={{
                maxWidth: "100%",
                maxHeight: "72vh",
                borderRadius: 1.5,
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.6)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </Stack>
  );
};
