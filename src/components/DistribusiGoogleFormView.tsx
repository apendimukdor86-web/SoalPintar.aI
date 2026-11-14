import React, { useState, useEffect } from 'react';
import { ExternalLink, Clock, PlusCircle, Folder, Edit3, Send, Play, Pause, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { ExamTokenConfig } from '../types';

interface DistribusiGoogleFormViewProps {
  config: ExamTokenConfig;
  onUpdateConfig: (config: ExamTokenConfig) => void;
  onOpenLiveMonitoring: () => void;
  onOpenSecureExam: () => void;
}

export const DistribusiGoogleFormView: React.FC<DistribusiGoogleFormViewProps> = ({
  config,
  onUpdateConfig,
  onOpenLiveMonitoring,
  onOpenSecureExam,
}) => {
  const [googleFormUrl, setGoogleFormUrl] = useState(config.googleFormUrl);
  const [googleFormEditUrl, setGoogleFormEditUrl] = useState(config.googleFormEditUrl || '');
  const [driveFolderUrl, setDriveFolderUrl] = useState(config.driveFolderUrl || '');

  useEffect(() => {
    setGoogleFormUrl(config.googleFormUrl || '');
    setGoogleFormEditUrl(config.googleFormEditUrl || '');
    setDriveFolderUrl(config.driveFolderUrl || '');
  }, [config.googleFormUrl, config.googleFormEditUrl, config.driveFolderUrl]);

  const formatSeconds = (sec: number) => {
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    const seconds = sec % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleExtendTime = async (mins: number) => {
    const newRemaining = Math.max(0, (config.remainingSeconds || 0) + mins * 60);
    const newDuration = Math.max(0, (config.durationMinutes || 0) + mins);
    const updated = {
      ...config,
      remainingSeconds: newRemaining,
      durationMinutes: newDuration,
    };
    onUpdateConfig(updated);

    const cleanToken = String(config.token || '').trim().toUpperCase();
    if (!cleanToken) return;

    try {
      await fetch(`/api/rooms/${encodeURIComponent(cleanToken)}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'extend_time',
          addMinutes: mins,
        }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleExamState = async () => {
    const updated = {
      ...config,
      isExamStarted: !config.isExamStarted,
    };
    onUpdateConfig(updated);

    const cleanToken = String(config.token || '').trim().toUpperCase();
    if (!cleanToken) return;

    try {
      await fetch(`/api/rooms/${encodeURIComponent(cleanToken)}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start_exam',
        }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveIntegration = async () => {
    const updated = {
      ...config,
      googleFormUrl,
      googleFormEditUrl,
      driveFolderUrl,
    };
    onUpdateConfig(updated);

    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.success && data.room?.token && !updated.token) {
          onUpdateConfig({ ...updated, token: data.room.token });
        }
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Distribusi Google Form & Integrasi Workspace
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Hubungkan kuis Google Form Anda langsung ke dalam portal evaluasi ujian aman Soalpintar.ai dengan kontrol hitung mundur dan akses folder Google Drive terpadu.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Google Form Links & Workspace Management */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Tautan Google Form & Google Drive (v2-soalpintar.ai)</span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Tautan Pengerjaan Google Form Siswa (URL /viewform)
              </label>
              <input
                type="url"
                value={googleFormUrl}
                onChange={(e) => setGoogleFormUrl(e.target.value)}
                placeholder="https://docs.google.com/forms/d/e/.../viewform"
                className="w-full text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Tautan ini akan dimuat di dalam Portal Ujian Aman Anti-Curang siswa.
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Tautan Editor Google Form Guru (URL /edit)
              </label>
              <input
                type="url"
                value={googleFormEditUrl}
                onChange={(e) => setGoogleFormEditUrl(e.target.value)}
                placeholder="https://docs.google.com/forms/d/.../edit"
                className="w-full text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Tautan Folder Kuis Google Drive
              </label>
              <input
                type="url"
                value={driveFolderUrl}
                onChange={(e) => setDriveFolderUrl(e.target.value)}
                placeholder="https://drive.google.com/drive/folders/v2-soalpintar-ai..."
                className="w-full text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <button
              onClick={handleSaveIntegration}
              className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Simpan Perubahan Tautan
            </button>
            <div className="flex items-center gap-2">
              {savedSuccess && (
                <span className="text-xs text-emerald-600 font-semibold animate-pulse">
                  ✓ Integrasi berhasil diperbarui!
                </span>
              )}
              <span className="text-xs text-slate-400">Token Terhubung: {config.token}</span>
            </div>
          </div>

          {/* Quick Direct Links Cards */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Akses Langsung Google Workspace:
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {googleFormUrl && googleFormUrl.startsWith('https://docs.google.com/forms/') && !googleFormUrl.includes('contoh-') ? (
                <a
                  href={googleFormUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-lg border border-purple-200 dark:border-purple-800 text-xs flex items-center justify-between hover:bg-purple-100 transition-colors"
                >
                  <span className="font-semibold text-purple-700 dark:text-purple-300">Form Siswa</span>
                  <ExternalLink className="w-3.5 h-3.5 text-purple-400" />
                </a>
              ) : (
                <div
                  className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between text-slate-400 opacity-75"
                  title="Formulir belum ditautkan atau masih kosong"
                >
                  <span>Form Siswa (Belum Ada)</span>
                  <span className="text-[10px]">⚠️</span>
                </div>
              )}

              {googleFormEditUrl && googleFormEditUrl.startsWith('https://docs.google.com/forms/') && !googleFormEditUrl.includes('contoh-') ? (
                <a
                  href={googleFormEditUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg border border-indigo-200 dark:border-indigo-800 text-xs flex items-center justify-between hover:bg-indigo-100 transition-colors"
                >
                  <span className="font-semibold text-indigo-700 dark:text-indigo-300">Editor Form</span>
                  <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                </a>
              ) : (
                <div
                  className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between text-slate-400 opacity-75"
                  title="Tautan editor form belum diisi"
                >
                  <span>Editor Form (Kosong)</span>
                  <span className="text-[10px]">⚠️</span>
                </div>
              )}

              <a
                href={driveFolderUrl || 'https://drive.google.com'}
                target="_blank"
                rel="noreferrer"
                className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between hover:bg-slate-100 transition-colors"
              >
                <span className="font-medium text-slate-700 dark:text-slate-300">Folder Drive</span>
                <Folder className="w-3.5 h-3.5 text-slate-400" />
              </a>
            </div>
          </div>
        </div>

        {/* Right: Countdown Timer & Exam Session Controller */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs text-center space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-500">HITUNGAN JAM MUNDUR (TIMER)</span>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-sm ${
                  config.isExamStarted
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                }`}
              >
                {config.isExamStarted ? 'Ujian Berjalan' : 'Ujian Dijeda / Belum Dimulai'}
              </span>
            </div>

            {/* Giant Visual Timer */}
            <div className="py-2">
              <div className="text-4xl md:text-5xl font-mono font-bold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">
                {formatSeconds(config.remainingSeconds)}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Total Alokasi Waktu: {config.durationMinutes} Menit
              </div>
            </div>

            {/* Quick Extension Buttons */}
            <div className="space-y-2">
              <div className="text-left text-xs font-semibold text-slate-700 dark:text-slate-300">
                Perpanjangan Waktu Cepat (Add Time):
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleExtendTime(15)}
                  className="py-2 px-2 text-xs font-medium bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                  +15 Menit
                </button>
                <button
                  onClick={() => handleExtendTime(30)}
                  className="py-2 px-2 text-xs font-medium bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                  +30 Menit
                </button>
                <button
                  onClick={() => handleExtendTime(45)}
                  className="py-2 px-2 text-xs font-medium bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                  +45 Menit
                </button>
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="pt-2 space-y-2">
              <button
                onClick={handleToggleExamState}
                className={`w-full py-2.5 px-4 text-xs font-semibold text-white rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                  config.isExamStarted ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {config.isExamStarted ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {config.isExamStarted ? 'Jeda Waktu Ujian' : 'Mulai / Lanjutkan Waktu Ujian'}
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={onOpenLiveMonitoring}
                  className="py-2 px-3 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5" />
                  Live Monitor
                </button>
                <button
                  onClick={onOpenSecureExam}
                  className="py-2 px-3 text-xs font-medium text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  Simulasi Siswa
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
