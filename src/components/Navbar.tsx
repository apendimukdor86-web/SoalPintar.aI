import React from 'react';
import { ShieldCheck, Moon, Sun } from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenStudentMode: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onOpenStudentMode,
  isDark,
  onToggleTheme,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md sticky top-0 z-30">
      {/* Zone 1: Single text element wordmark */}
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          onSelectTab('generator');
        }}
        className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0 flex items-center gap-2"
      >
        <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-sm">
          S
        </span>
        <span>Soalpintar.ai</span>
      </a>

      {/* Zone 2: 4-5 concise single-line nav links */}
      <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-600 dark:text-slate-300">
        <button
          onClick={() => onSelectTab('generator')}
          className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            currentTab === 'generator' ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : ''
          }`}
        >
          AI Generator
        </button>
        <button
          onClick={() => onSelectTab('bank')}
          className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            currentTab === 'bank' ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : ''
          }`}
        >
          Bank Soal
        </button>
        <button
          onClick={() => onSelectTab('token')}
          className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            currentTab === 'token' || currentTab === 'distribusi' ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : ''
          }`}
        >
          Token & Distribusi
        </button>
        <button
          onClick={() => onSelectTab('monitoring')}
          className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            currentTab === 'monitoring' ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : ''
          }`}
        >
          Ujian Live
        </button>
        <button
          onClick={() => onSelectTab('rekap')}
          className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            currentTab === 'rekap' || currentTab === 'pelanggaran' ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : ''
          }`}
        >
          Rekap Nilai
        </button>
        <button
          onClick={() => onSelectTab('download')}
          className={`hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            currentTab === 'download' || currentTab === 'paket' ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : ''
          }`}
        >
          Aplikasi & Paket
        </button>
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onToggleTheme}
          className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors rounded-lg cursor-pointer"
          title="Ganti Tema Gelap / Terang"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>

        <button
          onClick={onOpenStudentMode}
          className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Portal Ujian Siswa</span>
        </button>
      </div>
    </header>
  );
};
