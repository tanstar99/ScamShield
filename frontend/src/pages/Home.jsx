import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  IoShieldCheckmarkOutline,
  IoSearchOutline,
  IoMailOutline,
  IoBarChartOutline,
  IoBookOutline,
  IoCheckmarkCircleOutline,
  IoArrowForwardOutline,
  IoGlobeOutline,
  IoAlertCircleOutline,
  IoWarningOutline,
  IoShieldOutline,
} from "react-icons/io5";
import { ShieldCheck, Zap, BarChart3, ArrowRight, ExternalLink, TrendingUp, Users, Globe } from "lucide-react";

// ── Data ──
const stats = [
  { label: "URLs Scanned",    value: "2.4M+", icon: <Globe size={20} />,       color: "#2563EB", bg: "rgba(37,99,235,0.12)"  },
  { label: "Scams Detected",  value: "184K+", icon: <IoAlertCircleOutline size={20} />, color: "#DC2626", bg: "rgba(220,38,38,0.12)"   },
  { label: "Users Protected", value: "98K+",  icon: <Users size={20} />,        color: "#16A34A", bg: "rgba(22,163,74,0.12)"   },
  { label: "Accuracy Rate",   value: "99.2%", icon: <TrendingUp size={20} />,   color: "#0891B2", bg: "rgba(8,145,178,0.12)"   },
];

const features = [
  {
    icon: <IoShieldCheckmarkOutline size={26} />,
    title: "URL Scanner",
    desc: "Instantly detect phishing, malware, and fraudulent websites before you click.",
    color: "#2563EB", bg: "rgba(37,99,235,0.12)",
    href: "/scan-url", badge: "Most Used", badgeColor: "#2563EB",
  },
  {
    icon: <IoMailOutline size={26} />,
    title: "Email Analyzer",
    desc: "Analyze suspicious emails for social engineering, spoofing, and scam patterns.",
    color: "#0891B2", bg: "rgba(8,145,178,0.12)",
    href: "/scan-email", badge: "New", badgeColor: "#0891B2",
  },
  {
    icon: <IoBarChartOutline size={26} />,
    title: "Threat Reports",
    desc: "In-depth risk reports with severity scores, indicators, and recommended actions.",
    color: "#D97706", bg: "rgba(217,119,6,0.12)",
    href: "/reports", badge: "Detailed", badgeColor: "#D97706",
  },
  {
    icon: <IoBookOutline size={26} />,
    title: "Learn & Educate",
    desc: "Stay ahead with curated guides, scam trends, and awareness resources.",
    color: "#16A34A", bg: "rgba(22,163,74,0.12)",
    href: "/learn", badge: "Free", badgeColor: "#16A34A",
  },
];

const recentThreats = [
  { type: "Phishing", url: "secure-login-verify.net", risk: "High",   time: "2 min ago",  riskColor: "#DC2626", riskBg: "rgba(220,38,38,0.12)"  },
  { type: "Malware",  url: "free-download-pro.xyz",   risk: "High",   time: "8 min ago",  riskColor: "#DC2626", riskBg: "rgba(220,38,38,0.12)"  },
  { type: "Spam",     url: "win-prize-now.click",     risk: "Medium", time: "15 min ago", riskColor: "#D97706", riskBg: "rgba(217,119,6,0.12)"  },
  { type: "Safe",     url: "github.com/openai",       risk: "Safe",   time: "22 min ago", riskColor: "#16A34A", riskBg: "rgba(22,163,74,0.12)"  },
];

const steps = [
  { step: "01", title: "Paste a URL or Email",  desc: "Copy and paste any suspicious link or email content into ScamShield.",             icon: <IoSearchOutline size={22} /> },
  { step: "02", title: "AI Scans Instantly",    desc: "Our engine cross-checks against millions of threat signatures in real time.",       icon: <Zap size={22} />             },
  { step: "03", title: "Get Your Risk Report",  desc: "Receive a detailed breakdown with a risk score and the recommended next action.",   icon: <BarChart3 size={22} />       },
];

