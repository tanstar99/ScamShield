import tls from "tls";
import { URL } from "url";

const EMPTY_SSL = {
  cert_age_days: null,
  cert_days_remaining: null,
  is_self_signed: false,
  issuer_name: "Unknown",
  subject_common_name: "Unknown",
  fingerprint: null,
  tls_version: "Unknown",
  valid_from: null,
  valid_to: null,
};

/**
 * Robust self-signed detection.
 * Uses certificate chain first, then issuer/subject fallback.
 */
const isSelfSignedCertificate = (cert) => {
  if (!cert || Object.keys(cert).length === 0) return false;

  // Chain-based check (most reliable with getPeerCertificate(true))
  if (cert.issuerCertificate) {
    const issuerFp = cert.issuerCertificate.fingerprint256 || cert.issuerCertificate.fingerprint;
    const certFp = cert.fingerprint256 || cert.fingerprint;

    // If cert points to itself in chain, it's self-signed
    if (issuerFp && certFp && issuerFp === certFp) return true;
  }

  // Fallback: issuer and subject exactly same
  const issuer = cert.issuer || {};
  const subject = cert.subject || {};
  const sameCN = (issuer.CN || "") === (subject.CN || "");
  const sameO = (issuer.O || "") === (subject.O || "");
  const sameC = (issuer.C || "") === (subject.C || "");

  return sameCN && sameO && sameC && (sameCN || sameO || sameC);
};

/**
 * Get SSL certificate data from live HTTPS URL
 * ✅ FIXED: Returns consistent shape with domain_exists flag
 */
export const getSSLData = (targetUrl) =>
  new Promise((resolve) => {
    const startTime = Date.now();

    const done = (success, error = null, ssl_data = EMPTY_SSL, domain_exists = false) =>
      resolve({
        success,
        error,
        ssl_data,
        domain_exists, // ✅ NEW: Flag to indicate if domain exists
        lookup_time_ms: Date.now() - startTime,
      });

    try {
      const urlObj = new URL(targetUrl);

      if (urlObj.protocol !== "https:") {
        return done(true, null, {
          ...EMPTY_SSL,
          is_self_signed: false,
          tls_version: "No TLS (HTTP)",
        }, false);
      }

      const hostname = urlObj.hostname;

      const socket = tls.connect(
        {
          host: hostname,
          port: 443,
          servername: hostname, // SNI
          rejectUnauthorized: false,
        },
        () => {
          try {
            const cert = socket.getPeerCertificate(true);

            if (!cert || Object.keys(cert).length === 0) {
              socket.end();
              return done(false, "No certificate found", {
                ...EMPTY_SSL,
                is_self_signed: true,
              }, false); // ✅ Domain doesn't exist
            }

            const now = new Date();
            const validFrom = cert.valid_from ? new Date(cert.valid_from) : null;
            const validTo = cert.valid_to ? new Date(cert.valid_to) : null;

            const certAgeDays =
              validFrom && !Number.isNaN(validFrom.getTime())
                ? Math.max(0, Math.floor((now - validFrom) / (1000 * 60 * 60 * 24)))
                : null;

            const certDaysRemaining =
              validTo && !Number.isNaN(validTo.getTime())
                ? Math.floor((validTo - now) / (1000 * 60 * 60 * 24))
                : null;

            const isSelfSigned = isSelfSignedCertificate(cert);
            const issuerName = cert.issuer?.O || cert.issuer?.CN || cert.issuer?.C || "Unknown";
            const subjectCN = cert.subject?.CN || "Unknown";
            const tlsVersion = socket.getProtocol() || "Unknown";

            const ssl_data = {
              cert_age_days: certAgeDays,
              cert_days_remaining: certDaysRemaining,
              is_self_signed: isSelfSigned,
              issuer_name: issuerName,
              subject_common_name: subjectCN,
              fingerprint: cert.fingerprint256 || cert.fingerprint || null,
              tls_version: tlsVersion,
              valid_from: validFrom,
              valid_to: validTo,
            };

            socket.end();
            console.log(`[SSL] ✅ Certificate data retrieved for ${ssl_data}`);
            return done(true, null, ssl_data, true); // ✅ Domain exists
          } catch (err) {
            socket.end();
            return done(false, err.message, {
              ...EMPTY_SSL,
              is_self_signed: true,
            }, false); // ✅ Domain doesn't exist
          }
        }
      );

      socket.setTimeout(7000, () => {
        socket.destroy();
        return done(false, "Certificate fetch timeout", {
          ...EMPTY_SSL,
          is_self_signed: true,
        }, false); // ✅ Domain doesn't exist
      });

      socket.on("error", (err) => {
        console.log(`[SSL] ✅ Error connecting to domain (likely doesn't exist): ${err.message}`);
        return done(false, err.message, {
          ...EMPTY_SSL,
          is_self_signed: true,
        }, false); // ✅ Domain doesn't exist
      });
    } catch (err) {
      return done(false, err.message, {
        ...EMPTY_SSL,
        is_self_signed: true,
      }, false); // ✅ Domain doesn't exist
    }
  });

/**
 * SSL risk score (0-1)
 */
export const computeSSLRiskScore = (sslData = {}) => {
  const reasons = [];

  if (!sslData || typeof sslData !== "object") {
    reasons.push("SSL certificate data unavailable");
    return { score: 0.2, reasons };
  }

  const cert_age_days = Number.isFinite(Number(sslData.cert_age_days))
    ? Number(sslData.cert_age_days)
    : null;
  const cert_days_remaining = Number.isFinite(Number(sslData.cert_days_remaining))
    ? Number(sslData.cert_days_remaining)
    : null;

  const is_self_signed = Boolean(sslData.is_self_signed);
  const issuer_name = (sslData.issuer_name || "Unknown").toLowerCase();

  // Low base risk (SSL alone should not over-penalize)
  let score = 0.02;

  const trustedIssuers = [
    "digicert",
    "google trust",
    "let's encrypt",
    "sectigo",
    "globalsign",
    "amazon",
    "cloudflare",
    "comodoca",
  ];

  const isTrustedIssuer = trustedIssuers.some((t) => issuer_name.includes(t));

  // 1) Self-signed = primary strong signal
  if (is_self_signed) {
    score += 0.45;
    reasons.push("Self-signed SSL certificate detected");
  }

  // 2) Certificate age logic (relaxed)
  // 8–35 days is normal for many production certs -> no penalty
  if (cert_age_days !== null && cert_age_days >= 0 && cert_age_days < 3) {
    score += 0.08;
    reasons.push(`SSL certificate extremely new (${cert_age_days} days old)`);
  } else if (cert_age_days !== null && cert_age_days < 7) {
    score += 0.04;
    reasons.push(`SSL certificate very new (${cert_age_days} days old)`);
  }

  // 3) Expiry logic (strong only when very close/expired)
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

  // 4) Unknown issuer
  if (!isTrustedIssuer && issuer_name === "unknown") {
    score += 0.08;
    reasons.push("SSL certificate issuer unknown");
  }

  // 5) Trusted issuer small discount (if not self-signed)
  if (!is_self_signed && isTrustedIssuer) {
    score -= 0.03;
  }

  return { score: Math.max(0, Math.min(1, score)), reasons };
};