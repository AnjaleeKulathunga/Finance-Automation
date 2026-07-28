import React from "react";
import { Box, Button } from "@mui/material";
import { TableChart as UnmappedIcon } from "@mui/icons-material";

export default function ReportSummaryActions({
  reportResult,
  onDownloadUnmapped,
  unmappedLoading = false,
}) {
  if (!reportResult) return null;

  const { unmapped_count } = reportResult;

  return (
    <Box>
      {Number(unmapped_count) > 0 && (
        <Button
          type="button"
          variant="contained"
          size="large"
          startIcon={<UnmappedIcon />}
          onClick={onDownloadUnmapped}
          disabled={unmappedLoading}
          sx={{
            minHeight: 48,
            px: 4,
            borderRadius: 1.5,
            backgroundColor: "#E8A838",
            color: "#FFFFFF",
            textTransform: "none",
            fontWeight: 900,
            boxShadow: "0 8px 18px rgba(15, 23, 42, 0.12)",
            "&:hover": {
              backgroundColor: "#D99A26",
              boxShadow: "0 10px 22px rgba(15, 23, 42, 0.16)",
            },
            "&.Mui-disabled": {
              backgroundColor: "#E8A838",
              color: "rgba(255,255,255,0.76)",
            },
          }}
        >
          {unmappedLoading ? "Preparing Unmapped Rows..." : "Download Unmapped Rows"}
        </Button>
      )}
    </Box>
  );
}