const Home = () => {
  const [url, setUrl] = useState("");

  return (
    <div className="min-h-screen bg-[#0B1120] text-white overflow-x-hidden">

      {/* ══════════════════════════════════════════
          HERO
      ══════════════════════════════════════════ */}
      <section className="relative px-4 pt-28 pb-24 md:pt-28 md:pb-32 overflow-hidden">

        {/* Glow Blobs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-[#2563EB]/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-32 left-[10%]  w-[400px] h-[400px] bg-[#0891B2]/7  rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-32 right-[10%] w-[400px] h-[400px] bg-[#DC2626]/5  rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto text-center">

          {/* Live Badge */}
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-[#2563EB]/30 bg-[#2563EB]/10 mb-8">
            <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
            <span className="text-[11px] font-black text-[#2563EB] uppercase tracking-[0.2em]">
              AI-Powered Scam Detection · Live
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-[42px] sm:text-5xl md:text-[64px] lg:text-[76px] font-black leading-[1.06] tracking-tight mb-7">
            Stay Safe From
            <br />
            <span className="bg-gradient-to-r from-[#2563EB] via-[#0891B2] to-[#2563EB] bg-clip-text text-transparent">
              Online Scams
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-slate-400 text-base md:text-[17px] font-medium max-w-2xl mx-auto mb-10 leading-relaxed">
            ScamShield uses advanced AI to detect phishing links, fraudulent emails,
            and malicious URLs — protecting you before it's too late.
          </p>

          {/* ── Scan Input Bar ── */}
          <div className="max-w-2xl mx-auto mb-9">
            <div className="flex flex-col sm:flex-row gap-2 p-2 rounded-2xl border border-white/10 bg-white/4 backdrop-blur-sm shadow-[0_0_40px_rgba(37,99,235,0.08)]">
              <div className="flex items-center gap-2 flex-1 px-4">
                <IoGlobeOutline size={17} className="text-slate-500 shrink-0" />
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Paste a suspicious URL to scan..."
                  className="flex-1 bg-transparent text-white text-sm placeholder-slate-500 outline-none font-medium py-3"
                />
              </div>
              <Link
                to={`/scan-url${url ? `?url=${encodeURIComponent(url)}` : ""}`}
                className="flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-bold transition-all duration-200 shadow-[0_0_22px_rgba(37,99,235,0.45)] hover:shadow-[0_0_30px_rgba(37,99,235,0.6)] active:scale-95 shrink-0"
              >
                <IoShieldCheckmarkOutline size={17} />
                Scan Now
              </Link>
            </div>
            <p className="text-slate-600 text-xs mt-2.5 font-medium tracking-wide">
              Free · No account required · Results in seconds
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-bold transition-all duration-200 shadow-[0_0_24px_rgba(37,99,235,0.35)] active:scale-95"
            >
              Go to Dashboard <ArrowRight size={16} />
            </Link>
            <Link
              to="/learn"
              className="flex items-center gap-2 px-8 py-3.5 rounded-xl border border-white/12 bg-white/5 hover:bg-white/8 text-white text-sm font-bold transition-all duration-200"
            >
              Learn More <IoBookOutline size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          STATS
      ══════════════════════════════════════════ */}
      <section className="px-4 pb-20">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-3 p-6 rounded-2xl border border-white/8 bg-white/4 hover:bg-white/6 transition-all duration-200 group"
            >
              {/* Icon */}
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: s.bg, color: s.color }}
              >
                {s.icon}
              </div>
              <span className="text-[32px] font-black leading-none" style={{ color: s.color }}>
                {s.value}
              </span>
              <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider text-center">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════
          FEATURES
      ══════════════════════════════════════════ */}
      <section className="px-4 pb-24">
        <div className="max-w-5xl mx-auto">

          <div className="text-center mb-12">
            <p className="text-[10px] font-black text-[#2563EB] uppercase tracking-[0.22em] mb-3">
              Features
            </p>
            <h2 className="text-3xl md:text-[40px] font-black tracking-tight leading-tight">
              Everything You Need to Stay Protected
            </h2>
            <p className="text-slate-400 text-sm mt-4 max-w-xl mx-auto leading-relaxed">
              A full suite of intelligent tools designed to detect, analyze, and educate.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f, i) => (
              <Link
                key={i}
                to={f.href}
                className="group relative flex flex-col gap-5 p-6 rounded-2xl border border-white/8 bg-white/4 hover:bg-white/7 hover:border-white/15 transition-all duration-300 hover:-translate-y-1.5"
              >
                {/* Badge */}
                <span
                  className="absolute top-4 right-4 text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full"
                  style={{ color: f.badgeColor, background: `${f.badgeColor}20` }}
                >
                  {f.badge}
                </span>

                {/* Icon */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: f.bg, color: f.color }}
                >
                  {f.icon}
                </div>

                <div className="flex flex-col gap-2 flex-1">
                  <h3 className="text-white font-bold text-[15px]">{f.title}</h3>
                  <p className="text-slate-500 text-[12px] leading-relaxed">{f.desc}</p>
                </div>

                <div
                  className="flex items-center gap-1.5 text-[12px] font-bold"
                  style={{ color: f.color }}
                >
                  Try Now
                  <IoArrowForwardOutline
                    size={13}
                    className="group-hover:translate-x-1 transition-transform duration-200"
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════════ */}
      <section className="px-4 pb-24">
        <div className="max-w-5xl mx-auto">

          <div className="text-center mb-12">
            <p className="text-[10px] font-black text-[#0891B2] uppercase tracking-[0.22em] mb-3">
              How It Works
            </p>
            <h2 className="text-3xl md:text-[40px] font-black tracking-tight">
              Scan in 3 Simple Steps
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative">
            {steps.map((s, i) => (
              <div
                key={i}
                className="relative flex flex-col gap-5 p-7 rounded-2xl border border-white/8 bg-white/4 hover:bg-white/6 transition-all duration-200"
              >
                {/* Step label + arrow */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-[#2563EB] uppercase tracking-widest">
                    Step {s.step}
                  </span>
                  {i < steps.length - 1 && (
                    <ArrowRight size={14} className="text-white/15 hidden md:block" />
                  )}
                </div>

                {/* Icon */}
                <div className="w-11 h-11 rounded-xl bg-[#2563EB]/12 text-[#2563EB] flex items-center justify-center">
                  {s.icon}
                </div>

                <div>
                  <h3 className="text-white font-bold text-[15px] mb-2">{s.title}</h3>
                  <p className="text-slate-500 text-[12px] leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          RECENT THREATS
      ══════════════════════════════════════════ */}
      <section className="px-4 pb-24">
        <div className="max-w-5xl mx-auto">

          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-[10px] font-black text-[#DC2626] uppercase tracking-[0.22em] mb-2">
                Live Feed
              </p>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight">
                Recent Threats Detected
              </h2>
            </div>
            <Link
              to="/reports"
              className="flex items-center gap-1.5 text-xs font-bold text-[#2563EB] hover:text-white transition-colors pb-1"
            >
              View All <ExternalLink size={13} />
            </Link>
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/4 overflow-hidden divide-y divide-white/6">
            {recentThreats.map((t, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-5 py-4 hover:bg-white/4 transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: t.riskBg, color: t.riskColor }}
                  >
                    {t.risk === "Safe"
                      ? <IoCheckmarkCircleOutline size={19} />
                      : t.risk === "Medium"
                      ? <IoWarningOutline size={19} />
                      : <IoAlertCircleOutline size={19} />
                    }
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{t.url}</p>
                    <p className="text-slate-500 text-xs mt-0.5">{t.type} · {t.time}</p>
                  </div>
                </div>

                <span
                  className="shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-full ml-4"
                  style={{ color: t.riskColor, background: t.riskBg }}
                >
                  {t.risk} Risk
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          CTA BANNER
      ══════════════════════════════════════════ */}
      <section className="px-4 pb-24">
        <div className="max-w-5xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl border border-[#2563EB]/20 bg-gradient-to-br from-[#2563EB]/12 via-[#0891B2]/8 to-[#0B1120] p-10 md:p-16 text-center">

            {/* Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[250px] bg-[#2563EB]/12 rounded-full blur-[100px] pointer-events-none" />

            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#0891B2] flex items-center justify-center mx-auto mb-6 shadow-[0_0_32px_rgba(37,99,235,0.45)]">
                <ShieldCheck size={30} className="text-white" />
              </div>

              <h2 className="text-3xl md:text-[42px] font-black tracking-tight mb-4">
                Start Protecting Yourself Today
              </h2>
              <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto mb-10 leading-relaxed">
                Join thousands of users who trust ScamShield to keep them safe from
                online fraud, phishing attempts, and malicious content.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link
                  to="/scan-url"
                  className="flex items-center gap-2 px-9 py-3.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-bold transition-all duration-200 shadow-[0_0_24px_rgba(37,99,235,0.45)] active:scale-95"
                >
                  <IoShieldCheckmarkOutline size={17} />
                  Scan a URL Now
                </Link>
                <Link
                  to="/scan-email"
                  className="flex items-center gap-2 px-9 py-3.5 rounded-xl border border-white/12 bg-white/5 hover:bg-white/10 text-white text-sm font-bold transition-all duration-200"
                >
                  <IoMailOutline size={17} />
                  Scan an Email
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════ */}
      <footer className="border-t border-white/8 px-4 py-10">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-5">

          <div className="flex items-center gap-2">
            <IoShieldOutline size={16} className="text-[#2563EB]" />
            <span className="text-[15px] font-black text-white">
              Scam<span className="text-[#2563EB]">Shield</span>
            </span>
          </div>

          <p className="text-slate-600 text-xs text-center">
            © {new Date().getFullYear()} ScamShield · Built to protect against online fraud
          </p>

          <div className="flex items-center gap-6">
            {[
              { label: "Dashboard", href: "/dashboard" },
              { label: "Reports",   href: "/reports"   },
              { label: "Learn",     href: "/learn"     },
            ].map((item) => (
              <Link
                key={item.label}
                to={item.href}
                className="text-slate-500 hover:text-white text-xs font-semibold transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </div>

        </div>
      </footer>

    </div>
  );
};

export default Home;