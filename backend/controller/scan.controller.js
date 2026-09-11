
import axios from "axios";
import mongoose from "mongoose";
import { promises as dns } from "dns";
import Scan from "../models/scan.model.js";
import { computeHybridRiskScore } from "./score.contoller.js";
import {
  fetchWhoisData,
  calculateDomainAge,
  isDomainExpiringSoon,
} from "../utils/whois.js";
import { getSSLData } from "../utils/ssl.js";
import { FeatureExtractor } from "../utils/featureExtractor.js";
import Subscription from "../models/subscription.model.js";
import validator from "validator";

const AI_SERVER_URL = process.env.AI_SERVER_URL || "http://localhost:5000";

// Helper: base domain (without TLD)
const getBaseDomain = (url) => {
  try {
    const urlObj = new URL(url);
    let domain = urlObj.hostname.toLowerCase();
    if (domain.startsWith("www.")) domain = domain.replace(/^www\./, "");
    const parts = domain.split(".");
    if (parts.length >= 2) return parts.slice(0, -1).join(".").split(".").slice(-1)[0];
    return domain;
  } catch {
    return null;
  }
};

const checkRecentWhoisUpdate = (whoisData) => {
  if (!whoisData || !whoisData.updated_date) return false;
  const now = new Date();
  const updated = new Date(whoisData.updated_date);
  if (Number.isNaN(updated.getTime())) return false;
  const days = Math.floor((now - updated) / (1000 * 60 * 60 * 24));
  return days >= 0 && days <= 7;
};

const getIPFromHostname = async (hostname) => {
  try {
    const ips = await dns.resolve4(hostname);
    return ips && ips.length ? ips[0] : null;
  } catch {
    return null;
  }
};

const getIPWhoisData = async (hostname) => {
  try {
    const ip = await getIPFromHostname(hostname);
    if (!ip) return {
      ip: null, country: null, country_code: null, region: null, city: null,
      latitude: null, longitude: null, isp: null, is_proxy: false, is_vpn: false, is_tor: false, is_datacenter: false,
    };
    const resp = await axios.get(`http://ipwho.is/${ip}`, { timeout: 8000 });
    const data = resp.data || {};
    return {
      ip: data.ip || null,
      country: data.country || null,
      country_code: data.country_code || null,
      region: data.region || null,
      city: data.city || null,
      latitude: data.latitude || null,
      longitude: data.longitude || null,
      isp: data.isp || null,
      is_proxy: data.is_proxy === true,
      is_vpn: data.is_vpn === true,
      is_tor: data.is_tor === true,
      is_datacenter: data.is_datacenter === true,
    };
  } catch {
    return {
      ip: null, country: null, country_code: null, region: null, city: null,
      latitude: null, longitude: null, isp: null, is_proxy: false, is_vpn: false, is_tor: false, is_datacenter: false,
    };
  }
};

const getXGBoostScore = async (features) => {
  try {
    const r = await axios.post(`${AI_SERVER_URL}/api/analyze-url-ai`, { features }, { timeout: 15000 });
    return Number(r.data?.xgb_risk_score ?? 50);
  } catch {
    return 50;
  }
};

const getTypoAnalysis = async (url) => {
  try {
    if (!url) return {};
    const baseDomain = getBaseDomain(url);
    if (!baseDomain) return {};
    const r = await axios.post(`${AI_SERVER_URL}/api/analyze-typo`, { domain: baseDomain }, { timeout: 10000 });
    return r.data?.data || {};
  } catch {
    return {};
  }
};

const extractHostname = (url) => {
  try { return new URL(url).hostname; } catch { return null; }

};

