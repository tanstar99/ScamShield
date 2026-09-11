"use client";
import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import clsx from "clsx";
import {
  IoHomeOutline,
  IoShieldOutline,
  IoMailOutline,
  IoBarChartOutline,
  IoBookOutline,
} from "react-icons/io5";
import { Menu, X, Globe, ChevronDown } from "lucide-react";
import LoginButton from "./LoginButton";
import Language from "./Language.jsx";
import Logo from "../assets/logo.png";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const { userData } = useSelector((state) => state.user);
  const location = useLocation();
  const languageRef = useRef(null);

  const navLinks = [
    { name: "Dashboard",  href: "/dashboard",  icon: <IoHomeOutline size={18} />     },
    { name: "Scan URL",   href: "/scanurl",   icon: <IoShieldOutline size={18} />   },
    { name: "Scan Email", href: "/scan-email", icon: <IoMailOutline size={18} />     },
    { name: "Reports",    href: "/reports",    icon: <IoBarChartOutline size={18} /> },
    { name: "Learn",      href: "/learn",      icon: <IoBookOutline size={18} />     },
  ];

  



  return (
    <>
      {/* ─── Main Navbar ─── */}
      <nav className="fixed z-50 top-3 left-1/2 -translate-x-1/2 w-[97%] md:w-[94%] lg:w-[90%] rounded-2xl border border-white/10 bg-[#0B1120]/95 backdrop-blur-xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] transition-all duration-300">
        <div className="flex h-[62px] items-center px-4 md:px-6 gap-3">

          {/* ── Logo ── */}
          <Link to="/" className="flex items-center gap-3 group shrink-0">
            <div className="relative w-12 h-12 shrink-0">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#0891B2] opacity-30 blur-md group-hover:opacity-50 transition-opacity" />
              <div className="relative w-full h-full rounded-xl bg-gradient-to-br from-[#2563EB] to-[#0891B2] flex items-center justify-center shadow-xl group-hover:scale-105 transition-transform duration-200">
                <img
                  src={Logo}
                  alt="ScamShield"
                  width={32}
                  height={32}
                  className="brightness-125 drop-shadow-lg"
                />
              </div>
            </div>
            <span className="hidden sm:block text-white font-black text-[19px] tracking-tight">
              Scam<span className="text-[#2563EB]">Shield</span>
            </span>
          </Link>

          {/* ── Desktop Nav Links ── */}
          <div className="hidden lg:flex items-center gap-0.5 flex-1 justify-center">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.href;
              return (
                <Link
                  key={link.name}
                  to={link.href}
                  className={clsx(
                    "flex items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-semibold whitespace-nowrap transition-all duration-200",
                    isActive
                      ? "bg-[#2563EB] text-white shadow-[0_0_18px_rgba(37,99,235,0.4)]"
                      : "text-slate-400 hover:text-white hover:bg-white/6"
                  )}
                >
                  <span className={isActive ? "text-white" : "text-slate-500"}>
                    {link.icon}
                  </span>
                  {link.name}
                </Link>
              );
            })}
          </div>

          {/* ── Right Side ── */}
          <div className="flex items-center gap-1.5 ml-auto">

            {/* ── Language Dropdown ── */}
            <div className="relative" ref={languageRef}>
              <button
                onClick={() => setIsLanguageOpen((prev) => !prev)}
                className={clsx(
                  "flex items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-semibold transition-all duration-200 border",
                  isLanguageOpen
                    ? "bg-white/10 text-white border-white/20"
                    : "text-slate-400 hover:text-white hover:bg-white/6 border-transparent"
                )}
              >
                <Globe size={16} />
                <span className="hidden md:inline">Language</span>
                <ChevronDown
                  size={12}
                  className={clsx(
                    "hidden md:block transition-transform duration-200",
                    isLanguageOpen ? "rotate-180" : ""
                  )}
                />
               
              </button>

              {/* ── Dropdown Panel ── */}
              {isLanguageOpen && (
                <div className="absolute right-0 top-full mt-2 z-[999] w-[230px] rounded-2xl overflow-hidden border border-white/10 bg-[#1E293B] shadow-[0_24px_60px_rgba(0,0,0,0.7)]">
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/8 bg-[#2563EB]/10">
                    <Globe size={13} className="text-[#2563EB]" />
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                       <Language/>
                    </span>
                   
                  </div>
                  {/* Language — directly imported, no useEffect */}
                 
                </div>
              )}
            </div>

            {/* ── Divider ── */}
            <div className="hidden lg:block h-5 w-px bg-white/10 mx-1 shrink-0" />

            {/* ── Desktop Login ── */}
            <div className="hidden lg:block">
              <LoginButton />
            </div>

            {/* ── Mobile Hamburger ── */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className={clsx(
                "lg:hidden p-2 rounded-xl border transition-all duration-200",
                isOpen
                  ? "bg-white/10 text-white border-white/20"
                  : "text-slate-400 hover:text-white hover:bg-white/6 border-transparent"
              )}
            >
              {isOpen ? <X size={21} /> : <Menu size={21} />}
            </button>

          </div>
        </div>
      </nav>

      {/* ─── Mobile Overlay ─── */}
      <div
        className={clsx(
          "fixed inset-0 z-40 lg:hidden transition-all duration-300 bg-black/60 backdrop-blur-sm",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsOpen(false)}
      />

      {/* ─── Mobile Menu ─── */}
      <div
        className={clsx(
          "fixed left-1/2 top-[76px] z-50 lg:hidden w-[97%] sm:w-[88%] -translate-x-1/2 rounded-2xl",
          "border border-white/10 bg-[#0B1120] shadow-[0_24px_60px_rgba(0,0,0,0.7)]",
          "transition-all duration-300 ease-out",
          isOpen
            ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
            : "opacity-0 -translate-y-4 scale-95 pointer-events-none"
        )}
      >
        <div className="p-4 space-y-3">

          {/* ── Mobile User Card ── */}
          {userData && (
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/5 border border-white/8">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2563EB] to-[#0891B2] flex items-center justify-center shrink-0">
                <span className="text-sm font-black text-white">
                  {(userData.name || userData.email)
                    .split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white truncate">
                  {userData.name || userData.email?.split("@")[0]}
                </p>
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#16A34A]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
                  Secure Session
                </span>
              </div>
            </div>
          )}

          {/* ── Mobile Nav Links ── */}
          <div className="space-y-1">
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-1 pb-1">
              Navigation
            </p>
            {navLinks.map((link, index) => {
              const isActive = location.pathname === link.href;
              return (
                <Link
                  key={link.name}
                  to={link.href}
                  onClick={() => setIsOpen(false)}
                  className={clsx(
                    "flex items-center justify-between rounded-xl px-3.5 py-3 transition-all duration-200",
                    isActive
                      ? "bg-[#2563EB] text-white shadow-[0_0_16px_rgba(37,99,235,0.3)]"
                      : "text-slate-300 hover:bg-white/6 hover:text-white",
                    isOpen ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0"
                  )}
                  style={{ transitionDelay: isOpen ? `${index * 40}ms` : "0ms" }}
                >
                  <div className="flex items-center gap-3">
                    <div className={clsx(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      isActive ? "bg-white/20 text-white" : "bg-white/5 text-slate-500"
                    )}>
                      {link.icon}
                    </div>
                    <span className="text-sm font-semibold">{link.name}</span>
                  </div>
                  {isActive && (
                    <span className="w-2 h-2 rounded-full bg-white/80 shrink-0" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* ── Mobile Language — directly imported ── */}
          <div className="border-t border-white/8 pt-3 space-y-2">
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-1">
              Language
            </p>
            <div className="rounded-xl bg-[#1E293B] border border-white/8 px-4 py-3">
              <Language />
            </div>
          </div>

          {/* ── Mobile Login ── */}
          <div className="border-t border-white/8 pt-3">
            <LoginButton />
          </div>

        </div>
      </div>

      {/* ─── Spacer ─── */}
      
    </>
  );
};

export default Navbar;