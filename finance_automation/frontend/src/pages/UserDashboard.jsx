import React, { useState, useCallback, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Container,
  Box,
  Button,
  Paper,
  Grid,
  Card,
  CardContent,
  IconButton,
  LinearProgress,
  Typography,
  Chip,
} from "@mui/material";
import {
  CloudUpload as UploadIcon,
  Assessment as ReportIcon,
  Download as DownloadIcon,
  Description as FileIcon,
  Delete as DeleteIcon,
  TableChart as UnmappedIcon,
  ExitToApp as LogoutIcon,
} from "@mui/icons-material";
import {
  uploadFiles,
  generateReport,
  getDownloadUrl,
  generateUnmappedReport,
  getUnmappedDownloadUrl,
  getAdminConfig,
} from "../services/api";
import StatusPanel from "../components/StatusPanel";

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

export default function UserDashboard() {
  const { user: currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const [adminConfig, setAdminConfig] = useState({
    default_mapping_active: false,
    default_budget_active: false,
    default_mapping_filename: null,
    default_budget_filename: null,
  });

  const [files, setFiles] = useState({});
  const [activeStep, setActiveStep] = useState(0);
  const [uploadResult, setUploadResult] = useState(null);
  const [reportResult, setReportResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [unmappedLoading, setUnmappedLoading] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      const cfg = await getAdminConfig();
      setAdminConfig(cfg);
    } catch (err) {
      console.error("Failed to load admin config:", err);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const allFilesUploaded =
    files.tb_current &&
    files.tb_previous &&
    (files.budget || adminConfig.default_budget_active) &&
    (files.mapping || adminConfig.default_mapping_active);

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
    } catch (err) {
      const msg = err.message || "An error occurred";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!reportResult?.filename) return;
    try {
      const token = localStorage.getItem("token");
      const headers = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const response = await fetch(getDownloadUrl(reportResult.filename), { headers });
      if (!response.ok) throw new Error("Failed to download file");

      const blob = await response.blob();
      const localUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = localUrl;
      a.download = reportResult.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(localUrl);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to download file");
    }
  };

  const handleUnmappedDownload = async () => {
    if (!uploadResult?.session_id) return;
    setUnmappedLoading(true);
    try {
      const result = await generateUnmappedReport(uploadResult.session_id);
      const token = localStorage.getItem("token");
      const headers = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const response = await fetch(getUnmappedDownloadUrl(result.filename), { headers });
      if (!response.ok) throw new Error("Failed to download unmapped file");

      const blob = await response.blob();
      const localUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = localUrl;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(localUrl);
    } catch (err) {
      const msg = err.message || "Failed to generate unmapped report";
      setError(msg);
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

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      {/* Top Navigation Panel */}
      <div className="bg-[#061826] text-white py-3.5 px-8 flex justify-between items-center shadow-lg font-sans border-b border-white/5">
        <div className="flex items-center space-x-4">
          <img src="/logo.png" alt="SLT Mobitel Logo" className="h-10 object-contain" />
          <span className="h-6 w-[1px] bg-white/10 hidden sm:block"></span>
          <span className="font-bold text-lg tracking-wide hidden sm:inline-block">Finance Revenue Automation</span>
        </div>
        <div className="flex items-center space-x-6">
          <div className="text-right">
            <span className="block text-sm font-semibold">{currentUser?.full_name}</span>
            <span className="block text-xs text-green-400">Status: {currentUser?.status}</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-1.5 px-4 py-2 bg-[#E1251B] hover:bg-[#C11812] text-white rounded-xl text-sm font-bold transition-all shadow-md active:scale-95"
          >
            <LogoutIcon fontSize="small" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ mb: 4 }} className="font-sans">
          <Typography variant="h4" sx={{ fontWeight: 800, color: "#0B3041" }}>
            Welcome back, {currentUser?.full_name}!
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Generate PowerPoint reports from trial balances in seconds.
          </Typography>
        </Box>

        <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 700, color: "#0B3041" }}>
            Upload Required Files
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Upload your Trial Balances. System mapping and budget templates are preconfigured by administrators, or you can optionally upload custom versions to override them.
          </Typography>

          <Grid container spacing={3}>
            {FILE_CONFIGS.map((config) => {
              const isDefaultActive =
                (config.key === "budget" && adminConfig.default_budget_active) ||
                (config.key === "mapping" && adminConfig.default_mapping_active);
              const isUploaded = !!files[config.key];

              return (
                <Grid item xs={12} sm={6} key={config.key}>
                  <Card
                    variant="outlined"
                    sx={{
                      height: "100%",
                      borderColor: isUploaded ? config.color : isDefaultActive ? "#7AB648" : "#E0E0E0",
                      borderWidth: isUploaded || isDefaultActive ? 2 : 1,
                      backgroundColor: !isUploaded && isDefaultActive ? "#F9FBF7" : "inherit",
                      transition: "all 0.2s",
                      "&:hover": { borderColor: config.color },
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <FileIcon sx={{ color: config.color, mr: 1 }} />
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            {config.label}
                          </Typography>
                        </Box>
                        {!isUploaded && isDefaultActive && (
                          <Chip
                            label="Admin Default Active"
                            color="success"
                            size="small"
                            variant="outlined"
                            sx={{ height: 20, fontSize: "0.7rem", fontWeight: 600 }}
                          />
                        )}
                      </Box>

                      {isUploaded ? (
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
                              Replace Custom
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
                      ) : isDefaultActive ? (
                        <Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontStyle: "italic" }}>
                            Using system global template configured by administrator
                          </Typography>
                          <Button
                            size="small"
                            component="label"
                            variant="outlined"
                            sx={{ textTransform: "none", color: config.color, borderColor: config.color }}
                          >
                            Upload Custom Override
                            <input
                              type="file"
                              accept={config.accept}
                              hidden
                              onChange={(e) => handleFileChange(config.key, e)}
                            />
                          </Button>
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
              );
            })}
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
            <strong>Required files:</strong> Current Year Trial Balance and Previous Year Trial Balance are always required.
            If defaults are not set by the Admin, you must also provide the Revenue Budget Workbook and Revenue Mapping Workbook.
            All files must be in .xlsx format. System detects month/year from Trial Balance filename automatically.
          </Typography>
        </Paper>
      </Container>
    </ThemeProvider>
  );
}
