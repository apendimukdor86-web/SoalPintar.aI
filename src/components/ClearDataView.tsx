import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Database,
  Trash2,
  RotateCcw,
  ShieldAlert,
  Radio,
  ClipboardCheck,
  FileText,
  KeyRound,
  BookOpen,
  Check,
  AlertTriangle,
  Eraser,
} from 'lucide-react';
import { QuestionPackage, StudentScoreRecord, StudentViolationLog } from '../types';
import { ManualGoogleFormEntry } from './GoogleFormsView';

interface ClearDataViewProps {
  packages: QuestionPackage[];
  scores: StudentScoreRecord[];
  violations: StudentViolationLog[];
  manualForms: ManualGoogleFormEntry[];
  onClearViolations: () => void;
  onClearScores: () => void;
  onClearGoogleForms: () => void;
  onClearTokens: () => void;
  onClearPackages: () => void;
  onClearLogsAndHistory: () => void;
  onClearAllData: () => void;
  onRestoreDefaults: () => void;
}

type ConfirmAction =
  | {
      id: string;
      title: string;
      description: string;
      dangerLabel: string;
      tone: 'amber' | 'rose' | 'indigo';
      onConfirm: () => Promise<void> | void;
    }
  | null;

export const ClearDataView: React.FC<ClearDataViewProps> = ({
  packages,
  scores,
  violations,
  manualForms,
  onClearViolations,
  onClearScores,
  onClearGoogleForms,
  onClearTokens,
  onClearPackages,
  onClearLogsAndHistory,
  onClearAllData,
  onRestoreDefaults,
}) => {
  const [liveSessionsCount, setLiveSessionsCount] = useState<number>(0);
  const [tokensCount, setTokensCount] = useState<number>(0);
  const [storageKb, setStorageKb] = useState<string>('0.0');
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const refreshLocalMetrics = useCallback(async () => {
    // 1. Compute localStorage size in KB
    try {
      let totalBytes = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i) || '';
        const val = localStorage.getItem(key) || '';
        totalBytes += (key.length + val.length) * 2;
      }
      setStorageKb((totalBytes / 1024).toFixed(1));
    } catch {
      setStorageKb('0.0');
    }

    // 2. Count stored tokens
    try {
      const savedTokens = localStorage.getItem('soalpintar_created_tokens_v2');
      if (savedTokens) {
        const parsed = JSON.parse(savedTokens);
        if (Array.isArray(parsed)) {
          setTokensCount(parsed.length);
        }
      } else {
        setTokensCount(0);
      }
    } catch {
      setTokensCount(0);
    }

    // 3. Fetch live student sessions count from server
    try {
      const res = await fetch('/api/rooms');
      const data = await res.json();
      if (data?.success && Array.isArray(data.rooms)) {
        let count = 0;
        for (const r of data.rooms) {
          const parts = r.participants ? Object.values(r.participants) : [];
          count += parts.length;
        }
        setLiveSessionsCount(count);
      }
    } catch {
      // Ignore network error
    }
  }, []);

  useEffect(() => {
    refreshLocalMetrics();
  }, [refreshLocalMetrics, packages.length, scores.length, violations.length, manualForms.length]);

  const googleFormsCount = useMemoFormsCount(packages, manualForms);
  const totalLogAndHistory =
    violations.length + liveSessionsCount + scores.length + googleFormsCount;

  const callServerClear = async (scope: 'live_sessions' | 'tokens' | 'all' | 'restore') => {
    try {
      await fetch('/api/admin/clear-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope }),
      });
    } catch {
      // Ignore offline error
    }
  };

  const executeConfirm = async () => {
    if (!confirmAction) return;
    setIsProcessing(true);
    try {
      await confirmAction.onConfirm();
      await refreshLocalMetrics();
      setConfirmAction(null);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <Eraser className="w-6 h-6 text-rose-400" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Clear Data, Log &amp; Histori
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Hapus data log pelanggaran, histori sesi ujian live, nilai siswa, histori Google Forms, hingga cache penyimpanan lokal secara selektif atau sekaligus.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-[#0b1324] border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 shrink-0 shadow-xs">
          <Database className="w-4 h-4 text-indigo-400" />
          <span>Penyimpanan Lokal:</span>
          <strong className="font-mono text-slate-900 dark:text-white">{storageKb} KB</strong>
        </div>
      </div>

      {/* Pembersihan Cepat (Sekali Klik) */}
      <div className="bg-white dark:bg-[#0b1324] border border-slate-200 dark:border-slate-800/90 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Pembersihan Cepat (Sekali Klik)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Pilih pembersihan cepat untuk menghapus seluruh log &amp; histori sebelum sesi ujian baru dimulai.
            </p>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#0e172a] border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 font-medium shrink-0">
            Total Log &amp; Histori:{' '}
            <strong className="font-mono text-slate-900 dark:text-white">{totalLogAndHistory} item</strong>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Option 1: Bersihkan Log & Histori Ujian */}
          <button
            type="button"
            onClick={() =>
              setConfirmAction({
                id: 'clear_logs_history',
                title: 'Bersihkan Log & Histori Ujian?',
                description:
                  'Seluruh log pelanggaran, sesi siswa live, kunci Device ID, rekap nilai, dan histori tautan Google Form akan dihapus tanpa menghapus Bank Soal Anda.',
                dangerLabel: 'Ya, Bersihkan Log & Histori',
                tone: 'amber',
                onConfirm: async () => {
                  await callServerClear('live_sessions');
                  localStorage.removeItem('soalpintar_exam_device_locks');
                  onClearLogsAndHistory();
                  showToast('Log pelanggaran, sesi live, nilai, & histori forms berhasil dibersihkan.');
                },
              })
            }
            className="text-left p-5 rounded-2xl bg-amber-50/40 dark:bg-[#161510]/60 border border-amber-300/70 dark:border-amber-700/50 hover:border-amber-400 transition-all space-y-3 cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30 uppercase tracking-wider">
                Disarankan
              </span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-amber-300 transition-colors">
                Bersihkan Log &amp; Histori Ujian
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Hapus log pelanggaran, sesi live, nilai, &amp; histori forms tanpa menghapus Bank Soal.
              </p>
            </div>
          </button>

          {/* Option 2: Hapus Semua Data & Cache */}
          <button
            type="button"
            onClick={() =>
              setConfirmAction({
                id: 'clear_all',
                title: 'Hapus Semua Data & Cache?',
                description:
                  'Tindakan ini akan mengosongkan seluruh log, sesi live, nilai siswa, histori Google Forms, token ujian, Bank Soal, dan cache lokal aplikasi.',
                dangerLabel: 'Ya, Hapus Semua Data',
                tone: 'rose',
                onConfirm: async () => {
                  await callServerClear('all');
                  localStorage.removeItem('soalpintar_exam_device_locks');
                  localStorage.removeItem('soalpintar_created_tokens_v2');
                  localStorage.removeItem('soalpintar_manual_google_forms');
                  onClearAllData();
                  showToast('Seluruh database lokal, log, histori, token, bank soal, dan cache berhasil dikosongkan.');
                },
              })
            }
            className="text-left p-5 rounded-2xl bg-rose-50/40 dark:bg-[#190e18]/60 border border-rose-300/70 dark:border-rose-800/60 hover:border-rose-500 transition-all space-y-3 cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                <Trash2 className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-rose-500/15 text-rose-400 border border-rose-500/30 uppercase tracking-wider">
                Clear All
              </span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-rose-300 transition-colors">
                Hapus Semua Data &amp; Cache
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Kosongkan seluruh database lokal, log, histori, token, bank soal, dan cache.
              </p>
            </div>
          </button>

          {/* Option 3: Reset ke Data Bawaan Awal */}
          <button
            type="button"
            onClick={() =>
              setConfirmAction({
                id: 'restore_defaults',
                title: 'Reset ke Data Bawaan Awal?',
                description:
                  'Log terbaru akan dibersihkan dan contoh Bank Soal, Nilai, Pelanggaran, serta Token bawaan aplikasi akan dikembalikan seperti semula.',
                dangerLabel: 'Ya, Reset Bawaan Awal',
                tone: 'indigo',
                onConfirm: async () => {
                  await callServerClear('restore');
                  localStorage.removeItem('soalpintar_exam_device_locks');
                  localStorage.removeItem('soalpintar_created_tokens_v2');
                  localStorage.removeItem('soalpintar_manual_google_forms');
                  onRestoreDefaults();
                  showToast('Aplikasi berhasil di-reset ke data bawaan awal!');
                },
              })
            }
            className="text-left p-5 rounded-2xl bg-indigo-50/40 dark:bg-[#0e152c]/70 border border-indigo-300/70 dark:border-indigo-800/60 hover:border-indigo-500 transition-all space-y-3 cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
                <RotateCcw className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 uppercase tracking-wider">
                Restore
              </span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-300 transition-colors">
                Reset ke Data Bawaan Awal
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Bersihkan log terbaru dan kembalikan contoh soal serta token bawaan aplikasi.
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Pembersihan Per Kategori Data */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">
          Pembersihan Per Kategori Data
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. Log Pelanggaran (Anti-Cheat) */}
          <CategoryCard
            icon={<ShieldAlert className="w-4 h-4 text-rose-400" />}
            iconBoxClass="bg-rose-950/60 border-rose-800/50"
            title="Log Pelanggaran (Anti-Cheat)"
            badgeText={`${violations.length} log`}
            description="Menghapus seluruh catatan peringatan keluar fullscreen, pindah tab, dan status pemblokiran siswa."
            buttonLabel="Hapus Log Pelanggaran"
            onClick={() =>
              setConfirmAction({
                id: 'cat_violations',
                title: 'Hapus Log Pelanggaran?',
                description:
                  'Semua riwayat catatan pelanggaran anti-cheat siswa akan dihapus.',
                dangerLabel: 'Hapus Log Pelanggaran',
                tone: 'rose',
                onConfirm: () => {
                  onClearViolations();
                  showToast('Log pelanggaran berhasil dihapus.');
                },
              })
            }
          />

          {/* 2. Log Sesi Ujian Live Siswa */}
          <CategoryCard
            icon={<Radio className="w-4 h-4 text-emerald-400" />}
            iconBoxClass="bg-emerald-950/60 border-emerald-800/50"
            title="Log Sesi Ujian Live Siswa"
            badgeText={`${liveSessionsCount} sesi`}
            description="Membersihkan daftar siswa yang berstatus Mengerjakan, Terputus, atau Diblokir di monitor Ujian Live."
            buttonLabel="Bersihkan Sesi Live"
            onClick={() =>
              setConfirmAction({
                id: 'cat_live',
                title: 'Bersihkan Sesi Ujian Live?',
                description:
                  'Seluruh daftar peserta live beserta kunci Device ID sementara pada room ujian akan dibersihkan.',
                dangerLabel: 'Bersihkan Sesi Live',
                tone: 'amber',
                onConfirm: async () => {
                  await callServerClear('live_sessions');
                  localStorage.removeItem('soalpintar_exam_device_locks');
                  showToast('Log sesi Ujian Live & kunci perangkat sementara berhasil dibersihkan.');
                },
              })
            }
          />

          {/* 3. Histori Nilai & Jawaban Siswa */}
          <CategoryCard
            icon={<ClipboardCheck className="w-4 h-4 text-indigo-400" />}
            iconBoxClass="bg-indigo-950/60 border-indigo-800/50"
            title="Histori Nilai & Jawaban Siswa"
            badgeText={`${scores.length} nilai`}
            description="Menghapus rekapitulasi nilai, skor akhir, dan riwayat waktu pengumpulan ujian siswa yang sudah selesai."
            buttonLabel="Hapus Histori Nilai"
            onClick={() =>
              setConfirmAction({
                id: 'cat_scores',
                title: 'Hapus Histori Nilai Siswa?',
                description: 'Seluruh daftar rekap nilai ujian siswa akan dikosongkan.',
                dangerLabel: 'Hapus Histori Nilai',
                tone: 'rose',
                onConfirm: () => {
                  onClearScores();
                  showToast('Histori nilai siswa berhasil dihapus.');
                },
              })
            }
          />

          {/* 4. Histori Google Forms */}
          <CategoryCard
            icon={<FileText className="w-4 h-4 text-sky-400" />}
            iconBoxClass="bg-sky-950/60 border-sky-800/50"
            title="Histori Google Forms"
            badgeText={`${googleFormsCount} form`}
            description="Menghapus daftar riwayat tautan Google Form yang pernah dibuat atau diimpor serta memutus tautannya."
            buttonLabel="Hapus Histori Forms"
            onClick={() =>
              setConfirmAction({
                id: 'cat_forms',
                title: 'Hapus Histori Google Forms?',
                description:
                  'Semua tautan Google Form manual maupun tautan form yang terhubung ke paket soal akan dibersihkan.',
                dangerLabel: 'Hapus Histori Forms',
                tone: 'rose',
                onConfirm: () => {
                  localStorage.removeItem('soalpintar_manual_google_forms');
                  onClearGoogleForms();
                  showToast('Histori Google Forms berhasil dibersihkan.');
                },
              })
            }
          />

          {/* 5. Data Token Ujian Siswa */}
          <CategoryCard
            icon={<KeyRound className="w-4 h-4 text-amber-400" />}
            iconBoxClass="bg-amber-950/60 border-amber-800/50"
            title="Data Token Ujian Siswa"
            badgeText={`${tokensCount} token`}
            description="Menghapus seluruh kode token ujian yang pernah dibuat agar daftar token kembali bersih."
            buttonLabel="Hapus Data Token"
            onClick={() =>
              setConfirmAction({
                id: 'cat_tokens',
                title: 'Hapus Data Token Ujian?',
                description: 'Seluruh kode token ujian yang tersimpan akan dihapus.',
                dangerLabel: 'Hapus Data Token',
                tone: 'rose',
                onConfirm: async () => {
                  localStorage.removeItem('soalpintar_created_tokens_v2');
                  await callServerClear('tokens');
                  onClearTokens();
                  showToast('Data token ujian siswa berhasil dihapus.');
                },
              })
            }
          />

          {/* 6. Data Bank Soal */}
          <CategoryCard
            icon={<BookOpen className="w-4 h-4 text-violet-400" />}
            iconBoxClass="bg-violet-950/60 border-violet-800/50"
            title="Data Bank Soal"
            badgeText={`${packages.length} paket`}
            description="Mengosongkan seluruh paket soal ujian dan hasil generate AI yang tersimpan di penyimpanan lokal."
            buttonLabel="Hapus Bank Soal"
            onClick={() =>
              setConfirmAction({
                id: 'cat_packages',
                title: 'Hapus Data Bank Soal?',
                description: 'Seluruh paket soal di Bank Soal Guru akan dikosongkan.',
                dangerLabel: 'Hapus Bank Soal',
                tone: 'rose',
                onConfirm: () => {
                  onClearPackages();
                  showToast('Data Bank Soal berhasil dikosongkan.');
                },
              })
            }
          />
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#0b1324] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                  confirmAction.tone === 'rose'
                    ? 'bg-rose-950/60 border-rose-800/60 text-rose-400'
                    : confirmAction.tone === 'amber'
                    ? 'bg-amber-950/60 border-amber-800/60 text-amber-400'
                    : 'bg-indigo-950/60 border-indigo-800/60 text-indigo-400'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {confirmAction.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {confirmAction.description}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={executeConfirm}
                className={`px-4 py-2 text-xs font-semibold text-white rounded-xl transition-colors cursor-pointer disabled:opacity-60 ${
                  confirmAction.tone === 'rose'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : confirmAction.tone === 'amber'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {isProcessing ? 'Memproses...' : confirmAction.dangerLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
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

function useMemoFormsCount(
  packages: QuestionPackage[],
  manualForms: ManualGoogleFormEntry[]
): number {
  const pkgForms = packages.filter(
    (p) =>
      p.googleFormUrl &&
      (p.googleFormUrl.startsWith('https://docs.google.com/forms/') ||
        p.googleFormUrl.startsWith('https://forms.gle/')) &&
      !p.googleFormUrl.includes('contoh-')
  ).length;
  return manualForms.length + pkgForms;
}

interface CategoryCardProps {
  icon: React.ReactNode;
  iconBoxClass: string;
  title: string;
  badgeText: string;
  description: string;
  buttonLabel: string;
  onClick: () => void;
}

const CategoryCard: React.FC<CategoryCardProps> = ({
  icon,
  iconBoxClass,
  title,
  badgeText,
  description,
  buttonLabel,
  onClick,
}) => {
  return (
    <div className="bg-white dark:bg-[#0b1324] border border-slate-200 dark:border-slate-800/90 rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-xs">
      <div className="flex items-start gap-3.5">
        <div
          className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${iconBoxClass}`}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
              {title}
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#0e172a] border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-300 shrink-0">
              {badgeText}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
            {description}
          </p>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex justify-end">
        <button
          type="button"
          onClick={onClick}
          className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-[#0e172a] hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-2 transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5 text-slate-400" />
          <span>{buttonLabel}</span>
        </button>
      </div>
    </div>
  );
};
