import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Mail,
  Lock,
  Eye,
  EyeOff,
  BookOpen,
  Building2,
  ShieldCheck,
  Search,
  Edit3,
  Trash2,
  Check,
  X,
  UserCheck,
  AlertTriangle,
} from 'lucide-react';
import { TeacherAccount } from '../types';

interface TeacherUsersViewProps {
  teachers: TeacherAccount[];
  activeTeacherEmail?: string;
  onCreateTeacher: (
    payload: Omit<TeacherAccount, 'id' | 'createdAt'>
  ) => Promise<{ success: boolean; message?: string; teacher?: TeacherAccount }>;
  onUpdateTeacher: (
    id: string,
    updates: Partial<Omit<TeacherAccount, 'id' | 'createdAt'>>
  ) => Promise<{ success: boolean; message?: string }>;
  onDeleteTeacher: (id: string) => Promise<{ success: boolean; message?: string }>;
}

export const TeacherUsersView: React.FC<TeacherUsersViewProps> = ({
  teachers,
  activeTeacherEmail = '',
  onCreateTeacher,
  onUpdateTeacher,
  onDeleteTeacher,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [subject, setSubject] = useState('');
  const [school, setSchool] = useState('');
  const [role, setRole] = useState<'Guru Mapel' | 'Admin Sekolah' | 'Pengawas'>('Guru Mapel');
  const [status, setStatus] = useState<'Aktif' | 'Nonaktif'>('Aktif');

  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setEmail('');
    setPassword('');
    setSubject('');
    setSchool('');
    setRole('Guru Mapel');
    setStatus('Aktif');
    setFormError(null);
  };

  const handleStartEdit = (teacher: TeacherAccount) => {
    setEditingId(teacher.id);
    setName(teacher.name);
    setEmail(teacher.email);
    setPassword(''); // leave blank unless changing password
    setSubject(teacher.subject || '');
    setSchool(teacher.school || '');
    setRole(teacher.role);
    setStatus(teacher.status);
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      setFormError('Nama lengkap guru wajib diisi.');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setFormError('Harap masukkan alamat email guru yang valid.');
      return;
    }
    if (!editingId && (!password || password.length < 4)) {
      setFormError('Kata sandi minimal 4 karakter untuk pendaftaran guru baru.');
      return;
    }
    if (editingId && password && password.length < 4) {
      setFormError('Jika ingin mengubah kata sandi, minimal 4 karakter.');
      return;
    }

    setIsSaving(true);
    try {
      if (editingId) {
        const updates: Partial<Omit<TeacherAccount, 'id' | 'createdAt'>> = {
          name: cleanName,
          email: cleanEmail,
          subject: subject.trim(),
          school: school.trim(),
          role,
          status,
        };
        if (password) {
          updates.password = password;
        }
        const res = await onUpdateTeacher(editingId, updates);
        if (!res.success) {
          setFormError(res.message || 'Gagal memperbarui data guru.');
        } else {
          showToast(`Data pengguna guru "${cleanName}" berhasil diperbarui!`);
          resetForm();
        }
      } else {
        const res = await onCreateTeacher({
          name: cleanName,
          email: cleanEmail,
          password,
          subject: subject.trim(),
          school: school.trim(),
          role,
          status,
          source: 'pengaturan',
        });
        if (!res.success) {
          setFormError(res.message || 'Gagal mendaftarkan pengguna guru.');
        } else {
          showToast(`Pengguna guru "${cleanName}" berhasil ditambahkan dan dapat langsung login!`);
          resetForm();
        }
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (teacher: TeacherAccount) => {
    const nextStatus = teacher.status === 'Aktif' ? 'Nonaktif' : 'Aktif';
    const res = await onUpdateTeacher(teacher.id, { status: nextStatus });
    if (res.success) {
      showToast(`Status "${teacher.name}" diubah menjadi ${nextStatus}.`);
    } else {
      showToast(res.message || 'Gagal mengubah status.');
    }
  };

  const handleConfirmDelete = async (teacher: TeacherAccount) => {
    const res = await onDeleteTeacher(teacher.id);
    setConfirmDeleteId(null);
    if (res.success) {
      if (editingId === teacher.id) resetForm();
      showToast(`Akun guru "${teacher.name}" telah dihapus.`);
    } else {
      showToast(res.message || 'Gagal menghapus akun guru.');
    }
  };

  const filteredTeachers = teachers.filter((t) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      t.name.toLowerCase().includes(q) ||
      t.email.toLowerCase().includes(q) ||
      (t.subject || '').toLowerCase().includes(q) ||
      (t.school || '').toLowerCase().includes(q) ||
      t.role.toLowerCase().includes(q)
    );
  });

  const activeCount = teachers.filter((t) => t.status === 'Aktif').length;
  const portalRegisteredCount = teachers.filter((t) => t.source === 'portal_daftar').length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800">
              PENGATURAN &amp; APLIKASI
            </span>
            <span className="text-xs text-slate-400">· Sinkron dengan Portal Login Terpadu</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
            Daftar &amp; Manajemen Pengguna Guru
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Akun guru yang didaftarkan di Portal Login maupun ditambahkan di sini tersimpan di pengaturan aplikasi dan langsung aktif untuk login.
          </p>
        </div>

        {/* Summary Counters */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
            <span className="text-slate-400">Total Guru: </span>
            <span className="font-bold text-slate-900 dark:text-white font-mono">{teachers.length}</span>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
            <span className="text-slate-400">Aktif: </span>
            <span className="font-bold text-emerald-500 font-mono">{activeCount}</span>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
            <span className="text-slate-400">Daftar Portal: </span>
            <span className="font-bold text-indigo-400 font-mono">{portalRegisteredCount}</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Add/Edit Form Left, Teacher Directory Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Add / Edit Form */}
        <div className="lg:col-span-5">
          <form
            onSubmit={handleSubmit}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                <UserPlus className="w-4 h-4 text-emerald-600" />
                <span>{editingId ? 'Edit Pengguna Guru' : 'Tambah / Daftar Pengguna Guru'}</span>
              </div>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  Batal
                </button>
              )}
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Nama Lengkap &amp; Gelar
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Siti Rahayu, S.Pd."
                required
                className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Email Guru (Belajar.id / Gmail)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@guru.smp.belajar.id"
                  required
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3.5 py-2.5 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Mata Pelajaran
                </label>
                <div className="relative">
                  <BookOpen className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Matematika / IPA"
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-2.5 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Sekolah / Instansi
                </label>
                <div className="relative">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    placeholder="SMPN 1..."
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-2.5 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Peran Akun
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as TeacherAccount['role'])}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Guru Mapel">Guru Mapel</option>
                  <option value="Admin Sekolah">Admin Sekolah</option>
                  <option value="Pengawas">Pengawas</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Status Akses
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'Aktif' | 'Nonaktif')}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Nonaktif">Nonaktif</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {editingId ? 'Kata Sandi Baru (Kosongkan jika tidak diubah)' : 'Kata Sandi Login'}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={editingId ? 'Biarkan kosong untuk tetap' : 'Minimal 4 karakter'}
                  required={!editingId}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-10 py-2.5 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <Check className="w-4 h-4" />
              <span>
                {isSaving
                  ? 'Menyimpan...'
                  : editingId
                  ? 'Simpan Perubahan Guru'
                  : 'Simpan & Daftarkan Pengguna Guru'}
              </span>
            </button>
          </form>
        </div>

        {/* Right: Registered Teachers List */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                <Users className="w-4 h-4 text-indigo-500" />
                <span>Daftar Pengguna Guru Terdaftar ({filteredTeachers.length})</span>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama, email, mapel..."
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {filteredTeachers.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400">
                Tidak ada pengguna guru yang cocok dengan pencarian Anda.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTeachers.map((teacher) => {
                  const isCurrentActiveUser =
                    activeTeacherEmail &&
                    teacher.email.toLowerCase() === activeTeacherEmail.toLowerCase();
                  const isPrimaryDefault = teacher.id === 'teacher-default-1';

                  return (
                    <div
                      key={teacher.id}
                      className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-emerald-600/15 border border-emerald-500/30 text-emerald-500 flex items-center justify-center font-bold text-xs shrink-0">
                          {teacher.name
                            .split(/\s+/)
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((p) => p[0]?.toUpperCase() || '')
                            .join('') || 'GR'}
                        </div>

                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                              {teacher.name}
                            </span>
                            {isCurrentActiveUser && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                <UserCheck className="w-3 h-3" />
                                Sedang Login
                              </span>
                            )}
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                teacher.status === 'Aktif'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                  : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                              }`}
                            >
                              {teacher.status}
                            </span>
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {teacher.role}
                            </span>
                            {teacher.source === 'portal_daftar' && (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                                Daftar via Portal
                              </span>
                            )}
                          </div>

                          <div className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate">
                            {teacher.email}
                          </div>

                          {(teacher.subject || teacher.school) && (
                            <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-2">
                              {teacher.subject && <span>Mapel: {teacher.subject}</span>}
                              {teacher.subject && teacher.school && <span>·</span>}
                              {teacher.school && <span>{teacher.school}</span>}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(teacher)}
                          disabled={isPrimaryDefault}
                          title={
                            isPrimaryDefault
                              ? 'Akun default selalu aktif'
                              : teacher.status === 'Aktif'
                              ? 'Nonaktifkan akun'
                              : 'Aktifkan akun'
                          }
                          className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                        >
                          {teacher.status === 'Aktif' ? 'Nonaktifkan' : 'Aktifkan'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStartEdit(teacher)}
                          title="Edit pengguna guru"
                          className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-emerald-500 hover:border-emerald-500/40 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {!isPrimaryDefault &&
                          (confirmDeleteId === teacher.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleConfirmDelete(teacher)}
                                className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-semibold cursor-pointer"
                              >
                                Ya, Hapus
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] cursor-pointer"
                              >
                                Batal
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(teacher.id)}
                              title="Hapus pengguna guru"
                              className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-rose-500 hover:bg-rose-950/30 hover:border-rose-500/40 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white shadow-2xl text-xs font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        </div>
      )}
    </div>
  );
};
