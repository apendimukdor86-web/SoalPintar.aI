import React, { useState } from 'react';
import { Download, Smartphone, Laptop, ShieldCheck, Check, ExternalLink, HelpCircle, FileCode } from 'lucide-react';

export const DownloadAplikasiView: React.FC = () => {
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const handleDownloadSebConfig = () => {
    const sebXml = `<?xml version="1.0" encoding="utf-8"?>
<seb>
  <startURL>${window.location.origin}/?mode=student</startURL>
  <allowPreferencesWindow>false</allowPreferencesWindow>
  <allowQuit>true</allowQuit>
  <allowSwitchTo3rdPartyApps>false</allowSwitchTo3rdPartyApps>
  <browserExamKey>SOALPINTAR-SECURE-KEY-2026</browserExamKey>
  <enableRightMouse>false</enableRightMouse>
</seb>`;
    const blob = new Blob([sebXml], { type: 'application/seb' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Soalpintar_SafeExamBrowser.seb';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setDownloadSuccess('File konfigurasi Safe Exam Browser (.seb) berhasil diunduh!');
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  const handleDownloadApkSimulation = () => {
    setDownloadSuccess('Mengunduh installer Soalpintar Mobile Exam Lock (v2.4.0 APK). Pastikan izin instalasi aktif.');
    setTimeout(() => setDownloadSuccess(null), 3500);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Download Aplikasi Guru & Siswa
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Akses pengunduhan aplikasi desktop dan mobile pendukung untuk pelaksanaan ujian dengan tingkat keamanan sistem yang lebih tinggi.
        </p>
      </div>

      {downloadSuccess && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2 font-medium">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{downloadSuccess}</span>
        </div>
      )}

      {/* Main Download Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Android Mobile Exam Lock */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex items-start justify-between">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl text-emerald-600">
              <Smartphone className="w-6 h-6" />
            </div>
            <span className="text-xs font-mono text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
              v2.4.0 APK (Terbaru)
            </span>
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Soalpintar Mobile Exam Lock (Android)
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Aplikasi pendukung Android yang mengunci HP siswa ke dalam Kios Mode. Memblokir panel notifikasi, panggilan masuk, aplikasi floating (kalkulator mengambang), dan tombol navigasi home/recent apps.
            </p>
          </div>

          <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Kompatibel Android 8.0 s.d. Android 15</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Otomatis mendeteksi token kuis via QR Scanner built-in</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Ukuran file ringan (hanya 8.2 MB)</span>
            </div>
          </div>

          <button
            onClick={handleDownloadApkSimulation}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <Download className="w-4 h-4" />
            Unduh APK Android (8.2 MB)
          </button>
        </div>

        {/* Card 2: Desktop Safe Exam Browser (Windows / Mac) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex items-start justify-between">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-600">
              <Laptop className="w-6 h-6" />
            </div>
            <span className="text-xs font-mono text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
              SEB Config Profile
            </span>
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Safe Exam Browser (SEB Desktop)
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Konfigurasi terenkripsi untuk komputer lab sekolah (Windows / macOS). Mengunci OS komputer sehingga siswa tidak dapat menekan Alt+Tab, membuka browser Chrome lain, atau mencetak layar (PrintScreen).
            </p>
          </div>

          <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-indigo-600" />
              <span>Kunci keyboard sistem: Alt+Tab, Windows Key, Ctrl+Esc diblokir</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-indigo-600" />
              <span>Terkoneksi langsung ke server ujian Soalpintar.ai</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-indigo-600" />
              <span>Sertifikasi Browser Exam Key resmi</span>
            </div>
          </div>

          <button
            onClick={handleDownloadSebConfig}
            className="w-full py-2.5 px-4 bg-slate-900 dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <FileCode className="w-4 h-4" />
            Unduh File Konfigurasi SEB (.seb)
          </button>
        </div>
      </div>

      {/* Quick Guide: Screen Pinning (Tanpa Perlu Instal Aplikasi Tambahan) */}
      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
          <HelpCircle className="w-4 h-4 text-emerald-600" />
          <span>Alternatif Tanpa Instalasi: Fitur "Sematkan Aplikasi" (App Pinning) Bawaan Android</span>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Bila siswa menggunakan smartphone pribadi tanpa menginstal APK tambahan, guru pengawas dapat menginstruksikan siswa mengaktifkan fitur <strong className="text-slate-800 dark:text-slate-200">Sematkan Aplikasi (Screen Pinning)</strong> yang tersedia secara gratis di semua HP Android:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
            <div className="font-bold text-slate-800 dark:text-slate-200">Langkah 1: Pengaturan</div>
            <p className="text-slate-500">
              Buka menu <em>Pengaturan (Settings) &gt; Keamanan (Security) &gt; Sematkan Aplikasi</em>, lalu aktifkan.
            </p>
          </div>
          <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
            <div className="font-bold text-slate-800 dark:text-slate-200">Langkah 2: Buka Portal Ujian</div>
            <p className="text-slate-500">
              Buka browser Google Chrome ke portal ujian Soalpintar.ai, lalu buka menu Recent Apps (aplikasi terkini).
            </p>
          </div>
          <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
            <div className="font-bold text-slate-800 dark:text-slate-200">Langkah 3: Sematkan Layar</div>
            <p className="text-slate-500">
              Ketuk ikon Chrome di atas pratinjau, lalu pilih <strong>"Sematkan" (Pin)</strong>. HP terkunci total di lembar ujian!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
