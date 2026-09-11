import { URL } from "url";

/**
 * ✅ Backend Feature Extractor
 * Extracts all 14 XGBoost features from URL in CORRECT ORDER
 * Must match model training sequence exactly
 */
export class FeatureExtractor {
  constructor(url) {
    this.url = url;
    this.domain = this.extractDomain();
  }

  /**
   * Extract base domain from URL (without www and protocol)
   */
  extractDomain() {
    try {
      const urlObj = new URL(this.url);
      let domain = urlObj.hostname;
      if (domain && domain.startsWith("www.")) {
        domain = domain.replace("www.", "");
      }
      return domain || null;
    } catch {
      return null;
    }
  }

  /**
   * ✅ FEATURE 0: URL Length
   * Returns actual length of URL string
   */
  getUrlLength() {
    return this.url.length;
  }

  /**
   * ✅ FEATURE 1: Hostname Length
   * Returns actual length of domain
   */
  getHostnameLength() {
    return this.domain ? this.domain.length : 0;
  }

  /**
   * ✅ FEATURE 2: Count Dots in URL
   */
  getCountDot() {
    return (this.url.match(/\./g) || []).length;
  }

  /**
   * ✅ FEATURE 3: Count Hyphens in URL
   */
  getCountHyphen() {
    return (this.url.match(/\-/g) || []).length;
  }

  /**
   * ✅ FEATURE 4: Count @ Symbol
   */
  getCountAt() {
    return (this.url.match(/@/g) || []).length;
  }

  /**
   * ✅ FEATURE 5: Count ? (Query Parameters)
   */
  getCountQuestion() {
    return (this.url.match(/\?/g) || []).length;
  }

  /**
   * ✅ FEATURE 6: Count % (URL Encoding)
   */
  getCountPercent() {
    return (this.url.match(/%/g) || []).length;
  }

  /**
   * ✅ FEATURE 7: Count Digits in URL
   */
  getCountDigits() {
    return (this.url.match(/\d/g) || []).length;
  }

  /**
   * ✅ FEATURE 8: Subdomain Depth
   * ✅ UPDATED: Count dots + 1 (not split method)
   * Example: www.sbi.co.in = 3 dots = depth 4
   */
  getSubdomainDepth() {
    if (!this.domain) return 0;
    return (this.domain.match(/\./g) || []).length + 1;
  }

  /**
   * ✅ FEATURE 9: Is HTTPS (1 or 0)
   */
  getIsHttps() {
    return this.url.startsWith("https://") ? 1 : 0;
  }

