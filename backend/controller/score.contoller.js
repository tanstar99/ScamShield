import {
  normalizeAllScores,
  normalizeScore,
  computePhishingRiskScore,
} from "./normalize.contoller.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const safeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

// ─── 1. XGBoost Score (0-100 → 0-1) ────────────────────────────────────────
const computeXGBoostScore = (xgboost_score) => {
  const reasons = [];
  const rawScore = safeNumber(xgboost_score, 0);
  const normalizedScore = clamp(rawScore / 100, 0, 1);

  if (normalizedScore >= 0.8) {
    reasons.push("Very high-risk URL pattern detected by ML model");
  } else if (normalizedScore >= 0.6) {
    reasons.push("High-risk URL pattern detected by ML model");
  } else if (normalizedScore >= 0.4) {
    reasons.push("Suspicious URL pattern detected by ML model");
  }

  return { score: normalizedScore, reasons };
};

// ─── 2. SSL Risk Scoring (Returns 0-1) ─────────────────────────────────────
const computeSSLRiskScore = (sslData = {}, domainExists = true) => {
  const reasons = [];

  if (!sslData || typeof sslData !== "object") {
    reasons.push("SSL certificate data unavailable");
    return { score: 0.5, reasons };
  }

  if (!domainExists || sslData.error) {
    reasons.push("Domain does not exist or SSL certificate unavailable");
    return { score: 0.95, reasons };
  }

  const cert_age_days = Number.isFinite(Number(sslData.cert_age_days))
    ? Number(sslData.cert_age_days)
    : null;
  const cert_days_remaining = Number.isFinite(Number(sslData.cert_days_remaining))
    ? Number(sslData.cert_days_remaining)
    : null;
  const is_self_signed = Boolean(sslData.is_self_signed);
  const issuer_name = (sslData.issuer_name || "Unknown").toLowerCase();

  let score = 0.02;

  if (is_self_signed) {
    score += 0.45;
    reasons.push("Self-signed SSL certificate detected");
  }

  if (cert_age_days !== null && cert_age_days >= 0 && cert_age_days < 3) {
    score += 0.08;
    reasons.push(`SSL certificate extremely new (${cert_age_days} days)`);
  } else if (cert_age_days !== null && cert_age_days < 7) {
    score += 0.04;
    reasons.push(`SSL certificate very new (${cert_age_days} days)`);
  }

  if (cert_days_remaining !== null && cert_days_remaining < 0) {
    score += 0.35;
    reasons.push("SSL certificate has expired");
  } else if (cert_days_remaining !== null && cert_days_remaining <= 3) {
    score += 0.20;
    reasons.push(`SSL certificate expires in ${cert_days_remaining} days`);
  } else if (cert_days_remaining !== null && cert_days_remaining <= 7) {
    score += 0.10;
    reasons.push(`SSL certificate expires soon (${cert_days_remaining} days)`);
  } else if (cert_days_remaining !== null && cert_days_remaining <= 15) {
    score += 0.05;
    reasons.push(`SSL certificate nearing expiry (${cert_days_remaining} days)`);
  }

  if (issuer_name === "unknown") {
    score += 0.08;
    reasons.push("SSL certificate issuer unknown");
  }

  return { score: clamp(score, 0, 1), reasons };
};

// ─── 3. Domain Intelligence Scoring (Returns 0-1) ────────────────────────
const computeDomainIntelligenceScore = (
  domain_age_days,
  recent_update_flag,
  domainExists = true
) => {
  const reasons = [];

  if (!domainExists) {
    reasons.push("Domain does not exist or RDAP lookup failed");
    return { score: 0.95, reasons };
  }

  const age = safeNumber(domain_age_days, -1);
  const hasRecentUpdate = Boolean(recent_update_flag);

  let score = 0.1;

  if (age >= 0 && age < 7) {
    score += 0.4;
    reasons.push(`Domain very recently registered (${age} days old)`);
  } else if (age >= 0 && age < 30) {
    score += 0.25;
    reasons.push(`Domain recently registered (${age} days old)`);
  } else if (age >= 0 && age < 90) {
    score += 0.15;
    reasons.push(`Domain registered less than 90 days ago (${age} days old)`);
  } else if (age >= 0 && age < 365) {
    score += 0.05;
    reasons.push(`Domain registered less than 1 year ago (${age} days old)`);
  } else if (age === -1) {
    score += 0.3;
    reasons.push("Domain age could not be determined");
  }

  if (hasRecentUpdate) {
    score += 0.15;
    reasons.push("Domain details recently updated (suspicious activity)");
  }

  return { score: clamp(score, 0, 1), reasons };
};

