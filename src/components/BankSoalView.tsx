import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  Plus,
  Trash2,
  Edit3,
  Send,
  Download,
  FileText,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Folder,
  Settings,
  ShieldCheck,
  Zap,
  AlertCircle,
  FileCode,
  X,
  Link as LinkIcon,
  HelpCircle,
} from 'lucide-react';
import { QuestionItem, QuestionPackage } from '../types';

interface BankSoalViewProps {
  packages: QuestionPackage[];
  onAddPackage: (pkg: QuestionPackage) => void;
  onUpdatePackage?: (pkg: QuestionPackage) => void;
  onDeletePackage: (id: string) => void;
  onDistributePackage: (pkg: QuestionPackage) => void;
  onGoToAiGenerator: () => void;
  webAppUrl?: string;
  guruName?: string;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  onOpenGasSettings?: () => void;
}

export const BankSoalView: React.FC<BankSoalViewProps> = ({
  packages,
  onAddPackage,
  onUpdatePackage,
  onDeletePackage,
  onDistributePackage,
  onGoToAiGenerator,
  webAppUrl = '',
  guruName = 'Apendi Mukdor, S.Pd.',
  shuffleQuestions = true,
  shuffleOptions = false,
  onOpenGasSettings,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('Semua');
  const [selectedGrade, setSelectedGrade] = useState('Semua');
  const [expandedPackageId, setExpandedPackageId] = useState<string | null>(packages[0]?.id || null);

  // Toast feedback state (replaces window.alert)
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Dedicated Delete Confirmation Modal State (replaces window.confirm)
  const [pkgToDelete, setPkgToDelete] = useState<QuestionPackage | null>(null);

  // Edit Package Modal State (Perbaiki Data Paket)
  const [editingPackage, setEditingPackage] = useState<QuestionPackage | null>(null);

  // Edit Question Modal State (Perbaiki Data Butir Soal)
  const [editingQuestion, setEditingQuestion] = useState<{
    pkgId: string;
    question: QuestionItem;
  } | null>(null);

  // Save edited package
  const handleSaveEditedPackage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPackage) return;
    if (onUpdatePackage) {
      onUpdatePackage(editingPackage);
    }
    showToast(`Data paket "${editingPackage.title}" berhasil diperbaiki.`);
    setEditingPackage(null);
  };

  // Save edited question
  const handleSaveEditedQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion) return;
    const { pkgId, question } = editingQuestion;
    const targetPkg = packages.find((p) => p.id === pkgId);
    if (!targetPkg) return;

    const updatedQuestions = targetPkg.questions.map((q) =>
      q.id === question.id ? question : q
    );
    const updatedPkg: QuestionPackage = { ...targetPkg, questions: updatedQuestions };
    if (onUpdatePackage) {
      onUpdatePackage(updatedPkg);
    }
    showToast(`Butir soal No. ${question.number} berhasil diperbaiki.`);
    setEditingQuestion(null);
  };

  // Add question to existing package
  const handleAddQuestionToPackage = (pkg: QuestionPackage) => {
    const nextNum = pkg.questions.length + 1;
    const newQuestion: QuestionItem = {
      id: `q-${Date.now()}-${nextNum}`,
      number: nextNum,
      type: 'pilihan_ganda',
      question: 'Tuliskan pertanyaan baru di sini...',
      options: [
        { key: 'A', text: 'Pilihan A' },
        { key: 'B', text: 'Pilihan B' },
        { key: 'C', text: 'Pilihan C' },
        { key: 'D', text: 'Pilihan D' },
      ],
      correctAnswer: 'A',
      explanation: 'Pembahasan kunci jawaban.',
      cognitiveLevel: 'C2 - Pemahaman',
      points: 10,
    };
    const updatedPkg: QuestionPackage = {
      ...pkg,
      questions: [...pkg.questions, newQuestion],
    };
    if (onUpdatePackage) {
      onUpdatePackage(updatedPkg);
    }
    setEditingQuestion({
      pkgId: pkg.id,
      question: newQuestion,
    });
    showToast('Butir soal baru berhasil ditambahkan! Silakan perbaiki data soal.');
  };

  // Manual Add Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('Matematika');
  const [newGrade, setNewGrade] = useState('Kelas VII SMP');
  const [newTopic, setNewTopic] = useState('');

  // Questions for new manual package
  const [manualQuestions, setManualQuestions] = useState<QuestionItem[]>([
    {
      id: 'mq-1',
      number: 1,
      type: 'pilihan_ganda',
      stimulus: '',
      question: '',
      options: [
        { key: 'A', text: '' },
        { key: 'B', text: '' },
        { key: 'C', text: '' },
        { key: 'D', text: '' },
      ],
      correctAnswer: 'A',
      explanation: '',
      cognitiveLevel: 'C3 - Aplikasi',
      points: 10,
    },
  ]);

  // Google Form Automatic Creation & Management State
  const [selectedPkgForForm, setSelectedPkgForForm] = useState<QuestionPackage | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [formModalTab, setFormModalTab] = useState<'auto_gas' | 'manual_link' | 'code_script'>('auto_gas');

  // Inline Web App URL config inside modal
  const [inlineWebAppUrl, setInlineWebAppUrl] = useState(webAppUrl);

  // Manual Link Input State inside modal
  const [manualFormUrl, setManualFormUrl] = useState('');
  const [manualEditUrl, setManualEditUrl] = useState('');

  // Creation execution state
  const [isCreatingForm, setIsCreatingForm] = useState(false);
  const [formCreationStep, setFormCreationStep] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccessResult, setFormSuccessResult] = useState<{
    formUrl: string;
    editUrl: string;
    folder: string;
    isExisting?: boolean;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState<'view' | 'edit' | null>(null);

  // Standalone GAS script export modal
  const [showGasScriptModal, setShowGasScriptModal] = useState(false);
  const [customGasScript, setCustomGasScript] = useState('');
  const [copiedScript, setCopiedScript] = useState(false);

  // Top action modal for selecting package to convert to Google Form
  const [showSelectPkgModal, setShowSelectPkgModal] = useState(false);

  const subjects = ['Semua', ...Array.from(new Set(packages.map((p) => p.subject)))];
  const grades = ['Semua', ...Array.from(new Set(packages.map((p) => p.grade)))];

  const filteredPackages = packages.filter((pkg) => {
    const matchSearch =
      pkg.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pkg.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pkg.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchSubject = selectedSubject === 'Semua' || pkg.subject === selectedSubject;
    const matchGrade = selectedGrade === 'Semua' || pkg.grade === selectedGrade;
    return matchSearch && matchSubject && matchGrade;
  });

  // CONFIRMED DELETE ACTION
  const handleConfirmDelete = () => {
    if (!pkgToDelete) return;
    const title = pkgToDelete.title;
    onDeletePackage(pkgToDelete.id);
    setPkgToDelete(null);
    showToast(`Paket soal "${title}" berhasil dihapus.`);
  };

  // DELETE SINGLE QUESTION IN EXPANDED VIEW
  const handleDeleteQuestion = (pkg: QuestionPackage, questionId: string) => {
    if (pkg.questions.length <= 1) {
      showToast('Paket soal harus memiliki minimal 1 butir soal.');
      return;
    }
    const updatedQuestions = pkg.questions
      .filter((q) => q.id !== questionId)
      .map((q, idx) => ({ ...q, number: idx + 1 }));

    const updatedPkg: QuestionPackage = {
      ...pkg,
      questions: updatedQuestions,
    };

    if (onUpdatePackage) {
      onUpdatePackage(updatedPkg);
    }
    showToast('Butir soal berhasil dihapus dari paket.');
  };

  const handleSaveManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newPkg: QuestionPackage = {
      id: 'pkg-' + Date.now(),
      title: newTitle,
      subject: newSubject,
      grade: newGrade,
      topic: newTopic || 'Materi Umum',
      createdAt: new Date().toISOString().split('T')[0],
      questions: manualQuestions.filter((q) => q.question.trim() !== ''),
      googleAppsScript: 'ready',
    };

    onAddPackage(newPkg);
    setShowAddModal(false);
    setNewTitle('');
    setNewTopic('');
    showToast(`Paket soal "${newPkg.title}" berhasil ditambahkan ke Bank Soal.`);
  };

  const addManualQuestionField = () => {
    setManualQuestions([
      ...manualQuestions,
      {
        id: 'mq-' + Date.now(),
        number: manualQuestions.length + 1,
        type: 'pilihan_ganda',
        question: '',
        options: [
          { key: 'A', text: '' },
          { key: 'B', text: '' },
          { key: 'C', text: '' },
          { key: 'D', text: '' },
        ],
        correctAnswer: 'A',
        explanation: '',
        cognitiveLevel: 'C3 - Aplikasi',
        points: 10,
      },
    ]);
  };

  const exportToJson = (pkg: QuestionPackage) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(pkg, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${pkg.title.replace(/\s+/g, '_')}_soalpintar.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('File JSON paket soal berhasil diunduh.');
  };

  // Open modal to generate Google Form for a specific package
  const handleOpenCreateFormModal = (pkg: QuestionPackage) => {
    setSelectedPkgForForm(pkg);
    setFormError(null);
    setInlineWebAppUrl(webAppUrl || localStorage.getItem('soalpintar_gas_webapp_url') || '');
    setManualFormUrl(pkg.googleFormUrl || '');
    setManualEditUrl(pkg.googleFormEditUrl || '');

    const hasRealForm = Boolean(pkg.googleFormUrl && pkg.googleFormUrl.startsWith('https://docs.google.com/forms/'));

    setFormSuccessResult(
      hasRealForm
        ? {
            formUrl: pkg.googleFormUrl!,
            editUrl: pkg.googleFormEditUrl || '',
            folder: pkg.driveFolderUrl || `v2-soalpintar.ai/${pkg.subject}`,
            isExisting: true,
          }
        : null
    );
    setFormModalTab('auto_gas');
    setShowFormModal(true);
    setFormCreationStep(0);
  };

  // Save manual Google Form Link directly
  const handleSaveManualFormLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPkgForForm) return;

    if (!manualFormUrl.trim() || !manualFormUrl.includes('docs.google.com/forms')) {
      setFormError('Harap masukkan URL Google Form yang valid (contoh: https://docs.google.com/forms/d/e/.../viewform).');
      return;
    }

    const updated: QuestionPackage = {
      ...selectedPkgForForm,
      googleFormUrl: manualFormUrl.trim(),
      googleFormEditUrl: manualEditUrl.trim() || undefined,
      driveFolderUrl: 'https://drive.google.com',
      formId: 'manual-' + Date.now(),
    };

    setSelectedPkgForForm(updated);
    if (onUpdatePackage) {
      onUpdatePackage(updated);
    }

    setFormSuccessResult({
      formUrl: updated.googleFormUrl!,
      editUrl: updated.googleFormEditUrl || '',
      folder: 'Tautan Google Form Guru',
      isExisting: true,
    });
    setFormError(null);
    showToast('Tautan Google Form berhasil ditautkan ke paket soal!');
  };

  // Trigger Google Apps Script automatic form creation
  const handleExecuteCreateForm = async () => {
    if (!selectedPkgForForm) return;

    const targetUrl = inlineWebAppUrl.trim() || webAppUrl;

    // Check if webAppUrl is provided
    if (!targetUrl || !targetUrl.startsWith('https://script.google.com/macros/s/')) {
      setFormError(
        'URL Web App Google Apps Script belum valid. Silakan isi URL Web App Anda (format: https://script.google.com/macros/s/.../exec) pada kolom di bawah atau gunakan tab "Tautkan Link Sendiri".'
      );
      return;
    }

    // Save URL to localStorage
    localStorage.setItem('soalpintar_gas_webapp_url', targetUrl);

    setIsCreatingForm(true);
    setFormError(null);
    setFormCreationStep(1);

    // Format questions for Google Apps Script bridge
    const totalQuestions = selectedPkgForForm.questions.length;
    const formattedQuestions = selectedPkgForForm.questions.map((q, idx) => {
      const optionsArray = (q.options || []).map((o) => `${o.key}. ${o.text}`);
      let correctIndex = (q.options || []).findIndex((o) => o.key === q.correctAnswer || o.text === q.correctAnswer);
      if (correctIndex === -1) correctIndex = 0;

      return {
        number: idx + 1,
        type: q.type === 'pilihan_ganda' ? 'choice' : 'essay',
        question: q.stimulus ? `${q.stimulus}\n\n${q.question}` : q.question,
        options: optionsArray,
        answer: correctIndex,
      };
    });

    try {
      // Step visual feedback
      setTimeout(() => setFormCreationStep(2), 600);
      setTimeout(() => setFormCreationStep(3), 1300);

      const res = await fetch('/api/gas/create-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webAppUrl: targetUrl,
          title: selectedPkgForForm.title,
          quiz_id: 'pkg-' + selectedPkgForForm.id.replace(/[^a-zA-Z0-9]/g, '').slice(-8),
          guru_name: guruName || 'Guru',
          folder_name: selectedPkgForForm.subject,
          questions: formattedQuestions,
          shuffle_questions: shuffleQuestions,
          shuffle_options: shuffleOptions,
        }),
      });

      const data = await res.json();
      setFormCreationStep(4);

      if (data.success && data.form_url) {
        const result = {
          formUrl: data.form_url,
          editUrl: data.edit_url,
          folder: data.folder || `v2-soalpintar.ai/${selectedPkgForForm.subject}`,
          isExisting: data.data?.is_existing || false,
        };
        setFormSuccessResult(result);

        // Update package in state
        const updated: QuestionPackage = {
          ...selectedPkgForForm,
          googleFormUrl: data.form_url,
          googleFormEditUrl: data.edit_url,
          driveFolderUrl: `https://drive.google.com/drive/folders/v2-soalpintar-ai`,
          formId: data.form_id || 'form-' + Date.now(),
        };
        setSelectedPkgForForm(updated);
        if (onUpdatePackage) {
          onUpdatePackage(updated);
        }
        showToast('Google Form berhasil dibuat di Google Drive Anda!');
      } else {
        throw new Error(data.message || 'Gagal membuat Google Form via Apps Script.');
      }
    } catch (err: any) {
      console.error(err);
      setFormError(
        err.message ||
          'Gagal menghubungi Web App Google Apps Script. Pastikan URL Web App benar dan telah di-Deploy dengan akses: "Anyone".'
      );
    } finally {
      setIsCreatingForm(false);
    }
  };

  // Generate standalone Google Apps Script for the selected package
  const handleOpenGasScript = async (pkg: QuestionPackage) => {
    try {
      const res = await fetch('/api/generate-gas-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: pkg.title,
          questions: pkg.questions,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCustomGasScript(data.script);
        setSelectedPkgForForm(pkg);
        setShowGasScriptModal(true);
      }
    } catch (e: any) {
      showToast('Error: ' + e.message);
    }
  };

  const handleCopy = (text: string, type: 'view' | 'edit') => {
    navigator.clipboard.writeText(text);
    setCopiedLink(type);
    showToast('Tautan berhasil disalin ke clipboard.');
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(customGasScript);
    setCopiedScript(true);
    showToast('Kode Script Google Apps Script berhasil disalin!');
    setTimeout(() => setCopiedScript(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 text-emerald-200 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Bank Soal Guru Terpusat
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300">
              Otomasi Google Forms
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Kelola seluruh bank soal Anda, ekspor dan buat Google Form Kuis secara otomatis ke Google Drive, atau langsung distribusikan dengan token ujian anti-curang.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Top Quick Action: Buat Google Form Otomatis */}
          <button
            onClick={() => setShowSelectPkgModal(true)}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            Buat Google Form Otomatis
          </button>

          <button
            onClick={onGoToAiGenerator}
            className="px-3.5 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl hover:bg-emerald-100 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            AI Generator
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Tambah Manual
          </button>
        </div>
      </div>

      {/* Info Banner: Otomatisasi Google Form */}
      <div className="bg-purple-950/30 border border-purple-900/40 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-purple-200">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-900/60 border border-purple-700/60 text-purple-300 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-amber-300" />
          </div>
          <div>
            <div className="font-semibold text-white flex items-center gap-2">
              <span>Fitur Otomatisasi Google Form (Code.gs v3.2)</span>
              {webAppUrl ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-900/60 border border-emerald-700/80 text-emerald-300 font-normal">
                  ✓ Web App Terhubung
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-900/60 border border-amber-700/80 text-amber-300 font-normal">
                  Belum Ada URL Web App
                </span>
              )}
            </div>
            <p className="text-purple-300/80 mt-0.5 text-[11px]">
              Klik tombol <strong className="text-white">"⚡ Buat Google Form"</strong> di setiap kartu soal untuk otomatis mengonversi butir soal menjadi kuis Google Form di Google Drive Anda.
            </p>
          </div>
        </div>

        {onOpenGasSettings && (
          <button
            onClick={onOpenGasSettings}
            className="whitespace-nowrap px-3 py-1.5 bg-purple-800/80 hover:bg-purple-700 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto shrink-0"
          >
            <Settings className="w-3.5 h-3.5" />
            Setting Web App
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#0b1324] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between shadow-xs">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari mata pelajaran, bab, atau judul kuis..."
            className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 whitespace-nowrap">
            <span>Mapel:</span>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-slate-900 dark:text-slate-100"
            >
              {subjects.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 whitespace-nowrap">
            <span>Jenjang:</span>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-slate-900 dark:text-slate-100"
            >
              {grades.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Packages List */}
      <div className="space-y-4">
        {filteredPackages.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-[#0b1324] border border-slate-200 dark:border-slate-800/80 rounded-2xl text-slate-500 text-xs">
            Tidak ada paket soal yang cocok dengan filter pencarian.
          </div>
        ) : (
          filteredPackages.map((pkg) => {
            const isExpanded = expandedPackageId === pkg.id;
            const hasRealForm = Boolean(pkg.googleFormUrl && pkg.googleFormUrl.startsWith('https://docs.google.com/forms/'));

            return (
              <div
                key={pkg.id}
                className="bg-white dark:bg-[#0b1324] border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-xs overflow-hidden transition-all hover:border-slate-300 dark:hover:border-slate-700"
              >
                {/* Package Head */}
                <div className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 dark:border-slate-800/60">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                        {pkg.subject}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">· {pkg.grade}</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">· Dibuat {pkg.createdAt}</span>

                      {/* Google Form Status Badge */}
                      {hasRealForm ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/70 px-2 py-0.5 rounded-md">
                          <Check className="w-3 h-3 text-emerald-400" />
                          Google Form Siap
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 bg-slate-100 dark:bg-slate-800/60 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700/60">
                          Form Belum Dibuat
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug">
                      {pkg.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Materi: <strong className="text-slate-700 dark:text-slate-300">{pkg.topic}</strong> ({pkg.questions.length} Butir Soal Terdaftar)
                    </p>

                    {/* Quick Google Form Links if already created */}
                    {hasRealForm && (
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                        <a
                          href={pkg.googleFormUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-purple-400 hover:text-purple-300 font-medium bg-purple-950/40 hover:bg-purple-950/70 border border-purple-800/50 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Form Siswa</span>
                        </a>

                        {pkg.googleFormEditUrl && (
                          <a
                            href={pkg.googleFormEditUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium bg-indigo-950/40 hover:bg-indigo-950/70 border border-indigo-800/50 px-2.5 py-1 rounded-lg transition-colors"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Editor Form</span>
                          </a>
                        )}

                        <button
                          onClick={() => handleOpenCreateFormModal(pkg)}
                          className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-200 font-medium px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Generate ulang atau perbarui Google Form"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Update Form</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {/* PRIMARY ACTION: Buat Google Form Otomatis */}
                    <button
                      onClick={() => handleOpenCreateFormModal(pkg)}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 active:bg-purple-800 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                      title="Otomatis buat formulir kuis Google Form di Google Drive"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-300" />
                      {hasRealForm ? 'Kelola Google Form' : 'Buat Google Form Otomatis'}
                    </button>

                    {/* Secondary: Buat Token / Distribusikan */}
                    <button
                      onClick={() => onDistributePackage(pkg)}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                      title="Buat Token ujian untuk siswa"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Jadikan Token CBT
                    </button>

                    {/* Code.gs script viewer */}
                    <button
                      onClick={() => handleOpenGasScript(pkg)}
                      className="px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 bg-slate-100 dark:bg-slate-800 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                      title="Lihat / Ekspor Script Code.gs"
                    >
                      <FileCode className="w-3.5 h-3.5" />
                    </button>

                    {/* EDIT PACKAGE: Perbaiki Data Paket */}
                    <button
                      onClick={() => setEditingPackage({ ...pkg })}
                      className="px-2.5 py-1.5 text-xs font-medium text-indigo-400 hover:text-white bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-800/60 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                      title="Perbaiki judul, materi, jenjang, atau tautan paket soal"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Perbaiki Data</span>
                    </button>

                    {/* Download JSON */}
                    <button
                      onClick={() => exportToJson(pkg)}
                      className="px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 bg-slate-100 dark:bg-slate-800 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                      title="Unduh file JSON"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    {/* DELETE BUTTON: Opens Custom UI Delete Confirmation Modal */}
                    <button
                      onClick={() => setPkgToDelete(pkg)}
                      className="px-2.5 py-1.5 text-xs font-medium text-rose-500 hover:text-white hover:bg-rose-600 dark:bg-rose-950/40 dark:hover:bg-rose-600 border border-rose-300 dark:border-rose-900/60 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                      title="Hapus paket soal ini"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Hapus</span>
                    </button>

                    {/* Expand/Collapse */}
                    <button
                      onClick={() => setExpandedPackageId(isExpanded ? null : pkg.id)}
                      className="px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Questions Details */}
                {isExpanded && (
                  <div className="p-5 bg-slate-50/50 dark:bg-[#070d18] space-y-4">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Daftar Butir Soal & Kunci Jawaban</span>
                      <span>Total: {pkg.questions.length} Butir Soal ({pkg.questions.reduce((acc, q) => acc + (q.points || 10), 0)} Poin)</span>
                    </div>

                    <div className="space-y-3">
                      {pkg.questions.map((q) => (
                        <div
                          key={q.id}
                          className="bg-white dark:bg-[#0b1324] border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 text-xs space-y-2 shadow-2xs relative group/q"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              No. {q.number} ({q.type === 'pilihan_ganda' ? 'Pilihan Ganda' : q.type === 'isian' ? 'Isian' : 'Uraian'})
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-slate-400 font-mono">
                                {q.cognitiveLevel} · {q.points} Poin
                              </span>
                              {/* Edit single question button */}
                              <button
                                onClick={() => setEditingQuestion({ pkgId: pkg.id, question: { ...q } })}
                                className="text-slate-400 hover:text-indigo-400 p-1 transition-colors cursor-pointer"
                                title="Perbaiki butir soal ini"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              {/* Delete single question button */}
                              <button
                                onClick={() => handleDeleteQuestion(pkg, q.id)}
                                className="text-slate-400 hover:text-rose-500 p-1 transition-colors cursor-pointer"
                                title="Hapus butir soal ini"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {q.stimulus && (
                            <p className="italic text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800/50">
                              {q.stimulus}
                            </p>
                          )}

                          <p className="font-medium text-slate-900 dark:text-slate-100">{q.question}</p>

                          {q.options && q.options.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 pt-1">
                              {q.options.map((opt) => (
                                <div
                                  key={opt.key}
                                  className={`p-2 rounded-lg border text-xs flex items-center gap-2 ${
                                    opt.key === q.correctAnswer
                                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 font-medium'
                                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                                  }`}
                                >
                                  <span className="font-mono font-bold w-4 text-purple-400">{opt.key}.</span>
                                  <span>{opt.text}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="pt-2 text-[11px] text-slate-500 border-t border-slate-100 dark:border-slate-800/80">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              Kunci Jawaban: {q.correctAnswer}
                            </span>
                            <p className="mt-0.5 text-slate-400">{q.explanation}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Bottom Package Actions */}
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                      <button
                        onClick={() => handleAddQuestionToPackage(pkg)}
                        className="px-3 py-1.5 text-xs font-semibold text-emerald-400 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/60 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah Butir Soal Baru</span>
                      </button>
                      <button
                        onClick={() => setEditingPackage({ ...pkg })}
                        className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Perbaiki Metadata Paket Soal</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* MODAL: DELETE CONFIRMATION DIALOG (Fixes "Tombol delet/Hapus") */}
      {pkgToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="bg-[#0b1324] border border-rose-900/60 rounded-2xl w-full max-w-md p-6 shadow-2xl text-slate-100 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-950 border border-rose-800 text-rose-500 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">Hapus Paket Soal?</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Apakah Anda yakin ingin menghapus paket soal{' '}
                  <strong className="text-white">"{pkgToDelete.title}"</strong> ({pkgToDelete.subject} - {pkgToDelete.grade})?
                </p>
                <p className="text-[11px] text-rose-400/90 font-medium">
                  Seluruh {pkgToDelete.questions.length} butir soal di dalamnya akan dihapus secara permanen dari Bank Soal Guru.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setPkgToDelete(null)}
                className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PERBAIKI DATA PAKET SOAL */}
      {editingPackage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="bg-[#0b1324] border border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl text-slate-100 animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-950 border border-indigo-800 text-indigo-400 flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Perbaiki Data Paket Soal</h3>
                  <p className="text-[11px] text-slate-400">Edit informasi identitas dan tautan formulir paket</p>
                </div>
              </div>
              <button
                onClick={() => setEditingPackage(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedPackage} className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Judul Singkat Paket</label>
                <input
                  type="text"
                  required
                  value={editingPackage.title}
                  onChange={(e) => setEditingPackage({ ...editingPackage, title: e.target.value })}
                  placeholder="Contoh: Tabung, IPA, Matematika Aljabar"
                  className="w-full text-xs bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Mata Pelajaran</label>
                  <input
                    type="text"
                    required
                    value={editingPackage.subject}
                    onChange={(e) => setEditingPackage({ ...editingPackage, subject: e.target.value })}
                    placeholder="Contoh: Matematika, IPA"
                    className="w-full text-xs bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Jenjang / Kelas</label>
                  <select
                    value={editingPackage.grade}
                    onChange={(e) => setEditingPackage({ ...editingPackage, grade: e.target.value })}
                    className="w-full text-xs bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="SD">SD</option>
                    <option value="SMP">SMP</option>
                    <option value="SMP Kelas 7">SMP Kelas 7</option>
                    <option value="SMP Kelas 8">SMP Kelas 8</option>
                    <option value="SMP Kelas 9">SMP Kelas 9</option>
                    <option value="SMA">SMA</option>
                    <option value="SMK">SMK</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Topik / Bahasan Materi</label>
                <input
                  type="text"
                  required
                  value={editingPackage.topic}
                  onChange={(e) => setEditingPackage({ ...editingPackage, topic: e.target.value })}
                  placeholder="Contoh: Bangun Ruang Sisi Lengkung: Tabung"
                  className="w-full text-xs bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800 space-y-3">
                <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5 text-purple-400" />
                  <span>Tautan Google Forms (Opsional)</span>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">URL Google Form Siswa (/viewform)</label>
                  <input
                    type="url"
                    value={editingPackage.googleFormUrl || ''}
                    onChange={(e) => setEditingPackage({ ...editingPackage, googleFormUrl: e.target.value })}
                    placeholder="https://docs.google.com/forms/d/e/.../viewform"
                    className="w-full text-xs bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">URL Editor Google Form Guru (/edit)</label>
                  <input
                    type="url"
                    value={editingPackage.googleFormEditUrl || ''}
                    onChange={(e) => setEditingPackage({ ...editingPackage, googleFormEditUrl: e.target.value })}
                    placeholder="https://docs.google.com/forms/d/.../edit"
                    className="w-full text-xs bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingPackage(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl cursor-pointer shadow-sm"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PERBAIKI BUTIR SOAL */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="bg-[#0b1324] border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl text-slate-100 animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Perbaiki Butir Soal No. {editingQuestion.question.number}
                  </h3>
                  <p className="text-[11px] text-slate-400">Edit teks pertanyaan, pilihan jawaban, kunci, dan pembahasan</p>
                </div>
              </div>
              <button
                onClick={() => setEditingQuestion(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedQuestion} className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Stimulus / Teks Pengantar (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={editingQuestion.question.stimulus || ''}
                  onChange={(e) =>
                    setEditingQuestion({
                      ...editingQuestion,
                      question: { ...editingQuestion.question, stimulus: e.target.value },
                    })
                  }
                  placeholder="Contoh: Sebuah tabung memiliki jari-jari 7 cm..."
                  className="w-full text-xs bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Teks Pertanyaan <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={editingQuestion.question.question}
                  onChange={(e) =>
                    setEditingQuestion({
                      ...editingQuestion,
                      question: { ...editingQuestion.question, question: e.target.value },
                    })
                  }
                  placeholder="Tuliskan pertanyaan soal..."
                  className="w-full text-xs bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* 4 Options */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 block">Pilihan Jawaban (A, B, C, D)</label>
                {editingQuestion.question.options?.map((opt, optIdx) => (
                  <div key={opt.key} className="flex items-center gap-2">
                    <span className="w-6 text-center font-bold font-mono text-purple-400 text-xs">
                      {opt.key}.
                    </span>
                    <input
                      type="text"
                      required
                      value={opt.text}
                      onChange={(e) => {
                        const newOpts = [...(editingQuestion.question.options || [])];
                        newOpts[optIdx] = { ...newOpts[optIdx], text: e.target.value };
                        setEditingQuestion({
                          ...editingQuestion,
                          question: { ...editingQuestion.question, options: newOpts },
                        });
                      }}
                      className="flex-1 text-xs bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-emerald-500"
                      placeholder={`Pilihan ${opt.key}...`}
                    />
                  </div>
                ))}
              </div>

              {/* Cognitive level, Points, Answer Key */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Kunci Jawaban Benar</label>
                  <select
                    value={editingQuestion.question.correctAnswer}
                    onChange={(e) =>
                      setEditingQuestion({
                        ...editingQuestion,
                        question: { ...editingQuestion.question, correctAnswer: e.target.value },
                      })
                    }
                    className="w-full text-xs bg-slate-900 border border-emerald-600/80 rounded-xl p-2.5 text-emerald-300 font-bold font-mono focus:outline-none"
                  >
                    <option value="A">Kunci: A</option>
                    <option value="B">Kunci: B</option>
                    <option value="C">Kunci: C</option>
                    <option value="D">Kunci: D</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Tingkat Kognitif</label>
                  <select
                    value={editingQuestion.question.cognitiveLevel || 'C2 - Pemahaman'}
                    onChange={(e) =>
                      setEditingQuestion({
                        ...editingQuestion,
                        question: { ...editingQuestion.question, cognitiveLevel: e.target.value },
                      })
                    }
                    className="w-full text-xs bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="C1 - Mengingat">C1 - Mengingat</option>
                    <option value="C2 - Pemahaman">C2 - Pemahaman</option>
                    <option value="C3 - Aplikasi">C3 - Aplikasi</option>
                    <option value="C4 - Penalaran">C4 - Penalaran</option>
                    <option value="C5 - Evaluasi">C5 - Evaluasi</option>
                    <option value="C6 - Kreasi">C6 - Kreasi</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Bobot Poin</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={editingQuestion.question.points || 10}
                    onChange={(e) =>
                      setEditingQuestion({
                        ...editingQuestion,
                        question: { ...editingQuestion.question, points: Number(e.target.value) || 10 },
                      })
                    }
                    className="w-full text-xs bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Pembahasan / Penjelasan Jawaban
                </label>
                <textarea
                  rows={2}
                  value={editingQuestion.question.explanation || ''}
                  onChange={(e) =>
                    setEditingQuestion({
                      ...editingQuestion,
                      question: { ...editingQuestion.question, explanation: e.target.value },
                    })
                  }
                  placeholder="Penjelasan mengapa kunci tersebut benar..."
                  className="w-full text-xs bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingQuestion(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl cursor-pointer shadow-sm"
                >
                  Simpan Perubahan Soal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BUAT GOOGLE FORM OTOMATIS & INTEGRASI */}
      {showFormModal && selectedPkgForForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs">
          <div className="bg-[#0b1324] border border-slate-800 rounded-2xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl text-slate-100">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-950/80 border border-purple-800/60 text-purple-300 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Pembuatan & Integrasi Google Form
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Paket: <strong className="text-purple-300">{selectedPkgForForm.title}</strong> ({selectedPkgForForm.questions.length} Soal)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowFormModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex border-b border-slate-800 px-5 pt-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setFormModalTab('auto_gas');
                  setFormError(null);
                }}
                className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  formModalTab === 'auto_gas'
                    ? 'border-purple-500 text-purple-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Otomatis via Web App</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFormModalTab('manual_link');
                  setFormError(null);
                }}
                className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  formModalTab === 'manual_link'
                    ? 'border-purple-500 text-purple-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>Tautkan URL Form Sendiri</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleOpenGasScript(selectedPkgForForm);
                }}
                className="pb-2.5 px-3 font-semibold border-b-2 border-transparent text-slate-400 hover:text-slate-200 transition-colors cursor-pointer flex items-center gap-1.5 ml-auto"
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Kode Script (Code.gs)</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              {/* Error Box */}
              {formError && (
                <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-200 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>Perhatian</span>
                  </div>
                  <p className="leading-relaxed">{formError}</p>
                </div>
              )}

              {/* SUCCESS RESULT SCREEN */}
              {formSuccessResult && !isCreatingForm && (
                <div className="p-5 rounded-xl bg-emerald-950/40 border border-emerald-800/80 space-y-4">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Google Form Berhasil Terhubung!</span>
                  </div>

                  <p className="text-xs text-slate-300">
                    Formulir kuis telah tersambung dengan paket soal ini dan siap digunakan oleh siswa di portal ujian anti-curang.
                  </p>

                  <div className="space-y-2.5">
                    {/* Public Form URL */}
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                        <span>Tautan Pengerjaan Siswa (Google Forms):</span>
                        <button
                          onClick={() => handleCopy(formSuccessResult.formUrl, 'view')}
                          className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                        >
                          {copiedLink === 'view' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedLink === 'view' ? 'Tersalin' : 'Salin Tautan'}</span>
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={formSuccessResult.formUrl}
                          className="flex-1 text-xs bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono select-all"
                        />
                        <a
                          href={formSuccessResult.formUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium flex items-center gap-1 shrink-0"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Buka
                        </a>
                      </div>
                    </div>

                    {/* Edit URL */}
                    {formSuccessResult.editUrl && (
                      <div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                          <span>Tautan Editor Guru (Google Forms):</span>
                          <button
                            onClick={() => handleCopy(formSuccessResult.editUrl, 'edit')}
                            className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                          >
                            {copiedLink === 'edit' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedLink === 'edit' ? 'Tersalin' : 'Salin'}</span>
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={formSuccessResult.editUrl}
                            className="flex-1 text-xs bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono select-all"
                          />
                          <a
                            href={formSuccessResult.editUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium flex items-center gap-1 shrink-0"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Edit
                          </a>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-emerald-900/40 flex flex-col sm:flex-row gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setFormSuccessResult(null)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
                    >
                      Ubah / Generate Ulang
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowFormModal(false);
                        onDistributePackage(selectedPkgForForm);
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Jadikan Token & Ujian CBT Sekarang
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 1: OTOMATIS VIA APPS SCRIPT WEB APP */}
              {formModalTab === 'auto_gas' && !formSuccessResult && !isCreatingForm && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-900/40 text-xs space-y-2">
                    <div className="font-semibold text-purple-300 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>Pembuatan Formulir Otomatis di Google Drive Anda:</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px]">
                      <li>Otomatis membuat Google Form kuis baru dengan mode nilai <strong>100%</strong>.</li>
                      <li>Kunci jawaban dan pembahasan mendalam langsung tersimpan.</li>
                      <li>Disimpan di folder: <strong>v2-soalpintar.ai/{selectedPkgForForm.subject}</strong>.</li>
                    </ul>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      URL Web App Google Apps Script (Code.gs v3.2):
                    </label>
                    <input
                      type="url"
                      value={inlineWebAppUrl}
                      onChange={(e) => setInlineWebAppUrl(e.target.value)}
                      placeholder="https://script.google.com/macros/s/.../exec"
                      className="w-full text-xs font-mono bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
                    />
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                      <span>Dihasilkan dari menu Deploy &gt; Web app di script.google.com</span>
                      {onOpenGasSettings && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowFormModal(false);
                            onOpenGasSettings();
                          }}
                          className="text-purple-400 hover:text-purple-300 underline cursor-pointer"
                        >
                          Buka Panduan Setup
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs flex items-center justify-between">
                    <span className="text-slate-400">Nama Guru / Folder:</span>
                    <span className="font-semibold text-white">{guruName}</span>
                  </div>
                </div>
              )}

              {/* PROGRESS ANIMATION */}
              {isCreatingForm && (
                <div className="p-6 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
                  <div className="flex items-center gap-3">
                    <RefreshCw className="w-5 h-5 text-purple-400 animate-spin" />
                    <div>
                      <h4 className="text-xs font-bold text-white">Sedang Membuat Google Form Kuis...</h4>
                      <p className="text-[11px] text-slate-400">Menghubungkan ke Google Drive via Google Apps Script.</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className={`flex items-center gap-2 ${formCreationStep >= 1 ? 'text-emerald-400 font-semibold' : 'text-slate-500'}`}>
                      <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px]">
                        {formCreationStep > 1 ? '✓' : '1'}
                      </span>
                      <span>Menyiapkan {selectedPkgForForm.questions.length} butir soal, kunci, dan pembahasan...</span>
                    </div>

                    <div className={`flex items-center gap-2 ${formCreationStep >= 2 ? 'text-emerald-400 font-semibold' : 'text-slate-500'}`}>
                      <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px]">
                        {formCreationStep > 2 ? '✓' : '2'}
                      </span>
                      <span>Mengirim ke Google Apps Script Web App...</span>
                    </div>

                    <div className={`flex items-center gap-2 ${formCreationStep >= 3 ? 'text-emerald-400 font-semibold' : 'text-slate-500'}`}>
                      <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px]">
                        {formCreationStep > 3 ? '✓' : '3'}
                      </span>
                      <span>Membuat Formulir Kuis & Bobot Nilai 100%...</span>
                    </div>

                    <div className={`flex items-center gap-2 ${formCreationStep >= 4 ? 'text-emerald-400 font-semibold' : 'text-slate-500'}`}>
                      <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px]">
                        {formCreationStep >= 4 ? '✓' : '4'}
                      </span>
                      <span>Menyimpan ke folder Google Drive v2-soalpintar.ai...</span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: MANUAL LINK INPUT (For teachers who already have their own Google Form) */}
              {formModalTab === 'manual_link' && !formSuccessResult && (
                <form onSubmit={handleSaveManualFormLink} className="space-y-3.5">
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
                    Punya Google Form kuis yang sudah dibuat sendiri sebelumnya? Tempelkan tautannya di sini untuk menghubungkannya dengan paket soal ini:
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Tautan Pengerjaan Siswa (Google Forms /viewform) <span className="text-rose-400">*</span>:
                    </label>
                    <input
                      type="url"
                      value={manualFormUrl}
                      onChange={(e) => setManualFormUrl(e.target.value)}
                      placeholder="https://docs.google.com/forms/d/e/.../viewform"
                      className="w-full text-xs font-mono bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Tautan Editor Guru (Google Forms /edit) <span className="text-slate-500">(Opsional)</span>:
                    </label>
                    <input
                      type="url"
                      value={manualEditUrl}
                      onChange={(e) => setManualEditUrl(e.target.value)}
                      placeholder="https://docs.google.com/forms/d/.../edit"
                      className="w-full text-xs font-mono bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Simpan & Tautkan Google Form Ini
                  </button>
                </form>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white"
              >
                {formSuccessResult ? 'Selesai' : 'Batal'}
              </button>

              {!formSuccessResult && formModalTab === 'auto_gas' && (
                <button
                  type="button"
                  disabled={isCreatingForm}
                  onClick={handleExecuteCreateForm}
                  className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  {isCreatingForm ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Memproses...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5 text-amber-300" />
                      <span>Eksekusi Buat Google Form Sekarang</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SELECT PACKAGE FROM TOP BUTTON */}
      {showSelectPkgModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-[#0b1324] border border-slate-800 rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl text-slate-100">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Zap className="w-4 h-4 text-purple-400" />
                <span>Pilih Paket Soal untuk Dibuat Google Form</span>
              </div>
              <button
                onClick={() => setShowSelectPkgModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3">
              <p className="text-xs text-slate-400 mb-2">
                Pilih salah satu paket soal dari Bank Soal Guru untuk langsung dikonversi menjadi formulir Google Form Kuis:
              </p>

              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  onClick={() => {
                    setShowSelectPkgModal(false);
                    handleOpenCreateFormModal(pkg);
                  }}
                  className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-purple-600 hover:bg-slate-900 transition-all flex items-center justify-between cursor-pointer group"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded">
                        {pkg.subject}
                      </span>
                      <span className="text-[11px] text-slate-400">{pkg.grade}</span>
                      {pkg.googleFormUrl && pkg.googleFormUrl.startsWith('https://docs.google.com/forms/') && (
                        <span className="text-[10px] text-emerald-400 font-semibold">✓ Form Siap</span>
                      )}
                    </div>
                    <div className="text-xs font-bold text-white mt-1 group-hover:text-purple-300 transition-colors">
                      {pkg.title}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {pkg.questions.length} butir soal · Topik: {pkg.topic}
                    </div>
                  </div>

                  <span className="text-xs font-medium text-purple-400 group-hover:text-purple-300 flex items-center gap-1 shrink-0">
                    <span>Pilih</span>
                    <Zap className="w-3.5 h-3.5" />
                  </span>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowSelectPkgModal(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CODE.GS STANDALONE SCRIPT MODAL */}
      {showGasScriptModal && selectedPkgForForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-[#0b1324] border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl text-slate-100">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <FileCode className="w-4 h-4 text-purple-400" />
                <span>Script Google Apps Script: {selectedPkgForForm.title}</span>
              </div>
              <button
                onClick={() => setShowGasScriptModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3">
              <p className="text-xs text-slate-400">
                Kode di bawah ini dapat disalin dan langsung dijalankan di <strong>script.google.com</strong> untuk membuat Google Form kuis mandiri dengan seluruh kunci jawaban dan pembahasan:
              </p>

              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-emerald-300 overflow-x-auto max-h-80 leading-relaxed">
                {customGasScript}
              </pre>
            </div>

            <div className="p-5 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Otomatis mengonfigurasi isQuiz: true dan 100% skor.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowGasScriptModal(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={handleCopyScript}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedScript ? 'Tersalin ke Clipboard!' : 'Salin Seluruh Kode'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: MANUAL ADD PACKAGE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-[#0b1324] border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl text-slate-100">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">
                Tambah Paket Soal Manual
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveManual} className="p-5 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Judul Paket Soal
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Misal: Ulangan Harian Bab 3 Sistem Gerak"
                  className="w-full text-xs bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Mata Pelajaran
                  </label>
                  <input
                    type="text"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    className="w-full text-xs bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Tingkat Kelas
                  </label>
                  <input
                    type="text"
                    value={newGrade}
                    onChange={(e) => setNewGrade(e.target.value)}
                    className="w-full text-xs bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Bab / Topik
                </label>
                <input
                  type="text"
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  placeholder="Misal: Tulang, Otot, dan Sendi"
                  className="w-full text-xs bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="border-t border-slate-800 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">
                    Daftar Soal ({manualQuestions.length})
                  </span>
                  <button
                    type="button"
                    onClick={addManualQuestionField}
                    className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah Soal Lagi
                  </button>
                </div>

                {manualQuestions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2 text-xs"
                  >
                    <div className="font-semibold text-slate-300">
                      Soal No. {idx + 1}
                    </div>
                    <input
                      type="text"
                      value={q.question}
                      onChange={(e) => {
                        const updated = [...manualQuestions];
                        updated[idx].question = e.target.value;
                        setManualQuestions(updated);
                      }}
                      placeholder="Tuliskan pertanyaan soal di sini..."
                      className="w-full text-xs bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                      required
                    />

                    <div className="grid grid-cols-2 gap-2">
                      {q.options?.map((opt, oIdx) => (
                        <div key={opt.key} className="flex items-center gap-1.5">
                          <span className="font-mono text-purple-400 font-bold">{opt.key}</span>
                          <input
                            type="text"
                            value={opt.text}
                            onChange={(e) => {
                              const updated = [...manualQuestions];
                              if (updated[idx].options) {
                                updated[idx].options[oIdx].text = e.target.value;
                                setManualQuestions(updated);
                              }
                            }}
                            placeholder={`Pilihan ${opt.key}`}
                            className="w-full text-xs bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-white"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="text-[11px] text-slate-400">Kunci Jawaban</label>
                        <select
                          value={q.correctAnswer}
                          onChange={(e) => {
                            const updated = [...manualQuestions];
                            updated[idx].correctAnswer = e.target.value;
                            setManualQuestions(updated);
                          }}
                          className="w-full text-xs bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-white"
                        >
                          <option value="A">A</option>
                          <option value="B">B</option>
                          <option value="C">C</option>
                          <option value="D">D</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400">Pembahasan Ringkas</label>
                        <input
                          type="text"
                          value={q.explanation}
                          onChange={(e) => {
                            const updated = [...manualQuestions];
                            updated[idx].explanation = e.target.value;
                            setManualQuestions(updated);
                          }}
                          placeholder="Penjelasan jawaban benar..."
                          className="w-full text-xs bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-white"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl cursor-pointer"
                >
                  Simpan Paket Soal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
