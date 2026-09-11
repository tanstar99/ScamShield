
export const normalizeScore = (score, type = "0-1") => {
  // ✅ Handle null, undefined, NaN
  if (score === null || score === undefined || !isFinite(score)) {
    return 0;
  }

  const numScore = Number(score);

  // ✅ Double-check for NaN after conversion
  if (isNaN(numScore)) {
    return 0;
  }

  if (type === "0-1") {
    // Convert 0-1 to 0-100
    const normalized = numScore * 100;
    return Math.round(Math.max(0, Math.min(100, normalized)));
  }

  // For 0-100 scale, just clamp
  return Math.round(Math.max(0, Math.min(100, numScore)));
};

export const normalizeAllScores = ({
  xgboost_score = 0,
  ssl_score = 0,
  domain_intelligence_score = 0,
  whois_score = 0,
  typosquatting_score = 0,
} = {}) => {
  // ✅ Validate all inputs first
  const xgb = normalizeScore(xgboost_score, "0-100");
  const ssl = normalizeScore(ssl_score, "0-1");
  const domainIntel = normalizeScore(domain_intelligence_score, "0-1");
  const whois = normalizeScore(whois_score, "0-1");
  const typo = normalizeScore(typosquatting_score, "0-1");

  console.log(
    `[NORMALIZE] XGB: ${xgb}%, SSL: ${ssl}%, Domain: ${domainIntel}%, WHOIS: ${whois}%, Typo: ${typo}%`
  );

  return {
    xgboost_score_normalized: xgb,
    ssl_score_normalized: ssl,
    domain_intelligence_score_normalized: domainIntel,
    whois_score_normalized: whois,
    typosquatting_score_normalized: typo,
  };
};

// ═════════════════════════════════════════════════════════════════════
// ✅ PHISHING RISK SCORING ENGINE
// ═════════════════════════════════════════════════════════════════════

/**
 * Advanced 4-component weighted scoring with:
 * ✓ Normalized inputs (0-1)
 * ✓ Base weighted formula (40-25-20-15%)
 * ✓ Nonlinear pattern-based boosts
 * ✓ Safety dampening for legitimate sites
 * ✓ Production-ready & modular
 */

// ─── INPUT VALIDATION & NORMALIZATION ────────────────────────────────────

/**
 * Ensure all scores are valid numbers between 0-1
 */
const normalizeInput = (score, name = "score") => {
  const num = Number(score);

  if (!isFinite(num)) {
    console.warn(`[RISK-ENGINE] Invalid ${name}: ${score}, defaulting to 0`);
    return 0;
  }

  const normalized = Math.max(0, Math.min(1, num));

  if (normalized !== num) {
    console.warn(`[RISK-ENGINE] ${name} clamped from ${num} to ${normalized}`);
  }

  return normalized;
};

/**
 * Validate all 4 input components
 */
const validateInputs = (xgboost, typo, ssl, whois) => {
  return {
    xgboost_score: normalizeInput(xgboost, "xgboost_score"),
    typosquatting_score: normalizeInput(typo, "typosquatting_score"),
    ssl_risk: normalizeInput(ssl, "ssl_risk"),
    whois_risk: normalizeInput(whois, "whois_risk"),
  };
};

// ─── STEP 1: BASE WEIGHTED RISK CALCULATION ──────────────────────────────

/**
 * Calculate base risk using 4-component weighted formula
 * Weights: XGB(40%) + Typo(25%) + SSL(20%) + WHOIS(15%)
 */
const calculateBaseRisk = (
  xgboost_score,
  typosquatting_score,
  ssl_risk,
  whois_risk
) => {
  const baseRisk =
    xgboost_score * 0.4 +
    typosquatting_score * 0.25 +
    ssl_risk * 0.2 +
    whois_risk * 0.15;

  console.log(`[RISK-ENGINE] Base Risk Calculation:`);
  console.log(
    `  XGB (40%): ${xgboost_score.toFixed(3)} * 0.40 = ${(
      xgboost_score * 0.4
    ).toFixed(3)}`
  );
  console.log(
    `  Typo (25%): ${typosquatting_score.toFixed(3)} * 0.25 = ${(
      typosquatting_score * 0.25
    ).toFixed(3)}`
  );
  console.log(
    `  SSL (20%): ${ssl_risk.toFixed(3)} * 0.20 = ${(ssl_risk * 0.2).toFixed(
      3
    )}`
  );
  console.log(
    `  WHOIS (15%): ${whois_risk.toFixed(3)} * 0.15 = ${(
      whois_risk * 0.15
    ).toFixed(3)}`
  );
  console.log(`  📊 Base Risk: ${baseRisk.toFixed(3)}`);

  return baseRisk;
};

