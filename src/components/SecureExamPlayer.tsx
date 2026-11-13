import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ShieldAlert, ShieldCheck, Maximize2, AlertTriangle, Clock, CheckCircle2, ArrowLeft, CheckSquare, FileText, Search, HelpCircle, Cloud, LogOut, UserCheck, Monitor, Smartphone } from 'lucide-react';
import { ExamTokenConfig, QuestionPackage } from '../types';
import {
  getSyncDeviceId,
  getOrCreateDeviceId,
  detectDeviceCategory,
  findLocalExamLock,
  saveLocalExamLock,
  clearLocalExamLock,
} from '../utils/deviceId';

interface SecureExamPlayerProps {
  initialToken?: string;
  defaultPackages: QuestionPackage[];
  onExitToTeacherDashboard: () => void;
  guruName?: string;
  fallbackExamConfig?: ExamTokenConfig;
  initialStudentName?: string;
  initialStudentNisn?: string;
  initialStudentKelas?: string;
  isTeacherPreview?: boolean;
  onLogout?: () => void;
}

const normalizeGoogleFormEmbedUrl = (rawUrl?: string): string | null => {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.includes('contoh-')) return null;

  try {
    const parsed = new URL(trimmed);
    const isGoogleFormHost =
      parsed.hostname === 'docs.google.com' && parsed.pathname.startsWith('/forms/');
    const isShortFormHost = parsed.hostname === 'forms.gle';

    if (isShortFormHost) {
      return parsed.toString();
    }

    if (!isGoogleFormHost) {
      return null;
    }

    if (parsed.pathname.endsWith('/edit')) {
      parsed.pathname = parsed.pathname.replace(/\/edit$/, '/viewform');
    } else if (!parsed.pathname.endsWith('/viewform') && !parsed.pathname.endsWith('/formResponse')) {
      parsed.pathname = parsed.pathname.replace(/\/+$/, '') + '/viewform';
    }

    parsed.searchParams.set('embedded', 'true');
    return parsed.toString();
  } catch {
    return null;
  }
};

