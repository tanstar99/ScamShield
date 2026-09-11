import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  IoShieldCheckmarkOutline,
  IoGlobeOutline,
  IoClose,
  IoArrowBack,
  IoRefresh,
  IoLocationOutline,
  IoServerOutline,
  IoShieldOutline,
} from "react-icons/io5";
import { AlertCircle, CheckCircle2, Zap, Globe, Lock, Clock, Search } from "lucide-react";
import { AuthDataContext } from "../context/AuthDataContext";

axios.defaults.withCredentials = true;

const ScanUrl = () => {
  const navigate = useNavigate();
  const { serverUrl } = useContext(AuthDataContext);

  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showDebug, setShowDebug] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const handleScan = async (e) => {
    e.preventDefault();
    if (!url.trim()) {
      setError("Please enter a URL");
      return;
    }
    try {
      new URL(url);
    } catch {
      setError("Invalid URL format. Use https://example.com");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setActiveTab("overview");

    try {
      const response = await axios.post(
        `${serverUrl}/api/scan/url`,
        { url },
        { withCredentials: true, timeout: 60000 }
      );
      if (response.data.success) {
        setResult(response.data.data);
        setError(null);
      } else {
        setError(response.data.message || "Scan failed");
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setError("Session expired. Please login again.");
        setTimeout(() => navigate("/login"), 1500);
      } else if (err.response?.status === 400) {
        setError(err.response.data?.message || "Bad request");
      } else if (err.response?.status === 500) {
        setError("Server error. Check backend logs.");
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setUrl("");
    setResult(null);
    setError(null);
    setShowDebug(false);
    setActiveTab("overview");
  };

  // ──── UI HELPERS ────

  const getRiskStyle = (level) => {
    const styles = {
      Safe: {
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/30",
        text: "text-emerald-400",
        bar: "bg-emerald-500",
        badge: "bg-emerald-500/20 text-emerald-400",
        icon: <CheckCircle2 size={28} className="text-emerald-400" />,
        glow: "shadow-emerald-500/20",
      },
      Suspicious: {
        bg: "bg-yellow-500/10",
        border: "border-yellow-500/30",
        text: "text-yellow-400",
        bar: "bg-yellow-500",
        badge: "bg-yellow-500/20 text-yellow-400",
        icon: <AlertCircle size={28} className="text-yellow-400" />,
        glow: "shadow-yellow-500/20",
      },
      "High Risk": {
        bg: "bg-orange-500/10",
        border: "border-orange-500/30",
        text: "text-orange-400",
        bar: "bg-orange-500",
        badge: "bg-orange-500/20 text-orange-400",
        icon: <AlertCircle size={28} className="text-orange-400" />,
        glow: "shadow-orange-500/20",
      },
      "Very Dangerous": {
        bg: "bg-red-500/10",
        border: "border-red-500/30",
        text: "text-red-400",
        bar: "bg-red-500",
        badge: "bg-red-500/20 text-red-400",
        icon: <AlertCircle size={28} className="text-red-400" />,
        glow: "shadow-red-500/20",
      },
    };
    return (
      styles[level] || {
        bg: "bg-slate-500/10",
        border: "border-slate-500/30",
        text: "text-slate-400",
        bar: "bg-slate-500",
        badge: "bg-slate-500/20 text-slate-400",
        icon: <AlertCircle size={28} className="text-slate-400" />,
        glow: "shadow-slate-500/20",
      }
    );
  };

  const getScoreBarColor = (score) => {
    if (score <= 24) return "bg-emerald-500";
    if (score <= 54) return "bg-yellow-500";
    if (score <= 74) return "bg-orange-500";
    return "bg-red-500";
  };

  const formatDate = (value) => {
    if (!value) return "N/A";
    try {
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? "N/A" : d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  // ✅ COMPLETE RESOLVER: Handles all response shapes
  const resolveComponentValue = (resultObj, key) => {
    if (!resultObj) return 0;

    let value = null;

    // Try 1: component_scores.KEY.normalized_0_100
    const cs = resultObj.component_scores || {};
    if (cs[key] && typeof cs[key].normalized_0_100 === "number") {
      value = cs[key].normalized_0_100;
    }
    // Try 2: Top-level X_score_normalized
    else if (typeof resultObj[`${key}_normalized`] === "number") {
      value = resultObj[`${key}_normalized`];
    }
    // Try 3: Direct top-level field (0-1 or 0-100)
    else if (typeof resultObj[key] === "number") {
      value = resultObj[key];
      // If 0-1, convert to 0-100
      if (value <= 1) value = value * 100;
    }
    // Try 4: AI insights fallbacks
    else if (key === "xgboost_score" && typeof resultObj.ai_insights?.xgboost_score === "number") {
      value = resultObj.ai_insights.xgboost_score;
    }
    else if (key === "typosquatting_score" && typeof resultObj.ai_insights?.typo_analysis?.typo_risk_score === "number") {
      value = resultObj.ai_insights.typo_analysis.typo_risk_score * 100;
    }
    else if (key === "ssl_score" && typeof resultObj.ssl_score === "number") {
      value = resultObj.ssl_score;
      if (value <= 1) value = value * 100;
    }
    else if (key === "domain_intelligence_score" && typeof resultObj.domain_intelligence_score === "number") {
      value = resultObj.domain_intelligence_score;
      if (value <= 1) value = value * 100;
    }

    // Final validation
    if (value === null || value === undefined || Number.isNaN(Number(value))) return 0;
    value = Number(value);
    value = Math.round(Math.max(0, Math.min(100, value)));
    return value;
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: <IoShieldOutline size={14} /> },
    { id: "ssl", label: "SSL", icon: <Lock size={14} /> },
    { id: "whois", label: "WHOIS", icon: <Clock size={14} /> },
    { id: "ip", label: "IP Info", icon: <IoLocationOutline size={14} /> },
    { id: "ai", label: "AI Analysis", icon: <Zap size={14} /> },
    { id: "debug", label: "Features", icon: <IoServerOutline size={14} /> },
  ];

  return (
    <div className="min-h-screen bg-[#0B1120] text-white pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4">

        {/* ── HEADER ── */}
        <div className="mb-8">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-slate-400 hover:text-white text-sm font-semibold mb-6 transition-colors"
          >
            <IoArrowBack size={16} />
            Back
          </button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl md:text-5xl font-black mb-2 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                URL Scanner
              </h1>
              <p className="text-slate-400 text-sm">
                AI-powered phishing detection engine with 4-component risk scoring
              </p>
            </div>
            <IoShieldCheckmarkOutline size={52} className="hidden sm:block text-[#2563EB] opacity-15" />
          </div>
        </div>

        {/* ── INPUT FORM ── */}
        <form onSubmit={handleScan} className="mb-8">
          <div className="flex gap-2 p-2 rounded-2xl border border-white/10 bg-white/4 backdrop-blur">
            <div className="flex items-center gap-3 flex-1 px-4">
              <IoGlobeOutline size={18} className="text-slate-500 shrink-0" />
              <input
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="https://example.com"
                disabled={loading}
                className="flex-1 bg-transparent text-white outline-none py-3 text-sm placeholder:text-slate-600"
              />
              {url && (
                <button type="button" onClick={() => setUrl("")} className="text-slate-500 hover:text-white">
                  <IoClose size={16} />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="flex items-center gap-2 px-7 py-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold text-sm transition-all"
            >
              {loading ? (
                <>
                  <Zap size={15} className="animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Search size={15} />
                  Scan URL
                </>
              )}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-3 mt-3 p-4 rounded-xl bg-red-500/10 border border-red-500/25">
              <AlertCircle size={16} className="text-red-400 shrink-0" />
              <p className="text-red-400 text-sm flex-1">{error}</p>
              <button type="button" onClick={() => setError(null)}>
                <IoClose size={16} className="text-red-400 hover:text-red-300" />
              </button>
            </div>
          )}

          {/* Example URLs */}
          {!result && !loading && (
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="text-slate-600 text-xs self-center">Try:</span>
              {[
                "https://paypa1-secure.com",
                "https://amazon-login.click",
                "https://gmail.com",
                "https://google.com",
              ].map((ex, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setUrl(ex)}
                  className="px-3 py-1 rounded-lg bg-white/6 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-mono transition-all border border-white/8"
                >
                  {ex.replace("https://", "")}
                </button>
              ))}
            </div>
          )}
        </form>

        {/* ── LOADING ── */}
        {loading && (
          <div className="text-center py-20">
            <div className="relative w-28 h-28 mx-auto mb-8">
              <div className="absolute inset-0 rounded-full border-4 border-white/5" />
              <div className="absolute inset-0 rounded-full border-4 border-t-[#2563EB] animate-spin" />
              <div className="absolute inset-4 rounded-full border-4 border-t-blue-400/50 animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
              <IoShieldCheckmarkOutline size={28} className="absolute inset-0 m-auto text-[#2563EB]" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Analyzing URL...</h2>
            <p className="text-slate-400 text-sm">Running ML model • Checking SSL • Querying WHOIS • IP Geolocation • Typosquatting Detection</p>
            <div className="flex justify-center gap-6 mt-6 text-xs text-slate-500">
              {["Extracting 14 Features", "SSL Certificate", "WHOIS Lookup", "IP Geolocation", "AI Scoring"].map((step, i) => (
                <span key={i} className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
                  {step}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── RESULTS ── */}
        {result && !loading && (
          <div className="space-y-6">

            {/* ── RISK HERO CARD ── */}
            <div className={`rounded-3xl border p-8 ${getRiskStyle(result.risk_level).bg} ${getRiskStyle(result.risk_level).border} shadow-2xl ${getRiskStyle(result.risk_level).glow}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-6">

                {/* Left: Risk Level */}
                <div className="flex items-center gap-4">
                  {getRiskStyle(result.risk_level).icon}
                  <div>
                    <div className="text-xs font-semibold text-slate-400 mb-1 uppercase tracking-widest">Phishing Risk Assessment</div>
                    <h2 className={`text-4xl font-black ${getRiskStyle(result.risk_level).text}`}>
                      {result.risk_level}
                    </h2>
                    <p className="text-slate-500 text-xs mt-1 font-mono truncate max-w-xs">
                      {result.hostname}
                    </p>
                  </div>
                </div>

                {/* Right: Score Circle */}
                <div className="flex items-center gap-6">
                  <div className="relative w-28 h-28">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                      <circle
                        cx="50" cy="50" r="40" fill="none"
                        stroke={result.risk_level === "Safe" ? "#10b981" : result.risk_level === "Suspicious" ? "#eab308" : result.risk_level === "High Risk" ? "#f97316" : "#ef4444"}
                        strokeWidth="10"
                        strokeLinecap="round"
                        strokeDasharray={`${(result.final_risk_score / 100) * 251.2} 251.2`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className={`text-3xl font-black ${getRiskStyle(result.risk_level).text}`}>
                        {Math.round(result.final_risk_score || 0)}
                      </div>
                      <div className="text-[10px] text-slate-500 font-semibold">RISK %</div>
                    </div>
                  </div>

                  {/* Processing time */}
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-slate-500">Scan Time</p>
                    <p className="text-lg font-bold">{result.processing_time_ms}ms</p>
                    <p className="text-xs text-slate-500 mt-2">Engine v2.0</p>
                    <p className="text-xs text-slate-500">4-Component</p>
                  </div>
                </div>
              </div>

              {/* Risk Bar */}
              <div className="mb-6">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Safe</span>
                  <span>Suspicious</span>
                  <span>High Risk</span>
                  <span>Dangerous</span>
                </div>
                <div className="h-3 bg-white/8 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${getScoreBarColor(result.final_risk_score)}`}
                    style={{ width: `${Math.min(result.final_risk_score || 0, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-600 mt-1">
                  <span>0</span>
                  <span>25</span>
                  <span>55</span>
                  <span>75</span>
                  <span>100</span>
                </div>
              </div>

              {/* Reasons */}
              {result.reasons?.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-widest">
                    Detection Signals ({result.reasons.length})
                  </p>
                  <div className="space-y-2">
                    {result.reasons.slice(0, 6).map((reason, idx) => (
                      <div key={idx} className="flex items-start gap-3 text-sm bg-white/4 rounded-lg px-3 py-2">
                        <span className="text-[#2563EB] font-bold mt-0.5 shrink-0">→</span>
                        <span className="text-slate-300">{reason}</span>
                      </div>
                    ))}
                    {result.reasons.length > 6 && (
                      <p className="text-xs text-slate-500 pl-3">
                        +{result.reasons.length - 6} more signals
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ── COMPONENT SCORES (FIXED) ── */}
            <div className="rounded-2xl border border-white/8 bg-white/4 p-6">
              <h3 className="text-base font-bold mb-5 flex items-center gap-2">
                <IoShieldOutline size={18} className="text-[#2563EB]" />
                Risk Component Scores
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "ML Model", key: "xgboost_score", weight: "40%", icon: "🧠" },
                  { label: "Typosquatting", key: "typosquatting_score", weight: "25%", icon: "🎯" },
                  { label: "SSL Certificate", key: "ssl_score", weight: "20%", icon: "🔒" },
                  { label: "Domain Intel", key: "domain_intelligence_score", weight: "15%", icon: "🌐" },
                ].map((item) => {
                  const value = resolveComponentValue(result, item.key);
                  return (
                    <div key={item.key} className="p-4 rounded-xl border border-white/8 bg-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-lg">{item.icon}</span>
                        <span className="text-xs text-slate-500 font-semibold">{item.weight}</span>
                      </div>
                      <div className={`text-2xl font-black mb-1 ${getScoreBarColor(value).replace("bg-", "text-")}`}>
                        {value}
                        <span className="text-sm text-slate-500 font-normal">/100</span>
                      </div>
                      <p className="text-xs text-slate-400 font-medium">{item.label}</p>
                      <div className="h-1.5 bg-white/8 rounded-full mt-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${getScoreBarColor(value)}`}
                          style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── TABS ── */}
            <div>
              {/* Tab Header */}
              <div className="flex gap-1 p-1 rounded-xl bg-white/4 border border-white/8 mb-4 overflow-x-auto">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      activeTab === tab.id
                        ? "bg-[#2563EB] text-white"
                        : "text-slate-400 hover:text-white hover:bg-white/6"
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* ── OVERVIEW TAB ── */}
              {activeTab === "overview" && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { label: "Hostname", value: result.hostname },
                    { label: "Domain Age", value: result.domain_age_days != null ? `${result.domain_age_days} days` : "N/A" },
                    { label: "Recent WHOIS Update", value: result.recent_update_flag ? "⚠️ Yes" : "✅ No" },
                    { label: "Registrar", value: result.whois_data?.registrar_name || "Unknown" },
                    { label: "Registrant Privacy", value: result.whois_data?.registrant_privacy ? "⚠️ Enabled" : "✅ Disabled" },
                    { label: "SSL Issuer", value: result.ssl_data?.issuer_name || "Unknown" },
                    { label: "SSL Version", value: result.ssl_data?.tls_version || "Unknown" },
                    { label: "Self-Signed SSL", value: result.ssl_data?.is_self_signed ? "⚠️ Yes" : "✅ No" },
                    { label: "IP Address", value: result.ip_geolocation?.ip || "Unknown" },
                    { label: "Location", value: result.ip_geolocation?.country ? `${result.ip_geolocation.city}, ${result.ip_geolocation.country}` : "Unknown" },
                    { label: "ISP", value: result.ip_geolocation?.isp || "Unknown" },
                    { label: "Hosted on Proxy", value: result.ip_geolocation?.is_proxy ? "🚨 Yes" : "✅ No" },
                  ].map((item, idx) => (
                    <div key={idx} className="p-3 rounded-xl border border-white/8 bg-white/4">
                      <p className="text-xs text-slate-500 mb-1">{item.label}</p>
                      <p className="text-sm font-semibold truncate">{item.value || "N/A"}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* ── SSL TAB ── */}
              {activeTab === "ssl" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { label: "Issuer Name", value: result.ssl_data?.issuer_name || "Unknown" },
                      { label: "TLS Version", value: result.ssl_data?.tls_version || "Unknown" },
                      { label: "Self-Signed", value: result.ssl_data?.is_self_signed ? "⚠️ Yes" : "✅ No" },
                      { label: "Certificate Age", value: result.ssl_data?.cert_age_days != null ? `${result.ssl_data.cert_age_days} days` : "N/A" },
                      { label: "Days Remaining", value: result.ssl_data?.cert_days_remaining != null ? `${result.ssl_data.cert_days_remaining} days` : "N/A" },
                      { label: "Subject (CN)", value: result.ssl_data?.subject_common_name || "N/A" },
                    ].map((item, idx) => (
                      <div key={idx} className="p-4 rounded-xl border border-white/8 bg-white/4">
                        <p className="text-xs text-slate-500 mb-1">{item.label}</p>
                        <p className="text-sm font-semibold truncate">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* SSL Risk Score Bar */}
                  <div className="p-4 rounded-xl border border-white/8 bg-white/4">
                    <div className="flex justify-between mb-2">
                      <p className="text-sm font-semibold">SSL Risk Score</p>
                      <span className="text-sm font-bold">{resolveComponentValue(result, "ssl_score")}/100</span>
                    </div>
                    <div className="h-2 bg-white/8 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${getScoreBarColor(resolveComponentValue(result, "ssl_score"))}`}
                        style={{ width: `${Math.min(resolveComponentValue(result, "ssl_score"), 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ── WHOIS TAB ── */}
              {activeTab === "whois" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { label: "Domain Name", value: result.whois_data?.domain_name },
                      { label: "Registrar", value: result.whois_data?.registrar_name },
                      { label: "Created On", value: formatDate(result.whois_data?.creation_date) },
                      { label: "Expires On", value: formatDate(result.whois_data?.expiration_date) },
                      { label: "Last Updated", value: formatDate(result.whois_data?.updated_date) },
                      { label: "Registrant Privacy", value: result.whois_data?.registrant_privacy ? "⚠️ Enabled" : "✅ Disabled" },
                      { label: "Domain Age", value: result.domain_age_days != null ? `${result.domain_age_days} days` : "N/A" },
                      { label: "Recent Update", value: result.recent_update_flag ? "⚠️ Yes (last 7 days)" : "✅ No" },
                    ].map((item, idx) => (
                      <div key={idx} className="p-4 rounded-xl border border-white/8 bg-white/4">
                        <p className="text-xs text-slate-500 mb-1">{item.label}</p>
                        <p className="text-sm font-semibold truncate">{item.value || "N/A"}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── IP TAB ── */}
              {activeTab === "ip" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { label: "IP Address", value: result.ip_geolocation?.ip },
                      { label: "Country", value: result.ip_geolocation?.country ? `${result.ip_geolocation?.country} (${result.ip_geolocation?.country_code})` : null },
                      { label: "Region", value: result.ip_geolocation?.region },
                      { label: "City", value: result.ip_geolocation?.city },
                      { label: "ISP", value: result.ip_geolocation?.isp },
                      { label: "Latitude", value: result.ip_geolocation?.latitude?.toString() },
                      { label: "Longitude", value: result.ip_geolocation?.longitude?.toString() },
                      { label: "Proxy", value: result.ip_geolocation?.is_proxy ? "🚨 Yes" : "✅ No" },
                      { label: "VPN", value: result.ip_geolocation?.is_vpn ? "🚨 Yes" : "✅ No" },
                      { label: "Tor Network", value: result.ip_geolocation?.is_tor ? "🚨 Yes" : "✅ No" },
                      { label: "Datacenter", value: result.ip_geolocation?.is_datacenter ? "⚠️ Yes" : "✅ No" },
                    ].map((item, idx) => (
                      <div key={idx} className="p-4 rounded-xl border border-white/8 bg-white/4">
                        <p className="text-xs text-slate-500 mb-1">{item.label}</p>
                        <p className="text-sm font-semibold truncate">{item.value || "N/A"}</p>
                      </div>
                    ))}
                  </div>

                  {/* Threat Flags */}
                  {(result.ip_geolocation?.is_proxy || result.ip_geolocation?.is_vpn || result.ip_geolocation?.is_tor) && (
                    <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10">
                      <p className="text-red-400 font-semibold text-sm mb-2">🚨 IP Threat Flags Detected</p>
                      <div className="flex gap-2 flex-wrap">
                        {result.ip_geolocation?.is_proxy && <span className="px-2 py-1 rounded bg-red-500/20 text-red-400 text-xs font-bold">PROXY</span>}
                        {result.ip_geolocation?.is_vpn && <span className="px-2 py-1 rounded bg-red-500/20 text-red-400 text-xs font-bold">VPN</span>}
                        {result.ip_geolocation?.is_tor && <span className="px-2 py-1 rounded bg-red-500/20 text-red-400 text-xs font-bold">TOR</span>}
                        {result.ip_geolocation?.is_datacenter && <span className="px-2 py-1 rounded bg-orange-500/20 text-orange-400 text-xs font-bold">DATACENTER</span>}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── AI TAB ── */}
              {activeTab === "ai" && (
                <div className="space-y-4">

                  {/* XGBoost Score */}
                  <div className="p-5 rounded-xl border border-white/8 bg-white/4">
                    <h4 className="font-bold mb-4 flex items-center gap-2">
                      🧠 XGBoost ML Model
                      <span className="text-xs text-slate-500 font-normal">40% weight</span>
                    </h4>
                    <div className="flex items-end gap-4">
                      <div>
                        <div className={`text-5xl font-black ${getScoreBarColor(resolveComponentValue(result, "xgboost_score")).replace("bg-", "text-")}`}>
                          {resolveComponentValue(result, "xgboost_score")}%
                        </div>
                        <p className="text-xs text-slate-500 mt-1">URL pattern risk score</p>
                      </div>
                      <div className="flex-1">
                        <div className="h-3 bg-white/8 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${getScoreBarColor(resolveComponentValue(result, "xgboost_score"))}`}
                            style={{ width: `${Math.min(resolveComponentValue(result, "xgboost_score"), 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Typosquatting */}
                  {result.ai_insights?.typo_analysis && (
                    <div className="p-5 rounded-xl border border-white/8 bg-white/4">
                      <h4 className="font-bold mb-4 flex items-center gap-2">
                        🎯 Typosquatting Detection
                        <span className="text-xs text-slate-500 font-normal">25% weight</span>
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { label: "Closest Brand", value: result.ai_insights.typo_analysis?.closest_brand || "—" },
                          { label: "Similarity", value: `${((result.ai_insights.typo_analysis?.similarity_ratio || 0) * 100).toFixed(0)}%` },
                          { label: "Edit Distance", value: result.ai_insights.typo_analysis?.min_edit_distance ?? "—" },
                          { label: "Typo Risk", value: `${resolveComponentValue(result, "typosquatting_score")}%` },
                        ].map((item, idx) => (
                          <div key={idx} className="p-3 rounded-lg bg-white/5 border border-white/6">
                            <p className="text-xs text-slate-500 mb-1">{item.label}</p>
                            <p className="font-bold text-sm">{item.value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Flags */}
                      <div className="flex gap-3 mt-3">
                        <div className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${result.ai_insights.typo_analysis?.brand_keyword_flag === 1 ? "bg-red-500/15 border-red-500/30 text-red-400" : "bg-white/5 border-white/8 text-slate-500"}`}>
                          Brand Keyword {result.ai_insights.typo_analysis?.brand_keyword_flag === 1 ? "⚠️ Detected" : "✅ Clear"}
                        </div>
                        <div className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${result.ai_insights.typo_analysis?.char_substitution_flag === 1 ? "bg-red-500/15 border-red-500/30 text-red-400" : "bg-white/5 border-white/8 text-slate-500"}`}>
                          Char Substitution {result.ai_insights.typo_analysis?.char_substitution_flag === 1 ? "⚠️ Detected" : "✅ Clear"}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Engine Explanation */}
                  {result.engine_explanation?.length > 0 && (
                    <div className="p-5 rounded-xl border border-white/8 bg-white/4">
                      <h4 className="font-bold mb-3">📋 Engine Decision Log</h4>
                      <div className="space-y-1.5 font-mono text-xs text-slate-400">
                        {result.engine_explanation.map((line, idx) => (
                          <div key={idx} className="p-2 rounded bg-white/4">{line}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── FEATURES DEBUG TAB ── */}
              {activeTab === "debug" && result.xgboost_features && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { idx: 0, label: "URL Length", key: "url_len" },
                      { idx: 1, label: "Hostname Length", key: "hostname_len" },
                      { idx: 2, label: "Count Dots", key: "count_dot" },
                      { idx: 3, label: "Count Hyphens", key: "count_hyphen" },
                      { idx: 4, label: "Count @", key: "count_at" },
                      { idx: 5, label: "Count ?", key: "count_question" },
                      { idx: 6, label: "Count %", key: "count_percent" },
                      { idx: 7, label: "Count Digits", key: "count_digits" },
                      { idx: 8, label: "Subdomain Depth", key: "subdomain_depth" },
                      { idx: 9, label: "Is HTTPS", key: "is_https" },
                      { idx: 10, label: "Has IP", key: "has_ip" },
                      { idx: 11, label: "Indian Keywords", key: "indian_keyword_count" },
                      { idx: 12, label: "Urgent Banking", key: "is_urgent_banking" },
                      { idx: 13, label: "Govt Spoof", key: "is_govt_spoof" },
                    ].map((feat) => (
                      <div key={feat.idx} className="p-3 rounded-xl border border-white/8 bg-white/4 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-slate-500 font-mono mb-0.5">[{feat.idx}] {feat.label}</p>
                          <p className="text-lg font-black text-[#2563EB]">
                            {result.xgboost_features[feat.key] ?? "—"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── ACTIONS ── */}
            <div className="flex gap-3 pt-4 border-t border-white/8">
              <button
                onClick={handleClear}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/8 hover:bg-white/12 text-sm font-semibold transition-all"
              >
                <IoRefresh size={16} />
                Scan Again
              </button>
              <button
                onClick={() => navigate("/history")}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/8 hover:bg-white/12 text-sm font-semibold transition-all"
              >
                <Clock size={16} />
                View History
              </button>
            </div>
          </div>
        )}

        {/* ── EMPTY STATE ── */}
        {!result && !loading && !error && (
          <div className="text-center py-20">
            <IoShieldCheckmarkOutline size={72} className="mx-auto mb-6 text-slate-800" />
            <h2 className="text-2xl font-bold text-slate-400 mb-2">Ready to Scan</h2>
            <p className="text-slate-600 text-sm mb-3">Paste any URL above to check for phishing, typosquatting, and malicious activity</p>
            <div className="flex flex-wrap justify-center gap-3 text-xs text-slate-600 mt-8">
              {["🧠 XGBoost ML Model (40%)", "🎯 Typosquatting Detection (25%)", "🔒 SSL Certificate Analysis (20%)", "🌐 Domain Intelligence (15%)"].map((item, idx) => (
                <span key={idx} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/8">{item}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScanUrl;