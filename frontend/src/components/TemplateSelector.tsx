import React from "react";
import { Box, Typography, Button, Stack, Tooltip, IconButton } from "@mui/material";
import { TemplateItem } from "../types";

interface TemplateSelectorProps {
  templates: TemplateItem[];
  defaultTemplatesCount: number;
  onSelectTemplate: (tpl: TemplateItem) => void;
  onOpenModal: () => void;
  onDeleteCustomTemplate: (customIndex: number, e: React.MouseEvent) => void;
  isQa?: boolean;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  templates,
  defaultTemplatesCount,
  onSelectTemplate,
  onOpenModal,
  onDeleteCustomTemplate,
  isQa = false,
}) => {
  return (
    <Box
      sx={{
        mb: 2.5,
        p: 2,
        background: isQa ? "rgba(6, 182, 212, 0.05)" : "rgba(15, 23, 42, 0.5)",
        borderRadius: 2,
        border: isQa ? "1px solid rgba(6, 182, 212, 0.2)" : "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
        <Typography variant="caption" sx={{ color: isQa ? "#38bdf8" : "#818cf8", fontWeight: 700 }}>
          {isQa ? "🧪 HAZIR QA TEST SENARYO ŞABLONLARI:" : "💻 HAZIR GELİŞTİRİCİ KOD ŞABLONLARI:"}
        </Typography>
        <Button
          variant="contained"
          size="small"
          onClick={onOpenModal}
          sx={{
            textTransform: "none",
            fontSize: "0.78rem",
            fontWeight: 700,
            background: isQa
              ? "linear-gradient(90deg, #06b6d4, #6366f1)"
              : "linear-gradient(90deg, #10b981, #06b6d4)",
          }}
        >
          ➕ Yeni Şablon Ekle / AI ile Üret
        </Button>
      </Stack>

      <Stack direction="column" spacing={1}>
        {templates.map((tpl, i) => {
          const isCustom = i >= defaultTemplatesCount;
          const customIndex = i - defaultTemplatesCount;

          return (
            <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                fullWidth
                onClick={() => onSelectTemplate(tpl)}
                sx={{
                  textTransform: "none",
                  fontSize: "0.78rem",
                  justifyContent: "flex-start",
                  borderColor: isCustom ? "rgba(16, 185, 129, 0.4)" : "rgba(255,255,255,0.12)",
                  color: isCustom ? "#34d399" : "inherit",
                }}
              >
                {tpl.name}
              </Button>
              {isCustom && (
                <Tooltip title="Bu özel şablonu sil">
                  <IconButton
                    size="small"
                    onClick={(e) => onDeleteCustomTemplate(customIndex, e)}
                    sx={{ color: "#ef4444", p: 0.5 }}
                  >
                    ✕
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
};
