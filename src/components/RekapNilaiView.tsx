import React, { useState } from 'react';
import {
  Download,
  Search,
  CheckCircle2,
  XCircle,
  Award,
  TrendingUp,
  BarChart3,
  Users,
  Filter,
  Edit3,
  Trash2,
  Plus,
  X,
  Check,
  AlertCircle,
} from 'lucide-react';
import { QuestionPackage, StudentScoreRecord } from '../types';
import { ManualGoogleFormEntry } from './GoogleFormsView';

interface RekapNilaiViewProps {
  scores: StudentScoreRecord[];
  packages?: QuestionPackage[];
  manualForms?: ManualGoogleFormEntry[];
  webAppUrl?: string;
  gasApiSecret?: string;
  onOpenGasSettings?: () => void;
  onImportScores?: (newScores: StudentScoreRecord[]) => void;
}

export const RekapNilaiView: React.FC<RekapNilaiViewProps> = ({
  scores,
  packages = [],
  manualForms = [],
  webAppUrl = '',
  gasApiSecret = '',
  onOpenGasSettings,
  onImportScores,
}) => {
  const [kkm, setKkm] = useState(75);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'tuntas' | 'belum_tuntas'>('all');
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [formIdInput, setFormIdInput] = useState('');
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Toast notification (replaces window.alert)
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Edit Student Score State (Perbaiki Data Siswa)
  const [editingScore, setEditingScore] = useState<StudentScoreRecord | null>(null);

  // Add Student Score Modal State
  const [showAddScoreModal, setShowAddScoreModal] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newNisn, setNewNisn] = useState('');
  const [newKelas, setNewKelas] = useState('VII-A');
  const [newScoreVal, setNewScoreVal] = useState('85');
  const [newMaxScoreVal, setNewMaxScoreVal] = useState('100');
  const [newViolationsVal, setNewViolationsVal] = useState('0');

  const safeScores = scores.map((s, idx) => {
    const sc = Number.isFinite(Number(s?.score)) ? Number(s.score) : 0;
    const maxSc = Number.isFinite(Number(s?.maxScore)) && Number(s.maxScore) > 0 ? Number(s.maxScore) : 100;
    const pct = Number.isFinite(Number(s?.percentage)) ? Number(s.percentage) : Math.round((sc / maxSc) * 100);
    return {
      ...s,
      id: String(s?.id || `sc-${idx}`),
      studentName: String(s?.studentName || `Siswa ${idx + 1}`),
      nisn: String(s?.nisn || '-'),
      kelas: String(s?.kelas || '-'),
      token: String(s?.token || '-'),
      score: sc,
      maxScore: maxSc,
      percentage: pct,
      submittedAt: String(s?.submittedAt || '-'),
      violations: Number.isFinite(Number(s?.violations)) ? Number(s.violations) : 0,
    };
  });

  const totalStudents = safeScores.length;
  const passedStudents = safeScores.filter((s) => s.percentage >= kkm).length;
  const passRate = totalStudents > 0 ? Math.round((passedStudents / totalStudents) * 100) : 0;
  const averageScore =
    totalStudents > 0
      ? Math.round(safeScores.reduce((acc, s) => acc + s.score, 0) / totalStudents)
      : 0;
  const highestScore = totalStudents > 0 ? Math.max(...safeScores.map((s) => s.score)) : 0;
  const lowestScore = totalStudents > 0 ? Math.min(...safeScores.map((s) => s.score)) : 0;

  const filteredScores = safeScores.filter((s) => {
    const isPassed = s.percentage >= kkm;
    const q = searchQuery.toLowerCase();
    const matchSearch =
      s.studentName.toLowerCase().includes(q) ||
      s.nisn.toLowerCase().includes(q) ||
      s.kelas.toLowerCase().includes(q);
    const matchFilter =
      selectedFilter === 'all' ||
      (selectedFilter === 'tuntas' && isPassed) ||
      (selectedFilter === 'belum_tuntas' && !isPassed);
    return matchSearch && matchFilter;
  });

  // Save edited student score
  const handleSaveEditedScore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingScore) return;
    const cleanScore = Math.max(0, Number.isFinite(Number(editingScore.score)) ? Number(editingScore.score) : 0);
    const cleanMax = Math.max(1, Number.isFinite(Number(editingScore.maxScore)) ? Number(editingScore.maxScore) : 100);
    const cleanViol = Math.max(0, Number.isFinite(Number(editingScore.violations)) ? Number(editingScore.violations) : 0);
    const pct = Math.round((cleanScore / cleanMax) * 100);
    const updated: StudentScoreRecord = {
      ...editingScore,
      studentName: String(editingScore.studentName || '').trim() || 'Siswa',
      nisn: String(editingScore.nisn || '').trim() || '-',
      kelas: String(editingScore.kelas || '').trim() || '-',
      score: cleanScore,
      maxScore: cleanMax,
      violations: cleanViol,
      percentage: pct,
      statusKetuntasan: pct >= kkm ? 'Tuntas' : 'Belum Tuntas',
    };
    const updatedList = scores.map((s) => (s.id === updated.id ? updated : s));
    if (onImportScores) {
      onImportScores(updatedList);
    }
    showToast(`Data nilai ${updated.studentName} berhasil diperbaiki.`);
    setEditingScore(null);
  };

  // Delete a student score
  const handleDeleteScore = (id: string, name: string) => {
    const updatedList = scores.filter((s) => s.id !== id);
    if (onImportScores) {
      onImportScores(updatedList);
    }
    showToast(`Data nilai ${name} telah dihapus.`);
  };

  // Add new student score record
  const handleAddNewScore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;
    const sc = Math.max(0, Number.isFinite(Number(newScoreVal)) ? Number(newScoreVal) : 0);
    const maxSc = Math.max(1, Number.isFinite(Number(newMaxScoreVal)) && Number(newMaxScoreVal) > 0 ? Number(newMaxScoreVal) : 100);
    const pct = Math.round((sc / maxSc) * 100);
    const newRecord: StudentScoreRecord = {
      id: 'sc-manual-' + Date.now(),
      studentName: newStudentName.trim(),
      nisn: newNisn.trim() || `0089${Math.floor(1000 + Math.random() * 9000)}`,
      kelas: newKelas.trim() || 'VII-A',
      token: 'MANUAL',
      score: sc,
      maxScore: maxSc,
      percentage: pct,
      statusKetuntasan: pct >= kkm ? 'Tuntas' : 'Belum Tuntas',
      submittedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      violations: Math.max(0, Number.isFinite(Number(newViolationsVal)) ? Number(newViolationsVal) : 0),
    };
    if (onImportScores) {
      onImportScores([newRecord, ...scores]);
    }
    showToast(`Data siswa ${newRecord.studentName} berhasil ditambahkan.`);
    setShowAddScoreModal(false);
    setNewStudentName('');
    setNewNisn('');
  };

  const escapeCsvCell = (value: unknown) => {
    const str = String(value ?? '');
    return `"${str.replace(/"/g, '""')}"`;
  };

  const exportCsv = () => {
    const headers = ['Nama Siswa', 'NISN', 'Kelas', 'Nilai', 'Skor Maksimal', 'Persentase', 'Status Ketuntasan (KKTP)', 'Waktu Selesai', 'Pelanggaran'];
    const rows = filteredScores.map((s) => [
      escapeCsvCell(s.studentName),
      escapeCsvCell(s.nisn),
      escapeCsvCell(s.kelas),
      escapeCsvCell(s.score),
      escapeCsvCell(s.maxScore),
      escapeCsvCell(`${s.percentage}%`),
      escapeCsvCell(s.percentage >= kkm ? 'TUNTAS' : 'BELUM TUNTAS'),
      escapeCsvCell(s.submittedAt),
      escapeCsvCell(s.violations),
    ]);

    const csvText = '\uFEFF' + [headers.map(escapeCsvCell).join(','), ...rows.map((e) => e.join(','))].join('\r\n');
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Rekap_Nilai_Soalpintar_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleOpenSync = () => {
    if (!webAppUrl) {
      if (onOpenGasSettings) {
        onOpenGasSettings();
      } else {
        showToast('Harap konfigurasikan URL Web App terlebih dahulu di menu Setting Web App (Code.gs).');
      }
      return;
    }
    setShowSyncModal(true);
  };

  const linkedFormPackages = packages.filter(
    (p) =>
      (p.formId && !p.formId.startsWith('manual-')) ||
      (p.googleFormEditUrl && p.googleFormEditUrl.includes('/forms/d/')) ||
      (p.googleFormUrl && p.googleFormUrl.includes('/forms/d/'))
  );

  const handleSyncResponses = async () => {
    const rawInput = formIdInput.trim();
    if (!rawInput) {
      showToast('Harap masukkan ID Form Google, URL Editor (/edit), atau URL Siswa (/viewform).');
      return;
    }

    let formTarget = rawInput;
    if (rawInput.includes('/d/e/')) {
      const pubMatch = rawInput.match(/\/d\/e\/([a-zA-Z0-9_-]+)/);
      if (pubMatch?.[1]) {
        formTarget = rawInput; // Send full /d/e/ link so server resolves via Code.gs v3.5.2 find_form
      }
    } else if (rawInput.includes('/d/')) {
      const editMatch = rawInput.match(/\/d\/(?!e\/)([a-zA-Z0-9_-]+)/);
      if (editMatch?.[1]) {
        formTarget = editMatch[1];
      }
    }

    if (!formTarget || formTarget === 'e') {
      setSyncFeedback('Format ID Form Google tidak valid. Pastikan menggunakan ID Editor atau tautan lengkap Google Form.');
      return;
    }

    setIsSyncing(true);
    setSyncFeedback(null);

    try {
      let offset = 0;
      let hasMore = true;
      let pageGuard = 0;
      let allRows: Record<string, any>[] = [];
      let maxScore = 100;
      let resolvedId = formTarget;
      let engineName = '';

      while (hasMore && pageGuard < 10) {
        pageGuard++;
        const res = await fetch('/api/gas/get-responses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            webAppUrl,
            apiSecret: gasApiSecret || undefined,
            form_id: resolvedId,
            offset,
            limit: 1000,
            summary_only: true,
          }),
        });

        const text = await res.text();
        let data: any = null;
        try {
          data = text ? JSON.parse(text) : null;
        } catch {
          data = null;
        }

        if (!res.ok || !data) {
          setSyncFeedback(data?.message || `Gagal terhubung ke server/Web App (HTTP ${res.status}).`);
          return;
        }

        if (!data.success || !data.data || data.data.status !== 'success') {
          setSyncFeedback('Gagal mengambil respon: ' + (data.data?.message || data.message || 'Pastikan Form ID benar & Web App v3.5.2 aktif.'));
          return;
        }

        const gasResult = data.data;
        if (data.resolved_form_id) {
          resolvedId = String(data.resolved_form_id);
        }
        if (gasResult.is_quiz === false) {
          setSyncFeedback('Google Form ini belum diatur sebagai Mode Kuis sehingga belum memiliki skor.');
          return;
        }
        if (Number(gasResult.max_score) > 0) {
          maxScore = Number(gasResult.max_score);
        }
        if (gasResult.engine) {
          engineName = String(gasResult.engine);
        }

        const batchRows = Array.isArray(gasResult.responses) ? gasResult.responses : [];
        allRows = allRows.concat(batchRows);
        hasMore = Boolean(gasResult.has_more && gasResult.next_offset !== null && gasResult.next_offset !== undefined);
        offset = hasMore ? Number(gasResult.next_offset) : 0;
      }

      if (allRows.length === 0) {
        setSyncFeedback('Form ditemukan, namun belum ada respon siswa yang masuk.');
      } else {
        const imported: StudentScoreRecord[] = allRows
          .filter((r: unknown): r is Record<string, any> => Boolean(r && typeof r === 'object'))
          .map((r: any, idx: number) => {
            const rawScore = r.score !== null && r.score !== undefined && Number.isFinite(Number(r.score)) ? Number(r.score) : 0;
            const pct = maxScore > 0 ? Math.min(100, Math.round((rawScore / maxScore) * 100)) : 0;
            let formattedTime = 'Baru saja';
            if (r.submitted_at) {
              const dt = new Date(r.submitted_at);
              if (!isNaN(dt.getTime())) {
                formattedTime = dt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
              }
            }
            return {
              id: String(r.id ? `gas-${resolvedId}-${r.id}` : `gas-${resolvedId}-${idx}`),
              studentName: String(r.name || (r.email ? String(r.email).split('@')[0] : `Siswa ${idx + 1}`)),
              nisn: r.absen ? `Absen ${r.absen}` : `0089${1000 + idx}`,
              kelas: String(r.kelas || '-'),
              token: 'GFORM-LIVE',
              score: rawScore,
              maxScore: maxScore,
              percentage: pct,
              statusKetuntasan: pct >= kkm ? 'Tuntas' : 'Belum Tuntas',
              submittedAt: formattedTime,
              violations: 0,
            };
          });

        if (onImportScores) {
          const byId = new Map(scores.map((s) => [s.id, s]));
          for (const rec of imported) {
            byId.set(rec.id, rec);
          }
          onImportScores(Array.from(byId.values()));
        }
        setSyncFeedback(
          `Berhasil mengimpor ${imported.length} data nilai respon dari Google Forms${engineName ? ` (${engineName})` : ''}!`
        );
        setTimeout(() => setShowSyncModal(false), 1800);
      }
    } catch (err: any) {
      setSyncFeedback('Terjadi kesalahan: ' + (err?.message || 'Koneksi gagal'));
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Rekap & Analisis Nilai Siswa
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Laporan rekapitulasi nilai kuis otomatis dan analisis ketuntasan tujuan pembelajaran (KKTP).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowAddScoreModal(true)}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4 text-emerald-500" />
            <span>Tambah Data Siswa</span>
          </button>
          <button
            onClick={handleOpenSync}
            className="px-3.5 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Tarik nilai dan respon langsung dari Google Form via Web App"
          >
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            Tarik Nilai Google Forms (Live)
          </button>
          <button
            onClick={exportCsv}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Download className="w-4 h-4" />
            Ekspor Rekap Excel / CSV
          </button>
        </div>
      </div>

      {/* Sync from Google Forms Modal */}
      {showSyncModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Tarik Nilai dari Google Forms via Web App v3.5.2
              </h3>
              <button
                onClick={() => setShowSyncModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Sistem akan memanggil <code className="font-mono text-emerald-600">getFormResponses()</code> di Code.gs v3.5.2 (otomatis fallback FormApp tanpa error 403, micro-cache 60 detik, dan pelacakan <code className="font-mono text-emerald-600">find_form</code>).
            </p>

            {(linkedFormPackages.length > 0 || manualForms.length > 0) && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Pilih Cepat dari Bank Soal / Form Manual:
                </label>
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) setFormIdInput(e.target.value);
                  }}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-slate-100"
                >
                  <option value="">-- Pilih Google Form --</option>
                  {linkedFormPackages.map((p) => {
                    const targetVal = p.googleFormEditUrl || p.formId || p.googleFormUrl || '';
                    return (
                      <option key={p.id} value={targetVal}>
                        {p.title} ({p.subject})
                      </option>
                    );
                  })}
                  {manualForms.map((m) => (
                    <option key={m.id} value={m.url}>
                      [Manual] {m.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                ID Google Form, Tautan Editor (/edit), atau Tautan Siswa (/viewform):
              </label>
              <input
                type="text"
                value={formIdInput}
                onChange={(e) => setFormIdInput(e.target.value)}
                placeholder="https://docs.google.com/forms/d/<ID_FORM>/edit"
                className="w-full text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-slate-100"
              />
            </div>

            {syncFeedback && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs text-slate-700 dark:text-slate-300">
                {syncFeedback}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setShowSyncModal(false)}
                className="px-3 py-1.5 text-xs text-slate-500"
              >
                Batal
              </button>
              <button
                onClick={handleSyncResponses}
                disabled={isSyncing}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50 cursor-pointer"
              >
                {isSyncing ? 'Mengambil Data...' : 'Mulai Tarik Nilai'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards: Analytical Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">Tingkat Ketuntasan</span>
            <Award className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold font-mono text-emerald-600">
            {passRate}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {passedStudents} dari {totalStudents} siswa tuntas (KKTP: {kkm})
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">Rata-Rata Kelas</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold font-mono text-slate-900 dark:text-slate-100">
            {averageScore}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Dari skala 100 poin</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">Nilai Tertinggi</span>
            <BarChart3 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold font-mono text-emerald-600">
            {highestScore}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Skor tertinggi kelas</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">Nilai Terendah</span>
            <BarChart3 className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold font-mono text-rose-600">
            {lowestScore}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Perlu program remedial</div>
        </div>
      </div>

      {/* Control Bar: KKTP threshold & Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama siswa atau NISN..."
            className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          {/* KKTP threshold slider */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 whitespace-nowrap">Batas KKTP / KKM:</span>
            <input
              type="number"
              min={0}
              max={100}
              value={kkm}
              onChange={(e) => {
                const val = Number(e.target.value);
                setKkm(Number.isFinite(val) ? Math.max(0, Math.min(100, val)) : 75);
              }}
              className="w-16 text-xs font-mono font-bold text-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md py-1 text-slate-900 dark:text-slate-100"
            />
          </div>

          {/* Segmented Filter */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-medium">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                selectedFilter === 'all' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs' : 'text-slate-500'
              }`}
            >
              Semua ({scores.length})
            </button>
            <button
              onClick={() => setSelectedFilter('tuntas')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                selectedFilter === 'tuntas' ? 'bg-white dark:bg-slate-900 text-emerald-600 font-semibold shadow-xs' : 'text-slate-500'
              }`}
            >
              Tuntas ({passedStudents})
            </button>
            <button
              onClick={() => setSelectedFilter('belum_tuntas')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                selectedFilter === 'belum_tuntas' ? 'bg-white dark:bg-slate-900 text-rose-600 font-semibold shadow-xs' : 'text-slate-500'
              }`}
            >
              Remedial ({totalStudents - passedStudents})
            </button>
          </div>
        </div>
      </div>

      {/* Scores Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Nama Siswa</th>
                <th className="py-3 px-4">NISN</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4 text-center">Nilai Ujian</th>
                <th className="py-3 px-4 text-center">Status KKTP</th>
                <th className="py-3 px-4 text-center">Pelanggaran</th>
                <th className="py-3 px-4 text-right">Waktu Submit</th>
                <th className="py-3 px-4 text-center">Aksi / Perbaiki</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredScores.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    Tidak ada data rekap nilai yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredScores.map((scoreItem) => {
                  const isPassed = scoreItem.percentage >= kkm;
                  return (
                    <tr
                      key={scoreItem.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                        {scoreItem.studentName}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">
                        {scoreItem.nisn}
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                        {scoreItem.kelas}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
                        {scoreItem.score}
                        <span className="text-[11px] text-slate-400 font-normal"> / {scoreItem.maxScore}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isPassed ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Tuntas
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-600 font-semibold">
                            <XCircle className="w-3.5 h-3.5" />
                            Belum Tuntas
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        <span className={scoreItem.violations > 0 ? 'text-rose-600 font-bold' : 'text-slate-400'}>
                          {scoreItem.violations}x
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-400 font-mono text-[11px]">
                        {scoreItem.submittedAt}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setEditingScore({ ...scoreItem })}
                            className="p-1.5 text-indigo-400 hover:text-white hover:bg-indigo-950/80 rounded-lg border border-indigo-800/40 transition-colors cursor-pointer"
                            title="Perbaiki Data Siswa / Nilai"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteScore(scoreItem.id, scoreItem.studentName)}
                            className="p-1.5 text-rose-400 hover:text-white hover:bg-rose-950/80 rounded-lg border border-rose-800/40 transition-colors cursor-pointer"
                            title="Hapus Baris Nilai"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: PERBAIKI DATA SISWA & NILAI */}
      {editingScore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="bg-[#0b1324] border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl text-slate-100 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-950 border border-indigo-800 text-indigo-400 flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Perbaiki Data Nilai Siswa</h3>
                  <p className="text-[11px] text-slate-400">Koreksi nama, NISN, skor ujian, atau pelanggaran</p>
                </div>
              </div>
              <button onClick={() => setEditingScore(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedScore} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Nama Lengkap Siswa</label>
                <input
                  type="text"
                  required
                  value={editingScore.studentName}
                  onChange={(e) => setEditingScore({ ...editingScore, studentName: e.target.value })}
                  className="w-full text-xs bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">NISN</label>
                  <input
                    type="text"
                    required
                    value={editingScore.nisn}
                    onChange={(e) => setEditingScore({ ...editingScore, nisn: e.target.value })}
                    className="w-full text-xs bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Kelas</label>
                  <input
                    type="text"
                    required
                    value={editingScore.kelas}
                    onChange={(e) => setEditingScore({ ...editingScore, kelas: e.target.value })}
                    className="w-full text-xs bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Nilai Ujian</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={editingScore.score}
                    onChange={(e) => setEditingScore({ ...editingScore, score: Math.max(0, Number(e.target.value) || 0) })}
                    className="w-full text-xs bg-slate-900 border border-emerald-600/80 rounded-lg p-2.5 text-emerald-300 font-bold font-mono text-center"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Skor Maksimal</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={editingScore.maxScore}
                    onChange={(e) => setEditingScore({ ...editingScore, maxScore: Math.max(1, Number(e.target.value) || 100) })}
                    className="w-full text-xs bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-mono text-center"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Pelanggaran</label>
                  <input
                    type="number"
                    min={0}
                    value={editingScore.violations}
                    onChange={(e) => setEditingScore({ ...editingScore, violations: Number(e.target.value) || 0 })}
                    className="w-full text-xs bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-mono text-center"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingScore(null)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white bg-slate-800 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH DATA SISWA MANUAL */}
      {showAddScoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="bg-[#0b1324] border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl text-slate-100 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Tambah Data Siswa</h3>
                  <p className="text-[11px] text-slate-400">Input nilai ujian siswa secara manual</p>
                </div>
              </div>
              <button onClick={() => setShowAddScoreModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddNewScore} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Nama Lengkap Siswa</label>
                <input
                  type="text"
                  required
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  placeholder="Contoh: Muhammad Rizki"
                  className="w-full text-xs bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">NISN (Opsional)</label>
                  <input
                    type="text"
                    value={newNisn}
                    onChange={(e) => setNewNisn(e.target.value)}
                    placeholder="0089..."
                    className="w-full text-xs bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Kelas</label>
                  <input
                    type="text"
                    required
                    value={newKelas}
                    onChange={(e) => setNewKelas(e.target.value)}
                    placeholder="VII-A"
                    className="w-full text-xs bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Nilai Ujian</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={newScoreVal}
                    onChange={(e) => setNewScoreVal(e.target.value)}
                    className="w-full text-xs bg-slate-900 border border-emerald-600/80 rounded-lg p-2.5 text-emerald-300 font-bold font-mono text-center"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Skor Maksimal</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newMaxScoreVal}
                    onChange={(e) => setNewMaxScoreVal(e.target.value)}
                    className="w-full text-xs bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-mono text-center"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Pelanggaran</label>
                  <input
                    type="number"
                    min={0}
                    value={newViolationsVal}
                    onChange={(e) => setNewViolationsVal(e.target.value)}
                    className="w-full text-xs bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-mono text-center"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddScoreModal(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white bg-slate-800 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl cursor-pointer"
                >
                  Tambah Siswa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TOAST FEEDBACK NOTIFICATION */}
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
