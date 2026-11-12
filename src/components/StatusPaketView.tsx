import React, { useState } from 'react';
import { CreditCard, CheckCircle2, ShieldCheck, Sparkles, Clock, ArrowRight, Zap, Check } from 'lucide-react';

export const StatusPaketView: React.FC = () => {
  const [selectedPlan, setSelectedPlan] = useState<'pro' | 'school'>('pro');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Status Paket & Langganan Guru
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Informasi masa aktif lisensi, akun belajar.id terverifikasi, kuota pembuatan soal AI, dan perpanjangan langganan.
        </p>
      </div>

      {/* Account Info Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center font-bold text-lg">
              AI
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Paket Guru Juara CBT - Pro Tahunan
                </h3>
                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  Aktif (Terverifikasi)
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Akun: apendimukdor86@guru.smp.belajar.id
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs text-slate-400">Masa Berlaku Lisensi</div>
            <div className="text-sm font-bold font-mono text-slate-900 dark:text-slate-100 mt-0.5">
              s.d. 10 November 2027
            </div>
            <span className="text-[11px] text-emerald-600 font-medium">365 Hari Tersisa</span>
          </div>
        </div>

        {/* Quota Strips */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Kuota AI Generator Soal</span>
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-xl font-black text-emerald-600">UNLIMITED</div>
            <div className="text-[11px] text-slate-400">Didukung Gemini 3.8 Flash Education</div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Batas Siswa Live Ujian</span>
              <Zap className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-slate-100">500 Siswa</div>
            <div className="text-[11px] text-slate-400">Kapasitas serentak per sesi</div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Integrasi Google Form</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-xl font-black text-emerald-600">FULL ACCESS</div>
            <div className="text-[11px] text-slate-400">Google Apps Script otomatis & Drive</div>
          </div>
        </div>
      </div>

      {/* Plan Options & Comparison */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
          Pilihan Paket Perpanjangan & Lisensi Sekolah
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Free Tier */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Paket Guru Pemula</h3>
              <p className="text-xs text-slate-500 mt-0.5">Untuk latihan mandiri & kuis kelas kecil</p>
            </div>
            <div className="text-2xl font-extrabold font-mono text-slate-900 dark:text-slate-100">
              Gratis <span className="text-xs text-slate-400 font-normal">/ selamanya</span>
            </div>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600" /> 10 generate soal AI per bulan
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600" /> Maksimal 40 siswa per kuis
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600" /> Layar Proyektor Kelas dasar
              </li>
            </ul>
          </div>

          {/* Pro Tier (Active) */}
          <div className="bg-white dark:bg-slate-900 border-2 border-emerald-500 rounded-2xl p-5 space-y-4 relative shadow-md">
            <span className="absolute -top-2.5 right-4 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Paket Anda Saat Ini
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Paket Guru Juara CBT</h3>
              <p className="text-xs text-slate-500 mt-0.5">Untuk guru profesional & sekolah penggerak</p>
            </div>
            <div className="text-2xl font-extrabold font-mono text-emerald-600">
              Rp149.000 <span className="text-xs text-slate-400 font-normal">/ tahun</span>
            </div>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" /> AI Generator Soal Tanpa Batas
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" /> Hingga 500 siswa live per sesi
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" /> Ekspor otomatis Google Forms & Apps Script
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" /> Anti-curang kuis & Layar Proyektor
              </li>
            </ul>
            <button
              onClick={() => showToast('Masa aktif paket Anda masih berlaku hingga 10 November 2027.')}
              className="w-full py-2 px-3 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              Perpanjang Lisensi Tahunan
            </button>
          </div>

          {/* School Enterprise Tier */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Paket Satu Sekolah (BOS)</h3>
              <p className="text-xs text-slate-500 mt-0.5">Untuk seluruh guru & siswa di satu satuan pendidikan</p>
            </div>
            <div className="text-2xl font-extrabold font-mono text-slate-900 dark:text-slate-100">
              Rp1.450.000 <span className="text-xs text-slate-400 font-normal">/ tahun (Sekolah)</span>
            </div>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600" /> Seluruh guru (hingga 100 guru)
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600" /> Hingga 2.000 siswa serentak (ASAS/ANBK)
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600" /> Faktur SIPLah & Pembayaran Dana BOS
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600" /> Bimbingan teknis & pendampingan IT sekolah
              </li>
            </ul>
            <button
              onClick={() => showToast('Pengajuan proposal lisensi sekolah via SIPLah telah siap. Hubungi sales@soalpintar.ai')}
              className="w-full py-2 px-3 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Ajukan Pengadaan SIPLah / BOS
            </button>
          </div>
        </div>
      </div>

      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white shadow-2xl text-xs font-medium">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        </div>
      )}
    </div>
  );
};
