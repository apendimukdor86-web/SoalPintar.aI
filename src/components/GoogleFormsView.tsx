import React, { useState, useMemo } from 'react';
import {
  PlusCircle,
  Save,
  FileText,
  ExternalLink,
  Copy,
  Check,
  Trash2,
  CheckCircle2,
  AlertCircle,
  BookOpen,
} from 'lucide-react';
import { ExamTokenConfig, QuestionPackage } from '../types';

export interface ManualGoogleFormEntry {
  id: string;
  label: string;
  url: string;
  createdAt: string;
  timeAgo: string;
}

interface GoogleFormsViewProps {
  packages: QuestionPackage[];
  examConfig: ExamTokenConfig;
  manualForms: ManualGoogleFormEntry[];
  onAddManualForm: (entry: ManualGoogleFormEntry) => void;
  onDeleteManualForm: (id: string) => void;
  onUpdatePackage: (pkg: QuestionPackage) => void;
  onOpenBankSoal: () => void;
}

export const GoogleFormsView: React.FC<GoogleFormsViewProps> = ({
  packages,
  examConfig,
  manualForms,
  onAddManualForm,
  onDeleteManualForm,
  onUpdatePackage,
  onOpenBankSoal,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [labelInput, setLabelInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleSaveManualForm = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedUrl = urlInput.trim();
    const trimmedLabel = labelInput.trim();

    if (!trimmedUrl) {
      setErrorMsg('Harap masukkan URL Google Form terlebih dahulu.');
      return;
    }

    const isValidGoogleForm =
      trimmedUrl.startsWith('https://docs.google.com/forms/') ||
      trimmedUrl.startsWith('https://forms.gle/');

    if (!isValidGoogleForm) {
      setErrorMsg(
        'URL tidak valid. Gunakan link Google Forms (contoh: https://docs.google.com/forms/d/e/.../viewform).'
      );
      return;
    }

    const newEntry: ManualGoogleFormEntry = {
      id: 'gform-' + Date.now(),
      label: trimmedLabel || 'Google Form Kuis',
      url: trimmedUrl,
      createdAt: new Date().toISOString().split('T')[0],
      timeAgo: 'Baru saja',
    };

    onAddManualForm(newEntry);
    setUrlInput('');
    setLabelInput('');
    showToast(`Google Form "${newEntry.label}" berhasil disimpan!`);
  };

  const combinedForms = useMemo(() => {
    const packageForms = packages
      .filter(
        (p) =>
          p.googleFormUrl &&
          (p.googleFormUrl.startsWith('https://docs.google.com/forms/') ||
            p.googleFormUrl.startsWith('https://forms.gle/')) &&
          !p.googleFormUrl.includes('contoh-')
      )
      .map((p) => ({
        id: 'pkg-form-' + p.id,
        title: p.title,
        subtitle: `${p.grade} · ${p.questions.length} soal · ${
          examConfig.title === p.title || examConfig.googleFormUrl === p.googleFormUrl ? 1 : 0
        } token · ${p.timeAgo || p.createdAt}`,
        url: p.googleFormUrl as string,
        source: 'package' as const,
        packageObj: p,
      }));

    const manualList = manualForms.map((m) => ({
      id: m.id,
      title: m.label,
      subtitle: `Form Manual · ${examConfig.googleFormUrl === m.url ? 1 : 0} token · ${m.timeAgo}`,
      url: m.url,
      source: 'manual' as const,
      manualId: m.id,
    }));

    return [...manualList, ...packageForms];
  }, [packages, manualForms, examConfig.title, examConfig.googleFormUrl]);

  const handleCopyUrl = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteForm = (item: (typeof combinedForms)[number]) => {
    if (item.source === 'manual' && item.manualId) {
      onDeleteManualForm(item.manualId);
      showToast(`Form "${item.title}" dihapus dari daftar.`);
    } else if (item.source === 'package' && item.packageObj) {
      onUpdatePackage({
        ...item.packageObj,
        googleFormUrl: '',
        googleFormEditUrl: '',
        formId: undefined,
      });
      showToast(`Tautan Google Form untuk "${item.title}" berhasil dihapus.`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Banner */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header matching screenshot */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            Google Forms
          </h1>
          <p className="mt-1 text-xs md:text-sm text-slate-400">
            Daftar Google Form yang sudah di-generate
          </p>
        </div>

        {/* Role Pill */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0d221e] border border-emerald-800/60 text-emerald-400 text-xs font-medium shadow-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>Guru</span>
        </div>
      </div>

      {/* Add Manual Form Card */}
      <form
        onSubmit={handleSaveManualForm}
        className="bg-[#0b1324] border border-slate-800/80 rounded-2xl p-5 md:p-6 shadow-sm space-y-4"
      >
        <div className="flex items-center gap-2 text-sm font-bold text-white">
          <PlusCircle className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>Tambahkan Form Manual</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-end gap-3.5">
          <div className="flex-1 space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">
              URL Google Form
            </label>
            <input
              type="url"
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder="https://docs.google.com/forms/..."
              className="w-full text-xs px-3.5 py-2.5 bg-[#0e172a] border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
          </div>

          <div className="flex-1 space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">
              Label / Nama Form
            </label>
            <input
              type="text"
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              placeholder="Contoh: UTS Biologi Kelompok 1"
              className="w-full text-xs px-3.5 py-2.5 bg-[#0e172a] border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 bg-[#6366f1] hover:bg-[#5558e3] active:bg-[#4f46e5] text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-2 shrink-0"
          >
            <Save className="w-4 h-4" />
            <span>Simpan</span>
          </button>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-950/40 border border-rose-800/60 px-3 py-2 rounded-xl">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </form>

      {/* Generated & Saved Google Forms List */}
      <div className="space-y-3.5">
        {combinedForms.length === 0 ? (
          <div className="bg-[#0b1324] border border-slate-800/80 rounded-2xl p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-[#0e382c]/70 border border-emerald-700/40 text-emerald-400 flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">
                Belum Ada Google Form Tersimpan
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                Tempelkan URL Google Form pada form di atas atau buat Google Form otomatis dari paket soal Anda di Bank Soal.
              </p>
            </div>
            <div className="pt-1">
              <button
                type="button"
                onClick={onOpenBankSoal}
                className="px-4 py-2 bg-[#0d2e2b] hover:bg-[#13403b] border border-emerald-700/50 text-emerald-400 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Buat Google Form dari Bank Soal</span>
              </button>
            </div>
          </div>
        ) : (
          combinedForms.map((item) => {
            const isCopied = copiedId === item.id;
            return (
              <div
                key={item.id}
                className="bg-[#0b1324] border border-slate-800/80 rounded-2xl p-5 shadow-sm hover:border-slate-700/80 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left Icon + Info */}
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="w-12 h-12 rounded-xl bg-[#0e382c]/80 border border-emerald-700/40 flex items-center justify-center text-emerald-400 shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm md:text-base font-bold text-white truncate">
                      {item.title}
                    </h3>
                    <div className="text-xs text-slate-400 mt-0.5 truncate">
                      {item.subtitle}
                    </div>
                    <div className="text-xs font-mono text-slate-400/90 mt-1 truncate">
                      {item.url}
                    </div>
                  </div>
                </div>

                {/* Right Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 bg-[#0d2e2b] hover:bg-[#13403b] border border-emerald-700/50 text-emerald-400 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Buka</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => handleCopyUrl(item.id, item.url)}
                    className="px-3.5 py-2 bg-[#162040] hover:bg-[#1e2c57] border border-indigo-700/50 text-indigo-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {isCopied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{isCopied ? 'Tersalin!' : 'Copy URL'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteForm(item)}
                    className="px-3.5 py-2 bg-[#2a1522] hover:bg-[#3a1d2e] border border-rose-800/50 text-rose-400 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
