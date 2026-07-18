import React, { useState, useCallback } from "react";
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  Button,
  Paper,
  Grid,
  Card,
  CardContent,
  IconButton,
  LinearProgress,
  Snackbar,
  Alert,
} from "@mui/material";
import {
  CloudUpload as UploadIcon,
  Assessment as ReportIcon,
  Download as DownloadIcon,
  Description as FileIcon,
  Delete as DeleteIcon,
  TableChart as UnmappedIcon,
} from "@mui/icons-material";
import { uploadFiles, generateReport, getDownloadUrl, generateUnmappedReport, getUnmappedDownloadUrl } from "./services/api";
import StatusPanel from "./components/StatusPanel";

const theme = createTheme({
  palette: {
    primary: { main: "#0B3041" },
    secondary: { main: "#1B6B93" },
    background: { default: "#F5F7FA" },
  },
  typography: {
    fontFamily: "'Inter', 'Roboto', 'Arial', sans-serif",
  },
});

const FILE_CONFIGS = [
  { key: "tb_current", label: "Current Year Trial Balance", accept: ".xlsx,.xls", color: "#1B6B93" },
  { key: "tb_previous", label: "Previous Year Trial Balance", accept: ".xlsx,.xls", color: "#4A90B8" },
  { key: "budget", label: "Revenue Budget Workbook", accept: ".xlsx,.xls", color: "#7AB648" },
  { key: "mapping", label: "Revenue Mapping Workbook", accept: ".xlsx,.xls", color: "#E8A838" },
];