// ─── STEP 2: NONLINEAR PATTERN-BASED BOOSTS ──────────────────────────────

/**
 * Apply intelligent risk boosts based on dangerous patterns
 * Returns: { boost, explanations }
 */
const calculateRiskBoosts = (
  xgboost_score,
  typosquatting_score,
  ssl_risk,
  whois_risk
) => {
  let boost = 0;
  const explanations = [];

  console.log(`\n[RISK-ENGINE] Pattern-Based Boost Analysis:`);

  // ✅ PATTERN 1: Typosquatting + Weak SSL = Brand Hijack Attack
  if (typosquatting_score > 0.85 && ssl_risk > 0.6) {
    boost += 0.15;
    explanations.push(
      `🚨 CRITICAL: Typosquatting (${(typosquatting_score * 100).toFixed(
        0
      )}%) + Weak SSL (${(ssl_risk * 100).toFixed(0)}%) → Brand hijack suspected (+15%)`
    );
    console.log(
      `  ✓ Pattern 1 triggered: Typo(${(typosquatting_score * 100).toFixed(
        0
      )}%) + SSL(${(ssl_risk * 100).toFixed(0)}%)`
    );
  }

  // ✅ PATTERN 2: XGBoost Red + Weak SSL = ML + Certificate Manipulation
  if (xgboost_score > 0.75 && ssl_risk > 0.6) {
    boost += 0.1;
    explanations.push(
      `🚨 HIGH: ML Model High Risk (${(xgboost_score * 100).toFixed(
        0
      )}%) + Weak SSL (${(ssl_risk * 100).toFixed(0)}%) → Likely phishing (+10%)`
    );
    console.log(
      `  ✓ Pattern 2 triggered: XGB(${(xgboost_score * 100).toFixed(
        0
      )}%) + SSL(${(ssl_risk * 100).toFixed(0)}%)`
    );
  }

  // ✅ PATTERN 3: Triple Threat = All major signals firing
  if (xgboost_score > 0.6 && typosquatting_score > 0.6 && ssl_risk > 0.4) {
    boost += 0.15;
    explanations.push(
      `🚨 CRITICAL: Triple threat detected - XGB(${(xgboost_score * 100).toFixed(
        0
      )}%) + Typo(${(typosquatting_score * 100).toFixed(
        0
      )}%) + SSL(${(ssl_risk * 100).toFixed(0)}%) → Coordinated attack (+15%)`
    );
    console.log(
      `  ✓ Pattern 3 triggered: XGB(${(xgboost_score * 100).toFixed(
        0
      )}%) + Typo(${(typosquatting_score * 100).toFixed(
        0
      )}%) + SSL(${(ssl_risk * 100).toFixed(0)}%)`
    );
  }

  return { boost, explanations };
};

// ─── STEP 3: SAFETY DAMPENING ────────────────────────────────────────────

/**
 * Reduce false positives for legitimate-looking sites
 * Returns: { dampening, explanations }
 */
const calculateSafetyDampening = (
  xgboost_score,
  typosquatting_score,
  ssl_risk,
  whois_risk
) => {
  let dampening = 0;
  const explanations = [];

  console.log(`\n[RISK-ENGINE] Safety Dampening Analysis:`);

  // ✅ SAFETY CHECK: All signals are green
  if (
    ssl_risk < 0.2 &&
    whois_risk < 0.2 &&
    xgboost_score < 0.4 &&
    typosquatting_score < 0.3
  ) {
    dampening -= 0.1;
    explanations.push(
      `✅ LEGITIMATE: All signals green - SSL(${(ssl_risk * 100).toFixed(
        0
      )}%) + WHOIS(${(whois_risk * 100).toFixed(0)}%) + XGB(${(
        xgboost_score * 100
      ).toFixed(0)}%) + Typo(${(typosquatting_score * 100).toFixed(
        0
      )}%) → Likely safe (-10%)`
    );
    console.log(`  ✓ Safety dampening applied: All low-risk signals`);
  }

  return { dampening, explanations };
};

// ─── STEP 4: FINAL RISK CALCULATION ──────────────────────────────────────

/**
 * Compute final risk score (0-1) with all adjustments
 * Returns: { final_risk_0_1, boosts_applied, dampening_applied }
 */
