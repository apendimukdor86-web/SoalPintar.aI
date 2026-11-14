import React, { useState, useEffect } from 'react';
import { Maximize2, Minimize2, X, Clock, Users, ShieldCheck, Sparkles } from 'lucide-react';
import { ExamTokenConfig } from '../types';
import { generateQrCodeDataUrl } from '../utils/qr';

interface ProjectorScreenModalProps {
  config: ExamTokenConfig;
  onClose: () => void;
}

export const ProjectorScreenModal: React.FC<ProjectorScreenModalProps> = ({ config, onClose }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [participantCount, setParticipantCount] = useState<number>(0);

  const hasToken = Boolean(config.token && config.token.trim());
  const studentUrl = hasToken
    ? `${window.location.origin}/?mode=student&token=${config.token}`
    : `${window.location.origin}/?mode=student`;

  useEffect(() => {
    if (!hasToken) {
      setQrDataUrl('');
      setParticipantCount(0);
      return;
    }

    generateQrCodeDataUrl(studentUrl).then(setQrDataUrl);

    // Fetch live participant count
    const fetchCount = async () => {
      try {
        const res = await fetch(`/api/rooms/${encodeURIComponent(config.token)}`);
        if (!res.ok) {
          setParticipantCount(0);
          return;
        }
        const data = await res.json();
        if (data.success && data.room) {
          setParticipantCount(Object.keys(data.room.participants || {}).length);
        }
      } catch (e) {
        console.error(e);
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 4000);
    return () => clearInterval(interval);
  }, [studentUrl, config.token, hasToken]);

  const toggleBrowserFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const formatSeconds = (sec: number) => {
    const safeSec = Math.max(0, Math.floor(Number(sec) || 0));
    const hours = Math.floor(safeSec / 3600);
    const minutes = Math.floor((safeSec % 3600) / 60);
    const seconds = safeSec % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col p-6 overflow-hidden select-none">
      {/* Top Bar for Projector */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center font-bold text-white text-base">
            S
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
              <span>{config.title || 'Ujian CBT'}</span>
              <span className="text-slate-400 font-normal">· {config.grade || 'Umum'}</span>
            </div>
            <div className="text-xs text-slate-400">
              Layar Proyektor Resmi Soalpintar.ai CBT
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono">
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-300">Siswa Hadir:</span>
            <span className="font-bold text-emerald-400 text-sm">{participantCount}</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-300">Waktu:</span>
            <span className="font-bold text-amber-400 text-sm">{formatSeconds(config.remainingSeconds)}</span>
          </div>

          <button
            onClick={toggleBrowserFullscreen}
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 transition-colors"
            title="Layar Penuh Proyektor"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={onClose}
            className="p-2 bg-slate-900 hover:bg-rose-900/60 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
            title="Tutup Layar Proyektor"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Projector Stage */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center justify-center p-4">
        {/* Left: Giant QR Code Card */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center text-center space-y-4">
          <div className="p-5 bg-white rounded-3xl shadow-2xl border-4 border-slate-800 inline-block">
            {!hasToken ? (
              <div className="w-72 h-72 bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-medium px-6 text-center">
                Belum ada token ujian aktif. Buat token di menu Token Siswa terlebih dahulu.
              </div>
            ) : qrDataUrl ? (
              <img src={qrDataUrl} alt="QR Code Ujian Kelas" className="w-72 h-72 md:w-84 md:h-84 object-contain" />
            ) : (
              <div className="w-72 h-72 bg-slate-100 flex items-center justify-center text-slate-400 text-xs">
                Membuat QR Code...
              </div>
            )}
          </div>
          <p className="text-sm text-slate-400 font-medium tracking-wide">
            {hasToken ? 'Arahkan kamera smartphone ke QR Code di atas' : 'QR Code akan muncul otomatis setelah token dibuat'}
          </p>
        </div>

        {/* Right: Giant Token & Instructions */}
        <div className="lg:col-span-6 space-y-6">
          <div className="space-y-2">
            <div className="text-xs uppercase font-bold tracking-widest text-emerald-400">
              KODE TOKEN UJIAN KELAS
            </div>
            <div className="text-6xl md:text-7xl font-extrabold font-mono tracking-widest text-white bg-slate-900/90 py-5 px-8 rounded-2xl border-2 border-emerald-500/40 inline-block shadow-2xl">
              {hasToken ? config.token : '—'}
            </div>
            <p className="text-xs text-slate-400 pt-1">
              Atau ketik manual di browser:{' '}
              <span className="font-mono text-emerald-300 font-medium">{studentUrl}</span>
            </p>
          </div>

          {/* Student Steps */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-3.5 max-w-lg">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Petunjuk Pengerjaan Siswa di Kelas:</span>
            </div>

            <ol className="space-y-2.5 text-xs text-slate-300 list-decimal list-inside leading-relaxed">
              <li>
                <strong className="text-white">Pindai QR Code</strong> atau buka tautan di browser perangkat Anda.
              </li>
              <li>
                Masukkan <strong className="text-white">Nama Lengkap</strong>, <strong className="text-white">NISN</strong>, dan Token <strong className="font-mono text-emerald-400">{hasToken ? config.token : '-'}</strong>.
              </li>
              <li>
                Klik tombol <strong className="text-emerald-400">"Mulai Ujian Aman"</strong> untuk masuk ke mode fullscreen otomatis.
              </li>
              <li>
                <strong className="text-rose-400">Peringatan:</strong> Dilarang berpindah tab, membuka split screen, atau memperkecil browser! Sistem akan mengunci layar penalti 10 detik atau blokir permanen.
              </li>
            </ol>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="border-t border-slate-800 pt-3 flex items-center justify-between text-xs text-slate-500">
        <div>Soalpintar.ai Secure Exam · Google Forms & CBT Proyektor Edition</div>
        <div>Toleransi Pelanggaran: {config.maxViolations ?? 3}x Kesempatan</div>
      </div>
    </div>
  );
};
