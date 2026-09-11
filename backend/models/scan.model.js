import mongoose from "mongoose";

const scanSchema = new mongoose.Schema(
  {
    // ─────────────────────────────────────────────────────────────
    // BASIC INFO
    // ─────────────────────────────────────────────────────────────
    userId: {
      type: mongoose.Schema.Types.Mixed,
      ref: "User",
      required: true,
    },

    url: {
      type: String,
      required: true,
      trim: true,
    },

    hostname: {
      type: String,
      required: true,
    },

    normalized_domain: {
      type: String,
    },
     ip_geolocation: {
    ip: String,
    country: String,
    country_code: String,
    city: String,
    region: String,
    latitude: Number,
    longitude: Number,
    isp: String,
    is_proxy: Boolean,
    is_vpn: Boolean,
    is_tor: Boolean,
    is_datacenter: Boolean,
  },
    // ─────────────────────────────────────────────────────────────
    // XGBOOST INPUT FEATURES (STRICT 14 FEATURES)
    // ─────────────────────────────────────────────────────────────
    xgboost_features: {
      url_len: { type: Number, required: true, min: 0 },
      hostname_len: { type: Number, required: true, min: 0 },
      count_dot: { type: Number, required: true, min: 0 },
      count_hyphen: { type: Number, required: true, min: 0 },
      count_at: { type: Number, required: true, min: 0 },
      count_question: { type: Number, required: true, min: 0 },
      count_percent: { type: Number, required: true, min: 0 },
      count_digits: { type: Number, required: true, min: 0 },
      subdomain_depth: { type: Number, required: true, min: 0 },
      is_https: { type: Boolean, required: true },
      has_ip: { type: Boolean, required: true },
      indian_keyword_count: { type: Number, required: true, min: 0 },
      is_urgent_banking: { type: Boolean, required: true },
      is_govt_spoof: { type: Boolean, required: true },
    },

    // ─────────────────────────────────────────────────────────────
    // XGBOOST OUTPUT (0-100 scale)
    // ─────────────────────────────────────────────────────────────
    xgboost_score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    // ─────────────────────────────────────────────────────────────
    // ✅ SSL CERTIFICATE DATA (Only fetched fields)
    // ─────────────────────────────────────────────────────────────
    ssl_data: {
      cert_age_days: { type: Number, min: 0 },
      cert_days_remaining: { type: Number, min: 0 },
      is_self_signed: { type: Boolean, default: false },
      issuer_name: { type: String, default: "Unknown" },
      tls_version: { type: String, default: "Unknown" },
      // ✅ REMOVED: valid_from, valid_to, subject, serial_number, fingerprint
    },

    ssl_score: {
      type: Number,
      min: 0,
      max: 1,
    },

    // ─────────────────────────────────────────────────────────────
    // ✅ DOMAIN AGE & INTELLIGENCE (Only fetched fields)
    // ─────────────────────────────────────────────────────────────
    domain_age_days: {
      type: Number,
      min: 0,
    },

    recent_update_flag: {
      type: Boolean,
      default: false,
    },

    domain_intelligence_score: {
      type: Number,
      min: 0,
      max: 1,
    },

    // ─────────────────────────────────────────────────────────────
    // ✅ WHOIS DATA (LIMITED - Only fetched fields)
    // ─────────────────────────────────────────────────────────────
    whois_data: {
      domain_name: String,
      registrar_name: String,
      creation_date: Date,
      expiration_date: Date,
      updated_date: Date,
      registrant_privacy: {
        type: Boolean,
        default: false,
      },
      // ✅ REMOVED: registrar_url, registrar_email, status, name_servers, registrant_country, admin_email, tech_email, raw_whois
    },

    whois_score: {
      type: Number,
      min: 0,
      max: 1,
    },

    // ─────────────────────────────────────────────────────────────
    // ✅ TYPOSQUATTING INTELLIGENCE (6 FIELDS)
    // ─────────────────────────────────────────────────────────────
    typosquatting: {
      min_edit_distance: {
        type: Number,
        min: 0,
        default: 0,
      },

      closest_brand: {
        type: String,
        default: null,
      },

      similarity_ratio: {
        type: Number,
        min: 0,
        max: 1,
        default: 0,
      },

      char_substitution_flag: {
        type: Number,
        enum: [0, 1],
        default: 0,
      },

      brand_keyword_flag: {
        type: Number,
        enum: [0, 1],
        default: 0,
      },

      typo_risk_score: {
        type: Number,
        min: 0,
        max: 1,
        default: 0,
      },
    },

    typosquatting_score: {
      type: Number,
      min: 0,
      max: 1,
    },

    // ─────────────────────────────────────────────────────────────
    // ✅ FINAL HYBRID RISK OUTPUT (4 EQUAL COMPONENTS @ 25%)
    // ─────────────────────────────────────────────────────────────
    final_risk_score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    risk_level: {
      type: String,
      enum: ["Safe", "Suspicious", "High Risk", "Very Dangerous"],
      required: true,
    },

    risk_color: {
      type: String,
      enum: ["green", "yellow", "orange", "red"],
      required: true,
    },

    reasons: [String],

    // ─────────────────────────────────────────────────────────────
    // USER FEEDBACK & REPORTING
    // ─────────────────────────────────────────────────────────────
    user_reported: {
      type: Boolean,
      default: false,
    },

    report_reason: String,

    user_marked_safe: {
      type: Boolean,
      default: false,
    },

    // ─────────────────────────────────────────────────────────────
    // PERFORMANCE & DEBUGGING
    // ─────────────────────────────────────────────────────────────
    processing_time_ms: Number,

    model_version: {
      type: String,
      default: "v2",
    },
  },
  { timestamps: true }
);

// ─────────────────────────────────────────────────────────────
// DATABASE INDEXES (Performance Optimized)
// ─────────────────────────────────────────────────────────────

scanSchema.index({ userId: 1, createdAt: -1 });
scanSchema.index({ userId: 1, final_risk_score: -1 });
scanSchema.index({ userId: 1, risk_level: 1 });
scanSchema.index({ hostname: 1 });
scanSchema.index({ normalized_domain: 1 });
scanSchema.index({ final_risk_score: -1 });
scanSchema.index({ risk_level: 1 });
scanSchema.index({ createdAt: -1 });
scanSchema.index({ userId: 1, hostname: 1 });
scanSchema.index({ risk_level: 1, createdAt: -1 });

const Scan = mongoose.model("Scan", scanSchema);
export default Scan;