const computeFinalRisk = (baseRisk, boost, dampening) => {
  let finalRisk = baseRisk + boost + dampening;

  // Clamp to 0-1 range
  finalRisk = Math.max(0, Math.min(1, finalRisk));

  console.log(`\n[RISK-ENGINE] Final Risk Calculation:`);
  console.log(`  Base Risk: ${baseRisk.toFixed(3)}`);
  console.log(`  + Boost: ${boost.toFixed(3)}`);
  console.log(`  + Dampening: ${dampening.toFixed(3)}`);
  console.log(`  = Final Risk (0-1): ${finalRisk.toFixed(3)}`);
  console.log(`  = Final Risk (0-100): ${(finalRisk * 100).toFixed(1)}%`);

  return {
    final_risk_0_1: finalRisk,
    final_risk_0_100: finalRisk * 100,
    boosts_applied: boost,
    dampening_applied: dampening,
  };
};

// ─── STEP 5: RISK LEVEL CLASSIFICATION ──────────────────────────────────

/**
 * Map 0-100 risk score to risk levels
 * 0-24: Safe
 * 25-54: Suspicious
 * 55-74: High Risk
 * 75-100: Very Dangerous
 */
const classifyRiskLevel = (finalRisk0_100) => {
  const score = Math.round(finalRisk0_100);

  let level, color, icon;

  if (score <= 24) {
    level = "Safe";
    color = "green";
    icon = "✅";
  } else if (score <= 54) {
    level = "Suspicious";
    color = "yellow";
    icon = "⚠️";
  } else if (score <= 74) {
    level = "High Risk";
    color = "orange";
    icon = "🚨";
  } else {
    level = "Very Dangerous";
    color = "red";
    icon = "🚫";
  }

  console.log(`\n[RISK-ENGINE] Risk Classification:`);
  console.log(`  ${icon} Level: ${level} (${score}%)`);
  console.log(`  🎨 Color: ${color}`);

  return { level, color, icon };
};

// ─── MAIN ENGINE: COMPUTE PHISHING RISK SCORE ────────────────────────────

/**
 * ✅ MAIN PHISHING RISK SCORING ENGINE
 *
 * Input:
 *   - xgboost_score: ML model risk (0-1)
 *   - typosquatting_score: Brand similarity (0-1)
 *   - ssl_risk_score: SSL certificate risk (0-1)
 *   - whois_risk_score: Domain registration risk (0-1)
 *
 * Output: {
 *   final_risk_score: 0-100,
 *   risk_level: "Safe" | "Suspicious" | "High Risk" | "Very Dangerous",
 *   risk_color: "green" | "yellow" | "orange" | "red",
 *   raw_data: { base_risk, boosts, dampening, ... },
 *   explanation: [ "Pattern 1 triggered...", ... ]
 * }
 */