export const scanURL = async (req, res) => {
  const startTime = Date.now();
  try {
    const userId = req.userId;
    const { url } = req.body;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    if (!url || !validator.isURL(url, { require_protocol: true })) {
      return res.status(400).json({ success: false, message: "Valid URL with protocol required" });
    }

    const hostname = extractHostname(url);
    if (!hostname) return res.status(400).json({ success: false, message: "Invalid URL" });

    const extractor = new FeatureExtractor(url);
    const validation = extractor.validateFeatures();
    if (!validation.valid) return res.status(400).json({ success: false, message: `Missing features: ${validation.missing.join(", ")}` });
    const xgboost_features = validation.features;
    const featureArray = extractor.buildFeatureArray();

    const [sslResult, whoisResult, xgbScore, typoData, ipWhoisData] = await Promise.all([
      getSSLData(url),
      fetchWhoisData(hostname),
      getXGBoostScore(featureArray),
      getTypoAnalysis(url),
      getIPWhoisData(hostname),
    ]);

    const ssl_data = sslResult.ssl_data || {};
    const whois_data = whoisResult.data || {};
    const domain_exists = sslResult.domain_exists === true || Boolean(whois_data && whois_data.creation_date);

    const domain_age_days = domain_exists ? (calculateDomainAge(whois_data.creation_date) ?? null) : null;
    const recent_update_flag = domain_exists ? checkRecentWhoisUpdate(whois_data) : false;

    // Normalize typo risk to 0-1
    const rawTypo = Number(typoData?.typo_risk_score ?? typoData?.typo_risk ?? 0);
    let normalizedTypo = 0;
    if (!Number.isFinite(rawTypo)) normalizedTypo = 0;
    else if (rawTypo > 1) normalizedTypo = Math.min(1, rawTypo / 100);
    else normalizedTypo = Math.max(0, rawTypo);

    const riskResult = computeHybridRiskScore({
      xgboost_score: xgbScore,
      ssl_data,
      domain_age_days,
      recent_update_flag,
      whois_data,
      typosquatting_score: normalizedTypo,
      ip_geolocation: ipWhoisData,
      domain_exists,
    });

    const reasons = [...(riskResult.reasons || [])];

    if (ipWhoisData.is_proxy) reasons.push("🚩 Hosted on Proxy Server");
    if (ipWhoisData.is_vpn) reasons.push("🚩 Hosted on VPN Service");
    if (ipWhoisData.is_tor) reasons.push("🚩 Hosted on Tor Network");
    if (ipWhoisData.is_datacenter) reasons.push("⚠️ Hosted on Datacenter IP");
    if (typoData?.brand_keyword_flag === 1 && typoData?.closest_brand) {
      reasons.push(`🚩 Brand Impersonation: Similar to "${typoData.closest_brand}" (${((typoData.similarity_ratio || 0) * 100).toFixed(0)}%)`);
    }
    if (typoData?.char_substitution_flag === 1) reasons.push("🚩 Character Substitution: Visual lookalike detected");
    if (isDomainExpiringSoon(whois_data.expiration_date)) reasons.push(`⚠️ Domain Expiring Soon: ${new Date(whois_data.expiration_date).toLocaleDateString()}`);
    if (ssl_data.is_self_signed) reasons.push("⚠️ Self-Signed SSL Certificate");
    if (typeof ssl_data.cert_age_days === "number" && ssl_data.cert_age_days < 7) reasons.push(`⚠️ Certificate Very Recently Issued (${ssl_data.cert_age_days} days)`);
    if (typeof domain_age_days === "number" && domain_age_days < 30) reasons.push(`⚠️ Domain Very Recently Registered (${domain_age_days} days)`);
    if (recent_update_flag) reasons.push("⚠️ WHOIS information updated within last 7 days");

    // Build payload; only include domain_age_days when numeric >= 0
    const scanPayload = {
      userId,
      url,
      hostname,
      normalized_domain: hostname.toLowerCase(),
      xgboost_features,
      xgboost_score: xgbScore,
      ssl_data: {
        cert_age_days: ssl_data.cert_age_days ?? null,
        cert_days_remaining: ssl_data.cert_days_remaining ?? null,
        is_self_signed: ssl_data.is_self_signed || false,
        issuer_name: ssl_data.issuer_name || "Unknown",
        tls_version: ssl_data.tls_version || "Unknown",
      },
      ssl_score: riskResult.ssl_score,
      domain_intelligence_score: riskResult.domain_intelligence_score,
      recent_update_flag,
      whois_data: {
        domain_name: whois_data.domain_name || hostname,
        registrar_name: whois_data.registrar_name || null,
        creation_date: whois_data.creation_date || null,
        expiration_date: whois_data.expiration_date || null,
        updated_date: whois_data.updated_date || null,
        registrant_privacy: whois_data.registrant_privacy || false,
      },
      whois_score: riskResult.whois_score,
      ip_geolocation: {
        ip: ipWhoisData.ip || null,
        country: ipWhoisData.country || null,
        country_code: ipWhoisData.country_code || null,
        region: ipWhoisData.region || null,
        city: ipWhoisData.city || null,
        latitude: ipWhoisData.latitude || null,
        longitude: ipWhoisData.longitude || null,
        isp: ipWhoisData.isp || null,
        is_proxy: ipWhoisData.is_proxy || false,
        is_vpn: ipWhoisData.is_vpn || false,
        is_tor: ipWhoisData.is_tor || false,
        is_datacenter: ipWhoisData.is_datacenter || false,
      },
      typosquatting: {
        min_edit_distance: typoData?.min_edit_distance ?? 0,
        closest_brand: typoData?.closest_brand ?? null,
        similarity_ratio: typoData?.similarity_ratio ?? 0,
        char_substitution_flag: typoData?.char_substitution_flag ?? 0,
        brand_keyword_flag: typoData?.brand_keyword_flag ?? 0,
        // store normalized 0-1 value
        typo_risk_score: normalizedTypo,
      },
      typosquatting_score: normalizedTypo,
      nlp_analysis: { urgency_score: 0, fear_score: 0, reward_score: 0, final_text_risk: 0, flags: [] },
      nlp_score: 0,
      final_risk_score: riskResult.final_risk_score,
      risk_level: riskResult.risk_level,
      risk_color: riskResult.risk_color,
      reasons: [...new Set(reasons)],
      processing_time_ms: Date.now() - startTime,
      model_version: "v2",
    };

    if (typeof domain_age_days === "number" && domain_age_days >= 0) scanPayload.domain_age_days = domain_age_days;

    const scanRecord = new Scan(scanPayload);
    await scanRecord.save();

    await Subscription.findOneAndUpdate({ userId }, { $inc: { scans_used: 1 } }, { returnDocument: "after" });

    const responseData = {
      ...scanRecord.toObject(),
      ai_insights: { xgboost_score: xgbScore, typo_analysis: typoData, ip_geolocation: ipWhoisData },
      component_scores: {
        xgboost_score: { normalized_0_100: riskResult.xgboost_score_normalized, weight: 0.25 },
        ssl_score: { normalized_0_100: riskResult.ssl_score_normalized, weight: 0.25 },
        domain_intelligence_score: { normalized_0_100: riskResult.domain_intelligence_score_normalized, weight: 0.25 },
        typosquatting_score: { normalized_0_100: riskResult.typosquatting_score_normalized, weight: 0.25 },
      },
    };

    return res.status(200).json({ success: true, data: responseData });
  } catch (error) {
    console.error("[SCAN ERROR]", error);
    return res.status(500).json({ success: false, message: "Internal Server Error during scan", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
};


export const getScanHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const scans = await Scan.find({ userId: req.userId }).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).select("url hostname final_risk_score risk_level risk_color createdAt xgboost_score reasons ip_geolocation");
    const total = await Scan.countDocuments({ userId: req.userId });
    return res.status(200).json({ success: true, data: { scans, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Failed to fetch scan history" });
  }
};

export const getScanDetail = async (req, res) => {
  try {
    const scan = await Scan.findOne({ _id: req.params.scanId, userId: req.userId });
    if (!scan) return res.status(404).json({ success: false, message: "Scan not found" });
    return res.status(200).json({ success: true, data: scan });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Failed to fetch scan details" });
  }
};

export const getScanStats = async (req, res) => {
  try {
    const stats = await Scan.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(req.userId) } },
      { $group: { _id: null, totalScans: { $sum: 1 }, avgRisk: { $avg: "$final_risk_score" }, safeCount: { $sum: { $cond: [{ $eq: ["$risk_level", "Safe"] }, 1, 0] } }, suspiciousCount: { $sum: { $cond: [{ $eq: ["$risk_level", "Suspicious"] }, 1, 0] } }, highRiskCount: { $sum: { $cond: [{ $eq: ["$risk_level", "High Risk"] }, 1, 0] } }, veryDangerousCount: { $sum: { $cond: [{ $eq: ["$risk_level", "Very Dangerous"] }, 1, 0] } } } },
    ]);
    return res.status(200).json({ success: true, data: stats[0] || { totalScans: 0, avgRisk: 0, safeCount: 0, suspiciousCount: 0, highRiskCount: 0, veryDangerousCount: 0 } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Failed to fetch statistics" });
  }
};

export const getScansByDomain = async (req, res) => {
  try {
    const scans = await Scan.find({ hostname: req.params.hostname, userId: req.userId }).sort({ createdAt: -1 }).limit(50);
    return res.status(200).json({ success: true, data: scans });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Failed to fetch domain scans" });
  }
};

export const reportPhishingURL = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || reason.trim() === "") return res.status(400).json({ success: false, message: "Report reason required" });
    const scan = await Scan.findOneAndUpdate({ _id: req.params.scanId, userId: req.userId }, { user_reported: true, report_reason: reason }, { returnDocument: "after" });
    if (!scan) return res.status(404).json({ success: false, message: "Scan not found" });
    return res.status(200).json({ success: true, message: "Report submitted successfully", data: scan });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Failed to submit report" });
  }
};

