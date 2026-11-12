import React, { useState, useEffect } from 'react';
import { Users, ShieldAlert, AlertTriangle, RefreshCw, Send, CheckCircle2, QrCode, Copy, Search, ShieldX, PlayCircle, Check } from 'lucide-react';
import { StudentExamSession, ExamTokenConfig } from '../types';

interface LiveMonitoringViewProps {
  config: ExamTokenConfig;
  onOpenProjector: () => void;
  onOpenStudentSimulation: (token: string) => void;
}

export const LiveMonitoringView: React.FC<LiveMonitoringViewProps> = ({
  config,
  onOpenProjector,
  onOpenStudentSimulation,
}) => {
  const [participants, setParticipants] = useState<StudentExamSession[]>([]);
  const [remainingSec, setRemainingSec] = useState<number>(config.remainingSeconds);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Warning Modal
  const [warningTargetStudent, setWarningTargetStudent] = useState<StudentExamSession | null>(null);
  const [isBroadcastWarning, setIsBroadcastWarning] = useState<boolean>(false);
  const [warningText, setWarningText] = useState<string>('Peringatan Pengawas: Harap tetap fokus pada layar ujian Anda!');
  const [showWarningModal, setShowWarningModal] = useState<boolean>(false);

  const fetchLiveRoom = async () => {
    try {
      const res = await fetch(`/api/rooms/${config.token}`);
      const data = await res.json();
      if (data.success && data.room) {
        setParticipants(Object.values(data.room.participants));
        setRemainingSec(data.room.remainingSeconds);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLiveRoom();
    const interval = setInterval(fetchLiveRoom, 3000);
    return () => clearInterval(interval);
  }, [config.token]);

  const handleSendWarning = async () => {
    try {
      await fetch(`/api/rooms/${config.token}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_warning',
          studentId: isBroadcastWarning ? undefined : warningTargetStudent?.id,
          message: warningText,
        }),
      });
      setShowWarningModal(false);
      showToast('Peringatan pengawas berhasil dikirim!');
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetStudent = async (studentId: string) => {
    try {
      await fetch(`/api/rooms/${config.token}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset_unblock',
          studentId,
        }),
      });
      fetchLiveRoom();
      showToast('Siswa berhasil diizinkan ulang untuk melanjutkan ujian.');
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartExamAll = async () => {
    try {
      await fetch(`/api/rooms/${config.token}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start_exam',
        }),
      });
      fetchLiveRoom();
      showToast('Ujian serentak telah dimulai! Ruang tunggu dibuka.');
    } catch (err) {
      console.error(err);
    }
  };

  const copyExamLink = () => {
    const url = `${window.location.origin}/?mode=student&token=${config.token}`;
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const formatSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const countActive = participants.filter((p) => p.status === 'mengerjakan').length;
  const countBlocked = participants.filter((p) => p.status === 'diblokir').length;
  const countDisconnected = participants.filter((p) => p.status === 'terputus').length;
  const countDone = participants.filter((p) => p.status === 'selesai').length;

  const filtered = participants.filter((p) => {
    const matchesQuery =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.nisn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.kelas.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || p.status === filterStatus;
    return matchesQuery && matchesFilter;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Fast Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800">
              TOKEN: {config.token}
            </span>
            <span className="text-xs text-slate-500 font-mono">· Sisa Waktu: {formatSec(remainingSec)}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
            Ujian Live: Pemantauan Real-Time
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Monitoring aktivitas peserta ujian secara langsung. Deteksi siswa yang pindah tab, keluar layar penuh, atau terblokir.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={copyExamLink}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-slate-500" />
            {isCopied ? 'Tautan Tersalin' : 'Salin Tautan Soal'}
          </button>
          <button
            onClick={() => {
              setIsBroadcastWarning(true);
              setWarningTargetStudent(null);
              setShowWarningModal(true);
            }}
            className="px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-lg hover:bg-amber-100 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Kirim Peringatan Umum
          </button>
          <button
            onClick={onOpenProjector}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <QrCode className="w-3.5 h-3.5" />
            Layar QR Proyektor
          </button>
          <button
            onClick={() => onOpenStudentSimulation(config.token)}
            className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <PlayCircle className="w-3.5 h-3.5" />
            Buka Portal Siswa (Tes)
          </button>
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5">
          <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Total Peserta</span>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
            {participants.length}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5">
          <span className="text-[11px] text-emerald-600 uppercase tracking-wider font-semibold">Mengerjakan</span>
          <div className="text-xl font-bold font-mono text-emerald-600 mt-1">
            {countActive}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5">
          <span className="text-[11px] text-amber-600 uppercase tracking-wider font-semibold">Terputus / Lag</span>
          <div className="text-xl font-bold font-mono text-amber-600 mt-1">
            {countDisconnected}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5">
          <span className="text-[11px] text-rose-600 uppercase tracking-wider font-semibold">Diblokir (Curang)</span>
          <div className="text-xl font-bold font-mono text-rose-600 mt-1">
            {countBlocked}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5">
          <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Selesai Submit</span>
          <div className="text-xl font-bold font-mono text-slate-600 dark:text-slate-300 mt-1">
            {countDone}
          </div>
        </div>
      </div>

      {/* Filter and Table Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama siswa, NISN, atau kelas..."
              className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
            />
          </div>

          {/* Segmented status filter buttons */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-medium w-full md:w-auto overflow-x-auto">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                filterStatus === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Semua ({participants.length})
            </button>
            <button
              onClick={() => setFilterStatus('mengerjakan')}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                filterStatus === 'mengerjakan'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Mengerjakan ({countActive})
            </button>
            <button
              onClick={() => setFilterStatus('diblokir')}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                filterStatus === 'diblokir'
                  ? 'bg-white dark:bg-slate-900 text-rose-600 font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Diblokir ({countBlocked})
            </button>
            <button
              onClick={() => setFilterStatus('terputus')}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                filterStatus === 'terputus'
                  ? 'bg-white dark:bg-slate-900 text-amber-600 font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Terputus ({countDisconnected})
            </button>
            <button
              onClick={() => setFilterStatus('selesai')}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                filterStatus === 'selesai'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Selesai ({countDone})
            </button>
          </div>
        </div>

        {/* Live Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Nama Siswa & NISN</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4">Status Real-Time</th>
                <th className="py-3 px-4 text-center">Pelanggaran</th>
                <th className="py-3 px-4 text-center">Progres Soal</th>
                <th className="py-3 px-4 text-center">Nilai</th>
                <th className="py-3 px-4 text-right">Tindakan Pengawas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    Tidak ada siswa yang sesuai kriteria monitoring.
                  </td>
                </tr>
              ) : (
                filtered.map((student) => {
                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {student.name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          NISN: {student.nisn}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">
                        {student.kelas}
                      </td>
                      <td className="py-3 px-4">
                        {student.status === 'mengerjakan' && (
                          <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-400">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            Mengerjakan
                          </span>
                        )}
                        {student.status === 'terputus' && (
                          <span className="inline-flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-400">
                            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                            Terputus (Lag)
                          </span>
                        )}
                        {student.status === 'diblokir' && (
                          <span className="inline-flex items-center gap-1.5 font-bold text-rose-700 dark:text-rose-400">
                            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                            Diblokir Permanen
                          </span>
                        )}
                        {student.status === 'selesai' && (
                          <span className="inline-flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-400">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Selesai Submit
                          </span>
                        )}
                        {student.status === 'ruang_tunggu' && (
                          <span className="inline-flex items-center gap-1.5 font-medium text-indigo-600 dark:text-indigo-400">
                            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                            Ruang Tunggu
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        <span
                          className={`font-bold ${
                            student.violationsCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'
                          }`}
                        >
                          {student.violationsCount}x
                        </span>
                        <span className="text-slate-400 text-[10px]"> / {config.maxViolations}x</span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-slate-600 dark:text-slate-400">
                        {student.currentQuestionIndex || 1} / {config.totalQuestions || 15}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                        {student.score !== undefined ? student.score : '-'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {student.status === 'diblokir' || student.status === 'terputus' ? (
                            <button
                              onClick={() => handleResetStudent(student.id)}
                              className="px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-md hover:bg-emerald-100 transition-colors cursor-pointer"
                              title="Izinkan ulang melanjutkan pengerjaan"
                            >
                              Izinkan Ulang
                            </button>
                          ) : null}

                          <button
                            onClick={() => {
                              setIsBroadcastWarning(false);
                              setWarningTargetStudent(student);
                              setShowWarningModal(true);
                            }}
                            className="px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-md hover:bg-amber-100 transition-colors cursor-pointer"
                          >
                            Peringatan
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

      {/* Send Warning Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-md p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                {isBroadcastWarning ? 'Kirim Peringatan Umum (Seluruh Siswa)' : `Kirim Peringatan ke: ${warningTargetStudent?.name}`}
              </h3>
              <button
                onClick={() => setShowWarningModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Pesan Peringatan di Layar Siswa:
              </label>
              <textarea
                value={warningText}
                onChange={(e) => setWarningText(e.target.value)}
                rows={3}
                className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setWarningText('Peringatan: Fokus pada layar ujian, jangan menoleh atau berbicara!')}
                className="text-[10px] px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-slate-600 hover:text-slate-900"
              >
                Template 1: Menoleh
              </button>
              <button
                type="button"
                onClick={() => setWarningText('Peringatan: Terdeteksi mencoba membuka aplikasi lain / split screen!')}
                className="text-[10px] px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-slate-600 hover:text-slate-900"
              >
                Template 2: Split Screen
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setShowWarningModal(false)}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800"
              >
                Batal
              </button>
              <button
                onClick={handleSendWarning}
                className="px-4 py-1.5 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg"
              >
                Kirim Peringatan Sekarang
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
