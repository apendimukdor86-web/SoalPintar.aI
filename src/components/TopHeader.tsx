import React from 'react';
import { Menu, Moon, Sun, QrCode, ShieldCheck, Copy, Check, LogOut } from 'lucide-react';

interface TopHeaderProps {
  onToggleMobileMenu: () => void;
  activeTab: string;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenProjector: () => void;
  onOpenStudentMode: () => void;
  onLogout: () => void;
  tokenCode: string;
}

const tabTitles: Record<string, { category: string; title: string }> = {
  dashboard: { category: 'Utama', title: 'Dashboard Ringkasan' },
  generator: { category: 'Pembuatan Soal', title: '1. AI Generator Soal Cerdas' },
  bank: { category: 'Pembuatan Soal', title: '2. Bank Soal Guru Terpusat' },
  google_forms: { category: 'Pembuatan Soal', title: '3. Google Forms (Daftar & Form Manual)' },
  token: { category: 'Distribusi & Akses', title: '4. Token Siswa & Manajemen Akses' },
  distribusi: { category: 'Distribusi & Akses', title: '5. Distribusi Google Form' },
  monitoring: { category: 'Pelaksanaan Ujian', title: '6. Ujian Live (Pemantauan Real-Time)' },
  rekap: { category: 'Evaluasi & Analisis', title: '7. Rekap & Analisis Nilai Siswa' },
  pelanggaran: { category: 'Evaluasi & Analisis', title: '8. Riwayat Pelanggaran (Bukti Kejujuran)' },
  teacher_users: { category: 'Pengaturan & Aplikasi', title: 'Pengguna Guru (Daftar & Manajemen Akun)' },
  settings_gas: { category: 'Pengaturan & Aplikasi', title: 'Pengaturan Web App Google Apps Script (Code.gs v3.3)' },
  clear_data: { category: 'Pengaturan & Aplikasi', title: 'Clear Data, Log & Histori' },
  download: { category: 'Pengaturan & Aplikasi', title: '9. Download Aplikasi Guru & Siswa' },
  paket: { category: 'Pengaturan & Aplikasi', title: '10. Status Paket & Langganan' },
};

export const TopHeader: React.FC<TopHeaderProps> = ({
  onToggleMobileMenu,
  activeTab,
  isDark,
  onToggleTheme,
  onOpenProjector,
  onOpenStudentMode,
  onLogout,
  tokenCode,
}) => {
  const currentInfo = tabTitles[activeTab] || { category: 'Dashboard', title: 'Menu Evaluasi' };
  const [copied, setCopied] = React.useState(false);

  const handleCopyToken = () => {
    navigator.clipboard.writeText(tokenCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="h-16 px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 sticky top-0 z-30">
      {/* Left: Mobile Toggle & Contextual Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
          title="Buka Menu Navigasi"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <span>{currentInfo.category}</span>
            <span aria-hidden="true">/</span>
            <span className="text-slate-600 dark:text-slate-300 font-medium">{currentInfo.title}</span>
          </div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight hidden sm:block">
            {currentInfo.title}
          </h2>
        </div>
      </div>

      {/* Right: Quick Token, Projector, Theme Toggle, Student Portal */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Token Pill */}
        <button
          onClick={handleCopyToken}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Klik untuk salin token ujian"
        >
          <span className="text-slate-400 font-normal font-sans text-[11px]">Token:</span>
          <span className="text-emerald-600 dark:text-emerald-400">{tokenCode || '—'}</span>
          {tokenCode &&
            (copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-500 ml-0.5" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
            ))}
        </button>

        {/* Projector Button */}
        <button
          onClick={onOpenProjector}
          className="px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <QrCode className="w-3.5 h-3.5 text-emerald-600" />
          <span className="hidden md:inline">Layar Proyektor</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors rounded-lg cursor-pointer"
          title="Ganti Tema Gelap / Terang"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Student Portal CTA */}
        <button
          onClick={onOpenStudentMode}
          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Portal Siswa</span>
        </button>

        {/* Logout CTA */}
        <button
          onClick={onLogout}
          className="px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-950/70 border border-rose-200 dark:border-rose-800/60 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
          title="Keluar / Logout Guru"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Logout</span>
        </button>
      </div>
    </header>
  );
};