export const deleteScan = async (req, res) => {
  try {
    const result = await Scan.deleteOne({ _id: req.params.scanId, userId: req.userId });
    if (result.deletedCount === 0) return res.status(404).json({ success: false, message: "Scan not found" });
    return res.status(200).json({ success: true, message: "Scan deleted successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Failed to delete scan" });
  }
};

export const markScanAsSafe = async (req, res) => {
  try {
    const scan = await Scan.findOneAndUpdate({ _id: req.params.scanId, userId: req.userId }, { user_marked_safe: true }, { returnDocument: "after" });
    if (!scan) return res.status(404).json({ success: false, message: "Scan not found" });
    return res.status(200).json({ success: true, message: "Scan marked as safe", data: scan });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Failed to mark scan as safe" });
  }
};











export const scanURLNoAuth = async (req, res) => {
  const startTime = Date.now();
  try {
    const userId = "anonymous"; // Allow anonymous scans
    const { url } = req.body;
    
    if (!url || !validator.isURL(url, { require_protocol: true })) {
      return res.status(400).json({ success: false, message: "Valid URL with protocol required" });
    }

    const hostname = extractHostname(url);
    if (!hostname) return res.status(400).json({ success: false, message: "Invalid URL" });

    const extractor = new FeatureExtractor(url);
    const validation = extractor.validateFeatures();
    if (!validation.valid) return res.status(400).json({ success: false, message: `Missing features: ${validation.missing.join(", ")}` });
    const xgboost_features = validation.features;
    const featureArray = extractor.buildFeatureArray();

    const [sslResult, whoisResult, xgbScore, typoData, ipWhoisData] = await Promise.all([
      getSSLData(url),
      fetchWhoisData(hostname),
      getXGBoostScore(featureArray),
      getTypoAnalysis(url),
      getIPWhoisData(hostname),
    ]);

    const ssl_data = sslResult.ssl_data || {};
    const whois_data = whoisResult.data || {};
    const domain_exists = sslResult.domain_exists === true || Boolean(whois_data && whois_data.creation_date);

    const domain_age_days = domain_exists ? (calculateDomainAge(whois_data.creation_date) ?? null) : null;
    const recent_update_flag = domain_exists ? checkRecentWhoisUpdate(whois_data) : false;

    // Normalize typo risk to 0-1
    const rawTypo = Number(typoData?.typo_risk_score ?? typoData?.typo_risk ?? 0);
    let normalizedTypo = 0;
    if (!Number.isFinite(rawTypo)) normalizedTypo = 0;
    else if (rawTypo > 1) normalizedTypo = Math.min(1, rawTypo / 100);
    else normalizedTypo = Math.max(0, rawTypo);

    const riskResult = computeHybridRiskScore({
      xgboost_score: xgbScore,
      ssl_data,
      domain_age_days,
      recent_update_flag,
      whois_data,
      typosquatting_score: normalizedTypo,
      ip_geolocation: ipWhoisData,
      domain_exists,
    });

    const reasons = [...(riskResult.reasons || [])];

    if (ipWhoisData.is_proxy) reasons.push("🚩 Hosted on Proxy Server");
    if (ipWhoisData.is_vpn) reasons.push("🚩 Hosted on VPN Service");
    if (ipWhoisData.is_tor) reasons.push("🚩 Hosted on Tor Network");
    if (ipWhoisData.is_datacenter) reasons.push("⚠️ Hosted on Datacenter IP");
    if (typoData?.brand_keyword_flag === 1 && typoData?.closest_brand) {
      reasons.push(`🚩 Brand Impersonation: Similar to "${typoData.closest_brand}" (${((typoData.similarity_ratio || 0) * 100).toFixed(0)}%)`);
    }
    if (typoData?.char_substitution_flag === 1) reasons.push("🚩 Character Substitution: Visual lookalike detected");
    if (isDomainExpiringSoon(whois_data.expiration_date)) reasons.push(`⚠️ Domain Expiring Soon: ${new Date(whois_data.expiration_date).toLocaleDateString()}`);
    if (ssl_data.is_self_signed) reasons.push("⚠️ Self-Signed SSL Certificate");
    if (typeof ssl_data.cert_age_days === "number" && ssl_data.cert_age_days < 7) reasons.push(`⚠️ Certificate Very Recently Issued (${ssl_data.cert_age_days} days)`);
    if (typeof domain_age_days === "number" && domain_age_days < 30) reasons.push(`⚠️ Domain Very Recently Registered (${domain_age_days} days)`);
    if (recent_update_flag) reasons.push("⚠️ WHOIS information updated within last 7 days");

    // Build payload; only include domain_age_days when numeric >= 0
    const scanPayload = {
      userId,
      url,
      hostname,
      normalized_domain: hostname.toLowerCase(),
      xgboost_features,
      xgboost_score: xgbScore,
      ssl_data: {
        cert_age_days: ssl_data.cert_age_days ?? null,
        cert_days_remaining: ssl_data.cert_days_remaining ?? null,
        is_self_signed: ssl_data.is_self_signed || false,
        issuer_name: ssl_data.issuer_name || "Unknown",
        tls_version: ssl_data.tls_version || "Unknown",
      },
      ssl_score: riskResult.ssl_score,
      domain_intelligence_score: riskResult.domain_intelligence_score,
      recent_update_flag,
      whois_data: {
        domain_name: whois_data.domain_name || hostname,
        registrar_name: whois_data.registrar_name || null,
        creation_date: whois_data.creation_date || null,
        expiration_date: whois_data.expiration_date || null,
        updated_date: whois_data.updated_date || null,
        registrant_privacy: whois_data.registrant_privacy || false,
      },
      whois_score: riskResult.whois_score,
      ip_geolocation: {
        ip: ipWhoisData.ip || null,
        country: ipWhoisData.country || null,
        country_code: ipWhoisData.country_code || null,
        region: ipWhoisData.region || null,
        city: ipWhoisData.city || null,
        latitude: ipWhoisData.latitude || null,
        longitude: ipWhoisData.longitude || null,
        isp: ipWhoisData.isp || null,
        is_proxy: ipWhoisData.is_proxy || false,
        is_vpn: ipWhoisData.is_vpn || false,
        is_tor: ipWhoisData.is_tor || false,
        is_datacenter: ipWhoisData.is_datacenter || false,
      },
      typosquatting: {
        min_edit_distance: typoData?.min_edit_distance ?? 0,
        closest_brand: typoData?.closest_brand ?? null,
        similarity_ratio: typoData?.similarity_ratio ?? 0,
        char_substitution_flag: typoData?.char_substitution_flag ?? 0,
        brand_keyword_flag: typoData?.brand_keyword_flag ?? 0,
        typo_risk_score: normalizedTypo,
      },
      typosquatting_score: normalizedTypo,
      nlp_analysis: { urgency_score: 0, fear_score: 0, reward_score: 0, final_text_risk: 0, flags: [] },
      nlp_score: 0,
      final_risk_score: riskResult.final_risk_score,
      risk_level: riskResult.risk_level,
      risk_color: riskResult.risk_color,
      reasons: [...new Set(reasons)],
      processing_time_ms: Date.now() - startTime,
      model_version: "v2",
    };

    if (typeof domain_age_days === "number" && domain_age_days >= 0) scanPayload.domain_age_days = domain_age_days;

    const scanRecord = new Scan(scanPayload);
    await scanRecord.save();

    // Optional: Update subscription if user is authenticated
    if (req.userId) {
      await Subscription.findOneAndUpdate({ userId: req.userId }, { $inc: { scans_used: 1 } }, { returnDocument: "after" });
    }

    const responseData = {
      ...scanRecord.toObject(),
      ai_insights: { xgboost_score: xgbScore, typo_analysis: typoData, ip_geolocation: ipWhoisData },
      component_scores: {
        xgboost_score: { normalized_0_100: riskResult.xgboost_score_normalized, weight: 0.25 },
        ssl_score: { normalized_0_100: riskResult.ssl_score_normalized, weight: 0.25 },
        domain_intelligence_score: { normalized_0_100: riskResult.domain_intelligence_score_normalized, weight: 0.25 },
        typosquatting_score: { normalized_0_100: riskResult.typosquatting_score_normalized, weight: 0.25 },
      },
    };

    return res.status(200).json({ success: true, data: responseData });
  } catch (error) {
    console.error("[SCAN ERROR]", error);
    return res.status(500).json({ success: false, message: "Internal Server Error during scan", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
};