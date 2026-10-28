import React from "react";
import { Box, Typography, Button, Stack, Tooltip, IconButton } from "@mui/material";
import { TemplateItem } from "../types";

interface TemplateSelectorProps {
  templates: TemplateItem[];
  defaultTemplatesCount: number;
  onSelectTemplate: (tpl: TemplateItem) => void;
  onOpenModal: () => void;
  onDeleteCustomTemplate: (customIndex: number, e: React.MouseEvent) => void;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  templates,
  defaultTemplatesCount,
  onSelectTemplate,
  onOpenModal,
  onDeleteCustomTemplate,
}) => {
  return (
    <Box
      sx={{
        mb: 2.5,
        p: 2,
        background: "rgba(15, 23, 42, 0.5)",
        borderRadius: 2,
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
        <Typography variant="caption" sx={{ color: "#818cf8", fontWeight: 700 }}>
          ⚡ HAZIR SENARYO ŞABLONLARI:
        </Typography>
        <Button
          variant="contained"
          size="small"
          onClick={onOpenModal}
          sx={{
            textTransform: "none",
            fontSize: "0.78rem",
            fontWeight: 700,
            background: "linear-gradient(90deg, #10b981, #06b6d4)",
          }}
        >
          ➕ Şablon Ekle / AI ile Üret
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
