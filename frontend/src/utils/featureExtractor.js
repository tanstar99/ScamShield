/**
 * ✅ SIMPLE Frontend Feature Extractor
 * Extracts ONLY 14 XGBoost features from URL
 * Everything else (SSL, WHOIS, NLP, etc.) is done by backend
 */

export class FeatureExtractor {
  constructor(url) {
    this.url = url;
    this.domain = this.extractDomain();
  }

  extractDomain() {
    try {
      const urlObj = new URL(this.url);
      return urlObj.hostname || "";
    } catch {
      return "";
    }
  }

  // ✅ FEATURE 1: URL Length
  getUrlLength() {
    const len = this.url.length;
    if (len < 54) return 0;
    if (len <= 75) return 1;
    return 2;
  }

  // ✅ FEATURE 2: Hostname Length
  getHostnameLength() {
    return this.domain ? this.domain.length : 0;
  }

  // ✅ FEATURE 3: Count Dots
  getCountDot() {
    return (this.url.match(/\./g) || []).length;
  }

  // ✅ FEATURE 4: Count Hyphens
  getCountHyphen() {
    return (this.url.match(/-/g) || []).length;
  }

  // ✅ FEATURE 5: Count @ Symbol
  getCountAt() {
    return (this.url.match(/@/g) || []).length;
  }

  // ✅ FEATURE 6: Count Question Marks
  getCountQuestion() {
    return (this.url.match(/\?/g) || []).length;
  }

  // ✅ FEATURE 7: Count Percent Signs
  getCountPercent() {
    return (this.url.match(/%/g) || []).length;
  }

  // ✅ FEATURE 8: Count Digits
  getCountDigits() {
    return (this.url.match(/\d/g) || []).length;
  }

  // ✅ FEATURE 9: Subdomain Depth
  getSubdomainDepth() {
    if (!this.domain) return 0;
    return this.domain.split(".").length - 1;
  }

  // ✅ FEATURE 10: Is HTTPS
  getIsHttps() {
    return this.url.startsWith("https://") ? 1 : 0;
  }

  // ✅ FEATURE 11: Has IP Address
  getHasIp() {
    try {
      const ipPattern =
        /^(https?:\/\/)?(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])/;
      return ipPattern.test(this.url) ? 1 : 0;
    } catch {
      return 0;
    }
  }

  // ✅ FEATURE 12: Indian Keyword Count
  getIndianKeywordCount() {
    const keywords = [
      "sbi", "hdfc", "icici", "axis", "rbi",
      "paytm", "phonepe", "gpay", "bank", "kyc",
    ];
    const urlLower = this.url.toLowerCase();
    let count = 0;
    keywords.forEach((keyword) => {
      if (urlLower.includes(keyword)) count++;
    });
    return count;
  }

  // ✅ FEATURE 13: Is Urgent Banking
  getIsUrgentBanking() {
    const keywords = [
      "urgent", "verify", "confirm", "update",
      "suspended", "blocked", "kyc",
    ];
    const urlLower = this.url.toLowerCase();
    return keywords.some((kw) => urlLower.includes(kw)) ? 1 : 0;
  }

  // ✅ FEATURE 14: Is Govt Spoof
  getIsGovtSpoof() {
    const keywords = [
      "income-tax", "incometax", "aadhar", "government",
      "ministry", "portal", "gov.in",
    ];
    const urlLower = this.url.toLowerCase();
    return keywords.some((kw) => urlLower.includes(kw)) ? 1 : 0;
  }

  /**
   * Build all 14 features object
   */
  extract() {
    return {
      url_len: this.getUrlLength(),
      hostname_len: this.getHostnameLength(),
      count_dot: this.getCountDot(),
      count_hyphen: this.getCountHyphen(),
      count_at: this.getCountAt(),
      count_question: this.getCountQuestion(),
      count_percent: this.getCountPercent(),
      count_digits: this.getCountDigits(),
      subdomain_depth: this.getSubdomainDepth(),
      is_https: this.getIsHttps(),
      has_ip: this.getHasIp(),
      indian_keyword_count: this.getIndianKeywordCount(),
      is_urgent_banking: this.getIsUrgentBanking(),
      is_govt_spoof: this.getIsGovtSpoof(),
    };
  }

  /**
   * Get debug info
   */
  getDebugInfo() {
    const features = this.extract();
    return {
      url: this.url,
      domain: this.domain,
      features: features,
      total_features: 14,
    };
  }
}

export default FeatureExtractor;