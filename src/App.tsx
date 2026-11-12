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
import { INITIAL_PACKAGES, INITIAL_SCORES, INITIAL_VIOLATIONS } from './data/mockBankSoal';
import { QuestionPackage, ExamTokenConfig, StudentScoreRecord } from './types';

export default function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const initialMode = urlParams.get('mode') === 'student' ? 'student' : 'teacher';
  const initialTokenParam = urlParams.get('token') || 'ZJT0P4M';

  const [mode, setMode] = useState<'teacher' | 'student'>(initialMode);
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
  const [scores, setScores] = useState<StudentScoreRecord[]>(INITIAL_SCORES);
  const [violations, setViolations] = useState(INITIAL_VIOLATIONS);

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

  // If student mode is active, render the dedicated Anti-Cheat Exam Player
  if (mode === 'student') {
    return (
      <SecureExamPlayer
        initialToken={examConfig.token}
        defaultPackages={packages}
        onExitToTeacherDashboard={() => setMode('teacher')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex font-sans transition-colors duration-200">
      {/* 1. Left Sidebar Navigation Menu */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenProjector={() => setShowProjectorModal(true)}
        onOpenStudentMode={() => setMode('student')}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        tokenCode={examConfig.token}
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

          {activeTab === 'token' && (
            <TokenManagerView
              currentConfig={examConfig}
              onUpdateConfig={setExamConfig}
              onOpenProjector={() => setShowProjectorModal(true)}
              onOpenLiveMonitoring={() => setActiveTab('monitoring')}
              packages={packages}
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

          {activeTab === 'download' && <DownloadAplikasiView />}

          {activeTab === 'paket' && <StatusPaketView />}
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
