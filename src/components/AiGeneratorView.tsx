import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  FileSpreadsheet,
  Plus,
  Trash2,
  ArrowRight,
  BookOpen,
  Layers,
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  X,
} from 'lucide-react';
import { QuestionItem, QuestionPackage } from '../types';

interface AiGeneratorViewProps {
  onSaveToBank: (pkg: QuestionPackage) => void;
  onOpenDistribusi: (pkg: QuestionPackage) => void;
  webAppUrl?: string;
  onOpenGasSettings?: () => void;
}

export const AiGeneratorView: React.FC<AiGeneratorViewProps> = ({
  onSaveToBank,
  onOpenDistribusi,
  webAppUrl = '',
  onOpenGasSettings,
}) => {
  // Preset default matches user screenshot (Tabung · SMP, 10 soal)
  const [subject, setSubject] = useState('Matematika');
  const [grade, setGrade] = useState('SMP');
  const [topic, setTopic] = useState('Tabung');
  const [questionType, setQuestionType] = useState<'pilihan_ganda' | 'isian' | 'uraian' | 'campuran'>('pilihan_ganda');
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [difficulty, setDifficulty] = useState('HOTS (Analisis & Evaluasi C4-C5)');
  const [notes, setNotes] = useState('Sesuai Capaian Pembelajaran Kurikulum Merdeka Fase D (Luas Permukaan & Volume Tabung)');
  const [referenceMaterial, setReferenceMaterial] = useState('');
  const [showReferenceBox, setShowReferenceBox] = useState(false);

  // Generation & progress modal state
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null);
  const [generatedPackage, setGeneratedPackage] = useState<QuestionPackage | null>(null);

  // 5-Step checklist progress modal state (as shown in screenshot)
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [currentStep, setCurrentStep] = useState(1);
  const [progressPercent, setProgressPercent] = useState(15);
  const [currentActionText, setCurrentActionText] = useState('Membaca topik, jenjang...');

  // Direct Web App creation state
  const [isSendingToDrive, setIsSendingToDrive] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [directFormResult, setDirectFormResult] = useState<{
    form_url: string;
    edit_url: string;
    folder: string;
  } | null>(null);

  // Google Apps Script state
  const [showGasModal, setShowGasModal] = useState(false);
  const [gasScript, setGasScript] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);

  // Timer interval reference for cleanup
  const timerRef = useRef<any>(null);
  const stepTimeoutsRef = useRef<any[]>([]);

  const clearProgressTimers = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    stepTimeoutsRef.current.forEach((t) => clearTimeout(t));
    stepTimeoutsRef.current = [];
  };

  useEffect(() => {
    return () => clearProgressTimers();
  }, []);

  // Quick preset loader
  const handleApplyPreset = (pSubject: string, pGrade: string, pTopic: string, pQuestions = 10, pNotes = '') => {
    setSubject(pSubject);
    setGrade(pGrade);
    setTopic(pTopic);
    setTotalQuestions(pQuestions);
    if (pNotes) setNotes(pNotes);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setNoticeMsg(null);
    setTimerSeconds(1);
    setCurrentStep(1);
    setProgressPercent(15);
    setCurrentActionText('Membaca topik, jenjang...');

    clearProgressTimers();

    // Start 1-second interval timer
    timerRef.current = setInterval(() => {
      setTimerSeconds((prev) => prev + 1);
    }, 1000);

    // Step 2 at 1.8s
    stepTimeoutsRef.current.push(
      setTimeout(() => {
        setCurrentStep(2);
        setProgressPercent(38);
        setCurrentActionText('Menyusun pertanyaan...');
      }, 1800)
    );

    // Step 3 at 4.5s
    stepTimeoutsRef.current.push(
      setTimeout(() => {
        setCurrentStep(3);
        setProgressPercent(65);
        setCurrentActionText('Membuat pilihan jawaban & kunci...');
      }, 4500)
    );

    // Step 4 at 7.5s
    stepTimeoutsRef.current.push(
      setTimeout(() => {
        setCurrentStep(4);
        setProgressPercent(88);
        setCurrentActionText('Memeriksa kualitas & menghindari soal ganda...');
      }, 7500)
    );

    try {
      const res = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          grade,
          topic,
          questionType,
          totalQuestions,
          difficulty,
          notes,
          referenceMaterial,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Gagal generate soal.');
      }

      if (data.notice) {
        setNoticeMsg(data.notice);
      }

      // Step 5: Menyimpan ke Bank Soal
      setCurrentStep(5);
      setProgressPercent(100);
      setCurrentActionText('Menyimpan ke Bank Soal...');

      const generated = data.data;
      const newPkg: QuestionPackage = {
        id: 'pkg-' + Date.now(),
        title: generated.title || `Asesmen ${subject} - ${topic}`,
        subject: generated.subject || subject,
        grade: generated.grade || grade,
        topic: generated.topic || topic,
        createdAt: new Date().toISOString().split('T')[0],
        questions: (generated.questions || []).map((q: any, idx: number) => ({
          id: `q-${Date.now()}-${idx}`,
          number: q.number || idx + 1,
          type: q.type || 'pilihan_ganda',
          stimulus: q.stimulus || '',
          question: q.question || '',
          options: q.options || [],
          correctAnswer: q.correctAnswer || '',
          explanation: q.explanation || '',
          cognitiveLevel: q.cognitiveLevel || 'C3',
          points: q.points || 10,
        })),
        googleAppsScript: 'ready',
      };

      // Auto-save to Bank Soal (completes step 5 in checklist)
      onSaveToBank(newPkg);

      // Brief delay so user sees Step 5 checkmark completed
      await new Promise((resolve) => setTimeout(resolve, 800));

      setGeneratedPackage(newPkg);
      setToastMsg(`✓ ${newPkg.questions.length} butir soal ${topic} berhasil dibuat dan disimpan ke Bank Soal!`);
      setTimeout(() => setToastMsg(null), 4000);
    } catch (err: any) {
      console.error(err);
      const msg = err.message || '';
      if (msg.includes('503') || msg.includes('high demand') || msg.includes('UNAVAILABLE')) {
        setErrorMsg('Server AI Gemini sedang mengalami lonjakan trafik (503 High Demand). Silakan klik "Generate Soal Cerdas Sekarang" lagi atau gunakan generator cadangan.');
      } else {
        setErrorMsg(msg || 'Terjadi kesalahan saat memanggil Gemini API.');
      }
    } finally {
      clearProgressTimers();
      setIsLoading(false);
    }
  };

  const handleGenerateGas = async () => {
    if (!generatedPackage) return;
    try {
      const res = await fetch('/api/generate-gas-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: generatedPackage.title,
          questions: generatedPackage.questions,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setGasScript(data.script);
        setShowGasModal(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDirectSendToDrive = async () => {
    if (!generatedPackage) return;
    if (!webAppUrl) {
      if (onOpenGasSettings) {
        onOpenGasSettings();
      } else {
        setToastMsg('Harap masukkan dan simpan URL Web App terlebih dahulu di menu Setting Web App (Code.gs).');
        setTimeout(() => setToastMsg(null), 3500);
      }
      return;
    }

    setIsSendingToDrive(true);
    setDirectFormResult(null);

    const formattedQuestions = generatedPackage.questions.map((q, idx) => {
      const optionsArray = (q.options || []).map((o) => `${o.key}. ${o.text}`);
      let correctIndex = (q.options || []).findIndex((o) => o.key === q.correctAnswer);
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
      const res = await fetch('/api/gas/create-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webAppUrl,
          title: generatedPackage.title,
          quiz_id: 'soal-' + Date.now().toString().slice(-6),
          guru_name: 'Guru',
          folder_name: generatedPackage.subject,
          questions: formattedQuestions,
          shuffle_questions: true,
          shuffle_options: false,
        }),
      });

      const data = await res.json();
      if (data.success && data.form_url) {
        setDirectFormResult({
          form_url: data.form_url,
          edit_url: data.edit_url,
          folder: data.folder,
        });
        setToastMsg('Google Form berhasil dibuat di Google Drive Anda!');
        setTimeout(() => setToastMsg(null), 3500);
      } else {
        setToastMsg('Gagal membuat Google Form via Web App: ' + (data.message || 'Error'));
        setTimeout(() => setToastMsg(null), 4000);
      }
    } catch (e: any) {
      setToastMsg('Error: ' + e.message);
      setTimeout(() => setToastMsg(null), 4000);
    } finally {
      setIsSendingToDrive(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(gasScript);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const updateQuestionItem = (idx: number, updated: QuestionItem) => {
    if (!generatedPackage) return;
    const newQuestions = [...generatedPackage.questions];
    newQuestions[idx] = updated;
    setGeneratedPackage({ ...generatedPackage, questions: newQuestions });
  };

  const removeQuestionItem = (idx: number) => {
    if (!generatedPackage) return;
    const newQuestions = generatedPackage.questions.filter((_, i) => i !== idx);
    setGeneratedPackage({ ...generatedPackage, questions: newQuestions });
  };

  // Format short grade for modal display e.g. "SMP"
  const shortGrade = grade.includes('SMP') ? 'SMP' : grade.includes('SMA') ? 'SMA' : grade.includes('SD') ? 'SD' : grade;

  return (
    <div className="space-y-8">
      {/* Toast Notification Banner */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top-2">
          <Check className="w-4 h-4 text-emerald-200 shrink-0" />
          <span>{toastMsg}</span>
          <button
            onClick={() => setToastMsg(null)}
            className="ml-2 text-emerald-200 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header section with clean typography */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          AI Generator Soal Cerdas
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Buat butir soal pilihan ganda, isian, atau uraian secara instan berbasis kurikulum Indonesia dengan kunci jawaban, pembahasan mendalam, dan ekspor ke Google Forms.
        </p>
      </div>

      {/* Main Grid: Form Left, Preview Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form Panel */}
        <div className="lg:col-span-5 bg-white dark:bg-[#0b1324] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-semibold text-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Parameter Pembuatan Soal</span>
            </div>
            <span className="text-[11px] font-normal text-slate-400">Kurikulum Merdeka</span>
          </div>

          {/* Quick Preset Buttons */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5">
              Pilihan Cepat Materi:
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleApplyPreset('Matematika', 'SMP', 'Tabung', 10, 'Luas Permukaan, Volume, dan Jaring-jaring Tabung')}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-colors cursor-pointer ${
                  topic === 'Tabung'
                    ? 'bg-indigo-600 text-white border-indigo-500 font-semibold'
                    : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-400'
                }`}
              >
                Tabung · SMP (10 Soal)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('Ilmu Pengetahuan Alam (IPA)', 'SMP Kelas 7', 'Sistem Tata Surya & Karakteristik Planet', 10, 'Capaian Pembelajaran Fase D')}
                className="px-2.5 py-1 text-[11px] font-medium bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-lg hover:border-slate-400 transition-colors cursor-pointer"
              >
                IPA Tata Surya
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('Matematika', 'SMP', 'Teorema Pythagoras & Segitiga', 10, 'Penerapan Tripel Pythagoras')}
                className="px-2.5 py-1 text-[11px] font-medium bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-lg hover:border-slate-400 transition-colors cursor-pointer"
              >
                Pythagoras
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('Fisika SMA/SMK', 'SMA Kelas 10', 'Hukum Newton tentang Gerak', 10, 'Analisis Gaya Normal dan Gesek')}
                className="px-2.5 py-1 text-[11px] font-medium bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-lg hover:border-slate-400 transition-colors cursor-pointer"
              >
                Fisika SMA
              </button>
            </div>
          </div>

          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Mata Pelajaran
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Matematika">Matematika</option>
                <option value="Ilmu Pengetahuan Alam (IPA)">Ilmu Pengetahuan Alam (IPA)</option>
                <option value="Bahasa Indonesia">Bahasa Indonesia</option>
                <option value="Bahasa Inggris">Bahasa Inggris</option>
                <option value="Ilmu Pengetahuan Sosial (IPS)">Ilmu Pengetahuan Sosial (IPS)</option>
                <option value="Informatika">Informatika</option>
                <option value="Pendidikan Pancasila (PPKn)">Pendidikan Pancasila (PPKn)</option>
                <option value="Pendidikan Agama & Budi Pekerti">Pendidikan Agama & Budi Pekerti</option>
                <option value="Fisika SMA/SMK">Fisika SMA/SMK</option>
                <option value="Biologi SMA/SMK">Biologi SMA/SMK</option>
                <option value="Kimia SMA/SMK">Kimia SMA/SMK</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Jenjang / Kelas
                </label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="SMP">SMP</option>
                  <option value="SMP Kelas 7">SMP Kelas 7</option>
                  <option value="SMP Kelas 8">SMP Kelas 8</option>
                  <option value="SMP Kelas 9">SMP Kelas 9</option>
                  <option value="SD Kelas 4">SD Kelas 4</option>
                  <option value="SD Kelas 5">SD Kelas 5</option>
                  <option value="SD Kelas 6">SD Kelas 6</option>
                  <option value="SMA Kelas 10">SMA Kelas 10</option>
                  <option value="SMA Kelas 11">SMA Kelas 11</option>
                  <option value="SMA Kelas 12">SMA Kelas 12</option>
                  <option value="SMK Kelas 10-12">SMK Kelas 10-12</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Bentuk Butir Soal
                </label>
                <select
                  value={questionType}
                  onChange={(e) => setQuestionType(e.target.value as any)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="pilihan_ganda">Pilihan Ganda (A-D / A-E)</option>
                  <option value="isian">Isian Singkat</option>
                  <option value="uraian">Uraian / Essay</option>
                  <option value="campuran">Campuran (PG + Isian + Uraian)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Topik / Materi / Bab
              </label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                rows={2}
                placeholder="Contoh: Tabung"
                className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Jumlah Soal
                </label>
                <select
                  value={totalQuestions}
                  onChange={(e) => setTotalQuestions(Number(e.target.value))}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-semibold"
                >
                  <option value={5}>5 Butir Soal</option>
                  <option value={10}>10 Butir Soal (Sesuai Rekomendasi)</option>
                  <option value={15}>15 Butir Soal</option>
                  <option value={20}>20 Butir Soal</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Tingkat Kognitif / Kesulitan
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="HOTS (Analisis & Evaluasi C4-C5)">HOTS (Analisis C4-C5)</option>
                  <option value="Sedang (Aplikasi C3)">Sedang (Aplikasi C3)</option>
                  <option value="Mudah & Menengah (C1-C2)">Mudah & Menengah (C1-C2)</option>
                  <option value="Berimbang (C1 s.d. C6 Komprehensif)">Berimbang (C1 s.d. C6)</option>
                </select>
              </div>
            </div>

            {/* Materi Referensi (Modul / Buku PDF) Toggle & Box */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowReferenceBox(!showReferenceBox)}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{showReferenceBox ? 'Sembunyikan' : '+ Unggah / Tambah'} Materi Referensi (Buku / Modul)</span>
              </button>

              {showReferenceBox && (
                <div className="mt-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                  <div className="text-slate-400 text-[11px] flex items-center justify-between">
                    <span>Tempel ringkasan bab modul ajar atau materi referensi buku:</span>
                    <span className="text-[10px] text-indigo-400 font-medium">Opsional</span>
                  </div>
                  <textarea
                    rows={3}
                    value={referenceMaterial}
                    onChange={(e) => setReferenceMaterial(e.target.value)}
                    placeholder="Contoh: Rumus luas selimut tabung = 2πrt, luas permukaan tabung = 2πr(r+t), volume = πr²t. Pada contoh kasus tangki air silinder..."
                    className="w-full text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                  <p className="text-[10px] text-slate-500 italic">
                    AI akan memprioritaskan butir soal berdasarkan materi referensi yang Anda berikan.
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Catatan Capaian / Konteks Tambahan
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: Kurikulum Merdeka Fase D"
                className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {errorMsg && (
              <div className="p-3 text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div className="leading-relaxed">{errorMsg}</div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-700 hover:to-purple-700 active:scale-[0.99] text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-md"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Generate Soal Cerdas Sekarang ({totalQuestions} Soal)</span>
            </button>
          </form>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-7 space-y-4">
          {!generatedPackage && !isLoading && (
            <div className="bg-white dark:bg-[#0b1324] border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-12 text-center shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-indigo-950/80 border border-indigo-800/60 text-indigo-400 flex items-center justify-center mx-auto mb-3">
                <BookOpen className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Belum Ada Soal yang Dibuat
              </h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                Pilih materi di sebelah kiri (misal: <strong>Tabung · SMP</strong>) lalu klik tombol <em>Generate Soal Cerdas Sekarang</em>.
              </p>
            </div>
          )}

          {noticeMsg && generatedPackage && !isLoading && (
            <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-200 text-xs flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{noticeMsg}</span>
            </div>
          )}

          {generatedPackage && !isLoading && (
            <div className="space-y-4">
              {/* Top Action Bar */}
              <div className="bg-white dark:bg-[#0b1324] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                      ✓ Tersimpan di Bank Soal
                    </span>
                    <span className="text-[11px] text-slate-400">{generatedPackage.createdAt}</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1">
                    {generatedPackage.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                    <span>{generatedPackage.subject}</span>
                    <span aria-hidden="true">·</span>
                    <span>{generatedPackage.grade}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{generatedPackage.questions.length} Butir Soal</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleDirectSendToDrive}
                    disabled={isSendingToDrive}
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                    title={webAppUrl ? "Buat langsung Google Form di Google Drive via Web App" : "Atur Web App terlebih dahulu"}
                  >
                    <Sparkles className={`w-3.5 h-3.5 text-amber-300 ${isSendingToDrive ? 'animate-spin' : ''}`} />
                    {isSendingToDrive ? 'Membuat di Drive...' : 'Buat Google Form'}
                  </button>
                  <button
                    onClick={handleGenerateGas}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 bg-slate-100 dark:bg-slate-800 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    Kode Code.gs
                  </button>
                  <button
                    onClick={() => onOpenDistribusi(generatedPackage)}
                    className="px-3.5 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    Distribusi / Token
                  </button>
                </div>
              </div>

              {/* Success Result View for Direct Google Form */}
              {directFormResult && (
                <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/80 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Google Form Berhasil Dibuat di Google Drive!</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <a
                      href={directFormResult.form_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-indigo-400 hover:text-indigo-300 flex items-center justify-between"
                    >
                      <span className="font-semibold">Buka Form Siswa</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                    <a
                      href={directFormResult.edit_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-indigo-400 hover:text-indigo-300 flex items-center justify-between"
                    >
                      <span className="font-semibold">Buka Editor Guru</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              )}

              {/* Questions List */}
              <div className="space-y-3">
                {generatedPackage.questions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="bg-white dark:bg-[#0b1324] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 text-xs space-y-2.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        No. {q.number} ({q.type === 'pilihan_ganda' ? 'Pilihan Ganda' : q.type === 'isian' ? 'Isian Singkat' : 'Uraian'})
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400 font-mono">
                          {q.cognitiveLevel} · {q.points} Poin
                        </span>
                        <button
                          onClick={() => removeQuestionItem(idx)}
                          className="text-slate-400 hover:text-rose-500 p-1 transition-colors cursor-pointer"
                          title="Hapus soal ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {q.stimulus && (
                      <p className="italic text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 leading-relaxed">
                        {q.stimulus}
                      </p>
                    )}

                    <p className="font-medium text-slate-900 dark:text-slate-100 text-sm leading-relaxed">
                      {q.question}
                    </p>

                    {q.options && q.options.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                        {q.options.map((opt) => (
                          <div
                            key={opt.key}
                            className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
                              opt.key === q.correctAnswer
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 font-semibold'
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
                      <p className="mt-0.5 text-slate-400 leading-relaxed">{q.explanation}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: EXACT AI GENERATION PROGRESS MODAL (Matches user screenshot) */}
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#0c1322] border border-slate-800/80 rounded-3xl p-8 shadow-2xl space-y-6 text-slate-100 relative overflow-hidden">
            {/* Glowing Circular AI Icon */}
            <div className="flex justify-center pt-1">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-cyan-500/20 via-indigo-500/30 to-purple-500/40 p-1 flex items-center justify-center shadow-[0_0_35px_rgba(79,70,229,0.35)]">
                <div className="w-16 h-16 rounded-full bg-gradient-to-b from-[#1b254b] to-[#0f172a] border border-indigo-400/50 flex items-center justify-center shadow-inner">
                  <Sparkles className="w-8 h-8 text-indigo-300 drop-shadow-[0_0_10px_rgba(165,180,252,0.9)] animate-pulse" />
                </div>
              </div>
            </div>

            {/* Title & Subtitle */}
            <div className="text-center space-y-1">
              <h2 className="text-xl font-extrabold text-white tracking-tight">
                AI sedang menyusun {totalQuestions} soal
              </h2>
              <p className="text-sm font-medium text-slate-400">
                {topic} · {shortGrade}
              </p>
            </div>

            {/* Progress status & timer */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">{currentActionText}</span>
                <span className="text-slate-400 font-mono">{timerSeconds} dtk</span>
              </div>
              {/* Progress bar */}
              <div className="h-2 w-full bg-slate-800/80 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-400 to-emerald-400 transition-all duration-300 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* 5-Step Checklist */}
            <div className="space-y-3.5 pt-1">
              {/* Step 1: Membaca topik, jenjang */}
              <div className="flex items-center gap-3 text-xs">
                {currentStep > 1 ? (
                  <div className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-xs shrink-0">
                    ✓
                  </div>
                ) : currentStep === 1 ? (
                  <div className="w-5 h-5 rounded-full border-2 border-indigo-400 text-indigo-400 flex items-center justify-center animate-pulse shrink-0">
                    <span className="w-2 h-2 rounded-full bg-indigo-400" />
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full border border-slate-700 shrink-0" />
                )}
                <span className={currentStep > 1 ? 'text-slate-200' : currentStep === 1 ? 'text-white font-semibold' : 'text-slate-500'}>
                  Membaca topik, jenjang
                </span>
              </div>

              {/* Step 2: Menyusun pertanyaan sesuai tingkat kognitif */}
              <div className="flex items-center gap-3 text-xs">
                {currentStep > 2 ? (
                  <div className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-xs shrink-0">
                    ✓
                  </div>
                ) : currentStep === 2 ? (
                  <div className="w-5 h-5 rounded-full border-2 border-indigo-400 text-indigo-400 flex items-center justify-center animate-pulse shrink-0">
                    <span className="w-2 h-2 rounded-full bg-indigo-400" />
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full border border-slate-700 shrink-0" />
                )}
                <span className={currentStep > 2 ? 'text-slate-200' : currentStep === 2 ? 'text-white font-semibold' : 'text-slate-500'}>
                  Menyusun pertanyaan sesuai tingkat kognitif
                </span>
              </div>

              {/* Step 3: Membuat pilihan jawaban & kunci */}
              <div className="flex items-center gap-3 text-xs">
                {currentStep > 3 ? (
                  <div className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-xs shrink-0">
                    ✓
                  </div>
                ) : currentStep === 3 ? (
                  <div className="w-5 h-5 rounded-full border-2 border-indigo-400 text-indigo-400 flex items-center justify-center animate-pulse shrink-0">
                    <span className="w-2 h-2 rounded-full bg-indigo-400" />
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full border border-slate-700 shrink-0" />
                )}
                <span className={currentStep > 3 ? 'text-slate-200' : currentStep === 3 ? 'text-white font-semibold' : 'text-slate-500'}>
                  Membuat pilihan jawaban & kunci
                </span>
              </div>

              {/* Step 4: Memeriksa kualitas & menghindari soal ganda */}
              <div className="flex items-center gap-3 text-xs">
                {currentStep > 4 ? (
                  <div className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-xs shrink-0">
                    ✓
                  </div>
                ) : currentStep === 4 ? (
                  <div className="w-5 h-5 rounded-full border-2 border-indigo-400 text-indigo-400 flex items-center justify-center animate-pulse shrink-0">
                    <span className="w-2 h-2 rounded-full bg-indigo-400" />
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full border border-slate-700 shrink-0" />
                )}
                <span className={currentStep > 4 ? 'text-slate-200' : currentStep === 4 ? 'text-white font-semibold' : 'text-slate-500'}>
                  Memeriksa kualitas & menghindari soal ganda
                </span>
              </div>

              {/* Step 5: Menyimpan ke Bank Soal */}
              <div className="flex items-center gap-3 text-xs">
                {currentStep >= 5 ? (
                  <div className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-xs shrink-0">
                    ✓
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full border border-slate-700 shrink-0" />
                )}
                <span className={currentStep >= 5 ? 'text-slate-200 font-semibold' : 'text-slate-500'}>
                  Menyimpan ke Bank Soal
                </span>
              </div>
            </div>

            {/* Tips & Footer Message */}
            <div className="pt-2 text-center space-y-2 border-t border-slate-800/60">
              <p className="text-xs text-indigo-300/90 leading-relaxed px-2">
                Tips: unggah modul/buku Anda di Materi Referensi agar soal sesuai bahan ajar.
              </p>
              <p className="text-[11px] text-slate-500">
                Jangan tutup atau muat ulang halaman ini.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Google Apps Script Modal */}
      {showGasModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-[#0b1324] border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl text-slate-100">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <FileSpreadsheet className="w-4 h-4 text-purple-400" />
                <span>Kode Google Apps Script: {generatedPackage?.title}</span>
              </div>
              <button
                onClick={() => setShowGasModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3">
              <p className="text-xs text-slate-400">
                Salin dan tempel kode ini di <strong>script.google.com</strong> untuk membuat kuis Google Form mandiri:
              </p>
              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-emerald-300 overflow-x-auto max-h-80 leading-relaxed">
                {gasScript}
              </pre>
            </div>

            <div className="p-5 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Dilengkapi kunci jawaban dan skor 100%
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowGasModal(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? 'Tersalin ke Clipboard!' : 'Salin Kode'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