export const computePhishingRiskScore = ({
  xgboost_score = 0,
  typosquatting_score = 0,
  ssl_risk_score = 0,
  whois_risk_score = 0,
} = {}) => {
  console.log(`\n${"═".repeat(80)}`);
  console.log(`[RISK-ENGINE] 🎯 PHISHING RISK SCORING ENGINE`);
  console.log(`${"═".repeat(80)}`);

  // ─── STEP 1: Validate & Normalize Inputs ──────────────────────────

  console.log(`\n[RISK-ENGINE] Step 1: Input Validation & Normalization`);
  const inputs = validateInputs(
    xgboost_score,
    typosquatting_score,
    ssl_risk_score,
    whois_risk_score
  );

  console.log(`  ✓ XGBoost Score: ${inputs.xgboost_score.toFixed(3)} (0-1)`);
  console.log(
    `  ✓ Typosquatting Score: ${inputs.typosquatting_score.toFixed(3)} (0-1)`
  );
  console.log(`  ✓ SSL Risk Score: ${inputs.ssl_risk.toFixed(3)} (0-1)`);
  console.log(`  ✓ WHOIS Risk Score: ${inputs.whois_risk.toFixed(3)} (0-1)`);

  // ─── STEP 2: Calculate Base Risk ──────────────────────────────────

  console.log(`\n[RISK-ENGINE] Step 2: Base Weighted Risk Calculation`);
  const baseRisk = calculateBaseRisk(
    inputs.xgboost_score,
    inputs.typosquatting_score,
    inputs.ssl_risk,
    inputs.whois_risk
  );

  // ─── STEP 3: Apply Pattern-Based Boosts ──────────────────────────

  console.log(`\n[RISK-ENGINE] Step 3: Pattern-Based Risk Boosts`);
  const { boost, explanations: boostExplanations } = calculateRiskBoosts(
    inputs.xgboost_score,
    inputs.typosquatting_score,
    inputs.ssl_risk,
    inputs.whois_risk
  );

  if (boost === 0) {
    console.log(`  ℹ️ No patterns triggered, boost = 0`);
  } else {
    console.log(`  ✓ Total Boost: +${boost.toFixed(3)}`);
  }

  // ─── STEP 4: Apply Safety Dampening ──────────────────────────────

  console.log(`\n[RISK-ENGINE] Step 4: Safety Dampening (False Positive Control)`);
  const { dampening, explanations: dampeningExplanations } =
    calculateSafetyDampening(
      inputs.xgboost_score,
      inputs.typosquatting_score,
      inputs.ssl_risk,
      inputs.whois_risk
    );

  if (dampening === 0) {
    console.log(`  ℹ️ No safety conditions met, dampening = 0`);
  } else {
    console.log(`  ✓ Total Dampening: ${dampening.toFixed(3)}`);
  }

  // ─── STEP 5: Compute Final Risk ──────────────────────────────────

  console.log(`\n[RISK-ENGINE] Step 5: Final Risk Calculation`);
  const {
    final_risk_0_1,
    final_risk_0_100,
    boosts_applied,
    dampening_applied,
  } = computeFinalRisk(baseRisk, boost, dampening);

  // ─── STEP 6: Risk Level Classification ───────────────────────────

  console.log(`\n[RISK-ENGINE] Step 6: Risk Level Classification`);
  const { level: risk_level, color: risk_color, icon } =
    classifyRiskLevel(final_risk_0_100);

  // ─── Combine All Explanations ───────────────────────────────────

  const allExplanations = [
    `📊 Base Risk Score: ${(baseRisk * 100).toFixed(1)}%`,
    `  └─ XGB: ${inputs.xgboost_score.toFixed(3)} (40%) | Typo: ${inputs.typosquatting_score.toFixed(
      3
    )} (25%) | SSL: ${inputs.ssl_risk.toFixed(3)} (20%) | WHOIS: ${inputs.whois_risk.toFixed(
      3
    )} (15%)`,
    ...boostExplanations,
    ...dampeningExplanations,
    `\n${icon} Final Risk Score: ${final_risk_0_100.toFixed(1)}% → ${risk_level}`,
  ];

  console.log(`\n${"═".repeat(80)}`);
  console.log(`[RISK-ENGINE] ✅ SCORING COMPLETE`);
  console.log(`${"═".repeat(80)}\n`);

  // ─── Return Complete Result ─────────────────────────────────────

  return {
    // Final Risk Scores
    final_risk_score: Math.round(final_risk_0_100),
    final_risk_score_decimal: final_risk_0_100,

    // Classification
    risk_level,
    risk_color,
    risk_icon: icon,

    // Detailed Breakdown
    raw_data: {
      inputs: {
        xgboost_score: inputs.xgboost_score,
        typosquatting_score: inputs.typosquatting_score,
        ssl_risk: inputs.ssl_risk,
        whois_risk: inputs.whois_risk,
      },
      base_risk: baseRisk,
      boosts_applied,
      dampening_applied,
      final_risk_0_1,
      final_risk_0_100,
    },

    // Human-Readable Explanations
    explanation: allExplanations,

    // Metadata
    timestamp: new Date(),
    engine_version: "2.0",
  };
};

// ─── UTILITY: Create Risk Report ────────────────────────────────────────

/**
 * Generate a formatted risk report for UI/API response
 */
export const generateRiskReport = (riskScore) => {
  const {
    final_risk_score,
    risk_level,
    risk_color,
    risk_icon,
    raw_data,
    explanation,
  } = riskScore;

  return {
    score: final_risk_score,
    level: risk_level,
    color: risk_color,
    icon: risk_icon,
    report: {
      summary: `This URL has a ${risk_level} phishing risk score of ${final_risk_score}%.`,
      breakdown: {
        xgboost: `${(raw_data.inputs.xgboost_score * 100).toFixed(1)}%`,
        typosquatting: `${(raw_data.inputs.typosquatting_score * 100).toFixed(
          1
        )}%`,
        ssl: `${(raw_data.inputs.ssl_risk * 100).toFixed(1)}%`,
        whois: `${(raw_data.inputs.whois_risk * 100).toFixed(1)}%`,
      },
      adjustments: {
        boosts: `${(raw_data.boosts_applied * 100).toFixed(1)}%`,
        dampening: `${(raw_data.dampening_applied * 100).toFixed(1)}%`,
      },
      details: explanation,
    },
  };
};

// ─── Default Export ──────────────────────────────────────────────────────

export default {
  computePhishingRiskScore,
  generateRiskReport,
  normalizeScore,
  normalizeAllScores,
};