import React, { useState } from 'react';
import {
  ShieldCheck,
  GraduationCap,
  Users,
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  KeyRound,
  User,
  Hash,
  BookOpen,
  AlertTriangle,
  Sparkles,
  UserPlus,
  Building2,
  CheckCircle2,
  Monitor,
  Smartphone,
} from 'lucide-react';
import { TeacherAccount } from '../types';
import {
  getSyncDeviceId,
  getOrCreateDeviceId,
  detectDeviceCategory,
} from '../utils/deviceId';

export interface TeacherAuthPayload {
  role: 'teacher';
  name: string;
  email: string;
  loggedInAt: number;
}

export interface StudentAuthPayload {
  role: 'student';
  name: string;
  nisn: string;
  kelas: string;
  token: string;
  loggedInAt: number;
}

export type AuthSession = TeacherAuthPayload | StudentAuthPayload;

interface LoginViewProps {
  defaultRole?: 'teacher' | 'student';
  defaultToken?: string;
  defaultGuruName?: string;
  activeExamToken?: string;
  registeredTeachers?: TeacherAccount[];
  onRegisterTeacher?: (
    payload: Omit<TeacherAccount, 'id' | 'createdAt'>
  ) => Promise<{ success: boolean; message?: string; teacher?: TeacherAccount }>;
  onLoginSuccess: (session: AuthSession) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  defaultRole = 'teacher',
  defaultToken = 'ZJT0P4M',
  defaultGuruName = 'Apendi Mukdor, S.Pd.',
  activeExamToken = 'ZJT0P4M',
  registeredTeachers = [],
  onRegisterTeacher,
  onLoginSuccess,
}) => {
  const [roleTab, setRoleTab] = useState<'teacher' | 'student'>(defaultRole);
  const [teacherMode, setTeacherMode] = useState<'login' | 'register'>('login');

  // Teacher login form state
  const [teacherEmail, setTeacherEmail] = useState('apendimukdor86@guru.smp.belajar.id');
  const [teacherPassword, setTeacherPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Teacher registration form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regSubject, setRegSubject] = useState('');
  const [regSchool, setRegSchool] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Student login form state
  const [studentToken, setStudentToken] = useState(defaultToken.toUpperCase());
  const [studentName, setStudentName] = useState('');
  const [studentNisn, setStudentNisn] = useState('');
  const [studentKelas, setStudentKelas] = useState('VII-A');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [deviceId, setDeviceId] = useState<string>(() => getSyncDeviceId());
  const deviceType = React.useMemo(() => detectDeviceCategory(), []);

  React.useEffect(() => {
    let active = true;
    getOrCreateDeviceId().then((id) => {
      if (active && id) setDeviceId(id);
    });
    return () => {
      active = false;
    };
  }, []);

  const handleTeacherLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const trimmedEmail = teacherEmail.trim().toLowerCase();

    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setErrorMsg('Harap masukkan alamat email guru yang valid.');
      return;
    }

    if (!teacherPassword || teacherPassword.length < 4) {
      setErrorMsg('Kata sandi minimal 4 karakter.');
      return;
    }

    setIsLoading(true);
    try {
      // Check against local registeredTeachers state first
      const localMatch = registeredTeachers.find(
        (t) => t.email.toLowerCase() === trimmedEmail
      );

      if (localMatch) {
        if (localMatch.status === 'Nonaktif') {
          setErrorMsg('Akun guru ini sedang dinonaktifkan di Pengaturan & Aplikasi.');
          return;
        }
        if (localMatch.password !== teacherPassword) {
          setErrorMsg('Kata sandi tidak sesuai untuk akun guru tersebut.');
          return;
        }
        onLoginSuccess({
          role: 'teacher',
          name: localMatch.name,
          email: localMatch.email,
          loggedInAt: Date.now(),
        });
        return;
      }

      // Check backend API in case another session registered there
      const res = await fetch('/api/teachers/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password: teacherPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.teacher) {
        onLoginSuccess({
          role: 'teacher',
          name: data.teacher.name,
          email: data.teacher.email,
          loggedInAt: Date.now(),
        });
        return;
      }

      setErrorMsg(
        data.message ||
          'Email guru belum terdaftar. Klik "Daftar Guru Baru" untuk membuat akun dan menyimpannya ke Pengaturan.'
      );
    } catch {
      // Fallback for default demo account if server unreachable
      if (
        trimmedEmail === 'apendimukdor86@guru.smp.belajar.id' &&
        teacherPassword === 'guru123'
      ) {
        onLoginSuccess({
          role: 'teacher',
          name: defaultGuruName || 'Apendi Mukdor, S.Pd.',
          email: trimmedEmail,
          loggedInAt: Date.now(),
        });
      } else {
        setErrorMsg('Email atau kata sandi belum terdaftar. Silakan daftar akun guru terlebih dahulu.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleTeacherRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanName = regName.trim();
    const cleanEmail = regEmail.trim().toLowerCase();

    if (!cleanName) {
      setErrorMsg('Nama lengkap guru wajib diisi.');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Harap masukkan alamat email guru yang valid.');
      return;
    }
    if (!regPassword || regPassword.length < 4) {
      setErrorMsg('Kata sandi minimal 4 karakter.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setErrorMsg('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    if (!onRegisterTeacher) {
      onLoginSuccess({
        role: 'teacher',
        name: cleanName,
        email: cleanEmail,
        loggedInAt: Date.now(),
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await onRegisterTeacher({
        name: cleanName,
        email: cleanEmail,
        password: regPassword,
        subject: regSubject.trim(),
        school: regSchool.trim(),
        role: 'Guru Mapel',
        status: 'Aktif',
        source: 'portal_daftar',
      });

      if (!result.success) {
        setErrorMsg(result.message || 'Gagal mendaftarkan akun guru.');
        return;
      }

      setSuccessMsg('Akun guru berhasil didaftarkan & disimpan di Pengaturan & Aplikasi!');
      onLoginSuccess({
        role: 'teacher',
        name: result.teacher?.name || cleanName,
        email: result.teacher?.email || cleanEmail,
        loggedInAt: Date.now(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const normalizedToken = studentToken.trim().toUpperCase();
    const trimmedName = studentName.trim();
    const trimmedNisn = studentNisn.trim();
    const trimmedKelas = studentKelas.trim();

    if (!normalizedToken) {
      setErrorMsg('Kode Token Ujian wajib diisi.');
      return;
    }
    if (!trimmedName || !trimmedNisn || !trimmedKelas) {
      setErrorMsg('Harap lengkapi Nama Lengkap, NISN/No. Absen, dan Kelas Anda.');
      return;
    }

    setIsLoading(true);
    try {
      // Verify token against server rooms (allow activeExamToken fallback)
      const res = await fetch(`/api/rooms/${encodeURIComponent(normalizedToken)}`);
      if (!res.ok && normalizedToken !== activeExamToken.toUpperCase()) {
        setErrorMsg(
          `Kode token "${normalizedToken}" tidak ditemukan. Periksa kembali token dari pengawas/guru.`
        );
        setIsLoading(false);
        return;
      }
    } catch {
      // Allow offline/local fallback if server check fails transiently
    } finally {
      setIsLoading(false);
    }

    onLoginSuccess({
      role: 'student',
      name: trimmedName,
      nisn: trimmedNisn,
      kelas: trimmedKelas,
      token: normalizedToken,
      loggedInAt: Date.now(),
    });
  };

  const handleFillTeacherDemo = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setTeacherEmail('apendimukdor86@guru.smp.belajar.id');
    setTeacherPassword('guru123');
  };

  const handleFillStudentDemo = () => {
    setErrorMsg(null);
    setStudentToken((activeExamToken || 'ZJT0P4M').toUpperCase());
    setStudentName('Ahmad Raihan Pratama');
    setStudentNisn('0089283741');
    setStudentKelas('VII-A');
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-2xl bg-[#0b1324] border border-slate-800 shadow-sm">
            <span className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-base shadow-xs">
              S
            </span>
            <div className="text-left">
              <div className="text-sm font-extrabold tracking-tight text-white flex items-center gap-1.5">
                <span>Soalpintar.ai</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                  v2.0
                </span>
              </div>
              <div className="text-[10px] text-slate-400">
                Platform AI Asesmen &amp; CBT Google Forms
              </div>
            </div>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white pt-1">
            Masuk ke Portal Ujian
          </h1>
          <p className="text-xs text-slate-400">
            Pilih peran Anda sebagai <strong>Guru / Pengawas</strong> atau <strong>Peserta Ujian</strong>
          </p>
        </div>

        {/* Main Login Card */}
        <div className="bg-[#0b1324] border border-slate-800/90 rounded-2xl p-6 shadow-2xl space-y-5">
          {/* Role Switcher Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-[#0e172a] border border-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setRoleTab('teacher');
                setErrorMsg(null);
              }}
              className={`py-2.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                roleTab === 'teacher'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Login Guru</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setRoleTab('student');
                setErrorMsg(null);
              }}
              className={`py-2.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                roleTab === 'student'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Login Peserta</span>
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-800/80 text-rose-300 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-800/80 text-emerald-300 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {roleTab === 'teacher' ? (
            <div className="space-y-4">
              {/* Sub-mode switcher: Login vs Daftar Guru */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <button
                  type="button"
                  onClick={() => {
                    setTeacherMode('login');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className={`text-xs font-semibold pb-1 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                    teacherMode === 'login'
                      ? 'border-emerald-500 text-emerald-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Masuk Akun Guru</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTeacherMode('register');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className={`text-xs font-semibold pb-1 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                    teacherMode === 'register'
                      ? 'border-emerald-500 text-emerald-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Daftar Pengguna Guru</span>
                </button>
              </div>

              {teacherMode === 'login' ? (
                <form onSubmit={handleTeacherLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-300">
                      Email Guru (Belajar.id / Gmail)
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={teacherEmail}
                        onChange={(e) => setTeacherEmail(e.target.value)}
                        placeholder="nama@guru.smp.belajar.id"
                        required
                        className="w-full text-xs pl-10 pr-3.5 py-2.5 bg-[#0e172a] border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-medium text-slate-300">
                        Kata Sandi
                      </label>
                      <button
                        type="button"
                        onClick={handleFillTeacherDemo}
                        className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Isi Akun Demo</span>
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={teacherPassword}
                        onChange={(e) => setTeacherPassword(e.target.value)}
                        placeholder="Masukkan kata sandi..."
                        required
                        className="w-full text-xs pl-10 pr-10 py-2.5 bg-[#0e172a] border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                        title={showPassword ? 'Sembunyikan sandi' : 'Lihat sandi'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-60 text-white font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>{isLoading ? 'Memverifikasi Akun...' : 'Masuk ke Dashboard Guru'}</span>
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setTeacherMode('register');
                        setErrorMsg(null);
                      }}
                      className="text-[11px] text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
                    >
                      Belum terdaftar sebagai guru? <span className="font-semibold underline">Daftar Pengguna Guru Baru</span>
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleTeacherRegister} className="space-y-3.5">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-300">
                      Nama Lengkap &amp; Gelar
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="Contoh: Siti Rahayu, S.Pd."
                        required
                        className="w-full text-xs pl-10 pr-3.5 py-2.5 bg-[#0e172a] border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-300">
                      Email Guru (Belajar.id / Gmail)
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="nama@guru.smp.belajar.id"
                        required
                        className="w-full text-xs pl-10 pr-3.5 py-2.5 bg-[#0e172a] border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-slate-300">
                        Mata Pelajaran
                      </label>
                      <div className="relative">
                        <BookOpen className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={regSubject}
                          onChange={(e) => setRegSubject(e.target.value)}
                          placeholder="Matematika / IPA"
                          className="w-full text-xs pl-8 pr-3 py-2.5 bg-[#0e172a] border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-slate-300">
                        Asal Sekolah
                      </label>
                      <div className="relative">
                        <Building2 className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={regSchool}
                          onChange={(e) => setRegSchool(e.target.value)}
                          placeholder="SMPN 1..."
                          className="w-full text-xs pl-8 pr-3 py-2.5 bg-[#0e172a] border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-slate-300">
                        Kata Sandi
                      </label>
                      <div className="relative">
                        <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type={showRegPassword ? 'text' : 'password'}
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="Min. 4 karakter"
                          required
                          className="w-full text-xs pl-8 pr-8 py-2.5 bg-[#0e172a] border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPassword((prev) => !prev)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                        >
                          {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-slate-300">
                        Ulangi Sandi
                      </label>
                      <div className="relative">
                        <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type={showRegPassword ? 'text' : 'password'}
                          value={regConfirmPassword}
                          onChange={(e) => setRegConfirmPassword(e.target.value)}
                          placeholder="Ulangi sandi"
                          required
                          className="w-full text-xs pl-8 pr-3 py-2.5 bg-[#0e172a] border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-60 text-white font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{isLoading ? 'Menyimpan Akun...' : 'Daftar & Simpan ke Pengaturan'}</span>
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setTeacherMode('login');
                        setErrorMsg(null);
                      }}
                      className="text-[11px] text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
                    >
                      Sudah punya akun guru? <span className="font-semibold underline">Masuk di sini</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <form onSubmit={handleStudentLogin} className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-slate-300">
                    Kode Token Ujian
                  </label>
                  <button
                    type="button"
                    onClick={handleFillStudentDemo}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Isi Data Demo Peserta</span>
                  </button>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={studentToken}
                    onChange={(e) => setStudentToken(e.target.value.toUpperCase())}
                    placeholder="Misal: ZJT0P4M"
                    required
                    className="w-full font-mono text-sm font-bold tracking-widest pl-10 pr-3.5 py-2.5 bg-[#0e172a] border border-slate-800 rounded-xl text-emerald-400 placeholder-slate-500 uppercase focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-300">
                  Nama Lengkap Peserta
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="Nama sesuai absen kelas"
                    required
                    className="w-full text-xs pl-10 pr-3.5 py-2.5 bg-[#0e172a] border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-300">
                    NISN / No. Absen
                  </label>
                  <div className="relative">
                    <Hash className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={studentNisn}
                      onChange={(e) => setStudentNisn(e.target.value)}
                      placeholder="00892837..."
                      required
                      className="w-full text-xs font-mono pl-9 pr-3 py-2.5 bg-[#0e172a] border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-300">
                    Kelas / Rombel
                  </label>
                  <div className="relative">
                    <BookOpen className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={studentKelas}
                      onChange={(e) => setStudentKelas(e.target.value)}
                      placeholder="VII-A"
                      required
                      className="w-full text-xs pl-9 pr-3 py-2.5 bg-[#0e172a] border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-60 text-white font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{isLoading ? 'Memverifikasi Token...' : 'Masuk ke Portal Peserta'}</span>
              </button>

              <div className="pt-2 border-t border-slate-800/70 flex items-center justify-center gap-1.5 text-[11px] font-mono text-slate-400">
                {deviceType === 'HP / Tablet' ? (
                  <Smartphone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <Monitor className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                )}
                <span className="truncate">{deviceType} · Device ID: {deviceId}</span>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-slate-500">
          Soalpintar.ai · Sistem Asesmen Kurikulum Merdeka &amp; Google Forms Anti-Curang
        </p>
      </div>
    </div>
  );
};
