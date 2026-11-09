import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  Sun,
  Plus,
  ClipboardList,
  Users,
  Sparkles,
  CalendarPlus,
  Search,
  X,
  FileUp,
  Pin,
  BarChart3
} from 'lucide-react';

export type BottomNavTab = 'agenda' | 'my-day' | 'board' | 'balance' | 'family';

interface BottomNavBarProps {
  activeTab: BottomNavTab;
  onChangeTab: (tab: BottomNavTab) => void;
  onOpenQuickAddWithAI: () => void;
  onOpenNewActivityManual: () => void;
  onOpenNewBoardItem?: () => void;
  onOpenBoardImportAI?: () => void;
  onOpenSearch?: () => void;
  todayEventsCount?: number;
  unassignedCount?: number;
  urgentBoardCount?: number;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  onChangeTab,
  onOpenQuickAddWithAI,
  onOpenNewActivityManual,
  onOpenNewBoardItem,
  onOpenBoardImportAI,
  onOpenSearch,
  todayEventsCount = 0,
  unassignedCount = 0,
  urgentBoardCount = 0,
}) => {
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fecha o menu (+) ao clicar fora ou pressionar ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsAddMenuOpen(false);
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsAddMenuOpen(false);
      }
    };
    if (isAddMenuOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAddMenuOpen]);

  return (
    <>
      {/* Backdrop e Menu Popup do botão central (+) */}
      {isAddMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 flex items-end justify-center pb-24 px-4 animate-fade-in">
          <div
            ref={menuRef}
            className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 p-3 w-full max-w-sm space-y-2 animate-slide-up"
          >
            <div className="flex items-center justify-between px-2 py-1 border-b border-slate-100">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                Ações Rápidas da Família
              </span>
              <button
                type="button"
                onClick={() => setIsAddMenuOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Opção 1: Capturar com IA na Agenda */}
            <button
              type="button"
              onClick={() => {
                setIsAddMenuOpen(false);
                onOpenQuickAddWithAI();
              }}
              className="w-full flex items-center gap-3.5 p-3 rounded-2xl bg-gradient-to-r from-sky-50 to-indigo-50/70 hover:from-sky-100 hover:to-indigo-100/80 border border-sky-200/80 text-left transition-all cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold text-slate-900">
                  Capturar Compromisso com IA
                </p>
                <p className="text-[11px] text-slate-600 truncate">
                  Texto, voz ou convite para a Agenda com horário
                </p>
              </div>
            </button>

            {/* Opção 2: Importar Comunicado / Provas para o Mural (IA) */}
            {onOpenBoardImportAI && (
              <button
                type="button"
                onClick={() => {
                  setIsAddMenuOpen(false);
                  onOpenBoardImportAI();
                }}
                className="w-full flex items-center gap-3.5 p-3 rounded-2xl bg-indigo-50/70 hover:bg-indigo-100/80 border border-indigo-200/80 text-left transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                  <FileUp className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-extrabold text-indigo-950">
                    Importar Roteiro de Provas / PDF (IA)
                  </p>
                  <p className="text-[11px] text-indigo-700 truncate">
                    Extrai provas, capítulos e trabalhos para o Mural
                  </p>
                </div>
              </button>
            )}

            {/* Opção 3: Novo Aviso no Mural */}
            {onOpenNewBoardItem && (
              <button
                type="button"
                onClick={() => {
                  setIsAddMenuOpen(false);
                  onOpenNewBoardItem();
                }}
                className="w-full flex items-center gap-3.5 p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-left transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Pin className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-extrabold text-slate-900">
                    Novo Aviso no Mural
                  </p>
                  <p className="text-[11px] text-slate-600 truncate">
                    Prova, trabalho escolar, compra de material ou recado
                  </p>
                </div>
              </button>
            )}

            {/* Opção 4: Nova Atividade Manual na Agenda */}
            <button
              type="button"
              onClick={() => {
                setIsAddMenuOpen(false);
                onOpenNewActivityManual();
              }}
              className="w-full flex items-center gap-3.5 p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-left transition-all cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <CalendarPlus className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold text-slate-900">
                  Nova Atividade na Agenda
                </p>
                <p className="text-[11px] text-slate-600 truncate">
                  Compromisso com horário, dias de repetição e responsável
                </p>
              </div>
            </button>

            <div className="grid grid-cols-2 gap-2 pt-1">
              {/* Atalho: Balanço da Semana */}
              <button
                type="button"
                onClick={() => {
                  setIsAddMenuOpen(false);
                  onChangeTab('balance');
                }}
                className="flex items-center justify-center gap-2 p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/70 text-xs font-bold text-slate-700 cursor-pointer"
              >
                <BarChart3 className="w-4 h-4 text-sky-700" />
                <span>Balanço</span>
                {unassignedCount > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-extrabold bg-amber-500 text-slate-950 rounded-full">
                    {unassignedCount}
                  </span>
                )}
              </button>

              {/* Atalho: Buscar */}
              {onOpenSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setIsAddMenuOpen(false);
                    onOpenSearch();
                  }}
                  className="flex items-center justify-center gap-2 p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/70 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  <Search className="w-4 h-4 text-slate-500" />
                  <span>Buscar</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Barra Fixa no Rodapé (Bottom Navigation Bar) */}
      <nav
        aria-label="Navegação Principal"
        className="shrink-0 bg-white/95 backdrop-blur-md border-t border-slate-200/90 z-30 shadow-[0_-4px_20px_-4px_rgba(15,23,42,0.06)] pb-[env(safe-area-inset-bottom)]"
      >
        <div className="max-w-3xl mx-auto px-2 sm:px-6 h-16 grid grid-cols-5 items-center">
          {/* 1. Agenda */}
          <button
            type="button"
            onClick={() => onChangeTab('agenda')}
            className={`flex flex-col items-center justify-center gap-1 h-full transition-colors cursor-pointer ${
              activeTab === 'agenda'
                ? 'text-sky-700 font-extrabold'
                : 'text-slate-500 hover:text-slate-800 font-semibold'
            }`}
          >
            <div
              className={`px-3 py-1 rounded-full transition-all ${
                activeTab === 'agenda' ? 'bg-sky-100/90 text-sky-700' : ''
              }`}
            >
              <Calendar className="w-5 h-5" />
            </div>
            <span className="text-[11px] leading-none">Agenda</span>
          </button>

          {/* 2. Meu Dia */}
          <button
            type="button"
            onClick={() => onChangeTab('my-day')}
            className={`flex flex-col items-center justify-center gap-1 h-full transition-colors cursor-pointer relative ${
              activeTab === 'my-day'
                ? 'text-sky-700 font-extrabold'
                : 'text-slate-500 hover:text-slate-800 font-semibold'
            }`}
          >
            <div
              className={`px-3 py-1 rounded-full transition-all relative ${
                activeTab === 'my-day' ? 'bg-amber-100/90 text-amber-700' : ''
              }`}
            >
              <Sun className="w-5 h-5" />
              {todayEventsCount > 0 && (
                <span className="absolute -top-1 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-sky-600 text-white text-[9px] font-extrabold flex items-center justify-center shadow-2xs">
                  {todayEventsCount}
                </span>
              )}
            </div>
            <span className="text-[11px] leading-none">Meu Dia</span>
          </button>

          {/* 3. Botão Central (+) Destaque */}
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={() => setIsAddMenuOpen((prev) => !prev)}
              aria-label="Adicionar atividade ou aviso"
              className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg transition-all cursor-pointer ${
                isAddMenuOpen
                  ? 'bg-slate-900 rotate-45 scale-95'
                  : 'bg-sky-600 hover:bg-sky-700 hover:scale-105 shadow-sky-600/25'
              }`}
            >
              <Plus className="w-6 h-6 stroke-[2.5]" />
            </button>
          </div>

          {/* 4. Mural da Família (Opção A) */}
          <button
            type="button"
            onClick={() => onChangeTab('board')}
            className={`flex flex-col items-center justify-center gap-1 h-full transition-colors cursor-pointer relative ${
              activeTab === 'board' || activeTab === 'balance'
                ? 'text-sky-700 font-extrabold'
                : 'text-slate-500 hover:text-slate-800 font-semibold'
            }`}
          >
            <div
              className={`px-3 py-1 rounded-full transition-all relative ${
                activeTab === 'board' || activeTab === 'balance'
                  ? 'bg-sky-100/90 text-sky-700'
                  : ''
              }`}
            >
              <ClipboardList className="w-5 h-5" />
              {urgentBoardCount > 0 && (
                <span className="absolute -top-1 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-slate-950 text-[9px] font-extrabold flex items-center justify-center shadow-2xs">
                  {urgentBoardCount}
                </span>
              )}
            </div>
            <span className="text-[11px] leading-none">Mural</span>
          </button>

          {/* 5. Família / Ajustes */}
          <button
            type="button"
            onClick={() => onChangeTab('family')}
            className={`flex flex-col items-center justify-center gap-1 h-full transition-colors cursor-pointer ${
              activeTab === 'family'
                ? 'text-sky-700 font-extrabold'
                : 'text-slate-500 hover:text-slate-800 font-semibold'
            }`}
          >
            <div
              className={`px-3 py-1 rounded-full transition-all ${
                activeTab === 'family' ? 'bg-sky-100/90 text-sky-700' : ''
              }`}
            >
              <Users className="w-5 h-5" />
            </div>
            <span className="text-[11px] leading-none">Família</span>
          </button>
        </div>
      </nav>
    </>
  );
};
