import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      // ✅ REMOVED: subscriptionSchema.index({ userId: 1 }) is not needed
      // because unique: true automatically creates an index
    },
    plan: {
      type: String,
      enum: ["Free", "Pro", "Premium", "Enterprise"],
      default: "Free",
    },
    monthly_scan_limit: {
      type: Number,
      required: true,
    },
    scans_used: {
      type: Number,
      default: 0,
    },
    features: {
      url_scanning: { type: Boolean, default: true },
      email_scanning: { type: Boolean, default: false },
      advanced_analytics: { type: Boolean, default: false },
      api_access: { type: Boolean, default: false },
      priority_support: { type: Boolean, default: false },
      bulk_scanning: { type: Boolean, default: false },
      custom_reports: { type: Boolean, default: false },
      threat_intelligence: { type: Boolean, default: false },
    },
    price_per_month: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive", "Suspended"],
      default: "Active",
    },
    payment_method: {
      type: String,
      enum: ["Card", "PayPal", "Bank Transfer"],
    },
    payment_id: String,
    auto_renew: {
      type: Boolean,
      default: true,
    },
    billing_cycle_start: Date,
    billing_cycle_end: Date,
    next_renewal_date: Date,
    cancellation_date: Date,
  },
  { timestamps: true },
);

// ─────────────────────────────────────────────────────────────
// INDEXES - NO DUPLICATES
// ─────────────────────────────────────────────────────────────

// ✅ REMOVED: subscriptionSchema.index({ userId: 1 });
// Reason: userId has unique: true which auto-creates index

// ✅ Keep these indexes
subscriptionSchema.index({ plan: 1 });
subscriptionSchema.index({ status: 1 });

// ✅ Add compound indexes for common queries
subscriptionSchema.index({ userId: 1, status: 1 });
subscriptionSchema.index({ plan: 1, status: 1 });
subscriptionSchema.index({ status: 1, createdAt: -1 });
subscriptionSchema.index({ next_renewal_date: 1 });
subscriptionSchema.index({ auto_renew: 1, status: 1 });
subscriptionSchema.index({ billing_cycle_end: 1 });

const Subscription = mongoose.model("Subscription", subscriptionSchema);
export default Subscription;