  /**
   * ✅ FEATURE 10: Has IP Address (1 or 0)
   */
  getHasIp() {
    try {
      const ipPattern =
        /^(https?:\/\/)?(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])(:[0-9]+)?/;
      return ipPattern.test(this.url) ? 1 : 0;
    } catch {
      return 0;
    }
  }

  /**
   * ✅ FEATURE 11: Count of Indian Keywords
   * ✅ UPDATED: Comprehensive list of Indian banking, payment, govt, telecom keywords
   */
  getIndianKeywordCount() {
    const indianKeywords = [
      "sbi", "hdfc", "icici", "axis", "kotak", "pnb", "bob", "canara", "indusind",
      "rbl", "idfc", "paytm", "phonepe", "gpay", "bhim", "upi", "mobikwik",
      "razorpay", "ccavenue", "billdesk", "kyc", "pan", "aadhaar", "adhar",
      "cibil", "score", "loan", "mudra", "emi", "insurance", "lic", "policybazaar",
      "pmay", "pradhan", "mantri", "yojana", "awaas", "kissan", "ayushman",
      "eshram", "e-shram", "pf", "epfo", "uan", "ration", "subsidy", "dbt",
      "incometax", "itr", "gst", "challan", "parivahan", "vahan", "sarathi",
      "uidai", "digilocker", "passport", "visa", "nrega", "mseb", "mahadiscom", 
      "best", "adhani", "tata", "bses", "uppcl", "pspcl", "bescom", "tsspdcl", 
      "kseb", "tangedco", "jio", "airtel", "vi", "bsnl", "vodafone", "idea", "fiber", 
      "5g", "4g", "indane", "hpgas", "bharatgas", "cylinder", "booking", "muft", "free", 
      "inami", "inam", "jeet", "win", "dhamaka", "offer", "jaldi", "turant", "urgent", 
      "khatra", "blocked", "band", "chalu", "bijli", "bill", "light", "recharge", "vegl", 
      "shulka", "bhet", "khushkhabar", "vij", "bunk", "khata", "paisa", "rupee", "cash", 
      "money", "dhan", "laxmi", "bonus", "gift", "prize", "lottery", "luck", "winner", 
      "job", "naukri", "vacancy", "workfromhome", "wfh", "flipkart", "amazon", "meesho", 
      "myntra", "ajio", "jiomart", "bigbillion", "sale", "diwali", "eid", "christmas", 
      "newyear", "indiapost", "bluedart", "delhivery", "dtdc", "track", "order"
    ];

    const urlLower = this.url.toLowerCase();
    let count = 0;

    indianKeywords.forEach((keyword) => {
      const regex = new RegExp(keyword, "g");
      const matches = urlLower.match(regex) || [];
      count += matches.length;
    });

    return count;
  }

  /**
   * ✅ FEATURE 12: Is Urgent/Banking (1 or 0)
   */
  getIsUrgentBanking() {
    const urgentKeywords = [
      "urgent", "verify", "confirm", "update", "now",
      "immediate", "action", "required", "suspended",
      "blocked", "kyc", "aadhar", "banking", "account",
    ];

    const urlLower = this.url.toLowerCase();
    const hasUrgent = urgentKeywords.some((keyword) =>
      urlLower.includes(keyword)
    );

    return hasUrgent ? 1 : 0;
  }

  /**
   * ✅ FEATURE 13: Is Govt Spoof (1 or 0)
   * ✅ UPDATED: Only flags as spoof if has govt keyword BUT is NOT official .gov or .gov.in domain
   */
  getIsGovtSpoof() {
    const govtKeywords = [
      "income-tax", "incometax", "incomtax", "indiapost",
      "aadhaar", "aadhar", "nta", "cbse", "neet", "jee",
      "government", "ministry", "national", "portal",
      "dopt", "railways", "passport",
    ];

    const urlLower = this.url.toLowerCase();
    const hasGovtKeyword = govtKeywords.some((keyword) =>
      urlLower.includes(keyword)
    );

    // ✅ It's only a spoof if it has a keyword BUT is NOT an official .gov or .gov.in domain
    const isOfficialGovtDomain =
      this.domain &&
      (this.domain.endsWith(".gov.in") || this.domain.endsWith(".gov"));

    return hasGovtKeyword && !isOfficialGovtDomain ? 1 : 0;
  }

  /**
   * ✅ Build 14-element array in EXACT MODEL ORDER
   * 
   * Order must be:
   * [0] url_len
   * [1] hostname_len
   * [2] count_dot
   * [3] count_hyphen
   * [4] count_at
   * [5] count_question
   * [6] count_percent
   * [7] count_digits
   * [8] subdomain_depth
   * [9] is_https
   * [10] has_ip
   * [11] indian_keyword_count
   * [12] is_urgent_banking
   * [13] is_govt_spoof
   */
  buildFeatureArray() {
    const features = [
      this.getUrlLength(),           // [0]
      this.getHostnameLength(),      // [1]
      this.getCountDot(),            // [2]
      this.getCountHyphen(),         // [3]
      this.getCountAt(),             // [4]
      this.getCountQuestion(),       // [5]
      this.getCountPercent(),        // [6]
      this.getCountDigits(),         // [7]
      this.getSubdomainDepth(),      // [8]
      this.getIsHttps(),             // [9]
      this.getHasIp(),               // [10]
      this.getIndianKeywordCount(),  // [11]
      this.getIsUrgentBanking(),     // [12]
      this.getIsGovtSpoof(),         // [13]
    ];

    console.log(`[FEATURES] Array built (14 elements):`);
    console.log(`  [0] URL Length: ${features[0]}`);
    console.log(`  [1] Hostname Length: ${features[1]}`);
    console.log(`  [2] Count Dots: ${features[2]}`);
    console.log(`  [3] Count Hyphens: ${features[3]}`);
    console.log(`  [4] Count @: ${features[4]}`);
    console.log(`  [5] Count ?: ${features[5]}`);
    console.log(`  [6] Count %: ${features[6]}`);
    console.log(`  [7] Count Digits: ${features[7]}`);
    console.log(`  [8] Subdomain Depth: ${features[8]}`);
    console.log(`  [9] Is HTTPS: ${features[9]}`);
    console.log(`  [10] Has IP: ${features[10]}`);
    console.log(`  [11] Indian Keywords: ${features[11]}`);
    console.log(`  [12] Is Urgent Banking: ${features[12]}`);
    console.log(`  [13] Is Govt Spoof: ${features[13]}`);

    return features;
  }

  /**
   * Build features object (also in order)
   */
  buildFeaturesObject() {
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
   * Validate features
   */
  validateFeatures() {
    const features = this.buildFeaturesObject();
    const requiredFields = [
      "url_len", "hostname_len", "count_dot", "count_hyphen",
      "count_at", "count_question", "count_percent", "count_digits",
      "subdomain_depth", "is_https", "has_ip", "indian_keyword_count",
      "is_urgent_banking", "is_govt_spoof",
    ];

    const missing = requiredFields.filter((field) => !(field in features));
    return {
      valid: missing.length === 0,
      missing,
      features,
    };
  }

  /**
   * Get debug info
   */
  getDebugInfo() {
    const features = this.buildFeaturesObject();
    return {
      url: this.url,
      domain: this.domain,
      features,
      feature_array: this.buildFeatureArray(),
      debug: {
        url_length: this.url.length,
        hostname_length: this.domain ? this.domain.length : 0,
        dot_count: this.getCountDot(),
        hyphen_count: this.getCountHyphen(),
        at_count: this.getCountAt(),
        question_count: this.getCountQuestion(),
        percent_count: this.getCountPercent(),
        digit_count: this.getCountDigits(),
        subdomain_count: this.getSubdomainDepth(),
        is_https: this.getIsHttps(),
        has_ip: this.getHasIp(),
        indian_keywords: this.getIndianKeywordCount(),
        urgent_banking: this.getIsUrgentBanking(),
        govt_spoof: this.getIsGovtSpoof(),
      },
    };
  }
}

export default FeatureExtractor;