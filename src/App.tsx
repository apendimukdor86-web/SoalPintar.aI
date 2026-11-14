import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { AiGeneratorView } from './components/AiGeneratorView';
import { BankSoalView } from './components/BankSoalView';
import { TokenManagerView } from './components/TokenManagerView';
import { DistribusiGoogleFormView } from './components/DistribusiGoogleFormView';
import { LiveMonitoringView } from './components/LiveMonitoringView';
import { ProjectorScreenModal } from './components/ProjectorScreenModal';
import { SecureExamPlayer } from './components/SecureExamPlayer';
import { RekapNilaiView } from './components/RekapNilaiView';
import { RiwayatPelanggaranView } from './components/RiwayatPelanggaranView';
import { DownloadAplikasiView } from './components/DownloadAplikasiView';
import { StatusPaketView } from './components/StatusPaketView';
import { GasSettingsView } from './components/GasSettingsView';
import { DashboardView } from './components/DashboardView';
import { GoogleFormsView, ManualGoogleFormEntry } from './components/GoogleFormsView';
import { LoginView, AuthSession } from './components/LoginView';
import { TeacherUsersView } from './components/TeacherUsersView';
import { ClearDataView } from './components/ClearDataView';
import { INITIAL_PACKAGES, INITIAL_SCORES, INITIAL_VIOLATIONS } from './data/mockBankSoal';
import { QuestionPackage, ExamTokenConfig, StudentScoreRecord, StudentViolationLog, TeacherAccount } from './types';

const MANUAL_FORMS_STORAGE_KEY = 'soalpintar_manual_google_forms';
const AUTH_SESSION_STORAGE_KEY = 'soalpintar_auth_session';
const REGISTERED_TEACHERS_STORAGE_KEY = 'soalpintar_registered_teachers';
const PACKAGES_STORAGE_KEY = 'soalpintar_packages_v1';
const SCORES_STORAGE_KEY = 'soalpintar_scores_v1';
const VIOLATIONS_STORAGE_KEY = 'soalpintar_violations_v1';

const DEFAULT_TEACHER_ACCOUNTS: TeacherAccount[] = [
  {
    id: 'teacher-default-1',
    name: 'Apendi Mukdor, S.Pd.',
    email: 'apendimukdor86@guru.smp.belajar.id',
    password: 'guru123',
    subject: 'Matematika & IPA',
    school: 'SMP Negeri Penggerak',
    role: 'Admin Sekolah',
    status: 'Aktif',
    createdAt: '2026-11-01T08:00:00.000Z',
    source: 'pengaturan',
  },
];

function sanitizePackages(raw: unknown): QuestionPackage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, any> => Boolean(item && typeof item === 'object' && item.id))
    .map((p) => ({
      ...p,
      id: String(p.id),
      title: String(p.title || 'Paket Soal Tanpa Judul'),
      subject: String(p.subject || 'Umum'),
      grade: String(p.grade || 'SMP'),
      topic: String(p.topic || ''),
      createdAt: String(p.createdAt || ''),
      questions: Array.isArray(p.questions)
        ? p.questions
            .filter((q: unknown): q is Record<string, any> => Boolean(q && typeof q === 'object'))
            .map((q: any, idx: number) => ({
              ...q,
              id: String(q.id || `q-${idx + 1}`),
              number: Number(q.number) || idx + 1,
              type: q.type === 'isian' || q.type === 'uraian' ? q.type : 'pilihan_ganda',
              question: String(q.question || ''),
              options: Array.isArray(q.options)
                ? q.options
                    .filter((o: unknown): o is Record<string, any> => Boolean(o && typeof o === 'object'))
                    .map((o: any, oIdx: number) => ({
                      key: String(o.key || String.fromCharCode(65 + oIdx)),
                      text: String(o.text || ''),
                    }))
                : [],
              correctAnswer: String(q.correctAnswer || 'A'),
              explanation: String(q.explanation || ''),
              cognitiveLevel: String(q.cognitiveLevel || 'C2'),
              points: Number(q.points) > 0 ? Number(q.points) : 10,
            }))
        : [],
    }));
}

