import axios from "axios";

/**
 * ✅ Fetch domain age using RDAP API (More reliable than WHOIS)
 */
const getDomainAge = async (domain) => {
  try {
    const cleanDomain = domain.replace(/^www\./, "");
    const response = await axios.get(`https://rdap.org/domain/${cleanDomain}`, {
      timeout: 5000,
    });

    const events = response.data.events || [];
    const registrationEvent = events.find(
      (event) => event.eventAction === "registration"
    );

    if (!registrationEvent) return null;

    const creationDate = new Date(registrationEvent.eventDate);
    const now = new Date();
    const ageDays = Math.floor((now - creationDate) / (1000 * 60 * 60 * 24));

    return { creationDate, ageDays };
  } catch (error) {
    console.warn(
      `[RDAP] Error fetching domain age for ${domain}:`,
      error.message
    );
    return null;
  }
};

/**
 * ✅ Fetch WHOIS data using WhoisJSON API + RDAP fallback
 */
export const fetchWhoisData = async (domain) => {
  const startTime = Date.now();

  return new Promise((resolve) => {
    try {
      console.log(`[WHOIS] Fetching WHOIS data for: ${domain}`);

      const cleanDomain = domain.replace(/^www\./, "");

      axios
        .get(`https://whoisjson.com/api/v1/whois`, {
          params: {
            domain: cleanDomain,
          },
          timeout: 10000,
        })
        .then(async (response) => {
          const lookupTime = Date.now() - startTime;

          if (!response.data || response.data.error) {
            console.warn(
              `[WHOIS] No data for ${cleanDomain}:`,
              response.data?.message || "Unknown error"
            );

            // ✅ Fallback to RDAP for domain age
            const rdapData = await getDomainAge(cleanDomain);

            return resolve({
              success: false,
              error: response.data?.message || "No WHOIS data",
              data: {
                domain_name: cleanDomain,
                registrar_name: null,
                registrar_url: null,
                registrar_email: null,
                creation_date: rdapData?.creationDate || null,
                expiration_date: null,
                updated_date: null,
                status: [],
                name_servers: [],
                registrant_country: null,
                registrant_privacy: false,
                admin_email: null,
                tech_email: null,
                org_name: null,
                whois_fetched_at: new Date(),
                whois_lookup_time_ms: lookupTime,
              },
            });
          }

          const whoisData = response.data;

          // ✅ Get domain age from RDAP (more accurate)
          const rdapData = await getDomainAge(cleanDomain);

          const parsed = {
            domain_name: cleanDomain,
            registrar_name:
              whoisData.registrar?.name ||
              whoisData.registrar_name ||
              "Unknown",
            registrar_url: whoisData.registrar?.url || null,
            registrar_email: whoisData.registrar?.email || null,
            creation_date: rdapData?.creationDate
              ? new Date(rdapData.creationDate)
              : whoisData.created_date
              ? new Date(whoisData.created_date)
              : null,
            expiration_date: whoisData.expires_date
              ? new Date(whoisData.expires_date)
              : null,
            updated_date: whoisData.updated_date
              ? new Date(whoisData.updated_date)
              : null,
            status: Array.isArray(whoisData.status)
              ? whoisData.status
              : whoisData.status
              ? [whoisData.status]
              : [],
            name_servers: Array.isArray(whoisData.name_servers)
              ? whoisData.name_servers
              : [],
            registrant_country: whoisData.registrant?.country || null,
            registrant_privacy:
              whoisData.registrant_contact_privacy === true ||
              whoisData.privacy_protection === true ||
              false,
            admin_email: whoisData.admin?.email || null,
            tech_email: whoisData.tech?.email || null,
            org_name: whoisData.registrant?.organization || null,
          };

          console.log(`[WHOIS] ✅ Data fetched for ${cleanDomain}`);

          return resolve({
            success: true,
            data: {
              ...parsed,
              raw_whois: JSON.stringify(whoisData).substring(0, 2000),
              whois_fetched_at: new Date(),
              whois_lookup_time_ms: lookupTime,
            },
          });
        })
        .catch(async (error) => {
          const lookupTime = Date.now() - startTime;
          console.warn(
            `[WHOIS] WhoisJSON failed for ${cleanDomain}, trying RDAP:`,
            error.message
          );

          // ✅ Fallback to RDAP only
          try {
            const rdapData = await getDomainAge(cleanDomain);

            if (rdapData) {
              console.log(
                `[RDAP] ✅ Domain age retrieved for ${cleanDomain}`
              );
              return resolve({
                success: true,
                data: {
                  domain_name: cleanDomain,
                  registrar_name: null,
                  registrar_url: null,
                  registrar_email: null,
                  creation_date: new Date(rdapData.creationDate),
                  expiration_date: null,
                  updated_date: null,
                  status: [],
                  name_servers: [],
                  registrant_country: null,
                  registrant_privacy: false,
                  admin_email: null,
                  tech_email: null,
                  org_name: null,
                  whois_fetched_at: new Date(),
                  whois_lookup_time_ms: lookupTime,
                },
              });
            }
          } catch (rdapError) {
            console.error(`[RDAP] Error:`, rdapError.message);
          }

          return resolve({
            success: false,
            error: error.message,
            data: {
              domain_name: cleanDomain,
              registrar_name: null,
              registrar_url: null,
              registrar_email: null,
              creation_date: null,
              expiration_date: null,
              updated_date: null,
              status: [],
              name_servers: [],
              registrant_country: null,
              registrant_privacy: false,
              admin_email: null,
              tech_email: null,
              org_name: null,
              whois_fetched_at: new Date(),
              whois_lookup_time_ms: lookupTime,
            },
          });
        });
    } catch (error) {
      console.error(`[WHOIS] Catch error for ${domain}:`, error.message);

      resolve({
        success: false,
        error: error.message,
        data: {
          domain_name: domain,
          registrar_name: null,
          registrar_url: null,
          registrar_email: null,
          creation_date: null,
          expiration_date: null,
          updated_date: null,
          status: [],
          name_servers: [],
          registrant_country: null,
          registrant_privacy: false,
          admin_email: null,
          tech_email: null,
          org_name: null,
          whois_fetched_at: new Date(),
          whois_lookup_time_ms: Date.now() - startTime,
        },
      });
    }
  });
};

