import React, { useState, useEffect } from 'react';
import {
  Users,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  Send,
  CheckCircle2,
  QrCode,
  Copy,
  Search,
  ShieldX,
  PlayCircle,
  Check,
  Radio,
  ArrowLeft,
  X,
  Maximize2,
  ExternalLink,
} from 'lucide-react';
import { StudentExamSession, ExamTokenConfig, QuestionPackage } from '../types';
import { generateQrCodeDataUrl } from '../utils/qr';

interface LiveRoomData {
  token: string;
  quizId?: string;
  title: string;
  subject: string;
  grade?: string;
  totalQuestions?: number;
  durationMinutes: number;
  remainingSeconds: number;
  maxViolations: number;
  waitingRoomEnabled?: boolean;
  isExamStarted?: boolean;
  googleFormUrl?: string;
  googleFormEditUrl?: string;
  driveFolderUrl?: string;
  createdAt?: number;
  participants: Record<string, StudentExamSession>;
  activeCount?: number;
}

interface LiveMonitoringViewProps {
  config: ExamTokenConfig;
  onOpenProjector: () => void;
  onOpenStudentSimulation: (token: string) => void;
  packages?: QuestionPackage[];
}

export const LiveMonitoringView: React.FC<LiveMonitoringViewProps> = ({
  config,
  onOpenProjector,
  onOpenStudentSimulation,
  packages = [],
}) => {
  // Active rooms list state
  const [rooms, setRooms] = useState<LiveRoomData[]>([
    {
      token: 'LCXEIYU',
      quizId: 'quiz-segitiga-smp',
      title: 'Segitiga',
      subject: 'Segitiga',
      grade: 'SMP',
      totalQuestions: 10,
      durationMinutes: 0,
      remainingSeconds: 0,
      maxViolations: 3,
      waitingRoomEnabled: false,
      isExamStarted: true,
      googleFormUrl: '',
      driveFolderUrl: '',
      participants: {},
      activeCount: 0,
    },
    {
      token: 'ZJT0P4M',
      quizId: 'quiz-ipa-ulangan',
      title: 'Ulangan',
      subject: 'IPA',
      grade: 'SMP',
      totalQuestions: 10,
      durationMinutes: 0,
      remainingSeconds: 0,
      maxViolations: 3,
      waitingRoomEnabled: false,
      isExamStarted: true,
      googleFormUrl: '',
      driveFolderUrl: '',
      participants: {},
      activeCount: 0,
    },
  ]);

  // Selected room for detailed real-time monitoring (null = room grid overview)
  const [selectedRoomToken, setSelectedRoomToken] = useState<string | null>(null);

  // Dedicated QR Code Modal for specific room
  const [selectedQrRoom, setSelectedQrRoom] = useState<LiveRoomData | null>(null);
  const [qrModalDataUrl, setQrModalDataUrl] = useState<string>('');
  const [isCopiedQrLink, setIsCopiedQrLink] = useState(false);
  const [isCopiedToken, setIsCopiedToken] = useState(false);

  // Detail Room Monitoring State
  const [participants, setParticipants] = useState<StudentExamSession[]>([]);
  const [remainingSec, setRemainingSec] = useState<number>(config.remainingSeconds);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Warning Modal State
  const [warningTargetStudent, setWarningTargetStudent] = useState<StudentExamSession | null>(null);
  const [isBroadcastWarning, setIsBroadcastWarning] = useState<boolean>(false);
  const [warningText, setWarningText] = useState<string>('Peringatan Pengawas: Harap tetap fokus pada layar ujian Anda!');
  const [showWarningModal, setShowWarningModal] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Fetch all rooms for overview
  const fetchAllRooms = async () => {
    try {
      const res = await fetch('/api/rooms');
      const data = await res.json();
      if (data.success && Array.isArray(data.rooms)) {
        const mapped = data.rooms.map((r: any) => {
          const parts = r.participants ? Object.values(r.participants) : [];
          const active = parts.filter((p: any) => p.status === 'mengerjakan').length;
          return {
            ...r,
            activeCount: active,
          };
        });

        // Ensure LCXEIYU and ZJT0P4M are visible if not already returned
        const hasLcx = mapped.some((m: any) => m.token === 'LCXEIYU');
        const hasZjt = mapped.some((m: any) => m.token === 'ZJT0P4M');

        const initialList: LiveRoomData[] = [...mapped];
        if (!hasLcx) {
          initialList.unshift({
            token: 'LCXEIYU',
            title: 'Segitiga',
            subject: 'Segitiga',
            grade: 'SMP',
            totalQuestions: 10,
            durationMinutes: 0,
            remainingSeconds: 0,
            maxViolations: 3,
            isExamStarted: true,
            participants: {},
            activeCount: 0,
          });
        }
        if (!hasZjt) {
          initialList.push({
            token: 'ZJT0P4M',
            title: 'Ulangan',
            subject: 'IPA',
            grade: 'SMP',
            totalQuestions: 10,
            durationMinutes: 0,
            remainingSeconds: 0,
            maxViolations: 3,
            isExamStarted: true,
            participants: {},
            activeCount: 0,
          });
        }

        setRooms(initialList);
      }
    } catch (err) {
      console.error('Error fetching rooms:', err);
    }
  };

  // Fetch specific room data when in detail monitoring mode
  const fetchActiveRoomDetail = async (token: string) => {
    try {
      const res = await fetch(`/api/rooms/${token}`);
      const data = await res.json();
      if (data.success && data.room) {
        setParticipants(Object.values(data.room.participants || {}));
        setRemainingSec(data.room.remainingSeconds || 0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAllRooms();
    const interval = setInterval(fetchAllRooms, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedRoomToken) {
      fetchActiveRoomDetail(selectedRoomToken);
      const interval = setInterval(() => fetchActiveRoomDetail(selectedRoomToken), 3000);
      return () => clearInterval(interval);
    }
  }, [selectedRoomToken]);

  // Open Layar QR Modal
  const handleOpenQrModal = async (room: LiveRoomData) => {
    setSelectedQrRoom(room);
    const url = `${window.location.origin}/?mode=student&token=${room.token}`;
    const qrData = await generateQrCodeDataUrl(url);
    setQrModalDataUrl(qrData);
  };

  // Copy helpers
  const handleCopyQrUrl = () => {
    if (!selectedQrRoom) return;
    const url = `${window.location.origin}/?mode=student&token=${selectedQrRoom.token}`;
    navigator.clipboard.writeText(url);
    setIsCopiedQrLink(true);
    showToast('Tautan portal ujian siswa berhasil disalin!');
    setTimeout(() => setIsCopiedQrLink(false), 2000);
  };

  const handleCopyQrToken = () => {
    if (!selectedQrRoom) return;
    navigator.clipboard.writeText(selectedQrRoom.token);
    setIsCopiedToken(true);
    showToast(`Token "${selectedQrRoom.token}" berhasil disalin!`);
    setTimeout(() => setIsCopiedToken(false), 2000);
  };

  const handleSendWarning = async () => {
    if (!selectedRoomToken) return;
    try {
      await fetch(`/api/rooms/${selectedRoomToken}/actions`, {
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

  const handleResetStudent = async (student: StudentExamSession) => {
    if (!selectedRoomToken) return;
    try {
      await fetch(`/api/rooms/${selectedRoomToken}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset_device_lock',
          studentId: student.id,
          deviceId: student.deviceId,
          nisn: student.nisn,
        }),
      });
      fetchActiveRoomDetail(selectedRoomToken);
      showToast(`Akses & kunci perangkat untuk ${student.name} berhasil dibuka ulang.`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartExamAll = async () => {
    if (!selectedRoomToken) return;
    try {
      await fetch(`/api/rooms/${selectedRoomToken}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start_exam',
        }),
      });
      fetchActiveRoomDetail(selectedRoomToken);
      showToast('Ujian serentak telah dimulai! Ruang tunggu dibuka.');
    } catch (err) {
      console.error(err);
    }
  };

  const copyExamLink = (tok: string) => {
    const url = `${window.location.origin}/?mode=student&token=${tok}`;
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    showToast('Tautan soal berhasil disalin ke clipboard!');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const formatSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Calculate total students currently taking exams across all rooms
  const totalActiveStudents = rooms.reduce((acc, r) => acc + (r.activeCount || 0), 0);

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

  const activeRoomData = rooms.find((r) => r.token === selectedRoomToken);

  return (
    <div className="space-y-6">
      {/* =========================================================================
          VIEW MODE 1: ACTIVE ROOMS OVERVIEW (Matching Screenshot Pixel-by-Pixel)
         ========================================================================= */}
      {!selectedRoomToken ? (
        <div className="space-y-6">
          {/* Top Banner: Siswa sedang ujian di akun Anda */}
          <div className="bg-[#0b1324] border border-slate-800/80 rounded-2xl p-4 md:p-5 flex items-center gap-3.5 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-[#09221e] border border-emerald-900/50 flex items-center justify-center text-emerald-400 shrink-0">
              <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
            </div>
            <div className="text-sm font-medium text-slate-300">
              Siswa sedang ujian di akun Anda:{' '}
              <strong className="font-bold text-white ml-1">{totalActiveStudents} / 999</strong>
            </div>
          </div>

          {/* Grid of Live Exam Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {rooms.map((room) => {
              const activeCount = room.activeCount || 0;
              const durationLabel =
                room.durationMinutes && room.durationMinutes > 0
                  ? `${room.durationMinutes} menit`
                  : 'tanpa batas waktu';

              return (
                <div
                  key={room.token}
                  className="bg-[#0b1324] border border-slate-800/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:border-slate-700/80 transition-all"
                >
                  <div>
                    {/* Token Pill Badge */}
                    <span className="inline-block px-3 py-1 bg-[#18213e] border border-indigo-800/40 text-indigo-300 font-mono font-bold text-xs rounded-lg tracking-wider">
                      {room.token}
                    </span>

                    {/* Quiz Title */}
                    <h3 className="text-lg font-bold text-white mt-3.5 leading-snug">
                      {room.title}
                    </h3>

                    {/* Subject / Topic */}
                    <p className="text-xs text-slate-400 mt-1">
                      {room.subject || room.title}
                    </p>

                    {/* Meta info: X mengerjakan · tanpa batas waktu */}
                    <p className="text-xs text-slate-400 mt-3.5 flex items-center gap-1.5">
                      <span>{activeCount} mengerjakan</span>
                      <span>·</span>
                      <span>{durationLabel}</span>
                    </p>
                  </div>

                  {/* Two Action Buttons: Layar QR & Pantau */}
                  <div className="mt-6 flex items-center gap-3">
                    {/* Layar QR */}
                    <button
                      type="button"
                      onClick={() => handleOpenQrModal(room)}
                      className="flex-1 bg-[#1a233d] hover:bg-[#233054] border border-indigo-900/50 text-indigo-200 py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
                      title="Tampilkan Kode QR Ujian di Layar Proyektor"
                    >
                      <QrCode className="w-4 h-4 text-indigo-300" />
                      <span>Layar QR</span>
                    </button>

                    {/* Pantau */}
                    <button
                      type="button"
                      onClick={() => setSelectedRoomToken(room.token)}
                      className="flex-1 bg-[#0b2824] hover:bg-[#103a34] border border-emerald-900/50 text-emerald-300 py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
                      title="Buka Pemantauan Real-Time Ruang Ujian Ini"
                    >
                      <Radio className="w-4 h-4 text-emerald-400" />
                      <span>Pantau</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* =========================================================================
            VIEW MODE 2: DETAIL LIVE ROOM MONITORING (When Teacher Clicks "Pantau")
           ========================================================================= */
        <div className="space-y-6 animate-in fade-in">
          {/* Top Back Navigation & Fast Actions */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setSelectedRoomToken(null)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-xl transition-colors cursor-pointer mb-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Kembali ke Daftar Ujian Live</span>
              </button>

              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-emerald-300 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-800">
                  TOKEN: {selectedRoomToken}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  · {activeRoomData?.durationMinutes ? `Sisa: ${formatSec(remainingSec)}` : 'Tanpa Batas Waktu'}
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
                Ujian Live: {activeRoomData?.title || 'Pemantauan Real-Time'}
              </h1>
              <p className="text-xs text-slate-400">
                Materi: <strong className="text-slate-200">{activeRoomData?.subject || 'Umum'}</strong> · Deteksi otomatis perpindahan tab, split-screen, dan kecurangan siswa.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => copyExamLink(selectedRoomToken)}
                className="px-3 py-2 text-xs font-medium text-slate-300 bg-[#0e172a] border border-slate-800 rounded-xl hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Salin Tautan</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsBroadcastWarning(true);
                  setWarningTargetStudent(null);
                  setShowWarningModal(true);
                }}
                className="px-3 py-2 text-xs font-medium text-amber-300 bg-amber-950/50 border border-amber-800/60 rounded-xl hover:bg-amber-900/50 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Kirim Peringatan Umum</span>
              </button>

              {activeRoomData && (
                <button
                  type="button"
                  onClick={() => handleOpenQrModal(activeRoomData)}
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Layar QR Proyektor</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onOpenStudentSimulation(selectedRoomToken)}
                className="px-3 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <PlayCircle className="w-3.5 h-3.5" />
                <span>Tes Portal Siswa</span>
              </button>
            </div>
          </div>

          {/* KPI Overview Strip */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-[#0b1324] border border-slate-800/80 rounded-xl p-3.5">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Total Peserta</span>
              <div className="text-xl font-bold font-mono text-white mt-1">
                {participants.length}
              </div>
            </div>
            <div className="bg-[#0b1324] border border-slate-800/80 rounded-xl p-3.5">
              <span className="text-[11px] text-emerald-400 uppercase tracking-wider font-semibold">Mengerjakan</span>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                {countActive}
              </div>
            </div>
            <div className="bg-[#0b1324] border border-slate-800/80 rounded-xl p-3.5">
              <span className="text-[11px] text-amber-400 uppercase tracking-wider font-semibold">Terputus / Lag</span>
              <div className="text-xl font-bold font-mono text-amber-400 mt-1">
                {countDisconnected}
              </div>
            </div>
            <div className="bg-[#0b1324] border border-slate-800/80 rounded-xl p-3.5">
              <span className="text-[11px] text-rose-400 uppercase tracking-wider font-semibold">Diblokir (Curang)</span>
              <div className="text-xl font-bold font-mono text-rose-400 mt-1">
                {countBlocked}
              </div>
            </div>
            <div className="bg-[#0b1324] border border-slate-800/80 rounded-xl p-3.5">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Selesai Submit</span>
              <div className="text-xl font-bold font-mono text-slate-300 mt-1">
                {countDone}
              </div>
            </div>
          </div>

          {/* Filter and Table Container */}
          <div className="bg-[#0b1324] border border-slate-800/80 rounded-2xl shadow-xs overflow-hidden">
            {/* Table Toolbar */}
            <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama siswa, NISN, atau kelas..."
                  className="w-full text-xs pl-9 pr-3 py-2 bg-[#0e172a] border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Segmented status filter buttons */}
              <div className="flex items-center gap-1 p-1 bg-[#0e172a] border border-slate-800/80 rounded-xl text-xs font-medium w-full md:w-auto overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setFilterStatus('all')}
                  className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                    filterStatus === 'all'
                      ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Semua ({participants.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('mengerjakan')}
                  className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                    filterStatus === 'mengerjakan'
                      ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Mengerjakan ({countActive})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('diblokir')}
                  className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                    filterStatus === 'diblokir'
                      ? 'bg-rose-600 text-white font-semibold shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Diblokir ({countBlocked})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('terputus')}
                  className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                    filterStatus === 'terputus'
                      ? 'bg-amber-600 text-white font-semibold shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Terputus ({countDisconnected})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('selesai')}
                  className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                    filterStatus === 'selesai'
                      ? 'bg-slate-700 text-white font-semibold shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Selesai ({countDone})
                </button>
              </div>
            </div>

            {/* Live Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0e172a] border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
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
                <tbody className="divide-y divide-slate-800/60">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500 text-xs">
                        {participants.length === 0
                          ? 'Belum ada siswa yang bergabung di ruang ujian ini. Siswa dapat scan Layar QR atau memasukkan Token.'
                          : 'Tidak ada siswa yang sesuai filter pencarian.'}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((student) => {
                      return (
                        <tr
                          key={student.id}
                          className="hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-white">
                              {student.name}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              NISN: {student.nisn}
                            </div>
                            {student.deviceId && (
                              <div
                                className="text-[10px] text-slate-500 font-mono mt-0.5 truncate max-w-[200px]"
                                title={`Device ID: ${student.deviceId}`}
                              >
                                {student.deviceType ? `${student.deviceType} · ` : ''}ID: {student.deviceId.slice(0, 12)}...
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-slate-300 font-medium">
                            {student.kelas}
                          </td>
                          <td className="py-3.5 px-4">
                            {student.status === 'mengerjakan' && (
                              <span className="inline-flex items-center gap-1.5 font-medium text-emerald-400">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                Mengerjakan
                              </span>
                            )}
                            {student.status === 'terputus' && (
                              <span className="inline-flex items-center gap-1.5 font-medium text-amber-400">
                                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                Terputus (Lag)
                              </span>
                            )}
                            {student.status === 'diblokir' && (
                              <span className="inline-flex items-center gap-1.5 font-bold text-rose-400">
                                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                                Diblokir
                              </span>
                            )}
                            {student.status === 'selesai' && (
                              <span className="inline-flex items-center gap-1.5 font-medium text-slate-400">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                Selesai
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {student.violationsCount > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-950/60 text-rose-400 border border-rose-800/60">
                                <AlertTriangle className="w-3 h-3" />
                                {student.violationsCount}x Pelanggaran
                              </span>
                            ) : (
                              <span className="text-slate-500 font-mono text-[11px]">0</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="font-mono text-slate-300">
                              {student.currentQuestionIndex || 0} / {activeRoomData?.totalQuestions || 10}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {student.score !== undefined ? (
                              <span className="font-bold text-emerald-400 font-mono">
                                {student.score}
                              </span>
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {student.status === 'diblokir' || student.status === 'selesai' ? (
                                <button
                                  type="button"
                                  onClick={() => handleResetStudent(student)}
                                  className="px-2.5 py-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800 hover:bg-emerald-900/60 rounded-lg cursor-pointer"
                                >
                                  {student.status === 'selesai' ? 'Izinkan Ulang' : 'Buka Blokir'}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsBroadcastWarning(false);
                                    setWarningTargetStudent(student);
                                    setShowWarningModal(true);
                                  }}
                                  className="px-2.5 py-1 text-[11px] font-medium text-amber-300 bg-amber-950/60 border border-amber-800 hover:bg-amber-900/60 rounded-lg cursor-pointer"
                                >
                                  Tegur
                                </button>
                              )}
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
        </div>
      )}

      {/* =========================================================================
          MODAL: LAYAR QR CODE (For Projector / Big Screen Classroom Display)
         ========================================================================= */}
      {selectedQrRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-[#0b1324] border border-slate-800 rounded-3xl w-full max-w-lg p-6 md:p-8 shadow-2xl text-white text-center space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-indigo-400" />
                <span className="font-bold text-base text-white">Layar QR Ujian Siswa</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedQrRoom(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Room Info */}
            <div>
              <h2 className="text-xl font-extrabold text-white">{selectedQrRoom.title}</h2>
              <p className="text-xs text-slate-400 mt-1">
                {selectedQrRoom.subject || 'Umum'} · {selectedQrRoom.grade || 'SMP'}
              </p>
            </div>

            {/* QR Code Graphic Box */}
            <div className="bg-white p-5 rounded-2xl inline-block mx-auto shadow-xl border-4 border-slate-800">
              {qrModalDataUrl ? (
                <img
                  src={qrModalDataUrl}
                  alt="QR Code Ujian Siswa"
                  className="w-56 h-56 object-contain mx-auto"
                />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-slate-800 text-xs">
                  Membuat QR Code...
                </div>
              )}
            </div>

            {/* Big Token Display */}
            <div className="bg-[#0e172a] border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
              <div className="text-left">
                <span className="block text-[11px] text-slate-400 uppercase font-semibold">Kode Token Ujian</span>
                <span className="text-2xl font-mono font-black text-indigo-300 tracking-widest">
                  {selectedQrRoom.token}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyQrToken}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {isCopiedToken ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopiedToken ? 'Tersalin' : 'Salin Token'}</span>
              </button>
            </div>

            {/* Instructions */}
            <p className="text-xs text-slate-400 leading-relaxed">
              Siswa cukup membuka kamera ponsel atau tablet dan memindai QR di atas untuk langsung masuk ke portal ujian anti-curang.
            </p>

            {/* Modal Bottom Buttons */}
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleCopyQrUrl}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {isCopiedQrLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopiedQrLink ? 'Tautan Tersalin' : 'Salin Tautan'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedRoomToken(selectedQrRoom.token);
                  setSelectedQrRoom(null);
                }}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Buka Pantauan Live</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: KIRIM PERINGATAN (Warning Broadcast / Individual)
         ========================================================================= */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-[#0b1324] border border-amber-900/60 rounded-2xl w-full max-w-md p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-950/70 border border-amber-800/60 text-amber-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {isBroadcastWarning ? 'Peringatan ke Semua Siswa' : `Teguran ke ${warningTargetStudent?.name}`}
                </h3>
                <p className="text-xs text-slate-400">
                  Peringatan akan bergetar dan muncul melayang di layar ponsel/laptop siswa.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Isi Pesan Peringatan
              </label>
              <textarea
                value={warningText}
                onChange={(e) => setWarningText(e.target.value)}
                rows={3}
                className="w-full text-xs bg-[#0e172a] border border-slate-800 rounded-xl p-3 text-white focus:outline-hidden focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowWarningModal(false)}
                className="px-3.5 py-2 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSendWarning}
                className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors cursor-pointer shadow-xs"
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
