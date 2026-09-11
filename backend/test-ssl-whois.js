import dotenv from "dotenv";
dotenv.config();

import { getSSLData } from "./utils/ssl.js";
import {
  fetchWhoisData,
  calculateDomainAge,
  isDomainExpiringSoon,
} from "./utils/whois.js";

// Test URLs
const testUrls = [
  "https://google.com",
  "https://github.com",
  "https://amazon.com",
  "https://facebook.com",
  "https://shaadi.com",
  "https://linkedin.com",
];

// Test domains
const testDomains = [
  "google.com",
  "github.com",
  "amazon.com",
  "facebook.com",
  "shaadi.com",
  "linkedin.com",
  "example.com",
  "nonexistentdomain12345.com",
];

const runTests = async () => {
  console.log("\n" + "═".repeat(70));
  console.log("🔍 TESTING SSL & WHOIS + RDAP FUNCTIONALITY");
  console.log("═".repeat(70) + "\n");

  // ─── Test SSL ───
  console.log("📋 TESTING SSL CERTIFICATES");
  console.log("─".repeat(70) + "\n");

  for (const url of testUrls) {
    console.log(`🔗 Testing: ${url}`);
    try {
      const result = await getSSLData(url);
      console.log(`✅ SSL Status:`, result.success ? "SUCCESS" : "FAILED");
      if (result.success) {
        console.log(`  • Issuer: ${result.ssl_data.issuer_name}`);
        console.log(`  • TLS: ${result.ssl_data.tls_version}`);
        console.log(`  • Age: ${result.ssl_data.cert_age_days} days`);
        console.log(`  • Remaining: ${result.ssl_data.cert_days_remaining} days`);
      }
      console.log(`⏱️  Lookup Time: ${result.lookup_time_ms}ms\n`);
    } catch (error) {
      console.error(`❌ Error:`, error.message + "\n");
    }
  }

  // ─── Test WHOIS + RDAP ───
  console.log("\n" + "═".repeat(70));
  console.log("📋 TESTING WHOIS + RDAP DATA");
  console.log("─".repeat(70) + "\n");

  for (const domain of testDomains) {
    console.log(`🌐 Testing: ${domain}`);
    try {
      const result = await fetchWhoisData(domain);
      console.log(
        `✅ WHOIS Status:`,
        result.success ? "SUCCESS" : "FAILED"
      );

      if (result.success) {
        const data = result.data;
        console.log(`  • Domain: ${data.domain_name}`);
        console.log(`  • Registrar: ${data.registrar_name || "N/A"}`);
        console.log(`  • Created: ${data.creation_date || "N/A"}`);
        console.log(`  • Expires: ${data.expiration_date || "N/A"}`);
        console.log(
          `  • Age Days: ${calculateDomainAge(data.creation_date) || "N/A"}`
        );
        console.log(
          `  • Privacy: ${data.registrant_privacy ? "✅ Enabled" : "❌ Disabled"}`
        );
        console.log(
          `  • Expiring Soon: ${isDomainExpiringSoon(data.expiration_date) ? "⚠️ Yes" : "✅ No"}`
        );
      } else {
        console.log(`  ❌ Error: ${result.error}`);
      }
      console.log(`⏱️  Lookup Time: ${result.data.whois_lookup_time_ms}ms\n`);
    } catch (error) {
      console.error(`❌ Error:`, error.message + "\n");
    }
  }

  console.log("═".repeat(70));
  console.log("✅ TESTING COMPLETE");
  console.log("═".repeat(70) + "\n");

  process.exit(0);
};

runTests().catch((error) => {
  console.error("Fatal Error:", error);
  process.exit(1);
});