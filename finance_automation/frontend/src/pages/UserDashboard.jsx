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

      <div className="min-h-screen bg-[#f4f7fb]">
        <div className="bg-[#061826] text-white px-6 lg:px-10 py-4 flex justify-between items-center shadow-[0_12px_30px_rgba(6,24,38,0.18)] font-sans border-b border-white/10">
          <div className="flex items-center gap-5 min-w-0">
            <img src="/logo.png" alt="SLT Mobitel Logo" className="h-10 object-contain shrink-0" />
            <span className="h-8 w-[1px] bg-white/15 hidden sm:block" />
            <div className="min-w-0">
              <span className="block font-extrabold text-lg tracking-normal truncate">Finance Revenue Automation</span>
              <span className="hidden sm:block text-xs font-semibold text-slate-400">Revenue reporting workspace</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <span className="block text-sm font-extrabold">{currentUser?.full_name}</span>
              <span className="block text-xs font-semibold text-emerald-400">Status: {currentUser?.status}</span>
            </div>
            <Chip
              label={currentUser?.role || "User"}
              size="small"
              sx={{
                display: { xs: "none", md: "inline-flex" },
                color: "#bbf7d0",
                borderColor: "rgba(187,247,208,0.35)",
                backgroundColor: "rgba(22,163,74,0.12)",
                fontWeight: 800,
              }}
              variant="outlined"
            />
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-[#E1251B] hover:bg-[#C11812] text-white rounded-lg text-sm font-extrabold transition-all shadow-md active:scale-95"
          >
            <LogoutIcon fontSize="small" />
            <span>Sign Out</span>
          </button>
          </div>
        </div>

        <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
          <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3.5 }, borderRadius: 2, border: "1px solid #dce5ee", boxShadow: "0 18px 42px rgba(15, 23, 42, 0.08)" }}>
            <Box sx={{ mb: 3, display: "flex", alignItems: { xs: "flex-start", md: "center" }, justifyContent: "space-between", gap: 2, flexDirection: { xs: "column", md: "row" } }}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 900, color: "#082f49" }}>
                  Source Workbooks
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.75, color: "#64748b", fontWeight: 600 }}>
                  Current and previous trial balances are required. Admin defaults can cover budget and mapping.
                </Typography>
              </Box>
              <Chip
                label={allFilesUploaded ? "Generation enabled" : "Waiting for files"}
                sx={{
                  height: 34,
                  borderRadius: 1.5,
                  fontWeight: 900,
                  color: allFilesUploaded ? "#166534" : "#475569",
                  backgroundColor: allFilesUploaded ? "#dcfce7" : "#f1f5f9",
                }}
              />
            </Box>

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
                      borderColor: isUploaded ? config.color : isDefaultActive ? "#86C35C" : "#DCE5EE",
                      borderWidth: 1,
                      borderRadius: 2,
                      backgroundColor: !isUploaded && isDefaultActive ? "#F8FCF6" : "#FFFFFF",
                      transition: "all 0.2s",
                      boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
                      "&:hover": { borderColor: config.color, boxShadow: "0 14px 30px rgba(15, 23, 42, 0.08)" },
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <Box sx={{ width: 34, height: 34, borderRadius: 1.5, display: "grid", placeItems: "center", backgroundColor: `${config.color}14`, mr: 1.5 }}>
                            <FileIcon sx={{ color: config.color, fontSize: 21 }} />
                          </Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#1f2937" }}>
                            {config.label}
                          </Typography>
                        </Box>
                        {!isUploaded && isDefaultActive && (
                          <Chip
                            label="Admin Default Active"
                            color="success"
                            size="small"
                            variant="outlined"
                            sx={{ height: 22, fontSize: "0.68rem", fontWeight: 800 }}
                          />
                        )}
                      </Box>

                      {isUploaded ? (
                        <Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 700, wordBreak: "break-word" }}>
                            {files[config.key].name}
                          </Typography>
                          <Box sx={{ display: "flex", gap: 1 }}>
                            <Button
                              size="small"
                              component="label"
                              variant="outlined"
                              sx={{ textTransform: "none", fontWeight: 800, borderRadius: 1.5 }}
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
                            sx={{ textTransform: "none", color: config.color, borderColor: config.color, fontWeight: 800, borderRadius: 1.5 }}
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
                            py: 2.2,
                            borderStyle: "dashed",
                            textTransform: "none",
                            fontWeight: 900,
                            borderRadius: 1.5,
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

          {loading && <LinearProgress sx={{ mt: 3, height: 7, borderRadius: 999 }} />}

          <Box sx={{ mt: 3, display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center" }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<ReportIcon />}
              disabled={!allFilesUploaded || loading}
              onClick={handleUploadAndGenerate}
              sx={{
                backgroundColor: "#0B3041",
                textTransform: "none",
                fontWeight: 900,
                borderRadius: 1.5,
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
                fontWeight: 900,
                borderRadius: 1.5,
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
                fontWeight: 900,
                borderRadius: 1.5,
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
                sx={{ textTransform: "none", fontWeight: 900, borderRadius: 1.5 }}
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

        <Paper elevation={0} sx={{ p: 2.5, mt: 3, backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 2 }}>
          <Typography variant="caption" color="text.secondary">
            <strong>Required files:</strong> Current Year Trial Balance and Previous Year Trial Balance are always required.
            If defaults are not set by the Admin, you must also provide the Revenue Budget Workbook and Revenue Mapping Workbook.
            All files must be in .xlsx format. System detects month/year from Trial Balance filename automatically.
          </Typography>
        </Paper>
      </Container>
      </div>
    </ThemeProvider>
  );
}
