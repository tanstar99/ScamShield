const tabRisk = {}; // ✅ ADD THIS LINE - Declare storage object

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!sender || !sender.tab || !sender.tab.id) {
        console.warn("No sender.tab available for message:", message.type);
    }

    if (message.type === "URL_DATA") {
        if (!sender || !sender.tab || !sender.tab.id) return;
        
        fetch("http://localhost:8901/api/scan/url-no-auth", {  // ✅ ALSO: Change port to 5000
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(message.payload)
        })
        .then(res => res.json())
        .then(data => {
            console.log("Risk Data received from backend:", data);
            if (data.success && data.data) {
                // Store scan result
                tabRisk[sender.tab.id] = data.data;
                
                const riskScore = data.data.final_risk_score;
                const riskLevel = data.data.risk_level;
                
                if (riskLevel === "High Risk" || riskLevel === "Critical" || riskScore >= 70) {
                    chrome.tabs.sendMessage(sender.tab.id, {
                        type: "SHOW_WARNING",
                        riskData: data.data
                    });
                } else {
                    chrome.tabs.sendMessage(sender.tab.id, {
                        type: "SAFE_URL",
                        riskData: data.data
                    });
                }
            }
        })
        .catch(err => console.error("Error communicating with backend:", err));
    } 
    else if (message.type === "GET_RISK_SCORE") {
        const tabId = message.tabId || (sender && sender.tab && sender.tab.id);
        const data = tabRisk[tabId];
        sendResponse({ 
            score: data ? data.final_risk_score : null, 
            riskData: data || null 
        });
    } 
    else if (message.type === "CLOSE_TAB") {
        if (sender && sender.tab && sender.tab.id) {
            chrome.tabs.remove(sender.tab.id);
        }
    }
});

// Cleanup when tabs are closed
chrome.tabs.onRemoved.addListener(tabId => {
    delete tabRisk[tabId];
});