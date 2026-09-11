import express from "express";
import {
  scanURL,
  getScanHistory,
  getScanDetail,
  reportPhishingURL,
  deleteScan,
  getScanStats,
  getScansByDomain,
  scanURLNoAuth
} from "../controller/scan.controller.js";
import isAuth from "../middleware/auth.middleware.js";

const ScanRouter = express.Router();

// ─── Protected Routes (require authentication) ────────────────────────────


// ─── Public Route (no authentication) ────────────────────────────
ScanRouter.post("/url-no-auth", scanURLNoAuth);
// Scan a URL
ScanRouter.post("/url", isAuth, scanURL);

// Get user's scan history
ScanRouter.get("/history", isAuth, getScanHistory);

// Get scan statistics
ScanRouter.get("/stats/summary", isAuth, getScanStats);

// Get scans for specific domain
ScanRouter.get("/domain/:hostname", isAuth, getScansByDomain);

// Get specific scan details
ScanRouter.get("/:scanId", isAuth, getScanDetail);

// Report phishing URL
ScanRouter.post("/:scanId/report", isAuth, reportPhishingURL);

// Delete scan record
ScanRouter.delete("/:scanId", isAuth, deleteScan);

export default ScanRouter;