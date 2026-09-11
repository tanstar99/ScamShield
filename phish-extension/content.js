chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "SHOW_WARNING") {
        displayWarningPage(message.riskData);
    } else if (message.type === "SAFE_URL") {
        console.log("URL is safe:", message.riskData.url);
    }
});

// Helper: safely send message to background
function sendMessageToBackground(message) {
    try {
        chrome.runtime.sendMessage(message, (response) => {
            // Check for errors
            if (chrome.runtime.lastError) {
                console.warn("Message error:", chrome.runtime.lastError.message);
            }
        });
    } catch (e) {
        console.error("Failed to send message:", e);
    }
}

// Send URL for scanning on page load
(function sendUrlForScan() {
    try {
        sendMessageToBackground({ 
            type: "URL_DATA", 
            payload: { url: window.location.href } 
        });
    } catch (e) { 
        console.error("sendUrlForScan:", e); 
    }
})();

// Track SPA navigation (pushState/replaceState)
const _pushState = history.pushState;
history.pushState = function() {
    _pushState.apply(this, arguments);
    sendMessageToBackground({ 
        type: "URL_DATA", 
        payload: { url: window.location.href } 
    });
};

const _replaceState = history.replaceState;
history.replaceState = function() {
    _replaceState.apply(this, arguments);
    sendMessageToBackground({ 
        type: "URL_DATA", 
        payload: { url: window.location.href } 
    });
};

window.addEventListener('popstate', () => {
    sendMessageToBackground({ 
        type: "URL_DATA", 
        payload: { url: window.location.href } 
    });
});

function displayWarningPage(riskData) {
    // Check if overlay already exists
    if (document.getElementById("phish-warning-overlay")) {
        return; // Don't duplicate overlays
    }

    // Create warning overlay
    const overlay = document.createElement("div");
    overlay.id = "phish-warning-overlay";
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 999999;
    `;
    
    const warningBox = document.createElement("div");
    warningBox.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 40px;
        max-width: 600px;
        text-align: center;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
    `;
    
    const riskColor = riskData.risk_color || "red";
    const riskLevel = riskData.risk_level || "Unknown";
    const reasons = riskData.reasons || [];
    
    warningBox.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
        <h1 style="color: #d32f2f; margin: 20px 0; font-size: 28px;">POTENTIAL PHISHING ALERT</h1>
        <p style="color: #666; font-size: 16px; margin: 15px 0;">
            This website appears to be <strong style="color: ${riskColor};">${riskLevel}</strong>
        </p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: left;">
            <p style="color: #333; font-weight: bold; margin: 0 0 10px 0;">Risk Score: <span style="color: ${riskColor}; font-size: 20px;">${riskData.final_risk_score}/100</span></p>
            <p style="color: #666; font-weight: bold; margin: 15px 0 10px 0;">Reasons:</p>
            <ul style="margin: 10px 0; padding-left: 20px; color: #666;">
                ${reasons.map(reason => `<li style="margin: 5px 0;">${reason}</li>`).join('')}
            </ul>
        </div>
        <p style="color: #999; font-size: 14px; margin: 15px 0;">
            URL: <strong style="color: #333; word-break: break-all;">${riskData.url}</strong>
        </p>
        <div style="display: flex; gap: 10px; margin-top: 30px;">
            <button id="phish-back-btn" style="
                flex: 1;
                padding: 12px;
                background: #4CAF50;
                color: white;
                border: none;
                border-radius: 6px;
                font-size: 16px;
                cursor: pointer;
                font-weight: bold;
            ">← Go Back (Safe)</button>
            <button id="phish-continue-btn" style="
                flex: 1;
                padding: 12px;
                background: #d32f2f;
                color: white;
                border: none;
                border-radius: 6px;
                font-size: 16px;
                cursor: pointer;
                font-weight: bold;
            ">Continue at Your Own Risk</button>
        </div>
    `;
    
    overlay.appendChild(warningBox);
    document.body.appendChild(overlay);
    
    // Event listeners with error handling
    try {
        document.getElementById("phish-back-btn").addEventListener("click", () => {
            if (window.history.length > 1) {
                window.history.back();
            } else {
                sendMessageToBackground({ type: "CLOSE_TAB" });
            }
        });
        
        document.getElementById("phish-continue-btn").addEventListener("click", () => {
            overlay.remove();
        });
    } catch (e) {
        console.error("Error setting up button listeners:", e);
    }
}