export default function App() {
  const [files, setFiles] = useState({});
  const [activeStep, setActiveStep] = useState(0);
  const [uploadResult, setUploadResult] = useState(null);
  const [reportResult, setReportResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [unmappedLoading, setUnmappedLoading] = useState(false);

  const allFilesUploaded = FILE_CONFIGS.every((config) => files[config.key]);

  const handleFileChange = useCallback((key, event) => {
    const file = event.target.files[0];
    if (file) {
      setFiles((prev) => ({ ...prev, [key]: file }));
    }
  }, []);

  const handleRemoveFile = useCallback((key) => {
    setFiles((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const handleUploadAndGenerate = async () => {
    setLoading(true);
    setError(null);
    setActiveStep(1);

    try {
      const uploadResp = await uploadFiles(files);
      setUploadResult(uploadResp);
      setActiveStep(2);

      const reportResp = await generateReport(uploadResp.session_id);
      setReportResult(reportResp);
      setActiveStep(3);

      setSnackbar({
        open: true,
        message: "Report generated successfully!",
        severity: "success",
      });
    } catch (err) {
      const msg = err.message || "An error occurred";
      setError(msg);
      setSnackbar({ open: true, message: msg, severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (reportResult?.filename) {
      const url = getDownloadUrl(reportResult.filename);
      const a = document.createElement("a");
      a.href = url;
      a.download = reportResult.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleUnmappedDownload = async () => {
    if (!uploadResult?.session_id) return;
    setUnmappedLoading(true);
    try {
      const result = await generateUnmappedReport(uploadResult.session_id);
      const url = getUnmappedDownloadUrl(result.filename);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      const msg = err.message || "Failed to generate unmapped report";
      setError(msg);
      setSnackbar({ open: true, message: msg, severity: "error" });
    } finally {
      setUnmappedLoading(false);
    }
  };

  const handleReset = () => {
    setFiles({});
    setUploadResult(null);
    setReportResult(null);
    setActiveStep(0);
    setError(null);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="static" sx={{ backgroundColor: "#0B3041" }}>
        <Toolbar>
          <ReportIcon sx={{ mr: 1 }} />
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
            Finance Revenue Automation
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.7 }}>
            Revenue Report Generator
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 700, color: "#0B3041" }}>
            Upload Required Files
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Upload all four Excel files below, then click "Generate Report" to create the PowerPoint presentation.
          </Typography>

          <Grid container spacing={3}>
            {FILE_CONFIGS.map((config) => (
              <Grid item xs={12} sm={6} key={config.key}>
                <Card
                  variant="outlined"
                  sx={{
                    height: "100%",
                    borderColor: files[config.key] ? config.color : "#E0E0E0",
                    borderWidth: files[config.key] ? 2 : 1,
                    transition: "all 0.2s",
                    "&:hover": { borderColor: config.color },
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                      <FileIcon sx={{ color: config.color, mr: 1 }} />
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {config.label}
                      </Typography>
                    </Box>

                    {files[config.key] ? (
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {files[config.key].name}
                        </Typography>
                        <Box sx={{ display: "flex", gap: 1 }}>
                          <Button
                            size="small"
                            component="label"
                            variant="outlined"
                            sx={{ textTransform: "none" }}
                          >
                            Replace
                            <input
                              type="file"
                              accept={config.accept}
                              hidden
                              onChange={(e) => handleFileChange(config.key, e)}
                            />
                          </Button>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleRemoveFile(config.key)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                    ) : (
                      <Button
                        component="label"
                        variant="outlined"
                        fullWidth
                        startIcon={<UploadIcon />}
                        sx={{
                          mt: 1,
                          py: 2,
                          borderStyle: "dashed",
                          textTransform: "none",
                          color: config.color,
                          borderColor: config.color,
                          "&:hover": {
                            borderStyle: "solid",
                            backgroundColor: `${config.color}10`,
                          },
                        }}
                      >
                        Click to upload
                        <input
                          type="file"
                          accept={config.accept}
                          hidden
                          onChange={(e) => handleFileChange(config.key, e)}
                        />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {loading && <LinearProgress sx={{ mt: 3 }} />}

          <Box sx={{ mt: 3, display: "flex", gap: 2 }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<ReportIcon />}
              disabled={!allFilesUploaded || loading}
              onClick={handleUploadAndGenerate}
              sx={{
                backgroundColor: "#0B3041",
                textTransform: "none",
                fontWeight: 600,
                px: 4,
                "&:hover": { backgroundColor: "#143D52" },
              }}
            >
              Generate Report
            </Button>

            {reportResult && (
              <Button
                variant="contained"
                size="large"
                startIcon={<DownloadIcon />}
                onClick={handleDownload}
                sx={{
                  backgroundColor: "#7AB648",
                  textTransform: "none",
                  fontWeight: 600,
                  px: 4,
                  "&:hover": { backgroundColor: "#6AA038" },
                }}
              >
                Download PowerPoint
              </Button>
            )}

            {reportResult && reportResult.unmapped_count > 0 && (
              <Button
                variant="contained"
                size="large"
                startIcon={<UnmappedIcon />}
                onClick={handleUnmappedDownload}
                disabled={unmappedLoading}
                sx={{
                  backgroundColor: "#E8A838",
                  textTransform: "none",
                  fontWeight: 600,
                  px: 4,
                  "&:hover": { backgroundColor: "#D09830" },
                }}
              >
                {unmappedLoading ? "Generating..." : "Download Unmapped Rows"}
              </Button>
            )}

            {activeStep > 0 && (
              <Button
                variant="outlined"
                size="large"
                onClick={handleReset}
                disabled={loading}
                sx={{ textTransform: "none" }}
              >
                Reset
              </Button>
            )}
          </Box>
        </Paper>

        <StatusPanel
          activeStep={activeStep}
          uploadResult={uploadResult}
          reportResult={reportResult}
          error={error}
        />

        <Paper elevation={1} sx={{ p: 2, mt: 3, backgroundColor: "#F0F4F8" }}>
          <Typography variant="caption" color="text.secondary">
            <strong>Required files:</strong> (1) Current Year Trial Balance, (2) Previous Year Trial Balance,
            (3) Revenue Budget Workbook, (4) Revenue Mapping Workbook. All files must be in .xlsx format.
            The system will automatically detect the reporting month from the Trial Balance filename.
          </Typography>
        </Paper>
      </Container>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
}
