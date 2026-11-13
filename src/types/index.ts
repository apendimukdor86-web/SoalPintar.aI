export type QuestionType = 'pilihan_ganda' | 'isian' | 'uraian';

export interface QuestionOption {
  key: string; // A, B, C, D, E
  text: string;
}

export interface QuestionItem {
  id: string;
  number: number;
  type: QuestionType;
  stimulus?: string;
  question: string;
  options?: QuestionOption[];
  correctAnswer: string;
  explanation: string;
  cognitiveLevel: string; // C1-C6, HOTS
  points: number;
}

export interface QuestionPackage {
  id: string;
  title: string;
  subject: string;
  grade: string;
  topic: string;
  createdAt: string;
  questions: QuestionItem[];
  googleAppsScript?: string;
  googleFormUrl?: string;
  googleFormEditUrl?: string;
  driveFolderUrl?: string;
  formId?: string;
  status?: string;
  batchCode?: string;
  timeAgo?: string;
  optionCount?: number;
}

export interface ExamTokenConfig {
  token: string;
  title: string;
  subject: string;
  grade: string;
  durationMinutes: number;
  remainingSeconds: number;
  maxViolations: number;
  waitingRoomEnabled: boolean;
  isExamStarted: boolean;
  googleFormUrl: string;
  googleFormEditUrl?: string;
  driveFolderUrl?: string;
  expiryMode: 'datetime' | 'jp';
  jpCount?: number; // Jam Pelajaran (1 JP = 45 min)
  expiryDateTime?: string;
  totalQuestions: number;
}

export interface StudentViolationLog {
  id: string;
  studentId: string;
  studentName: string;
  nisn: string;
  kelas: string;
  timestamp: number;
  type: 'Pindah Tab' | 'Keluar Fullscreen' | 'Split Screen / Resize' | 'Aplikasi Mengambang' | 'Kombinasi Tombol Dilarang';
  penaltySeconds: number;
}

export interface StudentExamSession {
  id: string;
  name: string;
  nisn: string;
  kelas: string;
  token: string;
  status: 'mengerjakan' | 'terputus' | 'diblokir' | 'selesai' | 'ruang_tunggu';
  startedAt: number;
  lastPing: number;
  violationsCount: number;
  violationsLog: Array<{
    id: string;
    timestamp: number;
    type: 'Pindah Tab' | 'Keluar Fullscreen' | 'Split Screen / Resize' | 'Aplikasi Mengambang' | 'Kombinasi Tombol Dilarang';
    penaltySeconds: number;
  }>;
  score?: number;
  totalScore?: number;
  warningMessage?: string | null;
  currentQuestionIndex?: number;
  deviceId?: string;
  deviceType?: string;
}

export interface StudentScoreRecord {
  id: string;
  studentName: string;
  nisn: string;
  kelas: string;
  token: string;
  score: number;
  maxScore: number;
  percentage: number;
  statusKetuntasan: 'Tuntas' | 'Belum Tuntas';
  submittedAt: string;
  violations: number;
}

export interface TeacherAccount {
  id: string;
  name: string;
  email: string;
  password: string;
  subject?: string;
  school?: string;
  role: 'Guru Mapel' | 'Admin Sekolah' | 'Pengawas';
  status: 'Aktif' | 'Nonaktif';
  createdAt: string;
  source?: 'portal_daftar' | 'pengaturan';
}

