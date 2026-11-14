import React, { useState } from 'react';
import {
  Calendar,
  BarChart2,
  HelpCircle,
  FileText,
  Key,
  ShieldAlert,
  Sparkles,
  Layers,
  CheckCircle2,
  ArrowRight,
  Zap,
  Check,
  X,
} from 'lucide-react';
import { QuestionPackage, StudentViolationLog, ExamTokenConfig } from '../types';
import { ManualGoogleFormEntry } from './GoogleFormsView';

interface DashboardViewProps {
  teacherName?: string;
  packages: QuestionPackage[];
  manualForms?: ManualGoogleFormEntry[];
  violations: StudentViolationLog[];
  examConfig: ExamTokenConfig;
  onNavigate: (tabId: string) => void;
  onSelectPackageForDistribution: (pkg: QuestionPackage) => void;
}

const isValidGoogleFormUrl = (url?: string): boolean => {
  if (!url || typeof url !== 'string') return false;
  return (
    (url.startsWith('https://docs.google.com/forms/') || url.startsWith('https://forms.gle/')) &&
    !url.includes('contoh-')
  );
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  teacherName = 'Yana Periyana',
  packages,
  manualForms = [],
  violations,
  examConfig,
  onNavigate,
  onSelectPackageForDistribution,
}) => {
  // UTS schedule modal state
  const [showUtsModal, setShowUtsModal] = useState(false);
  const [utsDate, setUtsDate] = useState('2026-10-15');
  const [utsStudentCount, setUtsStudentCount] = useState('320');
  const [utsNotes, setUtsNotes] = useState('Asesmen Tengah Semester Ganjil SMP');
  const [utsScheduled, setUtsScheduled] = useState(false);

  // Dynamic calculations from database
  const totalQuiz = packages.length;
  const totalSoal = packages.reduce((acc, p) => acc + (p.questions?.length || 0), 0);
  const linkedPkgFormsCount = packages.filter((p) => isValidGoogleFormUrl(p.googleFormUrl)).length;
  const googleFormsCount = linkedPkgFormsCount + manualForms.length;

  const { activeTokensCount, totalTokensCount } = (() => {
    try {
      const saved = localStorage.getItem('soalpintar_created_tokens_v2');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const valid = parsed.filter((t) => t && typeof t === 'object' && t.token);
          const active = valid.filter((t) => t.isActive !== false).length;
          return { activeTokensCount: active, totalTokensCount: valid.length };
        }
      }
    } catch {
      // Ignore storage error
    }
    const hasDefault = Boolean(examConfig.token && examConfig.token.trim());
    return { activeTokensCount: hasDefault ? 1 : 0, totalTokensCount: hasDefault ? 1 : 0 };
  })();

  // Check violations in the past 24 hours
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const recentViolations = violations.filter((v) => Number(v.timestamp) > oneDayAgo);

  const handleSaveUts = (e: React.FormEvent) => {
    e.preventDefault();
    setUtsScheduled(true);
    setShowUtsModal(false);
  };

  return (
    <div className="space-y-6 text-slate-100">
      {/* 1. Header Zone */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Dashboard</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Selamat datang, {teacherName}!
          </p>
        </div>

        {/* Role Pill */}
        <div className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/80 text-emerald-400 text-xs font-semibold shadow-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Guru</span>
        </div>
      </div>

      {/* 2. Banner: Kapan UTS di sekolah Anda? */}
      <div className="bg-[#0c1322] border border-slate-800/80 rounded-2xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-sm">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-800/60 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">
              {utsScheduled
                ? `Jadwal UTS Terjadwal: ${utsDate} (${utsStudentCount} Siswa)`
                : 'Kapan UTS di sekolah Anda?'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              {utsScheduled
                ? 'Server cloud telah dipersiapkan dan dioptimalkan untuk kelancaran sesi ujian sekolah Anda.'
                : 'Isi tanggal dan jumlah siswanya (± 1 menit). Kami pakai untuk menyiapkan server agar ujian lancar.'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowUtsModal(true)}
          className="self-start md:self-auto whitespace-nowrap px-4 py-2 bg-[#4f46e5] hover:bg-[#4338ca] active:bg-[#3730a3] text-white text-xs font-medium rounded-xl transition-colors cursor-pointer shadow-sm shrink-0"
        >
          {utsScheduled ? 'Ubah jadwal' : 'Isi jadwal'}
        </button>
      </div>

      {/* 3. 4 Stat Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Quiz */}
        <div className="bg-[#0b1324] border border-slate-800/80 rounded-2xl p-5 space-y-4 shadow-sm hover:border-slate-700/80 transition-colors">
          <div className="w-9 h-9 rounded-xl bg-indigo-950/80 border border-indigo-800/50 text-indigo-400 flex items-center justify-center">
            <BarChart2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-3xl font-extrabold font-mono text-white tracking-tight">
              {totalQuiz}
            </div>
            <div className="text-xs text-slate-400 mt-1 font-medium">Total Quiz</div>
          </div>
        </div>

        {/* Card 2: Total Soal */}
        <div className="bg-[#0b1324] border border-slate-800/80 rounded-2xl p-5 space-y-4 shadow-sm hover:border-slate-700/80 transition-colors">
          <div className="w-9 h-9 rounded-xl bg-teal-950/80 border border-teal-800/50 text-teal-400 flex items-center justify-center">
            <HelpCircle className="w-4 h-4" />
          </div>
          <div>
            <div className="text-3xl font-extrabold font-mono text-white tracking-tight">
              {totalSoal}
            </div>
            <div className="text-xs text-slate-400 mt-1 font-medium">Total Soal</div>
          </div>
        </div>

        {/* Card 3: Google Forms */}
        <div className="bg-[#0b1324] border border-slate-800/80 rounded-2xl p-5 space-y-4 shadow-sm hover:border-slate-700/80 transition-colors">
          <div className="w-9 h-9 rounded-xl bg-amber-950/80 border border-amber-800/50 text-amber-400 flex items-center justify-center">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="text-3xl font-extrabold font-mono text-white tracking-tight">
              {googleFormsCount}
            </div>
            <div className="text-xs text-slate-400 mt-1 font-medium">Google Forms</div>
          </div>
        </div>

        {/* Card 4: Token Aktif */}
        <div className="bg-[#0b1324] border border-slate-800/80 rounded-2xl p-5 space-y-4 shadow-sm hover:border-slate-700/80 transition-colors">
          <div className="w-9 h-9 rounded-xl bg-rose-950/80 border border-rose-800/50 text-rose-400 flex items-center justify-center">
            <Key className="w-4 h-4" />
          </div>
          <div>
            <div className="text-3xl font-extrabold font-mono text-white tracking-tight">
              {totalTokensCount > 0 ? (
                <>
                  {activeTokensCount}
                  <span className="text-lg font-normal text-slate-500">/{totalTokensCount}</span>
                </>
              ) : (
                '0/0'
              )}
            </div>
            <div className="text-xs text-slate-400 mt-1 font-medium">Token Aktif</div>
          </div>
        </div>
      </div>

      {/* 4. Section: Pelanggaran Ujian */}
      <div className="bg-[#0b1324] border border-slate-800/80 rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800/60 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-950/70 border border-rose-900/60 text-rose-400 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Pelanggaran Ujian</h3>
              <p className="text-[11px] text-slate-400">
                {recentViolations.length} pelanggaran hari ini · menampilkan 24 jam terakhir
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('pelanggaran')}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 transition-colors self-start sm:self-auto cursor-pointer"
          >
            <span>Lihat riwayat lengkap</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Empty state or recent violations list */}
        {recentViolations.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            Belum ada pelanggaran dalam 24 jam terakhir. 👍
          </div>
        ) : (
          <div className="space-y-2 pt-1">
            {recentViolations.slice(0, 3).map((v) => {
              const dt = new Date(Number(v.timestamp) || Date.now());
              const timeStr = isNaN(dt.getTime())
                ? '-'
                : dt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
              return (
                <div
                  key={v.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 text-xs"
                >
                  <div>
                    <span className="font-semibold text-slate-200">{v.studentName || 'Siswa'}</span>
                    <span className="text-slate-500 ml-2">({v.kelas || '-'})</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-rose-400 font-semibold">{v.type}</span>
                    <span className="text-slate-500 font-mono text-[11px]">
                      {timeStr}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Lower Section: 2 Columns (Aksi Cepat Left, Quiz Terbaru Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Aksi Cepat */}
        <div className="lg:col-span-5 space-y-3.5">
          <h2 className="text-base font-bold text-white tracking-tight">Aksi Cepat</h2>

          <div className="space-y-3">
            {/* Action 1: Generate Soal AI */}
            <button
              onClick={() => onNavigate('generator')}
              className="w-full text-left p-3.5 rounded-2xl bg-[#0b1324] border border-slate-800/80 hover:border-slate-700 hover:bg-[#0e172c] transition-all flex items-center justify-between group cursor-pointer shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-950/80 border border-teal-800/60 text-teal-400 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-teal-300 transition-colors">
                    Generate Soal AI
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Buat soal otomatis dengan AI
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
            </button>

            {/* Action 2: Bank Soal */}
            <button
              onClick={() => onNavigate('bank')}
              className="w-full text-left p-3.5 rounded-2xl bg-[#0b1324] border border-slate-800/80 hover:border-slate-700 hover:bg-[#0e172c] transition-all flex items-center justify-between group cursor-pointer shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-800/60 text-indigo-400 flex items-center justify-center shrink-0">
                  <BarChart2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                    Bank Soal
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Lihat koleksi soal Anda
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
            </button>

            {/* Action 3: Token Siswa */}
            <button
              onClick={() => onNavigate('token')}
              className="w-full text-left p-3.5 rounded-2xl bg-[#0b1324] border border-slate-800/80 hover:border-slate-700 hover:bg-[#0e172c] transition-all flex items-center justify-between group cursor-pointer shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-950/80 border border-amber-800/60 text-amber-400 flex items-center justify-center shrink-0">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                    Token Siswa
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Kelola token akses ujian
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
            </button>

            {/* Subscription Card: Paket Basic */}
            <div className="p-4 rounded-2xl bg-[#0b1324] border border-emerald-900/40 space-y-3 shadow-sm">
              <button
                onClick={() => onNavigate('paket')}
                className="w-full text-left flex items-start justify-between cursor-pointer group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">Paket Anda</div>
                    <div className="text-xs font-bold text-emerald-400 mt-0.5">
                      Paket Basic
                    </div>
                    <div className="text-[11px] text-emerald-400/90 font-medium">
                      Siswa ujian bersamaan tanpa batas
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 font-mono">
                      Aktif s/d 07 Sep 2027
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors mt-2" />
              </button>

              <div className="pt-2 border-t border-slate-800/80">
                <button
                  onClick={() => onNavigate('paket')}
                  className="w-full text-left text-[11px] text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Upgrade Paket Sekolah Pro: siswa tanpa batas + 10 akun guru</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Quiz Terbaru */}
        <div className="lg:col-span-7 space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white tracking-tight">Quiz Terbaru</h2>
            <button
              onClick={() => onNavigate('bank')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>Lihat Semua</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* List of Quizzes */}
          <div className="space-y-3">
            {packages.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 bg-[#0b1324] border border-slate-800/80 rounded-2xl">
                Belum ada kuis yang dibuat. Klik Generate Soal AI untuk membuat kuis baru!
              </div>
            ) : (
              packages.slice(0, 5).map((pkg) => {
                const gradeStr = String(pkg.grade || 'SMP');
                const titleStr = String(pkg.title || pkg.subject || 'Kuis');
                const subjectStr = String(pkg.subject || 'Umum');
                const badgeTop = gradeStr.includes('SMA') ? 'SMA' : gradeStr.includes('SD') ? 'SD' : 'SMP';
                const badgeSub = gradeStr.includes('7')
                  ? 'Kelas 7'
                  : gradeStr.includes('8')
                  ? 'Kelas 8'
                  : gradeStr.includes('9')
                  ? 'Kelas 9'
                  : '';
                const hasRealForm = isValidGoogleFormUrl(pkg.googleFormUrl);

                return (
                  <div
                    key={pkg.id}
                    onClick={() => onSelectPackageForDistribution(pkg)}
                    className="p-4 rounded-2xl bg-[#0b1324] border border-slate-800/80 hover:border-slate-700 hover:bg-[#0e172c] transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 cursor-pointer group shadow-sm"
                  >
                    <div className="flex items-center gap-3.5">
                      {/* Subject/Grade Box */}
                      <div className="w-12 h-12 rounded-xl bg-[#131d36] border border-indigo-900/50 text-indigo-400 flex flex-col items-center justify-center text-center p-1 shrink-0 font-bold">
                        <span className="text-[11px] leading-tight text-indigo-300">{badgeTop}</span>
                        {badgeSub && (
                          <span className="text-[9px] leading-tight text-indigo-400 font-normal">{badgeSub}</span>
                        )}
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                          {subjectStr === 'Ilmu Pengetahuan Alam (IPA)'
                            ? 'IPA'
                            : titleStr.split(':')[0].length < 25
                            ? titleStr.split(':')[0]
                            : subjectStr}
                        </h4>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {(pkg.questions || []).length} soal · {pkg.timeAgo || pkg.createdAt || 'Baru saja'}
                        </div>
                      </div>
                    </div>

                    {/* Right Tag Badges */}
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      {hasRealForm ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-900/60 px-2 py-0.5 rounded-md">
                          <Check className="w-3 h-3 text-emerald-400" />
                          Form
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-slate-400 bg-slate-800/70 border border-slate-700/60 px-2 py-0.5 rounded-md">
                          CBT Lokal
                        </span>
                      )}
                      <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-950/40 border border-emerald-900/40 px-2 py-0.5 rounded-md">
                        {pkg.status || 'Siap'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* UTS Schedule Modal */}
      {showUtsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-[#0b1324] border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <span>Jadwalkan UTS / Ujian Sekolah</span>
              </div>
              <button
                onClick={() => setShowUtsModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Sistem Soalpintar.ai menggunakan data jadwal ini untuk menyiapkan dan mengalokasikan server agar pengerjaan siswa tidak mengalami lag atau kendala akses.
            </p>

            <form onSubmit={handleSaveUts} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tanggal Pelaksanaan UTS:
                </label>
                <input
                  type="date"
                  value={utsDate}
                  onChange={(e) => setUtsDate(e.target.value)}
                  className="w-full text-xs bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Perkiraan Jumlah Siswa Bersamaan:
                </label>
                <input
                  type="number"
                  value={utsStudentCount}
                  onChange={(e) => setUtsStudentCount(e.target.value)}
                  placeholder="Contoh: 320"
                  className="w-full text-xs font-mono bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Keterangan / Jenjang:
                </label>
                <input
                  type="text"
                  value={utsNotes}
                  onChange={(e) => setUtsNotes(e.target.value)}
                  className="w-full text-xs bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowUtsModal(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl"
                >
                  Simpan Jadwal Server
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
