import React, { useState } from 'react';
import { ShieldAlert, Download, Search, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';
import { StudentViolationLog } from '../types';

interface RiwayatPelanggaranViewProps {
  violations: StudentViolationLog[];
}

export const RiwayatPelanggaranView: React.FC<RiwayatPelanggaranViewProps> = ({ violations }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('Semua');

  const types = ['Semua', 'Pindah Tab', 'Keluar Fullscreen', 'Split Screen / Resize', 'Aplikasi Mengambang'];

  const filtered = violations.filter((v) => {
    const matchSearch =
      v.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.nisn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.kelas.toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = typeFilter === 'Semua' || v.type === typeFilter;
    return matchSearch && matchType;
  });

  const exportBeritaAcara = () => {
    const text = `BERITA ACARA AUDIT KEJUJURAN UJIAN CBT
Platform: Soalpintar.ai Secure Exam
Tanggal Cetak: ${new Date().toLocaleString('id-ID')}
Total Pelanggaran Terdeteksi: ${violations.length} Kejadian

DAFTAR BUKTI PELANGGARAN:
${violations
  .map(
    (v, i) =>
      `${i + 1}. [${new Date(v.timestamp).toLocaleTimeString('id-ID')}] ${v.studentName} (${v.nisn} - ${v.kelas}) - Jenis: ${v.type} - Sanksi: Penalti ${v.penaltySeconds} Detik`
  )
  .join('\n')}

Mengetahui,
Pengawas Ujian Kelas / Guru Mata Pelajaran
`;
    const element = document.createElement('a');
    const file = new Blob([text], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `Berita_Acara_Pelanggaran_Soalpintar_${Date.now()}.txt`;
    document.body.appendChild(element);
    element.click();
    element.remove();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Riwayat Pelanggaran: Bukti Kejujuran Siswa
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Audit trail otomatis setiap kali peserta terdeteksi melanggar integritas ujian (Pindah Tab, Keluar Fullscreen, Split Screen, dll.).
          </p>
        </div>

        <button
          onClick={exportBeritaAcara}
          className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <FileText className="w-4 h-4" />
          Unduh Berita Acara Kejujuran (TXT)
        </button>
      </div>

      {/* Filter and Search */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama siswa atau NISN..."
            className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs text-slate-500 whitespace-nowrap">Jenis Pelanggaran:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-1.5 text-slate-900 dark:text-slate-100"
          >
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Violations Audit Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Waktu Kejadian</th>
                <th className="py-3 px-4">Nama Siswa & NISN</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4">Jenis Pelanggaran</th>
                <th className="py-3 px-4">Sanksi Sistem</th>
                <th className="py-3 px-4 text-right">Status Bukti</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    Tidak ada catatan pelanggaran yang ditemukan.
                  </td>
                </tr>
              ) : (
                filtered.map((log) => {
                  const date = new Date(log.timestamp);
                  const timeStr = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono text-slate-500">
                        {timeStr} WIB
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {log.studentName}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          NISN: {log.nisn}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                        {log.kelas}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 font-semibold text-rose-700 dark:text-rose-400">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {log.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                        Layar Terkunci {log.penaltySeconds} Detik
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                          Terekam Otomatis
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
