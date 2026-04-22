/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import { Globe, LayoutDashboard, Settings, Link2, Wifi, Zap } from "lucide-react";
import { useState } from "react";

export default function App() {
  const [activeTab, setActiveTab] = useState("MAPA");

  const navItems = [
    { name: "MAPA", icon: Globe },
    { name: "DASHBOARD", icon: LayoutDashboard },
    { name: "GERENCIAR", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-bg relative overflow-hidden flex flex-col">
      {/* Background Globe Effect */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
        <div className="absolute inset-0 bg-radial-gradient from-accent/10 to-transparent pointer-events-none" />
        <img
          src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2672&auto=format&fit=crop"
          alt="Globe Background"
          className="w-full h-full object-cover mix-blend-screen opacity-30 select-none"
          referrerPolicy="no-referrer"
        />
        {/* Animated points overlay */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
      </div>

      {/* Header / Navbar */}
      <header className="relative z-10 px-12 py-8 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-2 group cursor-pointer">
          <div className="w-8 h-8 bg-accent rounded-sm flex items-center justify-center group-hover:rotate-45 transition-transform duration-500">
            <Zap className="w-5 h-5 text-bg" />
          </div>
          <span className="text-xl font-display font-bold text-accent tracking-tighter">
            Marciano Goggia
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-10">
          {navItems.map((item) => (
            <button
              key={item.name}
              onClick={() => setActiveTab(item.name)}
              className={`nav-link ${activeTab === item.name ? "nav-link-active" : ""}`}
            >
              {item.name}
            </button>
          ))}
        </nav>

        <button className="hidden md:block border border-white/20 px-6 py-2 text-xs font-bold uppercase tracking-widest hover:bg-white/5 transition-colors">
          Connect
        </button>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-grow flex flex-col items-center justify-center text-center px-4">
        <div className="absolute top-10 right-12 text-right">
          <div className="flex items-center gap-2 justify-end mb-1">
            <span className="text-[10px] font-mono text-accent opacity-80 tracking-tighter">SYNC STATUS: ACTIVE</span>
            <div className="flex gap-1">
              <div className="status-dot bg-accent animate-pulse" />
              <div className="status-dot bg-white/20" />
              <div className="status-dot bg-white/20" />
            </div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-3xl"
        >
          <span className="text-accent text-[10px] md:text-sm font-display font-medium tracking-[0.5em] uppercase mb-4 block">
            Intelligence & Engagement
          </span>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold uppercase mb-8 leading-tight">
            Marciano Goggia
          </h1>
          <p className="text-white/60 text-sm md:text-lg max-w-2xl mx-auto mb-12 font-light leading-relaxed">
            Leveraging high-fidelity data visualization and global connectivity to navigate the digital frontier.
            Elite intelligence for professional decision making.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <button className="btn-primary flex items-center justify-center gap-2">
              Explorar Mapa
            </button>
            <button className="btn-secondary">
              Relatórios
            </button>
          </div>
        </motion.div>

        {/* Decorative elements */}
        <div className="absolute bottom-20 left-12 h-0.5 w-32 bg-gradient-to-r from-accent to-transparent opacity-30" />
        <div className="absolute bottom-24 left-12 text-[10px] font-mono text-accent/40 tracking-widest uppercase">Lat: 23.5505 S</div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-12 py-8 flex flex-col md:flex-row items-center justify-between border-t border-white/5 bg-bg/80 backdrop-blur-sm">
        <div className="flex items-center gap-6 mb-4 md:mb-0">
          <span className="text-accent font-display font-black text-sm">MG</span>
          <span className="text-[10px] text-white/40 uppercase tracking-widest">
            © 2024 Marciano Goggia. All rights reserved.
          </span>
        </div>

        <div className="flex items-center gap-8 mb-4 md:mb-0">
          <a href="#" className="text-[10px] text-white/40 hover:text-white uppercase tracking-widest transition-colors font-medium">Privacy Policy</a>
          <a href="#" className="text-[10px] text-white/40 hover:text-white uppercase tracking-widest transition-colors font-medium">Terms of Service</a>
          <a href="#" className="text-[10px] text-white/40 hover:text-white uppercase tracking-widest transition-colors font-medium">Contact</a>
        </div>

        <div className="flex items-center gap-2 text-accent">
          <Link2 className="w-3 h-3" />
          <span className="text-[10px] font-mono tracking-widest uppercase">Global_Link_Stable</span>
        </div>
      </footer>
    </div>
  );
}
