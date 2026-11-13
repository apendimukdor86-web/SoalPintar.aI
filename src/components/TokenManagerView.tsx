import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Users,
  Radio,
  PlusCircle,
  Globe,
  KeyRound,
  Copy,
  Check,
  QrCode,
  Link2,
  EyeOff,
  Smartphone,
  Edit3,
  Pause,
  Play,
  Trash2,
  X,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { ExamTokenConfig, QuestionPackage } from '../types';
import { ManualGoogleFormEntry } from './GoogleFormsView';
import { generateQrCodeDataUrl } from '../utils/qr';

const TOKEN_LIST_STORAGE_KEY = 'soalpintar_created_tokens_v2';

export interface ManagedTokenEntry {
  token: string;
  label: string;
  quizTitle: string;
  subject: string;
  grade: string;
  totalQuestions: number;
  googleFormUrl: string;
  googleFormEditUrl?: string;
  driveFolderUrl?: string;
  maxViolations: number;
  expiryDateTime: string;
  waitingRoomEnabled: boolean;
  isExamStarted: boolean;
  isActive: boolean;
  createdAt: number;
}

interface TokenManagerViewProps {
  currentConfig: ExamTokenConfig;
  onUpdateConfig: (config: ExamTokenConfig) => void;
  onOpenProjector: () => void;
  onOpenLiveMonitoring: () => void;
  onOpenGoogleForms: () => void;
  onOpenStudentMode?: () => void;
  packages: QuestionPackage[];
  manualForms: ManualGoogleFormEntry[];
}

function generateRandomTokenCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let res = '';
  for (let i = 0; i < 7; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

export const TokenManagerView: React.FC<TokenManagerViewProps> = ({
  currentConfig,
  onUpdateConfig,
  onOpenProjector,
  onOpenLiveMonitoring,
  onOpenGoogleForms,
  onOpenStudentMode,
  packages,
  manualForms,
}) => {
  // Build Google Forms options (Manual Forms + Generated Bank Soal Forms)
  const googleFormOptions = useMemo(() => {
    const manualOpts = manualForms.map((m) => ({
      key: `manual:${m.id}`,
      label: m.label,
      title: m.label,
      subject: 'Google Form',
      grade: 'Form Manual',
      totalQuestions: 10,
      googleFormUrl: m.url,
      googleFormEditUrl: '',
      driveFolderUrl: currentConfig.driveFolderUrl || 'https://drive.google.com',
      sourceLabel: 'Form Manual',
    }));

    const packageOpts = packages
      .filter(
        (p) =>
          p.googleFormUrl &&
          (p.googleFormUrl.startsWith('https://docs.google.com/forms/') ||
            p.googleFormUrl.startsWith('https://forms.gle/')) &&
          !p.googleFormUrl.includes('contoh-')
      )
      .map((p) => ({
        key: `pkg:${p.id}`,
        label: p.title,
        title: p.title,
        subject: p.subject,
        grade: p.grade,
        totalQuestions: p.questions.length,
        googleFormUrl: p.googleFormUrl as string,
        googleFormEditUrl: p.googleFormEditUrl || '',
        driveFolderUrl: p.driveFolderUrl || 'https://drive.google.com',
        sourceLabel: `${p.grade} · ${p.questions.length} soal`,
      }));

    const all = [...manualOpts, ...packageOpts];
    if (all.length === 0 && packages.length > 0) {
      // Provide fallback option from packages if no Google Form generated yet
      return packages.slice(0, 5).map((p) => ({
        key: `pkg:${p.id}`,
        label: p.title,
        title: p.title,
        subject: p.subject,
        grade: p.grade,
        totalQuestions: p.questions.length,
        googleFormUrl: p.googleFormUrl || '',
        googleFormEditUrl: p.googleFormEditUrl || '',
        driveFolderUrl: p.driveFolderUrl || 'https://drive.google.com',
        sourceLabel: p.grade,
      }));
    }
    return all;
  }, [manualForms, packages, currentConfig.driveFolderUrl]);

  // Form inputs matching screenshot
  const [selectedFormKey, setSelectedFormKey] = useState<string>(() => {
    const matched = googleFormOptions.find(
      (opt) =>
        (currentConfig.googleFormUrl && opt.googleFormUrl === currentConfig.googleFormUrl) ||
        opt.title === currentConfig.title
    );
    return matched?.key || googleFormOptions[0]?.key || '';
  });
  const [labelInput, setLabelInput] = useState<string>('');
  const [maxViolationsInput, setMaxViolationsInput] = useState<number>(1);
  const [expiryInput, setExpiryInput] = useState<string>('');
  const [waitingRoomInput, setWaitingRoomInput] = useState<boolean>(false);

  // Managed Tokens List (persisted)
  const [tokens, setTokens] = useState<ManagedTokenEntry[]>(() => {
    try {
      const saved = localStorage.getItem(TOKEN_LIST_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Ignore storage error
    }
    return [
      {
        token: currentConfig.token || '534KR8M',
        label: 'ASAS',
        quizTitle: currentConfig.title || 'Segitiga',
        subject: currentConfig.subject || 'Matematika',
        grade: currentConfig.grade || 'SMP',
        totalQuestions: currentConfig.totalQuestions || 10,
        googleFormUrl: currentConfig.googleFormUrl || '',
        googleFormEditUrl: currentConfig.googleFormEditUrl || '',
        driveFolderUrl: currentConfig.driveFolderUrl || 'https://drive.google.com',
        maxViolations: 1,
        expiryDateTime: '',
        waitingRoomEnabled: currentConfig.waitingRoomEnabled,
        isExamStarted: true,
        isActive: true,
        createdAt: Date.now(),
      },
    ];
  });

  const [activeStudentsCount, setActiveStudentsCount] = useState<number>(0);
  const [copiedTokenCode, setCopiedTokenCode] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Modals
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);
  const [showWebTokenModal, setShowWebTokenModal] = useState<boolean>(false);
  const [webTokenInput, setWebTokenInput] = useState<string>(currentConfig.token || '');
  const [qrModalEntry, setQrModalEntry] = useState<ManagedTokenEntry | null>(null);
  const [qrModalImage, setQrModalImage] = useState<string>('');
  const [editingEntry, setEditingEntry] = useState<ManagedTokenEntry | null>(null);
  const [editLabel, setEditLabel] = useState<string>('');
  const [editLimit, setEditLimit] = useState<number>(1);
  const [editExpiry, setEditExpiry] = useState<string>('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3200);
  };

  useEffect(() => {
    try {
      localStorage.setItem(TOKEN_LIST_STORAGE_KEY, JSON.stringify(tokens));
    } catch {
      // Ignore storage error
    }
  }, [tokens]);

  useEffect(() => {
    if (googleFormOptions.length === 0) {
      setSelectedFormKey('');
      return;
    }
    if (!googleFormOptions.some((o) => o.key === selectedFormKey)) {
      setSelectedFormKey(googleFormOptions[0].key);
    }
  }, [googleFormOptions, selectedFormKey]);

  // Fetch live active student count from backend /api/rooms
  useEffect(() => {
    const fetchActiveCount = async () => {
      try {
        const res = await fetch('/api/rooms');
        const data = await res.json();
        if (data?.success && Array.isArray(data.rooms)) {
          let total = 0;
          for (const r of data.rooms) {
            const parts = r.participants ? Object.values(r.participants) : [];
            total += parts.filter((p: any) => p.status === 'mengerjakan').length;
          }
          setActiveStudentsCount(total);
        }
      } catch {
        // Ignore network error
      }
    };
    fetchActiveCount();
    const interval = setInterval(fetchActiveCount, 5000);
    return () => clearInterval(interval);
  }, []);

  const selectedFormItem = useMemo(
    () => googleFormOptions.find((opt) => opt.key === selectedFormKey) || null,
    [googleFormOptions, selectedFormKey]
  );

  const syncTokenToActiveConfigAndServer = async (entry: ManagedTokenEntry) => {
    const updated: ExamTokenConfig = {
      ...currentConfig,
      token: entry.token,
      title: entry.quizTitle,
      subject: entry.subject,
      grade: entry.grade,
      totalQuestions: entry.totalQuestions,
      googleFormUrl: entry.googleFormUrl,
      googleFormEditUrl: entry.googleFormEditUrl || '',
      driveFolderUrl: entry.driveFolderUrl || 'https://drive.google.com',
      maxViolations: entry.maxViolations,
      waitingRoomEnabled: entry.waitingRoomEnabled,
      isExamStarted: entry.isExamStarted,
      expiryMode: entry.expiryDateTime ? 'datetime' : 'jp',
      expiryDateTime: entry.expiryDateTime || undefined,
      durationMinutes: currentConfig.durationMinutes || 90,
      remainingSeconds: (currentConfig.durationMinutes || 90) * 60,
    };

    onUpdateConfig(updated);

    try {
      await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch {
      // Ignore offline error
    }
  };

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();

    const newCode = generateRandomTokenCode();
    const chosen = selectedFormItem;
    const newEntry: ManagedTokenEntry = {
      token: newCode,
      label: labelInput.trim() || 'ASAS',
      quizTitle: chosen?.title || currentConfig.title || 'Ujian CBT',
      subject: chosen?.subject || currentConfig.subject || 'Umum',
      grade: chosen?.grade || currentConfig.grade || 'SMP',
      totalQuestions: chosen?.totalQuestions || currentConfig.totalQuestions || 10,
      googleFormUrl: chosen?.googleFormUrl || currentConfig.googleFormUrl || '',
      googleFormEditUrl: chosen?.googleFormEditUrl || '',
      driveFolderUrl: chosen?.driveFolderUrl || 'https://drive.google.com',
      maxViolations: Math.max(1, Number(maxViolationsInput) || 1),
      expiryDateTime: expiryInput,
      waitingRoomEnabled: waitingRoomInput,
      isExamStarted: !waitingRoomInput,
      isActive: true,
      createdAt: Date.now(),
    };

    setTokens((prev) => [newEntry, ...prev]);
    await syncTokenToActiveConfigAndServer(newEntry);
    setLabelInput('');
    setExpiryInput('');
    showToast(`Token baru "${newCode}" berhasil dibuat dan diaktifkan!`);
  };

  const handleCopyToken = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedTokenCode(code);
    showToast(`Token "${code}" berhasil disalin!`);
    setTimeout(() => setCopiedTokenCode(null), 2000);
  };

  const handleCopyStudentLink = (entry: ManagedTokenEntry) => {
    const url = `${window.location.origin}/?mode=student&token=${entry.token}`;
    navigator.clipboard.writeText(url);
    showToast(`Tautan ujian siswa untuk token "${entry.token}" disalin!`);
  };

  const handleOpenQrForToken = async (entry: ManagedTokenEntry) => {
    await syncTokenToActiveConfigAndServer(entry);
    setQrModalEntry(entry);
    const url = `${window.location.origin}/?mode=student&token=${entry.token}`;
    const dataUrl = await generateQrCodeDataUrl(url);
    setQrModalImage(dataUrl);
  };

  const handleToggleExamStart = async (entry: ManagedTokenEntry) => {
    const nextStarted = !entry.isExamStarted;
    const updatedEntry = { ...entry, isExamStarted: nextStarted };
    setTokens((prev) => prev.map((t) => (t.token === entry.token ? updatedEntry : t)));

    if (nextStarted) {
      try {
        await fetch(`/api/rooms/${encodeURIComponent(entry.token)}/actions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'start_exam' }),
        });
      } catch {
        // Ignore offline error
      }
      showToast(`Ujian token "${entry.token}" dimulai serentak!`);
    } else {
      showToast(`Ruang tunggu token "${entry.token}" diaktifkan kembali.`);
    }
  };

  const handleToggleActiveStatus = (entry: ManagedTokenEntry) => {
    const nextActive = !entry.isActive;
    setTokens((prev) =>
      prev.map((t) => (t.token === entry.token ? { ...t, isActive: nextActive } : t))
    );
    showToast(
      nextActive
        ? `Token "${entry.token}" diaktifkan kembali.`
        : `Token "${entry.token}" dijeda (nonaktif sementara).`
    );
  };

  const handleOpenStudentPortalForToken = async (entry: ManagedTokenEntry) => {
    await syncTokenToActiveConfigAndServer(entry);
    if (onOpenStudentMode) {
      onOpenStudentMode();
    } else {
      onOpenLiveMonitoring();
    }
  };

  const handleStartEdit = (entry: ManagedTokenEntry) => {
    setEditingEntry(entry);
    setEditLabel(entry.label);
    setEditLimit(entry.maxViolations);
    setEditExpiry(entry.expiryDateTime || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;
    const updated: ManagedTokenEntry = {
      ...editingEntry,
      label: editLabel.trim() || editingEntry.label,
      maxViolations: Math.max(1, Number(editLimit) || 1),
      expiryDateTime: editExpiry,
    };
    setTokens((prev) => prev.map((t) => (t.token === updated.token ? updated : t)));
    if (currentConfig.token === updated.token) {
      await syncTokenToActiveConfigAndServer(updated);
    }
    setEditingEntry(null);
    showToast(`Token "${updated.token}" berhasil diperbarui.`);
  };

  const handleDeleteToken = (code: string) => {
    setTokens((prev) => prev.filter((t) => t.token !== code));
    showToast(`Token "${code}" dihapus dari daftar.`);
  };

  const handleWebTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = webTokenInput.trim().toUpperCase();
    if (!cleaned) return;
    const matched = tokens.find((t) => t.token === cleaned);
    if (matched) {
      await syncTokenToActiveConfigAndServer(matched);
    } else {
      onUpdateConfig({ ...currentConfig, token: cleaned });
    }
    setShowWebTokenModal(false);
    if (onOpenStudentMode) {
      onOpenStudentMode();
    } else {
      showToast(`Token web "${cleaned}" diterapkan sebagai token aktif.`);
    }
  };

  const formatExpiry = (val: string) => {
    if (!val) return '—';
    try {
      const dt = new Date(val);
      if (isNaN(dt.getTime())) return val;
      return dt.toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return val;
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. Top Guide Alert Banner */}
      <div className="bg-[#0b1324] border border-slate-800/90 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-950/50 border border-amber-700/50 text-amber-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">
              Panduan Penggunaan &amp; Alternatif Kendala Perangkat
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              Ujian mendukung &quot;Aplikasi Android&quot; (Mode Lockdown) dan &quot;Web Browser&quot; (Alternatif Cepat). Baca petunjuk penyelesaian masalah spesifikasi HP/browser siswa di sini.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowGuideModal(true)}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-xs"
        >
          <BookOpen className="w-4 h-4" />
          <span>Lihat Panduan Ujian</span>
        </button>
      </div>

      {/* 2. Live Concurrent Students Strip */}
      <div className="bg-[#0b1324] border border-slate-800/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#111c3a] border border-indigo-800/40 text-indigo-400 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">
              Siswa sedang ujian: <span className="font-mono">{activeStudentsCount} / 999</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Batas siswa ujian bersamaan sesuai paket Anda. Kursi kembali kosong saat siswa selesai.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenLiveMonitoring}
          className="px-4 py-2 bg-[#0e172a] hover:bg-slate-800 border border-slate-700/80 text-slate-200 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 shrink-0 cursor-pointer"
        >
          <Radio className="w-4 h-4 text-indigo-400" />
          <span>Ujian Live &amp; Layar QR</span>
        </button>
      </div>

      {/* 3. Buat Token Baru Card */}
      <form
        onSubmit={handleCreateToken}
        className="bg-[#0b1324] border border-slate-800/90 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <PlusCircle className="w-4 h-4 text-indigo-400" />
            <span>Buat Token Baru</span>
          </div>

          <button
            type="button"
            onClick={() => {
              setWebTokenInput(tokens[0]?.token || currentConfig.token || '');
              setShowWebTokenModal(true);
            }}
            className="px-3.5 py-2 bg-[#0e172a] hover:bg-slate-800 border border-slate-700/80 text-slate-200 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-indigo-400" />
            <span>Masukkan Token Versi Web</span>
          </button>
        </div>

        {/* 4-column Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
          <div className="md:col-span-3 space-y-1.5">
            <label className="block text-xs font-medium text-slate-400">
              Google Form
            </label>
            <select
              value={selectedFormKey}
              onChange={(e) => setSelectedFormKey(e.target.value)}
              className="w-full text-xs bg-[#0e172a] border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              {googleFormOptions.length === 0 ? (
                <option value="">-- Belum ada Google Form --</option>
              ) : (
                googleFormOptions.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label} ({opt.grade})
                  </option>
                ))
              )}
            </select>
            {googleFormOptions.length === 0 && (
              <button
                type="button"
                onClick={onOpenGoogleForms}
                className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <FileText className="w-3 h-3" />
                <span>Tambah di menu Google Forms</span>
              </button>
            )}
          </div>

          <div className="md:col-span-3 space-y-1.5">
            <label className="block text-xs font-medium text-slate-400">
              Label
            </label>
            <input
              type="text"
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              placeholder="Contoh: Kelas 9A - UTS Biologi"
              className="w-full text-xs bg-[#0e172a] border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="md:col-span-3 space-y-1.5">
            <label className="block text-xs font-medium text-slate-400">
              Batas Pelanggaran Keluar App/Fullscreen
            </label>
            <input
              type="number"
              min={1}
              max={20}
              value={maxViolationsInput}
              onChange={(e) => setMaxViolationsInput(Number(e.target.value))}
              className="w-full text-xs bg-[#0e172a] border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="md:col-span-3 space-y-1.5">
            <label className="block text-xs font-medium text-slate-400">
              Kedaluwarsa (opsional)
            </label>
            <input
              type="datetime-local"
              value={expiryInput}
              onChange={(e) => setExpiryInput(e.target.value)}
              className="w-full text-xs bg-[#0e172a] border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 scheme-dark"
            />
          </div>
        </div>

        {/* Waiting Room Box */}
        <label className="flex items-start gap-3 p-3.5 rounded-xl bg-[#0e172a] border border-slate-800/90 cursor-pointer hover:border-slate-700 transition-colors">
          <input
            type="checkbox"
            checked={waitingRoomInput}
            onChange={(e) => setWaitingRoomInput(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded-sm border-slate-600 text-indigo-600 focus:ring-indigo-500"
          />
          <div className="space-y-0.5">
            <div className="text-xs font-semibold text-white">
              Ruang tunggu: siswa menunggu dan baru mulai serentak saat saya klik &quot;Mulai Mengerjakan Soal&quot;
            </div>
            <div className="text-[11px] text-slate-400">
              Berlaku untuk web dan aplikasi Android. Tombol mulai ada di menu Ujian Live &rarr; Layar QR.
            </div>
          </div>
        </label>

        <div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition-colors inline-flex items-center gap-2 cursor-pointer shadow-md"
          >
            <KeyRound className="w-4 h-4" />
            <span>Buat Token</span>
          </button>
        </div>
      </form>

      {/* 4. Tokens Table Card */}
      <div className="bg-[#0b1324] border border-slate-800/90 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/80 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3.5 px-5">Token</th>
                <th className="py-3.5 px-4">Label</th>
                <th className="py-3.5 px-4">Quiz</th>
                <th className="py-3.5 px-4">Limit</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Kedaluwarsa</th>
                <th className="py-3.5 px-5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-xs">
              {tokens.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    Belum ada token dibuat. Klik tombol <strong>Buat Token</strong> di atas.
                  </td>
                </tr>
              ) : (
                tokens.map((entry) => (
                  <tr key={entry.token} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1.5 rounded-lg bg-[#19203b] border border-indigo-800/40 text-indigo-300 font-mono font-bold tracking-wider text-xs">
                          {entry.token}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyToken(entry.token)}
                          title="Salin kode token"
                          className="p-1.5 rounded-lg bg-[#0e172a] border border-slate-800 text-slate-400 hover:text-white cursor-pointer"
                        >
                          {copiedTokenCode === entry.token ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    <td className="py-4 px-4 font-semibold text-white">
                      {entry.label}
                    </td>

                    <td className="py-4 px-4 text-slate-300">
                      <div className="font-medium text-slate-200">{entry.quizTitle}</div>
                      {entry.googleFormUrl && (
                        <div className="text-[10px] font-mono text-slate-500 truncate max-w-[200px]">
                          {entry.googleFormUrl}
                        </div>
                      )}
                    </td>

                    <td className="py-4 px-4 font-bold text-rose-400 font-mono">
                      {entry.maxViolations}x
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex flex-col items-start gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                            entry.isActive
                              ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/50'
                              : 'bg-rose-950/60 text-rose-400 border-rose-800/50'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              entry.isActive ? 'bg-emerald-400' : 'bg-rose-400'
                            }`}
                          />
                          {entry.isActive ? 'Aktif' : 'Dijeda'}
                        </span>

                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                            entry.isExamStarted
                              ? 'bg-[#19203b] text-indigo-300 border-indigo-800/40'
                              : 'bg-amber-950/60 text-amber-300 border-amber-800/40'
                          }`}
                        >
                          {entry.isExamStarted ? 'Sudah dimulai' : 'Ruang tunggu'}
                        </span>
                      </div>
                    </td>

                    <td className="py-4 px-4 text-slate-400 font-mono text-[11px]">
                      {formatExpiry(entry.expiryDateTime)}
                    </td>

                    <td className="py-4 px-5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenQrForToken(entry)}
                          title="Tampilkan Layar QR Code"
                          className="w-8 h-8 rounded-lg bg-indigo-950/60 border border-indigo-800/50 text-indigo-300 hover:bg-indigo-900/60 flex items-center justify-center cursor-pointer"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopyStudentLink(entry)}
                          title="Salin Tautan Web Siswa"
                          className="w-8 h-8 rounded-lg bg-sky-950/60 border border-sky-800/50 text-sky-300 hover:bg-sky-900/60 flex items-center justify-center cursor-pointer"
                        >
                          <Link2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleExamStart(entry)}
                          title={
                            entry.isExamStarted
                              ? 'Aktifkan Ruang Tunggu (Tahan Siswa)'
                              : 'Mulai Ujian Serentak'
                          }
                          className="w-8 h-8 rounded-lg bg-amber-950/50 border border-amber-800/50 text-amber-300 hover:bg-amber-900/50 flex items-center justify-center cursor-pointer"
                        >
                          <EyeOff className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenStudentPortalForToken(entry)}
                          title="Buka Portal Ujian Siswa (Web / HP)"
                          className="w-8 h-8 rounded-lg bg-teal-950/60 border border-teal-800/50 text-teal-300 hover:bg-teal-900/60 flex items-center justify-center cursor-pointer"
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStartEdit(entry)}
                          title="Edit Token"
                          className="w-8 h-8 rounded-lg bg-indigo-950/50 border border-indigo-800/40 text-indigo-300 hover:bg-indigo-900/50 flex items-center justify-center cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleActiveStatus(entry)}
                          title={entry.isActive ? 'Jeda Token' : 'Aktifkan Token'}
                          className="w-8 h-8 rounded-lg bg-amber-950/40 border border-amber-800/40 text-amber-400 hover:bg-amber-900/50 flex items-center justify-center cursor-pointer"
                        >
                          {entry.isActive ? (
                            <Pause className="w-3.5 h-3.5" />
                          ) : (
                            <Play className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteToken(entry.token)}
                          title="Hapus Token"
                          className="w-8 h-8 rounded-lg bg-rose-950/60 border border-rose-800/50 text-rose-400 hover:bg-rose-900/60 flex items-center justify-center cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Panduan Ujian */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-[#0b1324] border border-slate-800 rounded-2xl w-full max-w-lg p-6 text-slate-100 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 font-bold text-sm text-white">
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span>Panduan Ujian &amp; Kendala Perangkat Siswa</span>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <div className="p-3 rounded-xl bg-[#0e172a] border border-slate-800">
                <div className="font-bold text-emerald-400 mb-1">1. Mode Web Browser (Cepat &amp; Universal)</div>
                <p>Siswa cukup memindai QR Code atau membuka tautan ujian di Chrome/Safari HP atau Laptop. Layar terkunci fullscreen dan otomatis mendeteksi Device ID perangkat agar tidak bisa mengulang.</p>
              </div>
              <div className="p-3 rounded-xl bg-[#0e172a] border border-slate-800">
                <div className="font-bold text-indigo-400 mb-1">2. Mode Aplikasi Android (Lockdown Penuh)</div>
                <p>Unduh APK di menu <strong>Download Aplikasi</strong> untuk penguncian penuh di HP Android (mencegah screenshot, floating window, dan split screen).</p>
              </div>
              <div className="p-3 rounded-xl bg-[#0e172a] border border-slate-800">
                <div className="font-bold text-amber-400 mb-1">3. Jika Siswa Terkendala / Terblokir</div>
                <p>Buka menu <strong>Ujian Live</strong> lalu klik tombol <strong>Buka Blokir</strong> atau <strong>Izinkan Ulang</strong> pada nama siswa yang bersangkutan.</p>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl cursor-pointer"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Masukkan Token Versi Web */}
      {showWebTokenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <form
            onSubmit={handleWebTokenSubmit}
            className="bg-[#0b1324] border border-slate-800 rounded-2xl w-full max-w-md p-6 text-slate-100 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 font-bold text-sm text-white">
                <Globe className="w-4 h-4 text-indigo-400" />
                <span>Masukkan Token Versi Web</span>
              </div>
              <button
                type="button"
                onClick={() => setShowWebTokenModal(false)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs text-slate-400">
                Kode Token Ujian
              </label>
              <input
                type="text"
                value={webTokenInput}
                onChange={(e) => setWebTokenInput(e.target.value.toUpperCase())}
                placeholder="Misal: 534KR8M"
                required
                className="w-full font-mono text-base font-bold tracking-widest bg-[#0e172a] border border-slate-800 rounded-xl px-4 py-2.5 text-indigo-300 uppercase focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowWebTokenModal(false)}
                className="px-3.5 py-2 text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Buka Portal Web Siswa</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: QR Code Token */}
      {qrModalEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-[#0b1324] border border-slate-800 rounded-3xl w-full max-w-md p-6 text-center text-white space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 font-bold text-sm">
                <QrCode className="w-4 h-4 text-indigo-400" />
                <span>QR Code Token {qrModalEntry.token}</span>
              </div>
              <button
                type="button"
                onClick={() => setQrModalEntry(null)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <h3 className="text-base font-bold text-white">{qrModalEntry.quizTitle}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{qrModalEntry.label}</p>
            </div>

            <div className="bg-white p-4 rounded-2xl inline-block mx-auto">
              {qrModalImage ? (
                <img src={qrModalImage} alt="QR Token" className="w-48 h-48 mx-auto" />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-slate-500 text-xs">
                  Membuat QR...
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => handleCopyStudentLink(qrModalEntry)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Salin Tautan Siswa
              </button>
              <button
                type="button"
                onClick={() => {
                  setQrModalEntry(null);
                  onOpenProjector();
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Buka Layar Proyektor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Token */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <form
            onSubmit={handleSaveEdit}
            className="bg-[#0b1324] border border-slate-800 rounded-2xl w-full max-w-md p-6 text-slate-100 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="font-bold text-sm text-white">
                Edit Token {editingEntry.token}
              </div>
              <button
                type="button"
                onClick={() => setEditingEntry(null)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs text-slate-400">Label</label>
              <input
                type="text"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                required
                className="w-full text-xs bg-[#0e172a] border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs text-slate-400">
                Batas Pelanggaran Keluar App/Fullscreen
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={editLimit}
                onChange={(e) => setEditLimit(Number(e.target.value))}
                className="w-full text-xs bg-[#0e172a] border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs text-slate-400">Kedaluwarsa (opsional)</label>
              <input
                type="datetime-local"
                value={editExpiry}
                onChange={(e) => setEditExpiry(e.target.value)}
                className="w-full text-xs bg-[#0e172a] border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 scheme-dark"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingEntry(null)}
                className="px-3.5 py-2 text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl cursor-pointer"
              >
                Simpan Perubahan
              </button>
            </div>
          </form>
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
