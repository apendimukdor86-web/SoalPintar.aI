import React, { useState, useEffect } from 'react';
import { KeyRound, QrCode, Copy, Check, Clock, ShieldAlert, Users, ExternalLink, RefreshCw, Send, Download } from 'lucide-react';
import { ExamTokenConfig, QuestionPackage } from '../types';
import { generateQrCodeDataUrl } from '../utils/qr';

interface TokenManagerViewProps {
  currentConfig: ExamTokenConfig;
  onUpdateConfig: (config: ExamTokenConfig) => void;
  onOpenProjector: () => void;
  onOpenLiveMonitoring: () => void;
  packages: QuestionPackage[];
}

export const TokenManagerView: React.FC<TokenManagerViewProps> = ({
  currentConfig,
  onUpdateConfig,
  onOpenProjector,
  onOpenLiveMonitoring,
  packages,
}) => {
  const [tokenInput, setTokenInput] = useState(currentConfig.token);
  const [titleInput, setTitleInput] = useState(currentConfig.title);
  const [durationInput, setDurationInput] = useState(currentConfig.durationMinutes);
  const [maxViolationsInput, setMaxViolationsInput] = useState(currentConfig.maxViolations);
  const [waitingRoomInput, setWaitingRoomInput] = useState(currentConfig.waitingRoomEnabled);
  const [expiryMode, setExpiryMode] = useState<'jp' | 'datetime'>('jp');
  const [jpCount, setJpCount] = useState(2); // 2 JP = 90 min
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isCopiedLink, setIsCopiedLink] = useState(false);
  const [isCopiedToken, setIsCopiedToken] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const studentUrl = `${window.location.origin}/?mode=student&token=${tokenInput}`;

  useEffect(() => {
    generateQrCodeDataUrl(studentUrl).then(setQrDataUrl);
  }, [studentUrl]);

  const handleGenerateRandomToken = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let res = '';
    for (let i = 0; i < 7; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setTokenInput(res);
  };

  const handleSaveAndApply = async () => {
    const minutes = expiryMode === 'jp' ? jpCount * 45 : durationInput;
    const updated: ExamTokenConfig = {
      ...currentConfig,
      token: tokenInput.trim().toUpperCase(),
      title: titleInput,
      durationMinutes: minutes,
      remainingSeconds: minutes * 60,
      maxViolations: Number(maxViolationsInput),
      waitingRoomEnabled: waitingRoomInput,
      expiryMode,
      jpCount,
    };

    onUpdateConfig(updated);

    // Sync to backend room
    try {
      await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch (err) {
      console.error(err);
    }

    setToastMsg('Token akses & aturan ujian berhasil diperbarui dan aktif!');
    setTimeout(() => setToastMsg(null), 3000);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(studentUrl);
    setIsCopiedLink(true);
    setTimeout(() => setIsCopiedLink(false), 2000);
  };

  const copyTokenOnly = () => {
    navigator.clipboard.writeText(tokenInput);
    setIsCopiedToken(true);
    setTimeout(() => setIsCopiedToken(false), 2000);
  };

  const downloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QR_Ujian_${tokenInput}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Token Siswa & Manajemen Akses Ujian
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Prinsip <span className="font-semibold text-slate-700 dark:text-slate-300">1 Token = 1 Alamat Soal Web Siswa</span>. Setiap token terhubung secara unik dengan kuis ujian, batas pelanggaran, dan ruang tunggu.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Configuration Form */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              <KeyRound className="w-4 h-4 text-emerald-600" />
              <span>Pengaturan Token & Hak Akses CBT</span>
            </div>
            <button
              onClick={handleGenerateRandomToken}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Acak Token Baru
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Kode Token Akses Siswa
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
                  maxLength={10}
                  className="w-full font-mono text-lg font-bold tracking-widest bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-emerald-600 dark:text-emerald-400 uppercase focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Contoh format: ZJT0P4M, MAT-7A, PTS-IPA-8
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Pilih Paket Soal Kuis
              </label>
              <select
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-slate-900 dark:text-slate-100"
              >
                {packages.map((p) => (
                  <option key={p.id} value={p.title}>
                    {p.subject} - {p.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Expiration Settings */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>Pengaturan Batas Waktu & Kedaluwarsa Dinamis</span>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                <input
                  type="radio"
                  name="expiryMode"
                  checked={expiryMode === 'jp'}
                  onChange={() => setExpiryMode('jp')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span>Berdasarkan Jam Pelajaran (JP)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                <input
                  type="radio"
                  name="expiryMode"
                  checked={expiryMode === 'datetime'}
                  onChange={() => setExpiryMode('datetime')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span>Durasi Menit Bebas</span>
              </label>
            </div>

            {expiryMode === 'jp' ? (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Jumlah JP (1 JP = 45 Menit)</label>
                  <select
                    value={jpCount}
                    onChange={(e) => setJpCount(Number(e.target.value))}
                    className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                  >
                    <option value={1}>1 JP (45 Menit)</option>
                    <option value={2}>2 JP (90 Menit - Standar Penilaian)</option>
                    <option value={3}>3 JP (135 Menit)</option>
                    <option value={4}>4 JP (180 Menit)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Total Waktu Ujian</label>
                  <div className="text-xs font-mono font-semibold py-2 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-emerald-700 dark:text-emerald-300">
                    {jpCount * 45} Menit
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Durasi Ujian (Menit)</label>
                <input
                  type="number"
                  min={10}
                  max={300}
                  value={durationInput}
                  onChange={(e) => setDurationInput(Number(e.target.value))}
                  className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                />
              </div>
            )}
          </div>

          {/* Security & Waiting Room */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <span>Batas Toleransi Pelanggaran</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Ujian siswa terkunci permanen jika melakukan kecurangan melebihi batas ini:
              </p>
              <select
                value={maxViolationsInput}
                onChange={(e) => setMaxViolationsInput(Number(e.target.value))}
                className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 font-medium"
              >
                <option value={1}>1x Pelanggaran (Ketat Maksimal)</option>
                <option value={2}>2x Pelanggaran (Ketat)</option>
                <option value={3}>3x Pelanggaran (Standar Asesmen)</option>
                <option value={5}>5x Pelanggaran (Toleransi Tinggi)</option>
              </select>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>Opsi Ruang Tunggu (Waiting Room)</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Siswa yang memasukkan token akan tertahan sampai guru menekan tombol "Mulai Ujian":
              </p>
              <label className="flex items-center gap-2 pt-1 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={waitingRoomInput}
                  onChange={(e) => setWaitingRoomInput(e.target.checked)}
                  className="rounded-sm text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span>Aktifkan Ruang Tunggu Sebelum Ujian</span>
              </label>
            </div>
          </div>

          <button
            onClick={handleSaveAndApply}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
          >
            Terapkan & Perbarui Token Ujian
          </button>
        </div>

        {/* Right: Live Token Card & QR Code */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs text-center space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-500">KODE AKSES AKTIF SISWA</span>
              <span className="text-xs text-emerald-600 font-medium">1 Token = 1 Alamat Web</span>
            </div>

            {/* Giant Token Display */}
            <div className="py-2">
              <div className="text-3xl md:text-4xl font-extrabold font-mono tracking-widest text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800/80 py-3 px-6 rounded-xl border border-slate-200 dark:border-slate-700 inline-block shadow-inner">
                {tokenInput}
              </div>
              <div className="mt-2 flex items-center justify-center gap-2">
                <button
                  onClick={copyTokenOnly}
                  className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer font-medium"
                >
                  {isCopiedToken ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {isCopiedToken ? 'Token Tersalin!' : 'Salin Kode Token'}
                </button>
              </div>
            </div>

            {/* QR Code Container */}
            <div className="flex flex-col items-center justify-center pt-2">
              {qrDataUrl ? (
                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs inline-block">
                  <img src={qrDataUrl} alt="QR Code Siswa" className="w-48 h-48 mx-auto" />
                </div>
              ) : (
                <div className="w-48 h-48 bg-slate-100 rounded-xl animate-pulse flex items-center justify-center text-xs text-slate-400">
                  Membuat QR Code...
                </div>
              )}
              <span className="text-[11px] text-slate-400 mt-2">
                Scan dengan kamera smartphone atau tablet siswa untuk langsung masuk
              </span>
            </div>

            {/* Direct Web URL */}
            <div className="pt-2">
              <div className="text-left text-[11px] text-slate-500 font-medium mb-1">
                Tautan Web Siswa:
              </div>
              <div className="flex items-center gap-1.5 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-600 dark:text-slate-400 truncate">
                <span className="truncate flex-1">{studentUrl}</span>
                <button
                  onClick={copyLink}
                  className="px-2.5 py-1 text-xs bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
                >
                  {isCopiedLink ? 'Tersalin' : 'Salin'}
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={onOpenProjector}
                className="py-2.5 px-3 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <QrCode className="w-4 h-4" />
                Layar QR Proyektor
              </button>
              <button
                onClick={onOpenLiveMonitoring}
                className="py-2.5 px-3 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Users className="w-4 h-4" />
                Ujian Live Monitor
              </button>
            </div>

            <button
              onClick={downloadQr}
              className="w-full text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center justify-center gap-1 pt-1"
            >
              <Download className="w-3.5 h-3.5" />
              Unduh Gambar QR Code (PNG)
            </button>
          </div>
        </div>
      </div>

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