function sanitizeManualForms(raw: unknown): ManualGoogleFormEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, any> => Boolean(item && typeof item === 'object' && item.url))
    .map((m, idx) => ({
      id: String(m.id || `gform-${idx}`),
      label: String(m.label || 'Google Form Kuis'),
      url: String(m.url || ''),
      createdAt: String(m.createdAt || ''),
      timeAgo: String(m.timeAgo || 'Baru saja'),
    }));
}

function sanitizeScores(raw: unknown): StudentScoreRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, any> => Boolean(item && typeof item === 'object'))
    .map((s, idx) => {
      const score = Number.isFinite(Number(s.score)) ? Number(s.score) : 0;
      const maxScore = Number.isFinite(Number(s.maxScore)) && Number(s.maxScore) > 0 ? Number(s.maxScore) : 100;
      const pct = Number.isFinite(Number(s.percentage))
        ? Number(s.percentage)
        : Math.round((score / maxScore) * 100);
      return {
        id: String(s.id || `score-${idx}`),
        studentName: String(s.studentName || `Siswa ${idx + 1}`),
        nisn: String(s.nisn || '-'),
        kelas: String(s.kelas || '-'),
        token: String(s.token || '-'),
        score,
        maxScore,
        percentage: pct,
        statusKetuntasan: s.statusKetuntasan === 'Tuntas' ? 'Tuntas' : 'Belum Tuntas',
        submittedAt: String(s.submittedAt || '-'),
        violations: Number.isFinite(Number(s.violations)) ? Number(s.violations) : 0,
      };
    });
}

function sanitizeViolations(raw: unknown): StudentViolationLog[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, any> => Boolean(item && typeof item === 'object'))
    .map((v, idx) => ({
      id: String(v.id || `viol-${idx}`),
      studentId: String(v.studentId || v.nisn || `std-${idx}`),
      studentName: String(v.studentName || 'Siswa'),
      nisn: String(v.nisn || '-'),
      kelas: String(v.kelas || '-'),
      token: String(v.token || '-'),
      timestamp: Number.isFinite(Number(v.timestamp)) ? Number(v.timestamp) : Date.now(),
      type: (v.type || 'Pindah Tab') as StudentViolationLog['type'],
      penaltySeconds: Number.isFinite(Number(v.penaltySeconds)) ? Number(v.penaltySeconds) : 10,
    }));
}

function sanitizeTeachers(raw: unknown): TeacherAccount[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, any> => Boolean(item && typeof item === 'object' && item.email && item.name))
    .map((t, idx) => ({
      id: String(t.id || `teacher-${idx}`),
      name: String(t.name),
      email: String(t.email).toLowerCase(),
      password: String(t.password || 'guru123'),
      subject: t.subject ? String(t.subject) : '',
      school: t.school ? String(t.school) : '',
      role: t.role === 'Admin Sekolah' || t.role === 'Pengawas' ? t.role : 'Guru Mapel',
      status: t.status === 'Nonaktif' ? 'Nonaktif' : 'Aktif',
      createdAt: String(t.createdAt || new Date().toISOString()),
      source: t.source === 'portal_daftar' ? 'portal_daftar' : 'pengaturan',
    }));
}