/**
 * Calculate domain age in days
 */
export const calculateDomainAge = (creationDate) => {
  if (!creationDate) return null;
  try {
    const now = new Date();
    const created = new Date(creationDate);
    const ageMs = now - created;
    const days = Math.floor(ageMs / (1000 * 60 * 60 * 24));
    return days >= 0 ? days : null;
  } catch {
    return null;
  }
};

/**
 * Check if domain expiring soon (within 30 days)
 */
export const isDomainExpiringSoon = (expirationDate) => {
  if (!expirationDate) return false;
  try {
    const now = new Date();
    const thirtyDaysFromNow = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000
    );
    return new Date(expirationDate) < thirtyDaysFromNow;
  } catch {
    return false;
  }
};

/**
 * Check if registrant privacy is enabled
 */
export const hasRegistrantPrivacy = (registrantPrivacy) => {
  return registrantPrivacy === true;
};

/**
 * Check if domain uses suspicious registrar
 */
export const isSuspiciousRegistrar = (registrarName) => {
  const suspiciousRegistrars = [
    "namecheap",
    "domains.com",
    "123-reg",
    "freenom",
    "hostinger",
    "godaddy",
    "easydomains",
    "enom",
  ];

  if (!registrarName) return false;
  return suspiciousRegistrars.some((reg) =>
    registrarName.toLowerCase().includes(reg)
  );
};

/**
 * Calculate WHOIS risk score
 */
export const calculateWhoisRiskScore = (whoisData) => {
  let riskScore = 0.1;
  const reasons = [];

  if (!whoisData || Object.keys(whoisData).length === 0) {
    return { score: 0.5, reasons: ["WHOIS data unavailable"] };
  }

  if (hasRegistrantPrivacy(whoisData.registrant_privacy)) {
    riskScore += 0.2;
    reasons.push("Registrant privacy enabled");
  }

  const domainAge = calculateDomainAge(whoisData.creation_date);
  if (domainAge !== null && domainAge < 7) {
    riskScore += 0.3;
    reasons.push("Domain created less than 7 days ago");
  } else if (domainAge !== null && domainAge < 30) {
    riskScore += 0.15;
    reasons.push("Domain created less than 30 days ago");
  } else if (domainAge !== null && domainAge < 365) {
    riskScore += 0.05;
    reasons.push("Domain created less than 1 year ago");
  }

  if (isDomainExpiringSoon(whoisData.expiration_date)) {
    riskScore += 0.15;
    reasons.push("Domain expiration date within 30 days");
  }

  if (isSuspiciousRegistrar(whoisData.registrar_name)) {
    riskScore += 0.1;
    reasons.push("Domain registered with suspicious registrar");
  }

  return {
    score: Math.min(riskScore, 1),
    reasons,
  };
};

/**
 * Get domain info summary
 */
export const getDomainInfo = async (domain) => {
  const result = await fetchWhoisData(domain);

  if (!result.success) {
    return {
      success: false,
      error: result.error,
    };
  }

  const whoisData = result.data;
  const domainAge = calculateDomainAge(whoisData.creation_date);
  const expiringSoon = isDomainExpiringSoon(whoisData.expiration_date);
  const whoisRisk = calculateWhoisRiskScore(whoisData);

  return {
    success: true,
    data: {
      domain_name: whoisData.domain_name,
      registrar: whoisData.registrar_name,
      created: whoisData.creation_date,
      expires: whoisData.expiration_date,
      updated: whoisData.updated_date,
      age_days: domainAge,
      expiring_soon: expiringSoon,
      privacy_enabled: whoisData.registrant_privacy,
      name_servers: whoisData.name_servers,
      status: whoisData.status,
      risk_score: whoisRisk.score,
      risk_reasons: whoisRisk.reasons,
      lookup_time_ms: whoisData.whois_lookup_time_ms,
    },
  };
};