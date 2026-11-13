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
import { QuestionPackage, ExamTokenConfig, StudentScoreRecord, TeacherAccount } from './types';

const MANUAL_FORMS_STORAGE_KEY = 'soalpintar_manual_google_forms';
const AUTH_SESSION_STORAGE_KEY = 'soalpintar_auth_session';
const REGISTERED_TEACHERS_STORAGE_KEY = 'soalpintar_registered_teachers';

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

export default function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const initialTokenParam = urlParams.get('token') || 'ZJT0P4M';
  const [isUrlStudentDirect, setIsUrlStudentDirect] = useState<boolean>(
    () => urlParams.get('mode') === 'student'
  );

  const [authSession, setAuthSession] = useState<AuthSession | null>(() => {
    try {
      const saved = localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.role === 'teacher' || parsed.role === 'student')) {
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
    try {
      const saved = localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.role === 'student') return 'student';
      }
    } catch {
      // Ignore storage error
    }
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

  // Core Data State
  const [packages, setPackages] = useState<QuestionPackage[]>(INITIAL_PACKAGES);
  const [manualForms, setManualForms] = useState<ManualGoogleFormEntry[]>(() => {
    try {
      const saved = localStorage.getItem(MANUAL_FORMS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Ignore storage error
    }
    return [];
  });
  const [scores, setScores] = useState<StudentScoreRecord[]>(INITIAL_SCORES);
  const [violations, setViolations] = useState(INITIAL_VIOLATIONS);

  const [registeredTeachers, setRegisteredTeachers] = useState<TeacherAccount[]>(() => {
    try {
      const saved = localStorage.getItem(REGISTERED_TEACHERS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed as TeacherAccount[];
        }
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

  // Sync local registered teachers with backend store on startup
  useEffect(() => {
    fetch('/api/teachers/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teachers: registeredTeachers }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && Array.isArray(data.teachers) && data.teachers.length > 0) {
          setRegisteredTeachers((prev) => {
            const byEmail = new Map<string, TeacherAccount>();
            for (const t of prev) byEmail.set(t.email.toLowerCase(), t);
            for (const t of data.teachers as TeacherAccount[]) {
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
      const data = await res.json();
      if (!res.ok && res.status !== 404) {
        return { success: false, message: data.message || 'Gagal mendaftarkan guru.' };
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
        const data = await res.json();
        return { success: false, message: data.message || 'Gagal memperbarui akun guru.' };
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

  // Active Exam Token & Room Configuration
  const [examConfig, setExamConfig] = useState<ExamTokenConfig>({
    token: initialTokenParam.toUpperCase(),
    title: 'Asesmen Sumatif Akhir: Matematika Aljabar & Bilangan Bulat',
    subject: 'Matematika',
    grade: 'Kelas VII SMP',
    totalQuestions: 15,
    durationMinutes: 90,
    remainingSeconds: 82 * 60,
    maxViolations: 3,
    waitingRoomEnabled: false,
    isExamStarted: true,
    googleFormUrl: '',
    googleFormEditUrl: '',
    driveFolderUrl: 'https://drive.google.com',
    expiryMode: 'jp',
    jpCount: 2,
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
              guruName={guruName}
              shuffleQuestions={shuffleQuestions}
              shuffleOptions={shuffleOptions}
              onOpenGasSettings={() => setActiveTab('settings_gas')}
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
              webAppUrl={webAppUrl}
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
                  token: 'ZJT0P4M',
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
                  token: 'ZJT0P4M',
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
