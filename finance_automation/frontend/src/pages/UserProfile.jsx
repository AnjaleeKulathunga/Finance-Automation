import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  Email as EmailIcon,
  ExitToApp as LogoutIcon,
  Person as PersonIcon,
  VerifiedUser as VerifiedUserIcon,
} from "@mui/icons-material";

const theme = createTheme({
  palette: {
    primary: { main: "#0B3041" },
    background: { default: "#F5F7FA" },
  },
  typography: {
    fontFamily: "'Inter', 'Roboto', 'Arial', sans-serif",
  },
});

const NAV_ITEMS = [
  { label: "Dashboard", icon: DashboardIcon, path: "/dashboard" },
  { label: "Profile", icon: PersonIcon, path: "/profile", active: true },
];

export default function UserProfile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      <div className="min-h-screen bg-[linear-gradient(180deg,#edf4fb_0%,#f8fafc_46%,#eef3f8_100%)] font-sans text-slate-900">
        <div className="flex min-h-screen">
          <aside className="hidden w-[284px] shrink-0 flex-col border-r border-white/10 bg-[#071b2a] text-white shadow-[18px_0_48px_rgba(7,27,42,0.16)] lg:flex">
            <div className="px-7 pb-6 pt-7">
              <div className="rounded-lg border border-white/10 bg-white/8 p-4">
                <img src="/logo.png" alt="SLT Mobitel Logo" className="h-12 object-contain" />
              </div>
            </div>

            <nav className="px-4">
              {NAV_ITEMS.map(({ label, icon: Icon, path, active }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => navigate(path)}
                  className={`mb-2 flex h-12 w-full items-center gap-3 rounded-lg px-4 text-left text-sm font-extrabold transition ${
                    active
                      ? "bg-white text-[#071b2a] shadow-lg"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon fontSize="small" />
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          </aside>

          <main className="flex min-w-0 flex-1 flex-col">
            <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 px-4 py-3 shadow-sm backdrop-blur md:px-8">
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-4">
                  <img src="/logo.png" alt="SLT Mobitel Logo" className="h-9 object-contain lg:hidden" />
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-black text-[#082f49] md:text-2xl">User Profile</h2>
                    <p className="hidden text-sm font-bold text-slate-500 sm:block">Finance Revenue Automation account details</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="hidden items-center rounded-lg border border-slate-200 bg-white p-2 shadow-[0_8px_20px_rgba(15,23,42,0.06)] md:flex"
                    aria-label="User profile"
                  >
                    <div className="grid h-11 w-11 place-items-center rounded-lg bg-[#082f49] text-white shadow-sm">
                      <PersonIcon sx={{ fontSize: 22 }} />
                    </div>
                  </button>
                  <Tooltip title="Sign out">
                    <Button
                      onClick={handleLogout}
                      variant="contained"
                      startIcon={<LogoutIcon />}
                      sx={{
                        minWidth: { xs: 42, sm: "auto" },
                        px: { xs: 1.2, sm: 2.4 },
                        height: 42,
                        backgroundColor: "#E1251B",
                        textTransform: "none",
                        fontWeight: 900,
                        borderRadius: 1.5,
                        boxShadow: "0 10px 18px rgba(225,37,27,0.2)",
                        "&:hover": { backgroundColor: "#C11812" },
                      }}
                    >
                      <span className="hidden sm:inline">Sign Out</span>
                    </Button>
                  </Tooltip>
                </div>
              </div>
            </header>

            <div className="flex-1 px-4 py-6 md:px-8 lg:px-10">
              <Paper
                elevation={0}
                sx={{
                  overflow: "hidden",
                  borderRadius: 2,
                  border: "1px solid #dce5ee",
                  boxShadow: "0 18px 42px rgba(15, 23, 42, 0.08)",
                  backgroundColor: "#ffffff",
                }}
              >
                <Box sx={{ backgroundColor: "#082f49", color: "white", p: { xs: 3, md: 4 } }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2.5, flexWrap: "wrap" }}>
                    <Box
                      sx={{
                        width: 76,
                        height: 76,
                        borderRadius: 2,
                        display: "grid",
                        placeItems: "center",
                        backgroundColor: "rgba(255,255,255,0.12)",
                        border: "1px solid rgba(255,255,255,0.18)",
                      }}
                    >
                      <PersonIcon sx={{ fontSize: 42 }} />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="h4" sx={{ fontWeight: 900, lineHeight: 1.1 }}>
                        {user?.full_name || "Finance User"}
                      </Typography>
                      <Typography sx={{ mt: 1, color: "#cbd5e1", fontWeight: 700 }}>
                        {user?.email || "No email available"}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                <Box sx={{ p: { xs: 3, md: 4 } }}>
                  <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mb: 3 }}>
                    <Chip
                      icon={<VerifiedUserIcon />}
                      label={user?.status || "Approved"}
                      sx={{ fontWeight: 900, color: "#047857", backgroundColor: "#d1fae5" }}
                    />
                    <Chip label={user?.role || "User"} sx={{ fontWeight: 900, color: "#0f766e", backgroundColor: "#ccfbf1" }} />
                  </Box>

                  <Divider sx={{ mb: 3 }} />

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-3 grid h-10 w-10 place-items-center rounded-lg bg-sky-100 text-sky-700">
                        <PersonIcon fontSize="small" />
                      </div>
                      <p className="text-xs font-black uppercase text-slate-500">User Name</p>
                      <p className="mt-1 text-lg font-black text-slate-900">{user?.full_name || "Finance User"}</p>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-3 grid h-10 w-10 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
                        <EmailIcon fontSize="small" />
                      </div>
                      <p className="text-xs font-black uppercase text-slate-500">Email Address</p>
                      <p className="mt-1 break-words text-lg font-black text-slate-900">{user?.email || "No email available"}</p>
                    </div>
                  </div>
                </Box>
              </Paper>
            </div>

            <footer className="border-t border-slate-200 bg-white px-4 py-5 md:px-8 lg:px-10">
              <div className="mx-auto flex max-w-5xl flex-col items-center justify-center gap-2 text-center">
                <div className="flex items-center gap-2 text-[#082f49]">
                  <VerifiedUserIcon fontSize="small" />
                  <span className="text-sm font-black">Finance Revenue Automation</span>
                </div>
                <p className="text-xs font-semibold text-slate-500">© {currentYear} SLT-MOBITEL</p>
              </div>
            </footer>
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}