// ─── 4. WHOIS Risk Scoring (Returns 0-1) ─────────────────────────────────
const computeWhoisRiskScore = (whoisData = {}) => {
  const reasons = [];

  if (!whoisData || Object.keys(whoisData).length === 0) {
    reasons.push("WHOIS data unavailable");
    return { score: 0.3, reasons };
  }

  let score = 0.1;
  const registrant_privacy = Boolean(whoisData.registrant_privacy);
  
  if (registrant_privacy) {
    score += 0.3;
    reasons.push("Registrant privacy enabled (hidden registration)");
  }

  const suspiciousRegistrars = [
    "namecheap",
    "domains.com",
    "123-reg",
    "freenom",
    "hostinger",
    "godaddy",
  ];

  const registrarName = (whoisData.registrar_name || "").toLowerCase();
  const isSuspiciousReg = suspiciousRegistrars.some((reg) =>
    registrarName.includes(reg)
  );

  if (isSuspiciousReg) {
    score += 0.2;
    reasons.push(`Suspicious registrar: ${whoisData.registrar_name}`);
  }

  if (whoisData.expiration_date) {
    const now = new Date();
    const thirtyDaysFromNow = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000
    );
    if (new Date(whoisData.expiration_date) < thirtyDaysFromNow) {
      score += 0.2;
      reasons.push(`Domain expiration date within 30 days`);
    }
  }

  return { score: clamp(score, 0, 1), reasons };
};

// ─── 5. Typosquatting Score (Returns 0-1) ─────────────────────────────────
const computeTyposquattingScore = (typosquatting_score) => {
  const reasons = [];

  if (
    typosquatting_score === null ||
    typosquatting_score === undefined ||
    !Number.isFinite(typosquatting_score)
  ) {
    return { score: 0.1, reasons };
  }

  const score = clamp(safeNumber(typosquatting_score, 0.1), 0, 1);

  if (score >= 0.8) {
    reasons.push("Very high typosquatting similarity to a known brand");
  } else if (score >= 0.6) {
    reasons.push("High typosquatting similarity to a known brand");
  } else if (score >= 0.4) {
    reasons.push("Moderate typosquatting similarity detected");
  }

  return { score, reasons };
};

// ─── 6. Risk Level Classification ──────────────────────────────────────────
const classifyRiskLevel = (finalScore) => {
  const score = safeNumber(finalScore, 0);
  if (score <= 30) return "Safe";
  if (score <= 60) return "Suspicious";
  if (score <= 80) return "High Risk";
  return "Very Dangerous";
};

const getRiskColor = (riskLevel) => {
  switch (riskLevel) {
    case "Safe":
      return "green";
    case "Suspicious":
      return "yellow";
    case "High Risk":
      return "orange";
    case "Very Dangerous":
      return "red";
    default:
      return "red";
  }
};

// ═════════════════════════════════════════════════════════════════════
// MAIN HYBRID RISK SCORER
// ═════════════════════════════════════════════════════════════════════

