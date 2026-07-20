import React from "react";
import {
  Typography,
  Box,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Alert,
  Chip,
  Divider,
} from "@mui/material";
import {
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  HourglassEmpty as PendingIcon,
} from "@mui/icons-material";

const stepLabels = [
  "Upload Files",
  "Process Data",
  "Generate Report",
  "Download",
];

export default function StatusPanel({ activeStep, uploadResult, reportResult, error }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2.5, md: 3 },
        mt: 3,
        borderRadius: 2,
        border: "1px solid #dce5ee",
        boxShadow: "0 14px 34px rgba(15, 23, 42, 0.06)",
        backgroundColor: "#ffffff",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, mb: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 900, color: "#082f49" }}>
            Processing Status
          </Typography>
          <Typography variant="body2" sx={{ color: "#64748b", fontWeight: 600 }}>
            Report workflow progress
          </Typography>
        </Box>
        <Chip
          label={reportResult ? "Completed" : error ? "Attention" : activeStep > 0 ? "In progress" : "Not started"}
          color={reportResult ? "success" : error ? "error" : "default"}
          sx={{ fontWeight: 800 }}
        />
      </Box>
      <Divider sx={{ mb: 2 }} />

      <Stepper
        activeStep={activeStep}
        alternativeLabel
        sx={{
          mb: 3,
          "& .MuiStepLabel-label": { fontWeight: 700, color: "#64748b" },
          "& .Mui-active .MuiStepLabel-label": { color: "#0B3041", fontWeight: 900 },
          "& .Mui-completed .MuiStepLabel-label": { color: "#166534", fontWeight: 900 },
        }}
      >
        {stepLabels.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {typeof error === "string" ? error : JSON.stringify(error)}
        </Alert>
      )}

      {uploadResult && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 900, color: "#334155" }}>
            Uploaded Files:
          </Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {Object.entries(uploadResult.files || {}).map(([key, filename]) => (
              <Chip
                key={key}
                icon={<CheckIcon />}
                label={`${formatLabel(key)}: ${filename}`}
                color="success"
                variant="outlined"
                size="small"
                sx={{ fontWeight: 700 }}
              />
            ))}
          </Box>
          {uploadResult.session_id && (
            <Typography variant="caption" display="block" sx={{ mt: 1, color: "text.secondary" }}>
              Session: {uploadResult.session_id}
            </Typography>
          )}
        </Box>
      )}

      {reportResult && (
        <Box sx={{ mt: 2 }}>
          <Alert severity="success" sx={{ mb: 1 }}>
            Report generated successfully!
          </Alert>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mt: 1 }}>
            <Chip label={`Period: ${reportResult.report_month} ${reportResult.report_year}`} />
            <Chip label={`Mapped: ${reportResult.total_mapped} records`} color="primary" />
            <Chip
              label={`Unmapped: ${reportResult.unmapped_count} records`}
              color={reportResult.unmapped_count > 0 ? "warning" : "default"}
            />
            <Chip label={`Time: ${reportResult.processing_time_seconds}s`} />
          </Box>
        </Box>
      )}
    </Paper>
  );
}

function formatLabel(key) {
  const labels = {
    tb_current: "CY Trial Balance",
    tb_previous: "PY Trial Balance",
    budget: "Revenue Budget",
    mapping: "Revenue Mapping",
  };
  return labels[key] || key;
}