export default function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const initialTokenParam = (() => {
    const fromUrl = urlParams.get('token');
    if (fromUrl) return fromUrl.trim().toUpperCase();
    try {
      const savedTokens = localStorage.getItem('soalpintar_created_tokens_v2');
      if (savedTokens !== null) {
        const parsed = JSON.parse(savedTokens);
        if (Array.isArray(parsed)) {
          const valid = parsed.find((t) => t && typeof t === 'object' && typeof t.token === 'string' && t.token.trim());
          return valid ? String(valid.token).trim().toUpperCase() : '';
        }
      }
    } catch {
      // Ignore storage error
    }
    return 'ZJT0P4M';
  })();
  const [isUrlStudentDirect, setIsUrlStudentDirect] = useState<boolean>(
    () => urlParams.get('mode') === 'student'
  );

  const [authSession, setAuthSession] = useState<AuthSession | null>(() => {
    try {
      const saved = localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.role === 'teacher' && parsed.email && parsed.name) {
          return parsed as AuthSession;
        }
        if (parsed && parsed.role === 'student' && parsed.token && parsed.name) {
          return parsed as AuthSession;
        }
      }
    } catch {
      // Ignore storage error
    }
    return null;
  });

  const [mode, setMode] = useState<'teacher' | 'student'>(() => {
    if (urlParams.get('mode') === 'student') return 'student';
    if (authSession?.role === 'student') return 'student';
    return 'teacher';
  });
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isDark, setIsDark] = useState<boolean>(true); // screenshot is dark navy theme
  const [showProjectorModal, setShowProjectorModal] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Google Apps Script Web App Setting State (Persisted)
  const [webAppUrl, setWebAppUrl] = useState<string>(() => {
    return localStorage.getItem('soalpintar_gas_webapp_url') || '';
  });
  const [gasApiSecret, setGasApiSecret] = useState<string>(() => {
    return localStorage.getItem('soalpintar_gas_api_secret') || '';
  });
  const [guruName, setGuruName] = useState<string>(() => {
    return localStorage.getItem('soalpintar_gas_guru_name') || 'Apendi Mukdor, S.Pd.';
  });
  const [shuffleQuestions, setShuffleQuestions] = useState<boolean>(() => {
    return localStorage.getItem('soalpintar_gas_shuffle_q') !== 'false';
  });
  const [shuffleOptions, setShuffleOptions] = useState<boolean>(() => {
    return localStorage.getItem('soalpintar_gas_shuffle_o') === 'true';
  });

  const handleSaveWebAppUrl = (url: string) => {
    setWebAppUrl(url);
    localStorage.setItem('soalpintar_gas_webapp_url', url);
  };

  const handleSaveGasApiSecret = (secret: string) => {
    setGasApiSecret(secret);
    if (secret) {
      localStorage.setItem('soalpintar_gas_api_secret', secret);
    } else {
      localStorage.removeItem('soalpintar_gas_api_secret');
    }
  };

  const handleSaveGuruName = (name: string) => {
    setGuruName(name);
    localStorage.setItem('soalpintar_gas_guru_name', name);
  };

  const handleSaveShuffleQ = (val: boolean) => {
    setShuffleQuestions(val);
    localStorage.setItem('soalpintar_gas_shuffle_q', String(val));
  };

  const handleSaveShuffleO = (val: boolean) => {
    setShuffleOptions(val);
    localStorage.setItem('soalpintar_gas_shuffle_o', String(val));
  };

  // Core Data State (persisted so Clear Data survives refresh)
  const [packages, setPackages] = useState<QuestionPackage[]>(() => {
    try {
      const saved = localStorage.getItem(PACKAGES_STORAGE_KEY);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return sanitizePackages(parsed);
      }
    } catch {
      // Ignore storage error
    }
    return INITIAL_PACKAGES;
  });
  const [manualForms, setManualForms] = useState<ManualGoogleFormEntry[]>(() => {
    try {
      const saved = localStorage.getItem(MANUAL_FORMS_STORAGE_KEY);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return sanitizeManualForms(parsed);
      }
    } catch {
      // Ignore storage error
    }
    return [];
  });
  const [scores, setScores] = useState<StudentScoreRecord[]>(() => {
    try {
      const saved = localStorage.getItem(SCORES_STORAGE_KEY);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return sanitizeScores(parsed);
      }
    } catch {
      // Ignore storage error
    }
    return INITIAL_SCORES;
  });
  const [violations, setViolations] = useState<StudentViolationLog[]>(() => {
    try {
      const saved = localStorage.getItem(VIOLATIONS_STORAGE_KEY);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return sanitizeViolations(parsed);
      }
    } catch {
      // Ignore storage error
    }
    return INITIAL_VIOLATIONS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(PACKAGES_STORAGE_KEY, JSON.stringify(packages));
    } catch {
      // Ignore storage error
    }
  }, [packages]);

  useEffect(() => {
    try {
      localStorage.setItem(SCORES_STORAGE_KEY, JSON.stringify(scores));
    } catch {
      // Ignore storage error
    }
  }, [scores]);

  useEffect(() => {
    try {
      localStorage.setItem(VIOLATIONS_STORAGE_KEY, JSON.stringify(violations));
    } catch {
      // Ignore storage error
    }
  }, [violations]);

  const [registeredTeachers, setRegisteredTeachers] = useState<TeacherAccount[]>(() => {
    try {
      const saved = localStorage.getItem(REGISTERED_TEACHERS_STORAGE_KEY);
      if (saved) {
        const cleaned = sanitizeTeachers(JSON.parse(saved));
        if (cleaned.length > 0) return cleaned;
      }
    } catch {
      // Ignore storage error
    }
    return DEFAULT_TEACHER_ACCOUNTS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(REGISTERED_TEACHERS_STORAGE_KEY, JSON.stringify(registeredTeachers));
    } catch {
      // Ignore storage error
    }
  }, [registeredTeachers]);

  // Sync local registered teachers and persisted tokens with backend store on startup
  useEffect(() => {
    fetch('/api/teachers/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teachers: registeredTeachers }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && Array.isArray(data.teachers) && data.teachers.length > 0) {
          setRegisteredTeachers((prev) => {
            const byEmail = new Map<string, TeacherAccount>();
            for (const t of prev) byEmail.set(t.email.toLowerCase(), t);
            for (const t of sanitizeTeachers(data.teachers)) {
              if (!byEmail.has(t.email.toLowerCase())) {
                byEmail.set(t.email.toLowerCase(), t);
              }
            }
            return Array.from(byEmail.values());
          });
        }
      })
      .catch(() => {
        // Ignore offline error
      });

    try {
      const rawTokens = localStorage.getItem('soalpintar_created_tokens_v2');
      if (rawTokens !== null) {
        const parsedTokens = JSON.parse(rawTokens);
        if (Array.isArray(parsedTokens)) {
          const validTokens = parsedTokens.filter(
            (t) => t && typeof t === 'object' && typeof t.token === 'string' && t.token.trim()
          );
          fetch('/api/rooms/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hasStoredTokens: true, tokens: validTokens }),
          }).catch(() => {});
        }
      }
    } catch {
      // Ignore storage/network error
    }
  }, []);

  const handleCreateTeacher = async (
    payload: Omit<TeacherAccount, 'id' | 'createdAt'>
  ): Promise<{ success: boolean; message?: string; teacher?: TeacherAccount }> => {
    const cleanEmail = payload.email.trim().toLowerCase();
    const cleanName = payload.name.trim();

    if (registeredTeachers.some((t) => t.email.toLowerCase() === cleanEmail)) {
      return {
        success: false,
        message: `Email "${cleanEmail}" sudah terdaftar di sistem.`,
      };
    }

    let createdTeacher: TeacherAccount = {
      ...payload,
      id: 'teacher-' + Date.now(),
      name: cleanName,
      email: cleanEmail,
      createdAt: new Date().toISOString(),
    };

    try {
      const res = await fetch('/api/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }
      if (!res.ok && res.status !== 404) {
        return { success: false, message: data?.message || 'Gagal mendaftarkan guru.' };
      }
      if (data?.success && data.teacher) {
        createdTeacher = data.teacher;
      }
    } catch {
      // Fallback to localStorage-only persistence if offline
    }

    setRegisteredTeachers((prev) => [createdTeacher, ...prev]);
    return { success: true, teacher: createdTeacher };
  };

  const handleUpdateTeacher = async (
    id: string,
    updates: Partial<Omit<TeacherAccount, 'id' | 'createdAt'>>
  ): Promise<{ success: boolean; message?: string }> => {
    if (updates.email) {
      const cleanEmail = updates.email.trim().toLowerCase();
      if (registeredTeachers.some((t) => t.id !== id && t.email.toLowerCase() === cleanEmail)) {
        return { success: false, message: `Email "${cleanEmail}" sudah digunakan akun lain.` };
      }
    }

    try {
      const res = await fetch(`/api/teachers/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok && res.status !== 404) {
        const text = await res.text();
        let data: any = null;
        try {
          data = text ? JSON.parse(text) : null;
        } catch {
          data = null;
        }
        return { success: false, message: data?.message || 'Gagal memperbarui akun guru.' };
      }
    } catch {
      // Ignore offline error
    }

    setRegisteredTeachers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
    return { success: true };
  };

  const handleDeleteTeacher = async (
    id: string
  ): Promise<{ success: boolean; message?: string }> => {
    if (id === 'teacher-default-1') {
      return { success: false, message: 'Akun utama default tidak dapat dihapus.' };
    }

    try {
      await fetch(`/api/teachers/${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch {
      // Ignore offline error
    }

    setRegisteredTeachers((prev) => prev.filter((t) => t.id !== id));
    return { success: true };
  };

  useEffect(() => {
    try {
      localStorage.setItem(MANUAL_FORMS_STORAGE_KEY, JSON.stringify(manualForms));
    } catch {
      // Ignore storage error
    }
  }, [manualForms]);

  const handleAddManualForm = (entry: ManualGoogleFormEntry) => {
    setManualForms((prev) => [entry, ...prev]);
  };

  const handleDeleteManualForm = (id: string) => {
    setManualForms((prev) => prev.filter((m) => m.id !== id));
  };

  // Active Exam Token & Room Configuration (synced from saved tokens if present)
  const [examConfig, setExamConfig] = useState<ExamTokenConfig>(() => {
    const cleanToken = initialTokenParam.toUpperCase();
    try {
      const savedTokensRaw = localStorage.getItem('soalpintar_created_tokens_v2');
      if (savedTokensRaw !== null) {
        const parsedTokens = JSON.parse(savedTokensRaw);
        if (Array.isArray(parsedTokens)) {
          if (parsedTokens.length === 0 && !urlParams.get('token')) {
            return {
              token: '',
              title: '',
              subject: '',
              grade: '',
              totalQuestions: 0,
              durationMinutes: 90,
              remainingSeconds: 90 * 60,
              maxViolations: 3,
              waitingRoomEnabled: false,
              isExamStarted: true,
              isActive: true,
              googleFormUrl: '',
              googleFormEditUrl: '',
              driveFolderUrl: 'https://drive.google.com',
              expiryMode: 'jp',
              jpCount: 2,
            };
          }
          const matched =
            parsedTokens.find((t: any) => t?.token?.toUpperCase() === cleanToken) || parsedTokens[0];
          if (matched) {
            return {
              token: matched.token || cleanToken,
              title: matched.quizTitle || 'Ujian CBT',
              subject: matched.subject || 'Umum',
              grade: matched.grade || 'SMP',
              totalQuestions: Number(matched.totalQuestions) || 10,
              durationMinutes: 90,
              remainingSeconds: 90 * 60,
              maxViolations: Number(matched.maxViolations) || 3,
              waitingRoomEnabled: Boolean(matched.waitingRoomEnabled),
              isExamStarted: matched.isExamStarted !== false,
              isActive: matched.isActive !== false,
              googleFormUrl: matched.googleFormUrl || '',
              googleFormEditUrl: matched.googleFormEditUrl || '',
              driveFolderUrl: matched.driveFolderUrl || 'https://drive.google.com',
              expiryMode: matched.expiryDateTime ? 'datetime' : 'jp',
              expiryDateTime: matched.expiryDateTime || undefined,
              jpCount: 2,
            };
          }
        }
      }
    } catch {
      // Ignore storage error
    }

    const firstPkg = packages[0];
    return {
      token: cleanToken,
      title: firstPkg?.title || 'Asesmen Sumatif Akhir: Matematika Aljabar & Bilangan Bulat',
      subject: firstPkg?.subject || 'Matematika',
      grade: firstPkg?.grade || 'Kelas VII SMP',
      totalQuestions: firstPkg?.questions?.length || 15,
      durationMinutes: 90,
      remainingSeconds: 82 * 60,
      maxViolations: 3,
      waitingRoomEnabled: false,
      isExamStarted: true,
      isActive: true,
      googleFormUrl: firstPkg?.googleFormUrl || '',
      googleFormEditUrl: firstPkg?.googleFormEditUrl || '',
      driveFolderUrl: firstPkg?.driveFolderUrl || 'https://drive.google.com',
      expiryMode: 'jp',
      jpCount: 2,
    };
  });

  // Sync dark mode class
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Background timer countdown for active exam
  useEffect(() => {
    const timer = setInterval(() => {
      setExamConfig((prev) => {
        if (prev.isExamStarted && prev.remainingSeconds > 0) {
          return { ...prev, remainingSeconds: prev.remainingSeconds - 1 };
        }
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAddPackage = (pkg: QuestionPackage) => {
    setPackages([pkg, ...packages]);
  };

  const handleUpdatePackage = (updatedPkg: QuestionPackage) => {
    setPackages((prev) => prev.map((p) => (p.id === updatedPkg.id ? updatedPkg : p)));
  };

  const handleDeletePackage = (id: string) => {
    setPackages((prev) => prev.filter((p) => p.id !== id));
  };

  const handleDistributePackage = (pkg: QuestionPackage) => {
    setExamConfig({
      ...examConfig,
      title: pkg.title,
      subject: pkg.subject,
      grade: pkg.grade,
      totalQuestions: pkg.questions.length,
      googleFormUrl: pkg.googleFormUrl || examConfig.googleFormUrl,
      googleFormEditUrl: pkg.googleFormEditUrl || examConfig.googleFormEditUrl,
      driveFolderUrl: pkg.driveFolderUrl || examConfig.driveFolderUrl,
    });
    setActiveTab('token');
  };

  const handleLoginSuccess = (session: AuthSession) => {
    setAuthSession(session);
    try {
      localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch {
      // Ignore storage error
    }

    if (session.role === 'teacher') {
      if (session.name) {
        handleSaveGuruName(session.name);
      }
      setIsUrlStudentDirect(false);
      setMode('teacher');
      setActiveTab('dashboard');
    } else {
      setExamConfig((prev) => ({
        ...prev,
        token: session.token.toUpperCase(),
      }));
      setMode('student');
    }
  };

  const handleLogout = () => {
    setAuthSession(null);
    setIsUrlStudentDirect(false);
    setShowProjectorModal(false);
    setIsMobileMenuOpen(false);
    try {
      localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
    } catch {
      // Ignore storage error
    }
    if (window.location.search) {
      window.history.replaceState({}, '', window.location.pathname);
    }
    setMode('teacher');
    setActiveTab('dashboard');
  };

  // Show Login portal if user has no active session and didn't enter via QR student link
  if (!authSession && !isUrlStudentDirect) {
    return (
      <LoginView
        defaultRole={urlParams.get('token') ? 'student' : 'teacher'}
        defaultToken={examConfig.token}
        defaultGuruName={guruName}
        activeExamToken={examConfig.token}
        registeredTeachers={registeredTeachers}
        onRegisterTeacher={handleCreateTeacher}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  // If student mode or logged-in student session is active, render the Anti-Cheat Exam Player
  if (mode === 'student' || authSession?.role === 'student') {
    const isTeacherPreview = authSession?.role === 'teacher';
    return (
      <SecureExamPlayer
        initialToken={authSession?.role === 'student' ? authSession.token : examConfig.token}
        initialStudentName={authSession?.role === 'student' ? authSession.name : ''}
        initialStudentNisn={authSession?.role === 'student' ? authSession.nisn : ''}
        initialStudentKelas={authSession?.role === 'student' ? authSession.kelas : 'VII-A'}
        isTeacherPreview={isTeacherPreview}
        defaultPackages={packages}
        guruName={guruName}
        fallbackExamConfig={examConfig}
        onLogout={handleLogout}
        onRecordScore={(rec) => setScores((prev) => [rec, ...prev])}
        onRecordViolation={(log) => setViolations((prev) => [log, ...prev])}
        onExitToTeacherDashboard={() => {
          if (isTeacherPreview) {
            setMode('teacher');
          } else {
            handleLogout();
          }
        }}
      />
    );
  }

  const activeTeacherName =
    authSession?.role === 'teacher' ? authSession.name : guruName;
  const activeTeacherEmail =
    authSession?.role === 'teacher'
      ? authSession.email
      : 'apendimukdor86@guru.smp.belajar.id';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex font-sans transition-colors duration-200">
      {/* 1. Left Sidebar Navigation Menu */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenProjector={() => setShowProjectorModal(true)}
        onOpenStudentMode={() => setMode('student')}
        onLogout={handleLogout}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        tokenCode={examConfig.token}
        teacherName={activeTeacherName}
        teacherEmail={activeTeacherEmail}
        teachersCount={registeredTeachers.length}
      />

      {/* 2. Main Content Viewport (offset by 288px / lg:pl-72) */}
      <div className="flex-1 lg:pl-72 flex flex-col min-w-0 min-h-screen">
        {/* Top Header Bar */}
        <TopHeader
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          activeTab={activeTab}
          isDark={isDark}
          onToggleTheme={() => setIsDark(!isDark)}
          onOpenProjector={() => setShowProjectorModal(true)}
          onOpenStudentMode={() => setMode('student')}
          onLogout={handleLogout}
          tokenCode={examConfig.token}
        />

        {/* Viewport Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeTab === 'dashboard' && (
            <DashboardView
              teacherName={guruName || 'Apendi Mukdor, S.Pd.'}
              packages={packages}
              manualForms={manualForms}
              violations={violations}
              examConfig={examConfig}
              onNavigate={(tab) => setActiveTab(tab)}
              onSelectPackageForDistribution={(pkg) => handleDistributePackage(pkg)}
            />
          )}

          {activeTab === 'generator' && (
            <AiGeneratorView
              onSaveToBank={handleAddPackage}
              onOpenDistribusi={handleDistributePackage}
              webAppUrl={webAppUrl}
              gasApiSecret={gasApiSecret}
              guruName={guruName}
              shuffleQuestions={shuffleQuestions}
              shuffleOptions={shuffleOptions}
              onOpenGasSettings={() => setActiveTab('settings_gas')}
            />
          )}

          {activeTab === 'bank' && (
            <BankSoalView
              packages={packages}
              onAddPackage={handleAddPackage}
              onUpdatePackage={handleUpdatePackage}
              onDeletePackage={handleDeletePackage}
              onDistributePackage={handleDistributePackage}
              onGoToAiGenerator={() => setActiveTab('generator')}
              webAppUrl={webAppUrl}
              gasApiSecret={gasApiSecret}
              guruName={guruName}
              shuffleQuestions={shuffleQuestions}
              shuffleOptions={shuffleOptions}
              onOpenGasSettings={() => setActiveTab('settings_gas')}
              onUpdateWebAppUrl={handleSaveWebAppUrl}
            />
          )}

          {activeTab === 'google_forms' && (
            <GoogleFormsView
              packages={packages}
              examConfig={examConfig}
              manualForms={manualForms}
              onAddManualForm={handleAddManualForm}
              onDeleteManualForm={handleDeleteManualForm}
              onUpdatePackage={handleUpdatePackage}
              onOpenBankSoal={() => setActiveTab('bank')}
            />
          )}

          {activeTab === 'token' && (
            <TokenManagerView
              currentConfig={examConfig}
              onUpdateConfig={setExamConfig}
              onOpenProjector={() => setShowProjectorModal(true)}
              onOpenLiveMonitoring={() => setActiveTab('monitoring')}
              onOpenGoogleForms={() => setActiveTab('google_forms')}
              onOpenStudentMode={() => setMode('student')}
              packages={packages}
              manualForms={manualForms}
            />
          )}

          {activeTab === 'distribusi' && (
            <DistribusiGoogleFormView
              config={examConfig}
              onUpdateConfig={setExamConfig}
              onOpenLiveMonitoring={() => setActiveTab('monitoring')}
              onOpenSecureExam={() => setMode('student')}
            />
          )}

          {activeTab === 'monitoring' && (
            <LiveMonitoringView
              config={examConfig}
              packages={packages}
              onOpenProjector={() => setShowProjectorModal(true)}
              onOpenStudentSimulation={(tok) => {
                setExamConfig({ ...examConfig, token: tok });
                setMode('student');
              }}
            />
          )}

          {activeTab === 'rekap' && (
            <RekapNilaiView
              scores={scores}
              packages={packages}
              manualForms={manualForms}
              webAppUrl={webAppUrl}
              gasApiSecret={gasApiSecret}
              onOpenGasSettings={() => setActiveTab('settings_gas')}
              onImportScores={(newScores) => setScores(newScores)}
            />
          )}

          {activeTab === 'pelanggaran' && <RiwayatPelanggaranView violations={violations} />}

          {activeTab === 'teacher_users' && (
            <TeacherUsersView
              teachers={registeredTeachers}
              activeTeacherEmail={activeTeacherEmail}
              onCreateTeacher={handleCreateTeacher}
              onUpdateTeacher={handleUpdateTeacher}
              onDeleteTeacher={handleDeleteTeacher}
            />
          )}

          {activeTab === 'settings_gas' && (
            <GasSettingsView
              webAppUrl={webAppUrl}
              onSaveWebAppUrl={handleSaveWebAppUrl}
              gasApiSecret={gasApiSecret}
              onSaveGasApiSecret={handleSaveGasApiSecret}
              guruName={guruName}
              onSaveGuruName={handleSaveGuruName}
              shuffleQuestions={shuffleQuestions}
              onSaveShuffleQuestions={handleSaveShuffleQ}
              shuffleOptions={shuffleOptions}
              onSaveShuffleOptions={handleSaveShuffleO}
            />
          )}

          {activeTab === 'clear_data' && (
            <ClearDataView
              packages={packages}
              scores={scores}
              violations={violations}
              manualForms={manualForms}
              onClearViolations={() => setViolations([])}
              onClearScores={() => setScores([])}
              onClearGoogleForms={() => {
                setManualForms([]);
                setPackages((prev) =>
                  prev.map((p) => ({
                    ...p,
                    googleFormUrl: '',
                    googleFormEditUrl: '',
                    formId: '',
                  }))
                );
                setExamConfig((prev) => ({
                  ...prev,
                  googleFormUrl: '',
                  googleFormEditUrl: '',
                }));
              }}
              onClearTokens={() => {
                setExamConfig((prev) => ({
                  ...prev,
                  token: '',
                  isActive: false,
                }));
              }}
              onClearPackages={() => setPackages([])}
              onClearLogsAndHistory={() => {
                setViolations([]);
                setScores([]);
                setManualForms([]);
                setPackages((prev) =>
                  prev.map((p) => ({
                    ...p,
                    googleFormUrl: '',
                    googleFormEditUrl: '',
                    formId: '',
                  }))
                );
                setExamConfig((prev) => ({
                  ...prev,
                  googleFormUrl: '',
                  googleFormEditUrl: '',
                }));
              }}
              onClearAllData={() => {
                setViolations([]);
                setScores([]);
                setManualForms([]);
                setPackages([]);
                setExamConfig((prev) => ({
                  ...prev,
                  token: '',
                  title: '',
                  subject: '',
                  grade: '',
                  totalQuestions: 0,
                  googleFormUrl: '',
                  googleFormEditUrl: '',
                }));
              }}
              onRestoreDefaults={() => {
                setPackages(INITIAL_PACKAGES);
                setScores(INITIAL_SCORES);
                setViolations(INITIAL_VIOLATIONS);
                setManualForms([]);
                setExamConfig((prev) => ({
                  ...prev,
                  token: 'ZJT0P4M',
                  title: INITIAL_PACKAGES[0]?.title || 'Asesmen Sumatif Akhir',
                  subject: INITIAL_PACKAGES[0]?.subject || 'Matematika',
                  grade: INITIAL_PACKAGES[0]?.grade || 'Kelas VII SMP',
                  totalQuestions: INITIAL_PACKAGES[0]?.questions.length || 15,
                  isActive: true,
                  googleFormUrl: '',
                  googleFormEditUrl: '',
                }));
              }}
            />
          )}

          {activeTab === 'download' && <DownloadAplikasiView />}

          {activeTab === 'paket' && (
            <StatusPaketView
              teacherEmail={activeTeacherEmail}
              teacherName={activeTeacherName}
            />
          )}
        </main>

        {/* Editorial Footer */}
        <footer className="border-t border-slate-200 dark:border-slate-800 py-5 px-6 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 mt-auto">
          <div>
            Soalpintar.ai &copy; 2026 · Platform AI Asesmen & CBT Google Forms
          </div>
          <div className="flex items-center gap-3 text-slate-400">
            <span>Kurikulum Merdeka</span>
            <span>·</span>
            <span>Kemdikbudristek Belajar.id</span>
            <span>·</span>
            <span>Safe Exam Anti-Cheat</span>
          </div>
        </footer>
      </div>

      {/* Classroom Projector Modal */}
      {showProjectorModal && (
        <ProjectorScreenModal
          config={examConfig}
          onClose={() => setShowProjectorModal(false)}
        />
      )}
    </div>
  );
}
