chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (!tabs || !tabs[0]) {
    showEmptyState();
    return;
  }

  const currentTabId = tabs[0].id;
  showScanningState();

  chrome.runtime.sendMessage(
    { type: "GET_RISK_SCORE", tabId: currentTabId },
    (response) => {
      if (chrome.runtime.lastError) {
        console.warn("Message error:", chrome.runtime.lastError.message);
        showEmptyState();
        return;
      }

      if (response && response.riskData) {
        displayRiskData(response.riskData, currentTabId);
      } else {
        showEmptyState();
      }
    },
  );
});

function showScanningState() {
  document.getElementById("scanningState").style.display = "flex";
  document.getElementById("riskContent").style.display = "none";
  document.getElementById("emptyState").style.display = "none";
}

function showRiskContent() {
  document.getElementById("scanningState").style.display = "none";
  document.getElementById("riskContent").style.display = "block";
  document.getElementById("emptyState").style.display = "none";
}

function showEmptyState() {
  document.getElementById("scanningState").style.display = "none";
  document.getElementById("riskContent").style.display = "none";
  document.getElementById("emptyState").style.display = "flex";
}

function displayRiskData(riskData, tabId) {
  const score = riskData.final_risk_score || 0;
  const riskLevel = riskData.risk_level || "Unknown";
  const riskColor = riskData.risk_color || "gray";
  const reasons = riskData.reasons || [];
  const processingTime = riskData.processing_time_ms || 0;
  const modelVersion = riskData.model_version || "v2";

  // Emoji mapping
  const emojis = {
    Safe: "✅",
    Suspicious: "⚠️",
    "High Risk": "🚨",
    "Very Dangerous": "🔴",
    Critical: "🔴",
  };

  // Update risk emoji
  document.getElementById("riskEmoji").textContent = emojis[riskLevel] || "❓";

  // Update risk level with class
  const riskLevelEl = document.getElementById("riskLevel");
  riskLevelEl.textContent = riskLevel;
  riskLevelEl.className = "risk-level";
  if (riskLevel === "Safe") riskLevelEl.classList.add("safe");
  else if (riskLevel === "Suspicious") riskLevelEl.classList.add("suspicious");
  else if (riskLevel === "High Risk") riskLevelEl.classList.add("high-risk");
  else if (riskLevel === "Critical" || riskLevel === "Very Dangerous")
    riskLevelEl.classList.add("critical");

  // Update risk score
  document.getElementById("riskScore").textContent = Math.round(score);

  // Update score circle color
  const scoreCircle = document.getElementById("riskScoreCircle");
  scoreCircle.className = "risk-score-circle";
  if (riskLevel === "Safe") scoreCircle.classList.add("safe");
  else if (riskLevel === "Suspicious") scoreCircle.classList.add("suspicious");
  else if (riskLevel === "High Risk") scoreCircle.classList.add("high-risk");

  // Update gauge indicator
  const gaugeIndicator = document.getElementById("gaugeIndicator");
  gaugeIndicator.style.left = Math.min(100, score) + "%";
  gaugeIndicator.style.background =
    riskColor === "green"
      ? "#51CF66"
      : riskColor === "yellow"
        ? "#FFD93D"
        : riskColor === "orange"
          ? "#FFA500"
          : "#FF1744";

  // Display reasons
  const detailsContainer = document.getElementById("detailsContainer");
  const reasonsList = document.getElementById("reasonsList");
  if (reasons.length > 0) {
    detailsContainer.style.display = "block";
    reasonsList.innerHTML = reasons
      .slice(0, 8)
      .map(
        (reason, idx) => `
                <div class="reason-item">
                    <div class="reason-icon">${reason.includes("🚩") ? "🚩" : reason.includes("⚠️") ? "⚠️" : "🔍"}</div>
                    <div class="reason-text">${reason}</div>
                </div>
            `,
      )
      .join("");

    if (reasons.length > 8) {
      reasonsList.innerHTML += `
                <div class="reason-item" style="border-left-color: #FFD93D;">
                    <div class="reason-icon">📋</div>
                    <div class="reason-text">+ ${reasons.length - 8} more signals detected</div>
                </div>
            `;
    }
  } else {
    detailsContainer.style.display = "none";
  }

  // Display metadata
  document.getElementById("scanTime").textContent = processingTime + "ms";
  document.getElementById("modelVersion").textContent =
    modelVersion + " (4-Component)";

  // Store scan data
  window.currentScanData = { riskData, tabId };

  showRiskContent();
}
