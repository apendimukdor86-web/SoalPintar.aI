import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, ShieldCheck, Maximize2, ZoomIn, ZoomOut, AlertTriangle, Clock, CheckCircle2, RefreshCw, Send, ArrowLeft, BookOpen, FileSpreadsheet, Sparkles } from 'lucide-react';
import { ExamTokenConfig, QuestionPackage } from '../types';

interface SecureExamPlayerProps {
  initialToken?: string;
  defaultPackages: QuestionPackage[];
  onExitToTeacherDashboard: () => void;
}

export const SecureExamPlayer: React.FC<SecureExamPlayerProps> = ({
  initialToken = 'ZJT0P4M',
  defaultPackages,
  onExitToTeacherDashboard,
}) => {
  // Student Auth State
  const [token, setToken] = useState(initialToken.toUpperCase());
  const [studentName, setStudentName] = useState('');
  const [studentNisn, setStudentNisn] = useState('');
  const [studentKelas, setStudentKelas] = useState('VII-A');
  const [hasStarted, setHasStarted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExamCompleted, setIsExamCompleted] = useState(false);
  const [examResult, setExamResult] = useState<{ score: number; maxScore: number; percentage: number } | null>(null);

  // Room config state
  const [room, setRoom] = useState<ExamTokenConfig | null>(null);
  const [remainingSec, setRemainingSec] = useState<number>(90 * 60);
  const [isWaitingRoom, setIsWaitingRoom] = useState(false);

  // Anti-Cheat State
  const [violationsCount, setViolationsCount] = useState<number>(0);
  const [penaltySecondsRemaining, setPenaltySecondsRemaining] = useState<number>(0);
  const [isPenaltyActive, setIsPenaltyActive] = useState<boolean>(false);
  const [penaltyReason, setPenaltyReason] = useState<string>('');
  const [isPermanentlyBlocked, setIsPermanentlyBlocked] = useState<boolean>(false);
  const [incomingTeacherWarning, setIncomingTeacherWarning] = useState<string | null>(null);

  // Zoom feature (80% - 125%)
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Tab switch mode inside player: 'cbt_interactive' or 'google_form'
  const [activeSheetTab, setActiveSheetTab] = useState<'cbt_interactive' | 'google_form'>('cbt_interactive');

  // Interactive Answers State
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);

  const studentIdRef = useRef<string>('std-' + Math.random().toString(36).substring(2, 8));
  const lastWindowWidthRef = useRef<number>(window.innerWidth);

  // Fetch Room on token change
  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const res = await fetch(`/api/rooms/${token}`);
        const data = await res.json();
        if (data.success && data.room) {
          setRoom(data.room);
          setRemainingSec(data.room.remainingSeconds);
        }
      } catch (err) {
        console.error(err);
      }
    };
    if (token) fetchRoom();
  }, [token]);

  // Questions to display: from room if matched with package or fallback default package
  const activePackage = defaultPackages.find((p) => p.title === room?.title) || defaultPackages[0];
  const questions = activePackage?.questions || [];

  // Register Violation Helper
  const reportViolation = async (type: 'Pindah Tab' | 'Keluar Fullscreen' | 'Split Screen / Resize' | 'Aplikasi Mengambang' | 'Kombinasi Tombol Dilarang') => {
    if (!hasStarted || isExamCompleted || isPenaltyActive || isPermanentlyBlocked) return;

    const nextCount = violationsCount + 1;
    setViolationsCount(nextCount);
    setPenaltyReason(type);
    setIsPenaltyActive(true);
    setPenaltySecondsRemaining(10);

    const maxLimit = room?.maxViolations || 3;
    if (nextCount >= maxLimit) {
      setIsPermanentlyBlocked(true);
    }

    try {
      await fetch(`/api/rooms/${token}/student-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: studentIdRef.current,
          name: studentName,
          nisn: studentNisn,
          kelas: studentKelas,
          newViolation: {
            type,
            penaltySeconds: 10,
          },
        }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Fullscreen, Visibility, Resize Detection Listeners
  useEffect(() => {
    if (!hasStarted || isExamCompleted) return;

    // 1. Fullscreen Change
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && hasStarted && !isPenaltyActive && !isPermanentlyBlocked) {
        reportViolation('Keluar Fullscreen');
      }
    };

    // 2. Tab Switch / Window Hidden
    const handleVisibilityChange = () => {
      if (document.hidden && hasStarted && !isPenaltyActive && !isPermanentlyBlocked) {
        reportViolation('Pindah Tab');
      }
    };

    // 3. Window Blur (e.g. clicking floating app or notification)
    const handleWindowBlur = () => {
      if (hasStarted && !isPenaltyActive && !isPermanentlyBlocked) {
        reportViolation('Aplikasi Mengambang');
      }
    };

    // 4. Split Screen / Resize Detection
    const handleWindowResize = () => {
      const currentWidth = window.innerWidth;
      // If width shrinks by > 20% suddenly
      if (lastWindowWidthRef.current - currentWidth > 220) {
        reportViolation('Split Screen / Resize');
      }
      lastWindowWidthRef.current = currentWidth;
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('resize', handleWindowResize);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('resize', handleWindowResize);
    };
  }, [hasStarted, isExamCompleted, isPenaltyActive, isPermanentlyBlocked, violationsCount]);

  // Penalty 10s Countdown
  useEffect(() => {
    if (!isPenaltyActive) return;
    if (penaltySecondsRemaining <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setPenaltySecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPenaltyActive, penaltySecondsRemaining]);

  // Periodic Heartbeat Sync with Teacher Server
  useEffect(() => {
    if (!hasStarted || isExamCompleted) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/rooms/${token}/student-sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: studentIdRef.current,
            name: studentName,
            nisn: studentNisn,
            kelas: studentKelas,
            currentQuestionIndex: currentQIndex + 1,
          }),
        });
        const data = await res.json();
        if (data.success) {
          if (data.roomRemainingSeconds !== undefined) {
            setRemainingSec(data.roomRemainingSeconds);
          }
          if (data.warningMessage) {
            setIncomingTeacherWarning(data.warningMessage);
          }
          // Teacher unblocked student
          if (data.isBlocked === false && isPermanentlyBlocked) {
            setIsPermanentlyBlocked(false);
            setIsPenaltyActive(false);
            setViolationsCount(0);
          }
          // Waiting room unlocked by teacher
          if (data.isExamStarted && isWaitingRoom) {
            setIsWaitingRoom(false);
          }
        }
      } catch (e) {
        console.error(e);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [hasStarted, isExamCompleted, token, studentName, studentNisn, studentKelas, currentQIndex, isPermanentlyBlocked, isWaitingRoom]);

  const [loginError, setLoginError] = useState<string | null>(null);

  // Start Exam Handler with Fullscreen Lock
  const handleStartExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    if (!studentName.trim() || !studentNisn.trim()) {
      setLoginError('Harap lengkapi Nama Lengkap dan NISN terlebih dahulu.');
      return;
    }

    // Check waiting room
    if (room?.waitingRoomEnabled && !room.isExamStarted) {
      setIsWaitingRoom(true);
    }

    // Request Fullscreen
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (err) {
      console.warn('Fullscreen request bypassed or denied:', err);
    }

    setHasStarted(true);
    lastWindowWidthRef.current = window.innerWidth;

    // Initial sync
    fetch(`/api/rooms/${token}/student-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: studentIdRef.current,
        name: studentName,
        nisn: studentNisn,
        kelas: studentKelas,
        status: room?.waitingRoomEnabled && !room?.isExamStarted ? 'ruang_tunggu' : 'mengerjakan',
      }),
    });
  };

  // Resume from 10s penalty
  const handleResumeFromPenalty = async () => {
    if (penaltySecondsRemaining > 0) return;
    try {
      if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch (e) {}
    setIsPenaltyActive(false);
  };

  // Submit Exam
  const handleSubmitExam = () => {
    setShowSubmitModal(true);
  };

  const executeSubmitExam = async () => {
    setShowSubmitModal(false);
    setIsSubmitting(true);

    // Calculate score
    let totalPoints = 0;
    let earnedPoints = 0;

    questions.forEach((q) => {
      const qPts = q.points || 10;
      totalPoints += qPts;
      if (answers[q.number] && answers[q.number].trim().toUpperCase() === q.correctAnswer.trim().toUpperCase()) {
        earnedPoints += qPts;
      }
    });

    const calculatedPercentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 80;

    try {
      await fetch(`/api/rooms/${token}/student-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: studentIdRef.current,
          name: studentName,
          nisn: studentNisn,
          kelas: studentKelas,
          status: 'selesai',
          score: earnedPoints,
          totalScore: totalPoints,
        }),
      });
    } catch (e) {
      console.error(e);
    }

    setExamResult({
      score: earnedPoints,
      maxScore: totalPoints,
      percentage: calculatedPercentage,
    });
    setIsExamCompleted(true);
    setIsSubmitting(false);

    // Exit fullscreen if desired
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  };

  const formatSeconds = (sec: number) => {
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    const seconds = sec % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // 1. Entry Gate / Login Screen
  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Portal Ujian CBT Siswa (Secure Exam)
            </h1>
            <p className="text-xs text-slate-400">
              Sistem Ujian Aman Berbasis Komputer & Google Forms Anti-Curang
            </p>
          </div>

          <form onSubmit={handleStartExam} className="space-y-4">
            {loginError && (
              <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Kode Token Ujian
              </label>
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value.toUpperCase())}
                placeholder="Misal: ZJT0P4M"
                required
                className="w-full font-mono text-center font-bold tracking-widest text-lg bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-emerald-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Nama Lengkap Siswa
              </label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Nama sesuai absen kelas"
                required
                className="w-full text-xs bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  NISN / No. Ujian
                </label>
                <input
                  type="text"
                  value={studentNisn}
                  onChange={(e) => setStudentNisn(e.target.value)}
                  placeholder="00892837..."
                  required
                  className="w-full text-xs font-mono bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Kelas / Rombel
                </label>
                <input
                  type="text"
                  value={studentKelas}
                  onChange={(e) => setStudentKelas(e.target.value)}
                  placeholder="VII-A"
                  required
                  className="w-full text-xs bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Rules Reminder */}
            <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/90 text-[11px] text-slate-400 space-y-1.5 leading-relaxed">
              <div className="font-semibold text-amber-400 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Ketentuan Integritas Ujian:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-300">
                <li>Layar akan otomatis terkunci ke <strong>Fullscreen (Layar Penuh)</strong>.</li>
                <li>Dilarang berpindah tab, membuka split screen, atau memperkecil browser.</li>
                <li>Setiap kecurangan memicu <strong>Penalti 10 Detik</strong> atau <strong>Blokir Permanen</strong>.</li>
              </ul>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg"
            >
              <Maximize2 className="w-4 h-4" />
              Mulai Ujian Aman (Kunci Fullscreen)
            </button>
          </form>

          <div className="pt-2 text-center">
            <button
              onClick={onExitToTeacherDashboard}
              className="text-xs text-slate-500 hover:text-slate-300 flex items-center justify-center gap-1 mx-auto"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Kembali ke Dashboard Guru
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Waiting Room Screen
  if (isWaitingRoom) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center p-6 text-center">
        <div className="max-w-md space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-950/60 border border-indigo-500/40 text-indigo-400 flex items-center justify-center mx-auto animate-pulse">
            <Clock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold">Ruang Tunggu Ujian (Waiting Room)</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Identitas Anda (<span className="text-white font-semibold">{studentName}</span> - {studentKelas}) telah tercatat. Harap menunggu pengawas kelas memulai ujian serentak.
          </p>
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-emerald-400">
            Status: Menunggu Sinyal Pengawas...
          </div>
        </div>
      </div>
    );
  }

  // 3. Exam Finished Result Screen
  if (isExamCompleted && examResult) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center p-6">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-center space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-white">Ujian Berhasil Dikumpulkan!</h2>
            <p className="text-xs text-slate-400 mt-1">
              Jawaban Anda telah tersimpan di sistem Soalpintar.ai & Google Forms.
            </p>
          </div>

          <div className="p-5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3">
            <div className="text-xs text-slate-400 uppercase font-semibold">Perolehan Nilai Kuis</div>
            <div className="text-4xl font-extrabold font-mono text-emerald-400">
              {examResult.score} <span className="text-base text-slate-500">/ {examResult.maxScore}</span>
            </div>
            <div className="text-xs text-slate-300 font-medium">
              Skor Persentase: {examResult.percentage}% · Status: {examResult.percentage >= 75 ? 'Tuntas (KKTP Tercapai)' : 'Perlu Remedial'}
            </div>
          </div>

          <div className="text-xs text-slate-400 space-y-1 text-left bg-slate-800/40 p-3 rounded-lg">
            <div>Siswa: <span className="text-white font-medium">{studentName}</span></div>
            <div>NISN: <span className="text-white font-mono">{studentNisn}</span></div>
            <div>Total Pelanggaran: <span className="text-white font-mono">{violationsCount}x</span></div>
          </div>

          <button
            onClick={onExitToTeacherDashboard}
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Selesai & Keluar ke Menu Utama
          </button>
        </div>
      </div>
    );
  }

  // Active Question for interactive mode
  const currentQ = questions[currentQIndex] || questions[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden select-none">
      {/* 4. Layar Penalti 10 Detik (Anti-Cheat Lock) */}
      {isPenaltyActive && !isPermanentlyBlocked && (
        <div className="fixed inset-0 z-50 bg-black/95 text-white flex flex-col items-center justify-center p-6 text-center backdrop-blur-md">
          <div className="max-w-md space-y-5 animate-bounce">
            <div className="w-16 h-16 rounded-2xl bg-rose-600/20 border border-rose-500 text-rose-500 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div>
              <div className="text-xs uppercase font-extrabold tracking-widest text-rose-500">
                PERINGATAN SANKSI DISIPLIN CBT
              </div>
              <h2 className="text-2xl font-black mt-1">Layar Terkunci: 10 Detik</h2>
              <p className="text-xs text-slate-400 mt-2">
                Terdeteksi pelanggaran: <strong className="text-white">{penaltyReason}</strong>.
                Layar dibekukan selama 10 detik sebelum Anda diizinkan melanjutkan ujian.
              </p>
            </div>

            {/* Giant Countdown */}
            <div className="py-2">
              <div className="text-6xl font-black font-mono text-rose-500">
                {penaltySecondsRemaining}s
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Pelanggaran ke-{violationsCount} dari {room?.maxViolations || 3}x batas toleransi.
              </div>
            </div>

            <button
              onClick={handleResumeFromPenalty}
              disabled={penaltySecondsRemaining > 0}
              className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-all ${
                penaltySecondsRemaining === 0
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-lg'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              {penaltySecondsRemaining > 0
                ? `Tunggu ${penaltySecondsRemaining} detik...`
                : 'Saya Mengerti & Kembali ke Fullscreen Ujian'}
            </button>
          </div>
        </div>
      )}

      {/* 5. Layar Blokir Permanen */}
      {isPermanentlyBlocked && (
        <div className="fixed inset-0 z-50 bg-rose-950 text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md bg-rose-900/40 border border-rose-500/60 rounded-3xl p-8 space-y-4 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-rose-600 text-white flex items-center justify-center mx-auto">
              <ShieldAlert className="w-9 h-9" />
            </div>
            <h2 className="text-2xl font-black text-rose-100">UJIAN DIBLOKIR PERMANEN</h2>
            <p className="text-xs text-rose-200 leading-relaxed">
              Anda telah melampaui batas toleransi pelanggaran ({room?.maxViolations || 3}x).
              Seluruh rekam jejak kecurangan telah dikirimkan ke komputer pengawas.
            </p>
            <div className="p-3 bg-black/40 rounded-xl text-xs font-mono text-rose-300">
              Segera hubungi Pengawas Ujian di depan kelas untuk permohonan "Izinkan Ulang".
            </div>
            <div className="text-[11px] text-rose-400">
              Sistem sedang mendengarkan perintah unblock dari pengawas secara real-time...
            </div>
          </div>
        </div>
      )}

      {/* 6. Incoming Teacher Warning Banner */}
      {incomingTeacherWarning && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2.5 text-xs font-bold flex items-center justify-between shadow-md z-40">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{incomingTeacherWarning}</span>
          </div>
          <button
            onClick={() => setIncomingTeacherWarning(null)}
            className="text-xs underline cursor-pointer ml-4 font-semibold"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Top Navigation Bar of Exam Player */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 px-4 md:px-6 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-bold text-sm tracking-tight text-white flex items-center gap-2">
            <span>{activePackage?.subject || 'Ujian CBT'}</span>
            <span className="text-xs font-normal text-slate-400">· {studentName} ({studentKelas})</span>
          </span>
        </div>

        {/* Center: Countdown Timer */}
        <div className="flex items-center gap-2 px-3 py-1 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs">
          <Clock className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-slate-400">Sisa:</span>
          <span className="font-bold text-white tracking-wide">{formatSeconds(remainingSec)}</span>
        </div>

        {/* Right: Zoom controls and View Tab */}
        <div className="flex items-center gap-3">
          {/* Zoom Selector (80% - 125%) */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setZoomLevel((z) => Math.max(80, z - 10))}
              className="p-1 text-slate-400 hover:text-white"
              title="Perkecil Teks Soal"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[11px] px-1 text-slate-300 font-semibold">{zoomLevel}%</span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(125, z + 10))}
              className="p-1 text-slate-400 hover:text-white"
              title="Perbesar Teks Soal"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mode Switch: Lembar CBT vs Google Form */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setActiveSheetTab('cbt_interactive')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                activeSheetTab === 'cbt_interactive' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:text-white'
              }`}
            >
              Lembar Soal CBT
            </button>
            <button
              onClick={() => setActiveSheetTab('google_form')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                activeSheetTab === 'google_form' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:text-white'
              }`}
            >
              Google Form
            </button>
          </div>

          <button
            onClick={handleSubmitExam}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            Kumpulkan Ujian
          </button>
        </div>
      </header>

      {/* Main Content Area with Zoom Transform */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 flex justify-center">
        <div
          className="w-full max-w-4xl transition-transform origin-top"
          style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
        >
          {activeSheetTab === 'cbt_interactive' ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* Question Navigation Map */}
              <div className="md:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
                  <span className="font-semibold text-slate-200">Daftar Nomor Soal</span>
                  <span>{Object.keys(answers).length} / {questions.length} Dijawab</span>
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {questions.map((q, idx) => {
                    const isAnswered = Boolean(answers[q.number]);
                    const isCurrent = idx === currentQIndex;
                    return (
                      <button
                        key={q.id}
                        onClick={() => setCurrentQIndex(idx)}
                        className={`h-9 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                          isCurrent
                            ? 'bg-emerald-500 text-white ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-900'
                            : isAnswered
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        {q.number}
                      </button>
                    );
                  })}
                </div>

                <div className="text-[11px] text-slate-500 space-y-1 pt-2 border-t border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-xs bg-emerald-500 inline-block" />
                    <span>Nomor yang sedang dibuka</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-xs bg-emerald-950 border border-emerald-800 inline-block" />
                    <span>Sudah dijawab</span>
                  </div>
                </div>
              </div>

              {/* Question Viewport */}
              <div className="md:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-md border border-emerald-800 font-mono">
                      Soal No. {currentQ.number}
                    </span>
                    <span className="text-xs text-slate-400">· {currentQ.points} Poin</span>
                  </div>
                  <span className="text-xs text-slate-500 font-mono">{currentQ.cognitiveLevel}</span>
                </div>

                {/* Stimulus */}
                {currentQ.stimulus && (
                  <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-300 leading-relaxed italic">
                    {currentQ.stimulus}
                  </div>
                )}

                {/* Main Question Text */}
                <div className="text-sm font-semibold text-white leading-relaxed">
                  {currentQ.question}
                </div>

                {/* Options / Answer Input */}
                {currentQ.type === 'pilihan_ganda' && currentQ.options && (
                  <div className="space-y-2 pt-2">
                    {currentQ.options.map((opt) => {
                      const isSelected = answers[currentQ.number] === opt.key;
                      return (
                        <button
                          key={opt.key}
                          onClick={() => setAnswers({ ...answers, [currentQ.number]: opt.key })}
                          className={`w-full text-left p-3.5 rounded-xl border text-xs transition-all flex items-start gap-3 cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-950/90 border-emerald-500 text-white font-medium shadow-md'
                              : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                          }`}
                        >
                          <span
                            className={`w-6 h-6 rounded-md flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                              isSelected ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {opt.key}
                          </span>
                          <span className="leading-snug pt-0.5">{opt.text}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {currentQ.type !== 'pilihan_ganda' && (
                  <div className="space-y-2 pt-2">
                    <label className="block text-xs text-slate-400 font-medium">Tuliskan Jawaban Anda:</label>
                    <textarea
                      rows={4}
                      value={answers[currentQ.number] || ''}
                      onChange={(e) => setAnswers({ ...answers, [currentQ.number]: e.target.value })}
                      placeholder="Ketik jawaban lengkap di sini..."
                      className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                )}

                {/* Pagination Controls */}
                <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                  <button
                    onClick={() => setCurrentQIndex((i) => Math.max(0, i - 1))}
                    disabled={currentQIndex === 0}
                    className="px-4 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-xl cursor-pointer"
                  >
                    ← Soal Sebelumnya
                  </button>

                  <button
                    onClick={() => setCurrentQIndex((i) => Math.min(questions.length - 1, i + 1))}
                    disabled={currentQIndex === questions.length - 1}
                    className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-xl cursor-pointer"
                  >
                    Soal Berikutnya →
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Embedded Google Form View */
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
              <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  Lembar Formulir Google Form Terintegrasi
                </span>
                <span className="text-xs text-slate-400">
                  {room?.googleFormUrl && room.googleFormUrl.startsWith('https://docs.google.com/forms/') && !room.googleFormUrl.includes('contoh-')
                    ? 'Kerjakan langsung di dalam lembar formulir di bawah ini'
                    : 'Gunakan Lembar Soal CBT'}
                </span>
              </div>
              <div className="w-full min-h-[500px] h-[75vh] bg-slate-950 flex flex-col justify-center items-center">
                {room?.googleFormUrl &&
                room.googleFormUrl.startsWith('https://docs.google.com/forms/') &&
                !room.googleFormUrl.includes('contoh-') ? (
                  <iframe
                    src={room.googleFormUrl}
                    className="w-full h-full border-0 bg-white"
                    title="Google Form Exam Sheet"
                  />
                ) : (
                  <div className="p-8 text-center max-w-md space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-purple-950/80 border border-purple-800 text-purple-300 flex items-center justify-center mx-auto">
                      <Sparkles className="w-7 h-7 text-amber-300" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">Lembar Soal CBT Interaktif Aktif</h3>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Tautan Google Form eksternal belum ditautkan oleh guru. Anda dapat mengerjakan seluruh butir soal ({questions.length} soal) dengan aman, anti-curang, dan penilaian otomatis pada tab <strong>Lembar Soal CBT</strong>.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveSheetTab('cbt_interactive')}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                    >
                      Beralih ke Lembar Soal CBT
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* SUBMIT CONFIRMATION MODAL (Replaces window.confirm) */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">Selesaikan & Kumpulkan Ujian?</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Apakah Anda yakin ingin menyelesaikan ujian ini? Pastikan seluruh butir soal telah diperiksa kembali sebelum dikirimkan.
                </p>
                <div className="p-2.5 bg-slate-950 rounded-lg text-xs text-slate-400 font-mono">
                  Dijawab: <span className="text-emerald-400 font-bold">{Object.keys(answers).length}</span> dari {questions.length} butir soal
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
              >
                Periksa Lagi
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={executeSubmitExam}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-md cursor-pointer"
              >
                {isSubmitting ? 'Mengirim...' : 'Ya, Kumpulkan Ujian'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