export const computeHybridRiskScore = ({
  xgboost_score = 0,
  ssl_data = {},
  domain_age_days = null,
  recent_update_flag = false,
  whois_data = {},
  typosquatting_score = null,
  ip_geolocation = {},
  domain_exists = true,
} = {}) => {
  console.log(`\n${"═".repeat(80)}`);
  console.log(`[RISK-ENGINE] 🎯 PHISHING RISK SCORING ENGINE`);
  console.log(`${"═".repeat(80)}`);

  console.log(`[RISK-ENGINE] Domain exists: ${domain_exists}`);
  console.log(`[RISK-ENGINE] Domain Age: ${domain_age_days}`);

  // Compute individual component scores (0-1)
  const xgb = computeXGBoostScore(xgboost_score);
  const ssl = computeSSLRiskScore(ssl_data, domain_exists);
  const domainIntel = computeDomainIntelligenceScore(
    domain_age_days,
    recent_update_flag,
    domain_exists
  );
  const whois = computeWhoisRiskScore(whois_data);
  const typo = computeTyposquattingScore(typosquatting_score);

  console.log(
    `[RISK-ENGINE] Individual scores (0-1) - XGB: ${xgb.score.toFixed(
      3
    )}, SSL: ${ssl.score.toFixed(3)}, Domain: ${domainIntel.score.toFixed(
      3
    )}, WHOIS: ${whois.score.toFixed(3)}, Typo: ${typo.score.toFixed(3)}`
  );

  // Step 1: Weighted calculation (4-component with correct weights)
  console.log(`\n[RISK-ENGINE] Step 1: Weighted Risk Calculation`);
  
  const xgb_weight = 0.40;
  const typo_weight = 0.25;
  const ssl_weight = 0.20;
  const domain_weight = 0.15;

  const xgb_contrib = xgb.score * xgb_weight;
  const typo_contrib = typo.score * typo_weight;
  const ssl_contrib = ssl.score * ssl_weight;
  const domain_contrib = domainIntel.score * domain_weight;

  console.log(`[RISK-ENGINE] Weighted contributions:`);
  console.log(`  XGB (${Math.round(xgb_weight * 100)}%): ${xgb.score.toFixed(3)} * ${xgb_weight} = ${xgb_contrib.toFixed(3)}`);
  console.log(`  Typo (${Math.round(typo_weight * 100)}%): ${typo.score.toFixed(3)} * ${typo_weight} = ${typo_contrib.toFixed(3)}`);
  console.log(`  SSL (${Math.round(ssl_weight * 100)}%): ${ssl.score.toFixed(3)} * ${ssl_weight} = ${ssl_contrib.toFixed(3)}`);
  console.log(`  Domain (${Math.round(domain_weight * 100)}%): ${domainIntel.score.toFixed(3)} * ${domain_weight} = ${domain_contrib.toFixed(3)}`);

  let baseRisk = xgb_contrib + typo_contrib + ssl_contrib + domain_contrib;
  console.log(`  📊 Base Risk (0-1): ${baseRisk.toFixed(3)}`);

  // Step 2: Pattern-based boosts
  console.log(`\n[RISK-ENGINE] Step 2: Pattern-Based Risk Boosts`);
  
  let boost = 0;
  const patterns = [];

  // IP Geolocation boost
  let ip_geo_risk = 0;
  if (ip_geolocation.is_proxy) ip_geo_risk += 0.25;
  if (ip_geolocation.is_vpn) ip_geo_risk += 0.2;
  if (ip_geolocation.is_tor) ip_geo_risk += 0.35;
  if (ip_geolocation.is_datacenter) ip_geo_risk += 0.15;
  ip_geo_risk = clamp(ip_geo_risk, 0, 1);

  if (ip_geo_risk > 0.3) {
    boost += ip_geo_risk * 0.15;
    patterns.push(`IP Geo Risk (${(ip_geo_risk * 100).toFixed(0)}%): +${(ip_geo_risk * 0.15).toFixed(3)}`);
  }

  // High typo + domain intel pattern
  if (typo.score > 0.5 && domainIntel.score > 0.4) {
    boost += 0.1;
    patterns.push("Typo + New Domain Pattern: +0.100");
  }

  // Self-signed SSL + new domain
  if (ssl_data.is_self_signed && domain_age_days !== null && domain_age_days < 30) {
    boost += 0.15;
    patterns.push("Self-signed SSL + New Domain: +0.150");
  }

  if (patterns.length > 0) {
    console.log(`[RISK-ENGINE] Pattern-Based Boost Analysis:`);
    patterns.forEach(p => console.log(`  🔥 ${p}`));
  } else {
    console.log(`[RISK-ENGINE] Pattern-Based Boost Analysis:`);
    console.log(`  ℹ️ No patterns triggered, boost = 0`);
  }

  const riskWithBoost = baseRisk + boost;
  console.log(`  📈 Risk After Boost: ${riskWithBoost.toFixed(3)}`);

  // Step 3: Safety Dampening (Only for VERY LOW risk)
  console.log(`\n[RISK-ENGINE] Step 3: Safety Dampening (False Positive Control)`);
  
  let dampening = 0;
  
  // ONLY dampen if ALL signals are green
  const allSignalsGreen = xgb.score < 0.2 && 
                          typo.score < 0.1 && 
                          ssl.score < 0.2 && 
                          domainIntel.score < 0.2 &&
                          ip_geo_risk < 0.1;

  if (allSignalsGreen && riskWithBoost < 0.1) {
    dampening = -0.05; // gentle dampening only
    console.log(`[RISK-ENGINE] Safety Dampening Analysis:`);
    console.log(`  ✓ All signals green + risk < 10%`);
    console.log(`  ✓ Gentle Dampening: ${dampening}`);
  } else {
    console.log(`[RISK-ENGINE] Safety Dampening Analysis:`);
    console.log(`  ℹ️ Risk signals present, no dampening applied`);
  }

  // Step 4: Final Risk Calculation
  console.log(`\n[RISK-ENGINE] Step 4: Final Risk Calculation`);
  
  let finalRisk = riskWithBoost + dampening;
  finalRisk = clamp(finalRisk, 0, 1);

  const finalRiskScore = Math.round(finalRisk * 100);

  console.log(`[RISK-ENGINE] Final Risk Calculation:`);
  console.log(`  Base Risk: ${baseRisk.toFixed(3)}`);
  console.log(`  + Boost: ${boost.toFixed(3)}`);
  console.log(`  + Dampening: ${dampening.toFixed(3)}`);
  console.log(`  = Final Risk (0-1): ${finalRisk.toFixed(3)}`);
  console.log(`  = Final Risk (0-100): ${finalRiskScore}%`);

  // Step 5: Risk Level Classification
  console.log(`\n[RISK-ENGINE] Step 5: Risk Level Classification`);
  
  const risk_level = classifyRiskLevel(finalRiskScore);
  const risk_color = getRiskColor(risk_level);

  console.log(`[RISK-ENGINE] Risk Classification:`);
  console.log(`  ✅ Level: ${risk_level} (${finalRiskScore}%)`);
  console.log(`  🎨 Color: ${risk_color}`);

  console.log(`\n${"═".repeat(80)}`);
  console.log(`[RISK-ENGINE] ✅ SCORING COMPLETE`);
  console.log(`${"═".repeat(80)}\n`);

  // Build reasons array
  const allReasons = [
    ...xgb.reasons,
    ...ssl.reasons,
    ...domainIntel.reasons,
    ...whois.reasons,
    ...typo.reasons,
  ];

  const reasons = Array.from(new Set(allReasons));

  // Normalize component scores to 0-100
  const xgboost_score_normalized = Math.round(xgb.score * 100);
  const ssl_score_normalized = Math.round(ssl.score * 100);
  const domain_intelligence_score_normalized = Math.round(domainIntel.score * 100);
  const whois_score_normalized = Math.round(whois.score * 100);
  const typosquatting_score_normalized = Math.round(typo.score * 100);

  console.log(`[NORMALIZE] XGB: ${xgboost_score_normalized}%, SSL: ${ssl_score_normalized}%, Domain: ${domain_intelligence_score_normalized}%, WHOIS: ${whois_score_normalized}%, Typo: ${typosquatting_score_normalized}%\n`);

  return {
    // raw component scores (0-1)
    xgboost_score: xgb.score,
    ssl_score: ssl.score,
    domain_intelligence_score: domainIntel.score,
    whois_score: whois.score,
    typosquatting_score: typo.score,

    // normalized (0-100) ← IMPORTANT FOR FRONTEND
    xgboost_score_normalized,
    ssl_score_normalized,
    domain_intelligence_score_normalized,
    whois_score_normalized,
    typosquatting_score_normalized,

    // final results
    final_risk_score: finalRiskScore,
    risk_level,
    risk_color,
    reasons,

    // IP geo risk for display
    ip_geo_risk,
  };
};

export {
  computeDomainIntelligenceScore,
  computeWhoisRiskScore,
  computeTyposquattingScore,
  computeXGBoostScore,
  classifyRiskLevel,
  getRiskColor,
};