export const SecureExamPlayer: React.FC<SecureExamPlayerProps> = ({
  initialToken = 'ZJT0P4M',
  defaultPackages,
  onExitToTeacherDashboard,
  guruName = 'Yana Periyana',
  fallbackExamConfig,
  initialStudentName = '',
  initialStudentNisn = '',
  initialStudentKelas = 'VII-A',
  isTeacherPreview = false,
  onLogout,
}) => {
  // Student Auth State
  const [token, setToken] = useState(initialToken.toUpperCase());
  const [studentName, setStudentName] = useState(initialStudentName);
  const [studentNisn, setStudentNisn] = useState(initialStudentNisn);
  const [studentKelas, setStudentKelas] = useState(initialStudentKelas || 'VII-A');
  const [hasStarted, setHasStarted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExamCompleted, setIsExamCompleted] = useState(false);
  const [examResult, setExamResult] = useState<{ score: number; maxScore: number; percentage: number } | null>(null);

  // Automatic Device ID Detection & Lock State
  const [deviceId, setDeviceId] = useState<string>(() => getSyncDeviceId());
  const deviceType = useMemo(() => detectDeviceCategory(), []);
  const [alreadyCompletedLock, setAlreadyCompletedLock] = useState<{
    deviceId: string;
    studentName?: string;
  } | null>(null);

  useEffect(() => {
    let active = true;
    getOrCreateDeviceId().then((id) => {
      if (active && id) setDeviceId(id);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hasStarted) {
      if (initialToken) setToken(initialToken.toUpperCase());
      if (initialStudentName) setStudentName(initialStudentName);
      if (initialStudentNisn) setStudentNisn(initialStudentNisn);
      if (initialStudentKelas) setStudentKelas(initialStudentKelas);
    }
  }, [initialToken, initialStudentName, initialStudentNisn, initialStudentKelas, hasStarted]);

  // Room config state
  const [room, setRoom] = useState<ExamTokenConfig | null>(null);
  const [remainingSec, setRemainingSec] = useState<number>(
    fallbackExamConfig?.remainingSeconds && fallbackExamConfig.remainingSeconds > 0
      ? fallbackExamConfig.remainingSeconds
      : 90 * 60
  );
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

  const handleCycleZoom = () => {
    setZoomLevel((prev) => {
      if (prev === 100) return 110;
      if (prev === 110) return 125;
      if (prev === 125) return 80;
      if (prev === 80) return 90;
      return 100;
    });
  };

  // Interactive Answers & Google Form Sections State (used when no external form URL is linked)
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [formSection, setFormSection] = useState<1 | 2>(1);
  const [formAbsen, setFormAbsen] = useState('');
  const [formNama, setFormNama] = useState('');
  const [formKelas, setFormKelas] = useState('');
  const [formValidationErrors, setFormValidationErrors] = useState<{
    absen?: boolean;
    nama?: boolean;
    kelas?: boolean;
  }>({});

  const studentIdRef = useRef<string>('std-' + Math.random().toString(36).substring(2, 8));
  const lastWindowWidthRef = useRef<number>(window.innerWidth);
  const mainScrollRef = useRef<HTMLElement | null>(null);

  // Fetch Room on token change
  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const res = await fetch(`/api/rooms/${token}`);
        const data = await res.json();
        if (data.success && data.room) {
          setRoom(data.room);
          if (data.room.durationMinutes > 0 && data.room.remainingSeconds > 0) {
            setRemainingSec(data.room.remainingSeconds);
          } else if (fallbackExamConfig?.remainingSeconds && fallbackExamConfig.remainingSeconds > 0) {
            setRemainingSec(fallbackExamConfig.remainingSeconds);
          } else {
            setRemainingSec(90 * 60);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    if (token) fetchRoom();
  }, [token, fallbackExamConfig?.remainingSeconds]);

  // Smooth 1-second local countdown timer while exam is active
  useEffect(() => {
    if (!hasStarted || isExamCompleted || isWaitingRoom || isPermanentlyBlocked) return;
    const timer = setInterval(() => {
      setRemainingSec((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [hasStarted, isExamCompleted, isWaitingRoom, isPermanentlyBlocked]);

  // Questions to display: match room title or subject with defaultPackages
  const activePackage = useMemo(() => {
    return (
      defaultPackages.find(
        (p) =>
          p.title.toLowerCase() === (room?.title || '').toLowerCase() ||
          (room?.subject && p.title.toLowerCase() === room.subject.toLowerCase()) ||
          (room?.subject && p.subject.toLowerCase().includes(room.subject.toLowerCase()))
      ) || defaultPackages[0]
    );
  }, [defaultPackages, room?.title, room?.subject]);

  const questions = activePackage?.questions || [];

  const embeddedGoogleFormUrl = useMemo(() => {
    return (
      normalizeGoogleFormEmbedUrl(room?.googleFormUrl) ||
      normalizeGoogleFormEmbedUrl(fallbackExamConfig?.googleFormUrl) ||
      normalizeGoogleFormEmbedUrl(activePackage?.googleFormUrl)
    );
  }, [room?.googleFormUrl, fallbackExamConfig?.googleFormUrl, activePackage?.googleFormUrl]);

  // Automatic check whether this Device ID / link has already completed this exam
  useEffect(() => {
    if (isTeacherPreview || hasStarted || isExamCompleted) return;
    const rawFormUrl =
      room?.googleFormUrl || fallbackExamConfig?.googleFormUrl || activePackage?.googleFormUrl || '';

    const localLock = findLocalExamLock({
      token,
      googleFormUrl: rawFormUrl,
      deviceId,
      nisn: studentNisn,
    });
    if (localLock) {
      setAlreadyCompletedLock({
        deviceId: localLock.deviceId || deviceId,
        studentName: localLock.studentName,
      });
    }

    let cancelled = false;
    const checkServerDevice = async () => {
      try {
        const params = new URLSearchParams({
          deviceId,
          nisn: studentNisn || '',
          googleFormUrl: rawFormUrl,
          localCompletedAt: localLock ? String(localLock.completedAt || 0) : '0',
        });
        const res = await fetch(`/api/rooms/${encodeURIComponent(token)}/check-device?${params.toString()}`);
        const data = await res.json();
        if (cancelled) return;
        if (data?.unlockedByTeacher) {
          clearLocalExamLock({ token, googleFormUrl: rawFormUrl, deviceId });
          setAlreadyCompletedLock(null);
        } else if (data?.success && data.locked) {
          setAlreadyCompletedLock({
            deviceId: data.lockInfo?.deviceId || deviceId,
            studentName: data.lockInfo?.studentName,
          });
        } else if (!localLock) {
          setAlreadyCompletedLock(null);
        }
      } catch {
        // Ignore offline check error
      }
    };
    if (token && deviceId) {
      checkServerDevice();
    }
    return () => {
      cancelled = true;
    };
  }, [
    token,
    deviceId,
    studentNisn,
    room?.googleFormUrl,
    fallbackExamConfig?.googleFormUrl,
    activePackage?.googleFormUrl,
    isTeacherPreview,
    hasStarted,
    isExamCompleted,
  ]);

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

    // 3. Window Blur (bypassed so interacting with embedded Google Form iframe is not penalized)
    const handleWindowBlur = () => {
      // Intentionally empty to prevent false-positive violation when clicking inside iframe
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

  // Start Exam Handler with Fullscreen Lock & Device ID Check
  const handleStartExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    if (!studentName.trim() || !studentNisn.trim()) {
      setLoginError('Harap lengkapi Nama Lengkap dan NISN terlebih dahulu.');
      return;
    }

    const rawFormUrl =
      room?.googleFormUrl || fallbackExamConfig?.googleFormUrl || activePackage?.googleFormUrl || '';

    if (!isTeacherPreview) {
      const localLock = findLocalExamLock({
        token,
        googleFormUrl: rawFormUrl,
        deviceId,
        nisn: studentNisn,
      });
      if (localLock) {
        setAlreadyCompletedLock({
          deviceId: localLock.deviceId || deviceId,
          studentName: localLock.studentName,
        });
        return;
      }

      try {
        const params = new URLSearchParams({
          deviceId,
          nisn: studentNisn.trim(),
          googleFormUrl: rawFormUrl,
        });
        const checkRes = await fetch(
          `/api/rooms/${encodeURIComponent(token)}/check-device?${params.toString()}`
        );
        const checkData = await checkRes.json();
        if (checkData?.success && checkData.locked) {
          setAlreadyCompletedLock({
            deviceId: checkData.lockInfo?.deviceId || deviceId,
            studentName: checkData.lockInfo?.studentName,
          });
          return;
        }
      } catch {
        // Proceed if server check unavailable
      }
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

    setFormAbsen(studentNisn.trim());
    setFormNama(studentName.trim());
    setFormKelas(studentKelas.trim());
    setFormSection(1);
    setHasStarted(true);
    lastWindowWidthRef.current = window.innerWidth;

    // Initial sync with Device ID
    try {
      const syncRes = await fetch(`/api/rooms/${token}/student-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: studentIdRef.current,
          name: studentName,
          nisn: studentNisn,
          kelas: studentKelas,
          deviceId,
          deviceType,
          googleFormUrl: rawFormUrl,
          bypassDeviceLock: isTeacherPreview,
          status: room?.waitingRoomEnabled && !room?.isExamStarted ? 'ruang_tunggu' : 'mengerjakan',
        }),
      });
      const syncData = await syncRes.json();
      if (syncData?.alreadyCompleted && !isTeacherPreview) {
        setHasStarted(false);
        setAlreadyCompletedLock({
          deviceId: syncData.lockInfo?.deviceId || deviceId,
          studentName: syncData.lockInfo?.studentName,
        });
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      }
    } catch {
      // Ignore network sync error
    }
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

    const rawFormUrl =
      room?.googleFormUrl || fallbackExamConfig?.googleFormUrl || activePackage?.googleFormUrl || '';

    if (!isTeacherPreview) {
      saveLocalExamLock({
        token,
        googleFormUrl: rawFormUrl,
        deviceId,
        nisn: studentNisn.trim() || '-',
        studentName: studentName.trim() || 'Siswa CBT',
        completedAt: Date.now(),
      });
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
          deviceId,
          deviceType,
          googleFormUrl: rawFormUrl,
          bypassDeviceLock: isTeacherPreview,
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

  // 0. Device & Identity Lock Screen ("UJIAN SUDAH SELESAI")
  if (!isTeacherPreview && alreadyCompletedLock && !isExamCompleted) {
    return (
      <div className="min-h-screen bg-[#0b1324] text-white flex flex-col justify-center items-center p-6 text-center select-none">
        <div className="max-w-lg w-full flex flex-col items-center space-y-5">
          <div className="w-20 h-20 rounded-full border-[4.5px] border-emerald-400 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
            <CheckCircle2 className="w-11 h-11 stroke-[2.2]" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-wide text-emerald-400 uppercase">
            UJIAN SUDAH SELESAI
          </h1>

          <p className="text-sm sm:text-base text-slate-100 leading-relaxed max-w-md font-medium">
            Anda sudah menyelesaikan ujian ini sebelumnya. Token sudah dikunci untuk perangkat dan identitas ini.
          </p>

          <div className="pt-2 font-mono text-xs sm:text-sm text-slate-400 tracking-wide">
            Device ID: {alreadyCompletedLock.deviceId || deviceId}
          </div>

          {onLogout && (
            <div className="pt-4">
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Keluar / Ganti Akun</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

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
            {!isTeacherPreview && initialStudentName && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-700/60 text-indigo-300 text-[11px] font-medium mt-1">
                <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span>Login Peserta Aktif: {initialStudentName}</span>
              </div>
            )}
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

          <div className="pt-2 border-t border-slate-800/70 space-y-2 text-center">
            <div className="flex items-center justify-center gap-1.5 text-[11px] font-mono text-slate-400">
              {deviceType === 'HP / Tablet' ? (
                <Smartphone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <Monitor className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              )}
              <span>{deviceType} · Device ID: {deviceId}</span>
            </div>

            <div className="flex items-center justify-center gap-4">
              {isTeacherPreview ? (
                <button
                  type="button"
                  onClick={onExitToTeacherDashboard}
                  className="text-xs text-slate-400 hover:text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Kembali ke Dashboard Guru
                </button>
              ) : onLogout ? (
                <button
                  type="button"
                  onClick={onLogout}
                  className="text-xs text-rose-400 hover:text-rose-300 font-medium flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-rose-950/50 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Logout Peserta
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onExitToTeacherDashboard}
                  className="text-xs text-slate-500 hover:text-slate-300 flex items-center justify-center gap-1 mx-auto cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Kembali ke Menu Utama
                </button>
              )}
            </div>
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

          {!isTeacherPreview && onLogout ? (
            <button
              type="button"
              onClick={onLogout}
              className="w-full py-2.5 px-4 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Selesai &amp; Logout Peserta</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onExitToTeacherDashboard}
              className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Selesai &amp; Keluar ke Menu Utama
            </button>
          )}
        </div>
      </div>
    );
  }

  const quizTitle = room?.title || activePackage?.title || 'Segitiga';
  const quizGrade = room?.grade || activePackage?.grade || 'SMP';
  const quizIdLabel = activePackage?.batchCode || room?.token || '3452';
  const teacherEmailHandle = guruName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 20) || 'guru';

  const handleFormNextSection = () => {
    const errors = {
      absen: !formAbsen.trim(),
      nama: !formNama.trim(),
      kelas: !formKelas.trim(),
    };
    setFormValidationErrors(errors);
    if (errors.absen || errors.nama || errors.kelas) return;
    setFormSection(2);
    mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClearForm = () => {
    if (formSection === 1) {
      setFormAbsen('');
      setFormNama('');
      setFormKelas('');
      setFormValidationErrors({});
    } else {
      setAnswers({});
    }
  };

  return (
    <div className="h-screen w-screen bg-[#f0ebf8] text-slate-900 flex flex-col overflow-hidden select-none">
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
        <div className="bg-amber-500 text-slate-950 px-4 py-2.5 text-xs font-bold flex items-center justify-between shadow-md z-40 shrink-0">
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
      <header className="h-14 md:h-16 bg-[#1a2336] border-b border-slate-800 px-4 md:px-6 flex items-center justify-between gap-4 shrink-0 shadow-md z-30">
        {/* Left Header Section */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#0e382c] border border-emerald-700/60 flex items-center justify-center shrink-0 text-emerald-400">
            <FileText className="w-4 h-4" />
          </div>

          <div className="flex flex-col min-w-0">
            <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider leading-none truncate">
              GURU: {guruName.toUpperCase()}
            </span>
            <h2 className="text-sm font-bold text-white tracking-tight leading-snug truncate">
              {quizTitle}
            </h2>
          </div>

          {/* Blue Zoom Pill Button */}
          <button
            type="button"
            onClick={handleCycleZoom}
            className="ml-2 px-3 py-1.5 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95 shrink-0"
            title="Ubah Ukuran Teks / Zoom"
          >
            <Search className="w-3.5 h-3.5" />
            <span>{zoomLevel}%</span>
          </button>
        </div>

        {/* Right Header Section */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Dark Pill Timer */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 bg-[#131b2e] rounded-xl border border-slate-800/80 font-mono text-xs font-semibold text-slate-200 shadow-xs">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="tabular-nums">{formatSeconds(remainingSec)}</span>
          </div>

          {/* Red Submit Button */}
          <button
            type="button"
            onClick={handleSubmitExam}
            className="px-4 py-1.5 bg-[#ef4444] hover:bg-[#dc2626] text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
          >
            <CheckSquare className="w-4 h-4" />
            <span>Selesai</span>
          </button>
        </div>
      </header>

      {/* Main Content Area: Full 100% Google Form View */}
      <main
        ref={mainScrollRef}
        className={`flex-1 w-full min-h-0 bg-[#f0ebf8] relative ${
          embeddedGoogleFormUrl ? 'overflow-hidden' : 'overflow-y-auto'
        }`}
      >
        {embeddedGoogleFormUrl ? (
          <div className="w-full h-full overflow-hidden">
            <div
              className="origin-top-left transition-transform duration-150"
              style={{
                transform: `scale(${zoomLevel / 100})`,
                width: `${(100 * 100) / zoomLevel}%`,
                height: `${(100 * 100) / zoomLevel}%`,
              }}
            >
              <iframe
                src={embeddedGoogleFormUrl}
                className="w-full h-full border-0 bg-[#f0ebf8]"
                title="Google Form Exam Sheet"
                allow="fullscreen"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        ) : (
          <div
            className="w-full min-h-full py-4 md:py-5 px-3 sm:px-4 relative flex flex-col items-center"
            style={{ zoom: zoomLevel / 100 }}
          >
            <div className="w-full max-w-[640px] space-y-3 pb-10">
              {/* Google Form Top Header Card */}
              <div className="bg-white rounded-lg border border-[#dadce0] overflow-hidden shadow-[0_1px_2px_rgba(60,64,67,0.08)]">
                <div className="h-[10px] w-full bg-[#673ab7]" />
                <div className="px-6 pt-5 pb-4 space-y-3">
                  <h1 className="text-[28px] md:text-[32px] font-normal text-[#202124] leading-tight tracking-tight">
                    Quiz: {quizTitle} ({quizGrade}) [{quizIdLabel}]
                  </h1>
                  <div className="text-sm text-[#202124] space-y-2.5 leading-relaxed">
                    <p>Quiz dibuat oleh {guruName}</p>
                    <p>Isi data diri Anda di bagian pertama, lalu kerjakan soal di bagian berikutnya.</p>
                    <p className="text-xs text-[#5f6368]">[Quiz ID: {quizIdLabel}]</p>
                  </div>
                </div>

                {/* Account Info Divider */}
                <div className="border-t border-[#dadce0] px-6 py-3 flex items-start justify-between gap-3">
                  <div className="space-y-1 text-xs">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-bold text-[#5f6368]">
                        {teacherEmailHandle}@guru.smp.belajar.id
                      </span>
                      <span className="text-[#5f6368]">·</span>
                      <span className="text-[#1a73e8] font-medium">Terhubung</span>
                    </div>
                    <div className="text-[#5f6368] text-[12px]">
                      Jawaban disimpan ke sesi ujian token <span className="font-mono font-semibold">{token}</span>
                    </div>
                  </div>
                  <Cloud className="w-5 h-5 text-[#5f6368] shrink-0 mt-0.5" />
                </div>

                {/* Required Indicator */}
                <div className="border-t border-[#dadce0] px-6 py-3">
                  <span className="text-[13px] text-[#d93025]">
                    * Menunjukkan pertanyaan yang wajib diisi
                  </span>
                </div>
              </div>

              {formSection === 1 ? (
                <>
                  {/* Card: Nomor Absen */}
                  <div
                    className={`bg-white rounded-lg border p-6 space-y-4 shadow-[0_1px_2px_rgba(60,64,67,0.08)] ${
                      formValidationErrors.absen ? 'border-[#d93025]' : 'border-[#dadce0]'
                    }`}
                  >
                    <div>
                      <label className="block text-[15px] font-normal text-[#202124]">
                        Nomor Absen <span className="text-[#d93025]">*</span>
                      </label>
                      <p className="text-xs text-[#202124] mt-1">Masukkan nomor absen atau NISN Anda</p>
                    </div>
                    <div className="pt-1">
                      <input
                        type="text"
                        value={formAbsen}
                        onChange={(e) => {
                          setFormAbsen(e.target.value);
                          if (formValidationErrors.absen) {
                            setFormValidationErrors((prev) => ({ ...prev, absen: false }));
                          }
                        }}
                        placeholder="Jawaban Anda"
                        className="w-full max-w-[300px] text-sm text-[#202124] placeholder:text-[#70757a] border-b border-[#dadce0] focus:border-b-2 focus:border-[#673ab7] focus:outline-none py-1.5 bg-transparent select-text transition-colors"
                      />
                    </div>
                    {formValidationErrors.absen && (
                      <div className="flex items-center gap-1.5 text-xs text-[#d93025]">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Pertanyaan ini wajib diisi</span>
                      </div>
                    )}
                  </div>

                  {/* Card: Nama Lengkap */}
                  <div
                    className={`bg-white rounded-lg border p-6 space-y-4 shadow-[0_1px_2px_rgba(60,64,67,0.08)] ${
                      formValidationErrors.nama ? 'border-[#d93025]' : 'border-[#dadce0]'
                    }`}
                  >
                    <div>
                      <label className="block text-[15px] font-normal text-[#202124]">
                        Nama Lengkap <span className="text-[#d93025]">*</span>
                      </label>
                      <p className="text-xs text-[#202124] mt-1">Masukkan nama lengkap Anda</p>
                    </div>
                    <div className="pt-1">
                      <input
                        type="text"
                        value={formNama}
                        onChange={(e) => {
                          setFormNama(e.target.value);
                          if (formValidationErrors.nama) {
                            setFormValidationErrors((prev) => ({ ...prev, nama: false }));
                          }
                        }}
                        placeholder="Jawaban Anda"
                        className="w-full max-w-[360px] text-sm text-[#202124] placeholder:text-[#70757a] border-b border-[#dadce0] focus:border-b-2 focus:border-[#673ab7] focus:outline-none py-1.5 bg-transparent select-text transition-colors"
                      />
                    </div>
                    {formValidationErrors.nama && (
                      <div className="flex items-center gap-1.5 text-xs text-[#d93025]">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Pertanyaan ini wajib diisi</span>
                      </div>
                    )}
                  </div>

                  {/* Card: Kelas */}
                  <div
                    className={`bg-white rounded-lg border p-6 space-y-4 shadow-[0_1px_2px_rgba(60,64,67,0.08)] ${
                      formValidationErrors.kelas ? 'border-[#d93025]' : 'border-[#dadce0]'
                    }`}
                  >
                    <div>
                      <label className="block text-[15px] font-normal text-[#202124]">
                        Kelas <span className="text-[#d93025]">*</span>
                      </label>
                      <p className="text-xs text-[#202124] mt-1">Contoh: 9A, 10 IPA 2, 7B</p>
                    </div>
                    <div className="pt-1">
                      <input
                        type="text"
                        value={formKelas}
                        onChange={(e) => {
                          setFormKelas(e.target.value);
                          if (formValidationErrors.kelas) {
                            setFormValidationErrors((prev) => ({ ...prev, kelas: false }));
                          }
                        }}
                        placeholder="Jawaban Anda"
                        className="w-full max-w-[300px] text-sm text-[#202124] placeholder:text-[#70757a] border-b border-[#dadce0] focus:border-b-2 focus:border-[#673ab7] focus:outline-none py-1.5 bg-transparent select-text transition-colors"
                      />
                    </div>
                    {formValidationErrors.kelas && (
                      <div className="flex items-center gap-1.5 text-xs text-[#d93025]">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Pertanyaan ini wajib diisi</span>
                      </div>
                    )}
                  </div>

                  {/* Section 1 Bottom Action Row */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={handleFormNextSection}
                      className="px-6 py-2 bg-white hover:bg-[#f8f5fc] text-[#673ab7] text-sm font-medium rounded-sm border border-[#dadce0] shadow-[0_1px_2px_rgba(60,64,67,0.12)] cursor-pointer transition-colors"
                    >
                      Berikutnya
                    </button>
                    <button
                      type="button"
                      onClick={handleClearForm}
                      className="px-3 py-2 text-sm font-medium text-[#673ab7] hover:bg-[#673ab7]/5 rounded-sm cursor-pointer transition-colors"
                    >
                      Kosongkan formulir
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Section 2 Header Banner */}
                  <div className="bg-white rounded-lg border border-[#dadce0] overflow-hidden shadow-[0_1px_2px_rgba(60,64,67,0.08)]">
                    <div className="bg-[#673ab7] text-white px-6 py-2.5 text-sm font-medium flex items-center justify-between">
                      <span>Lembar Pengerjaan Soal</span>
                      <span className="text-xs opacity-90">
                        {Object.keys(answers).length} / {questions.length} terjawab
                      </span>
                    </div>
                    <div className="px-6 py-3 text-xs text-[#5f6368] flex flex-wrap items-center justify-between gap-2">
                      <span>
                        Peserta: <strong className="text-[#202124]">{formNama || studentName}</strong> ({formKelas || studentKelas} · Absen/NISN: {formAbsen || studentNisn})
                      </span>
                      <span>Pilih satu jawaban yang paling tepat pada setiap soal.</span>
                    </div>
                  </div>

                  {/* Question Cards List */}
                  {questions.map((q, idx) => {
                    const selectedAnswer = answers[q.number] || '';
                    return (
                      <div
                        key={q.id || q.number}
                        onClick={() => setCurrentQIndex(idx)}
                        className="bg-white rounded-lg border border-[#dadce0] p-6 space-y-4 shadow-[0_1px_2px_rgba(60,64,67,0.08)]"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-2.5 flex-1">
                            {q.stimulus && (
                              <div className="bg-[#f8f9fa] border-l-4 border-[#673ab7] px-3.5 py-2.5 text-xs text-[#3c4043] leading-relaxed rounded-r-sm select-text">
                                {q.stimulus}
                              </div>
                            )}
                            <div className="text-[15px] font-normal text-[#202124] leading-relaxed select-text">
                              {q.question.replace(/^\s*(?:No\.?\s*)?\d+\s*[.)]\s*/i, '')}
                              <span className="text-[#d93025] ml-1">*</span>
                            </div>
                          </div>
                          <span className="text-xs text-[#70757a] whitespace-nowrap shrink-0 pt-0.5">
                            {q.points || 10} poin
                          </span>
                        </div>

                        {q.options && q.options.length > 0 ? (
                          <div className="space-y-1.5 pt-1">
                            {q.options.map((opt) => {
                              const isSelected = selectedAnswer === opt.key;
                              return (
                                <label
                                  key={opt.key}
                                  className={`flex items-start gap-3 px-2.5 py-2 rounded-md cursor-pointer transition-colors ${
                                    isSelected ? 'bg-[#f3eefa]' : 'hover:bg-[#f8f9fa]'
                                  }`}
                                >
                                  <span className="relative flex items-center justify-center w-5 h-5 shrink-0 mt-0.5">
                                    <input
                                      type="radio"
                                      name={`question-${q.number}`}
                                      value={opt.key}
                                      checked={isSelected}
                                      onChange={() => {
                                        setAnswers((prev) => ({ ...prev, [q.number]: opt.key }));
                                        setCurrentQIndex(idx);
                                      }}
                                      className="sr-only"
                                    />
                                    <span
                                      className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center transition-colors ${
                                        isSelected ? 'border-[#673ab7]' : 'border-[#5f6368]'
                                      }`}
                                    >
                                      {isSelected && <span className="w-2.5 h-2.5 rounded-full bg-[#673ab7]" />}
                                    </span>
                                  </span>
                                  <span className="text-sm text-[#202124] leading-relaxed select-text">
                                    <span className="font-medium mr-1.5">{opt.key}.</span>
                                    {opt.text}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="pt-1">
                            <input
                              type="text"
                              value={selectedAnswer}
                              onChange={(e) => {
                                setAnswers((prev) => ({ ...prev, [q.number]: e.target.value }));
                                setCurrentQIndex(idx);
                              }}
                              placeholder="Jawaban Anda"
                              className="w-full text-sm text-[#202124] placeholder:text-[#70757a] border-b border-[#dadce0] focus:border-b-2 focus:border-[#673ab7] focus:outline-none py-1.5 bg-transparent select-text transition-colors"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Section 2 Bottom Action Row */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setFormSection(1);
                          mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="px-5 py-2 bg-white hover:bg-[#f8f5fc] text-[#673ab7] text-sm font-medium rounded-sm border border-[#dadce0] shadow-[0_1px_2px_rgba(60,64,67,0.12)] cursor-pointer transition-colors"
                      >
                        Kembali
                      </button>
                      <button
                        type="button"
                        onClick={handleSubmitExam}
                        className="px-6 py-2 bg-[#673ab7] hover:bg-[#5e35b1] text-white text-sm font-medium rounded-sm shadow-[0_1px_2px_rgba(60,64,67,0.2)] cursor-pointer transition-colors"
                      >
                        Kirim
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearForm}
                      className="px-3 py-2 text-sm font-medium text-[#673ab7] hover:bg-[#673ab7]/5 rounded-sm cursor-pointer transition-colors"
                    >
                      Kosongkan formulir
                    </button>
                  </div>
                </>
              )}

              {/* Subtle Google Forms-style Footer */}
              <div className="pt-4 text-center space-y-2 text-[11px] text-[#5f6368]">
                <p>Formulir ujian ini terintegrasi dengan Sistem CBT Anti-Curang Soalpintar.ai.</p>
                <div className="text-sm font-medium text-[#5f6368]/80 tracking-tight">
                  Soalpintar <span className="font-normal">Forms</span>
                </div>
              </div>
            </div>

            {/* Bottom-left Help Icon */}
            <button
              type="button"
              onClick={handleCycleZoom}
              title="Ubah Zoom Tampilan Soal"
              className="fixed bottom-3 left-3 w-7 h-7 rounded-full bg-white/80 hover:bg-white border border-[#dadce0] text-[#5f6368] flex items-center justify-center shadow-xs cursor-pointer"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        )}
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
                {!embeddedGoogleFormUrl && (
                  <div className="p-2.5 bg-slate-950 rounded-lg text-xs text-slate-400 font-mono">
                    Dijawab: <span className="text-emerald-400 font-bold">{Object.keys(answers).length}</span> dari {questions.length} butir soal
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white cursor-pointer"
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
