import React from 'react';
import {
  Sparkles,
  BookOpen,
  KeyRound,
  FileSpreadsheet,
  Users,
  QrCode,
  BarChart3,
  ShieldAlert,
  Smartphone,
  CreditCard,
  ShieldCheck,
  ChevronRight,
  LogOut,
  X,
  FileCode,
  LayoutDashboard,
  Radio,
  FileText,
  Eraser,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onOpenProjector: () => void;
  onOpenStudentMode: () => void;
  onLogout: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  tokenCode: string;
  teacherName?: string;
  teacherEmail?: string;
  teachersCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  onOpenProjector,
  onOpenStudentMode,
  onLogout,
  isOpenMobile,
  onCloseMobile,
  tokenCode,
  teacherName = 'Apendi Mukdor',
  teacherEmail = 'apendimukdor86@guru.smp.belajar.id',
  teachersCount = 1,
}) => {
  const menuGroups = [
    {
      groupTitle: 'UTAMA',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          number: '✦',
          icon: LayoutDashboard,
        },
      ],
    },
    {
      groupTitle: 'PEMBUATAN SOAL',
      items: [
        {
          id: 'generator',
          label: 'AI Generator Soal',
          number: '1',
          icon: Sparkles,
        },
        {
          id: 'bank',
          label: 'Bank Soal Guru',
          number: '2',
          icon: BookOpen,
        },
        {
          id: 'google_forms',
          label: 'Google Forms',
          number: '3',
          icon: FileText,
        },
      ],
    },
    {
      groupTitle: 'DISTRIBUSI & AKSES',
      items: [
        {
          id: 'token',
          label: 'Token Siswa',
          number: '4',
          icon: KeyRound,
          badge: tokenCode,
        },
        {
          id: 'distribusi',
          label: 'Distribusi Google Form',
          number: '5',
          icon: FileSpreadsheet,
        },
      ],
    },
    {
      groupTitle: 'PELAKSANAAN UJIAN',
      items: [
        {
          id: 'monitoring',
          label: 'Ujian Live',
          number: '6',
          icon: Radio,
        },
      ],
    },
    {
      groupTitle: 'EVALUASI & ANALISIS',
      items: [
        {
          id: 'rekap',
          label: 'Rekap Nilai Siswa',
          number: '7',
          icon: BarChart3,
        },
        {
          id: 'pelanggaran',
          label: 'Riwayat Pelanggaran',
          number: '8',
          icon: ShieldAlert,
        },
      ],
    },
    {
      groupTitle: 'PENGATURAN & APLIKASI',
      items: [
        {
          id: 'teacher_users',
          label: 'Pengguna Guru',
          number: '11',
          icon: Users,
          badge: String(teachersCount),
        },
        {
          id: 'settings_gas',
          label: 'Setting Web App (Code.gs)',
          number: 'GS',
          icon: FileCode,
          badge: 'v3.3',
        },
        {
          id: 'clear_data',
          label: 'Clear Data & Cache',
          number: '12',
          icon: Eraser,
        },
        {
          id: 'download',
          label: 'Download Aplikasi',
          number: '9',
          icon: Smartphone,
        },
        {
          id: 'paket',
          label: 'Status Paket & Akun',
          number: '10',
          icon: CreditCard,
        },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-base shadow-xs">
              S
            </span>
            <div>
              <div className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span>Soalpintar.ai</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-sm bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  v2.0
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                CBT & Google Forms Platform
              </div>
            </div>
          </div>

          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Projector Action Banner */}
        <div className="px-4 pt-3 pb-1 shrink-0">
          <button
            onClick={() => {
              onOpenProjector();
              onCloseMobile();
            }}
            className="w-full py-2 px-3 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 rounded-xl transition-all flex items-center justify-between shadow-xs cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
              <span>Layar QR Proyektor</span>
            </div>
            <span className="text-[10px] font-mono opacity-70">Layar Penuh</span>
          </button>
        </div>

        {/* Nav Links Menu List with Categories */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {menuGroups.map((group) => (
            <div key={group.groupTitle} className="space-y-1">
              <div className="px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                {group.groupTitle}
              </div>

              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectTab(item.id);
                      onCloseMobile();
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors flex items-center justify-between group cursor-pointer ${
                      isActive
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200/80 dark:border-emerald-800/80'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.badge && (
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-sm bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {item.badge}
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-slate-400 opacity-60">
                        {item.number}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer Profile & Student Portal Switch */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 shrink-0 space-y-2">
          {/* Student Mode Button */}
          <button
            onClick={() => {
              onOpenStudentMode();
              onCloseMobile();
            }}
            className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Buka Portal Siswa (CBT)</span>
          </button>

          {/* User Account Info & Logout */}
          <div className="px-2 py-1.5 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-xs shrink-0 uppercase">
              {teacherName.slice(0, 2) || 'GR'}
            </div>
            <div className="truncate flex-1">
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                {teacherName}
              </div>
              <div className="text-[10px] text-slate-400 truncate font-mono">
                {teacherEmail}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onCloseMobile();
                onLogout();
              }}
              className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors shrink-0 cursor-pointer"
              title="Logout Guru"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
