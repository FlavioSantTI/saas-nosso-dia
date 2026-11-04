import React, { useState } from 'react';
import {
  Calendar,
  Sun,
  Plus,
  BarChart3,
  Users,
  Sparkles,
  Edit3,
  Search,
  X
} from 'lucide-react';

export type BottomNavTab = 'agenda' | 'my-day' | 'balance' | 'family';

interface BottomNavBarProps {
  activeTab: BottomNavTab;
  onChangeTab: (tab: BottomNavTab) => void;
  onOpenQuickAddWithAI: () => void;
  onOpenNewActivityManual: () => void;
  onOpenSearch?: () => void;
  todayEventsCount?: number;
  unassignedCount?: number;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  onChangeTab,
  onOpenQuickAddWithAI,
  onOpenNewActivityManual,
  onOpenSearch,
  todayEventsCount = 0,
  unassignedCount = 0,
}) => {
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);

  const handleCreateClick = () => {
    setIsCreateMenuOpen((prev) => !prev);
  };

  const closeMenu = () => setIsCreateMenuOpen(false);

  return (
    <>
      {/* Backdrop para o menu rápido flutuante */}
      {isCreateMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 transition-opacity animate-fade-in"
          onClick={closeMenu}
          aria-hidden="true"
        />
      )}

      {/* Action Sheet Flutuante (Menu Central de Criação) */}
      {isCreateMenuOpen && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-[92%] max-w-sm bg-white rounded-3xl p-4 shadow-2xl border border-sky-100 z-50 animate-slide-up">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-2">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <span>✨</span> O que deseja adicionar?
            </span>
            <button
              type="button"
              onClick={closeMenu}
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            {/* Opção 1: Captura com IA */}
            <button
              type="button"
              onClick={() => {
                closeMenu();
                onOpenQuickAddWithAI();
              }}
              className="w-full flex items-center gap-3.5 p-3 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50/70 border border-amber-200/80 hover:border-amber-300 text-left transition-all cursor-pointer group shadow-2xs"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="font-bold text-sm text-amber-950">Captura com IA</p>
                  <span className="text-[10px] font-extrabold text-amber-800 bg-amber-200/80 px-1.5 py-0.2 rounded-full uppercase">
                    Rápido
                  </span>
                </div>
                <p className="text-xs text-amber-800/80 truncate">
                  Digite corrido, envie áudio ou foto de aviso escolar
                </p>
              </div>
            </button>

            {/* Opção 2: Nova Atividade Manual */}
            <button
              type="button"
              onClick={() => {
                closeMenu();
                onOpenNewActivityManual();
              }}
              className="w-full flex items-center gap-3.5 p-3 rounded-2xl bg-sky-50/70 hover:bg-sky-50 border border-sky-100 hover:border-sky-300 text-left transition-all cursor-pointer group shadow-2xs"
            >
              <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                <Edit3 className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm text-slate-900">Atividade Manual</p>
                <p className="text-xs text-slate-500 truncate">
                  Defina horário, responsável, participantes e repetição
                </p>
              </div>
            </button>

            {/* Opção 3: Busca no Calendário */}
            {onOpenSearch && (
              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  onOpenSearch();
                }}
                className="w-full flex items-center gap-3.5 p-2.5 rounded-2xl hover:bg-slate-50 text-left transition-all cursor-pointer group border border-transparent hover:border-slate-200"
              >
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                  <Search className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-xs text-slate-800">Buscar no Calendário</p>
                  <p className="text-[11px] text-slate-400 truncate">Encontre aniversários, médicos ou aulas</p>
                </div>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Barra de Navegação do Rodapé (Mobile First Thumb Zone) */}
      <nav
        aria-label="Navegação Principal do Rodapé"
        className="shrink-0 bg-white/95 backdrop-blur-md border-t border-sky-100/90 shadow-[0_-4px_20px_rgba(0,0,0,0.04)] z-30 pb-[env(safe-area-inset-bottom,0px)]"
      >
        <div className="max-w-md md:max-w-xl mx-auto px-2 sm:px-4 h-16 flex items-center justify-around relative">
          {/* Aba 1: Agenda */}
          <button
            type="button"
            onClick={() => onChangeTab('agenda')}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1.5 transition-colors cursor-pointer relative ${
              activeTab === 'agenda'
                ? 'text-sky-700 font-bold'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all ${activeTab === 'agenda' ? 'bg-sky-50 shadow-2xs' : ''}`}>
              <Calendar className="w-5 h-5" />
            </div>
            <span className="text-[11px] tracking-tight leading-none mt-1">Agenda</span>
            {activeTab === 'agenda' && (
              <span className="absolute bottom-1 w-5 h-0.5 bg-sky-600 rounded-full" />
            )}
          </button>

          {/* Aba 2: Meu Dia (Resumo Familiar) */}
          <button
            type="button"
            onClick={() => onChangeTab('my-day')}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1.5 transition-colors cursor-pointer relative ${
              activeTab === 'my-day'
                ? 'text-amber-700 font-bold'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all relative ${activeTab === 'my-day' ? 'bg-amber-50 shadow-2xs' : ''}`}>
              <Sun className="w-5 h-5" />
              {todayEventsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white rounded-full text-[9px] font-extrabold flex items-center justify-center shadow-2xs">
                  {todayEventsCount > 9 ? '9+' : todayEventsCount}
                </span>
              )}
            </div>
            <span className="text-[11px] tracking-tight leading-none mt-1">Meu Dia</span>
            {activeTab === 'my-day' && (
              <span className="absolute bottom-1 w-5 h-0.5 bg-amber-500 rounded-full" />
            )}
          </button>

          {/* Botão Central ➕: Integrado no corpo do rodapé */}
          <div className="flex flex-col items-center justify-center flex-1 h-full py-1">
            <button
              type="button"
              onClick={handleCreateClick}
              className={`w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-xs transition-all active:scale-95 cursor-pointer ${
                isCreateMenuOpen
                  ? 'bg-slate-900 rotate-45 shadow-slate-400/40'
                  : 'bg-sky-600 hover:bg-sky-500 shadow-sky-600/30'
              }`}
              title="Adicionar Atividade"
              aria-label="Adicionar Atividade"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>

          {/* Aba 3: Balanço */}
          <button
            type="button"
            onClick={() => onChangeTab('balance')}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1.5 transition-colors cursor-pointer relative ${
              activeTab === 'balance'
                ? 'text-sky-700 font-bold'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all relative ${activeTab === 'balance' ? 'bg-sky-50 shadow-2xs' : ''}`}>
              <BarChart3 className="w-5 h-5" />
              {unassignedCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white rounded-full text-[9px] font-extrabold flex items-center justify-center shadow-2xs animate-pulse">
                  !
                </span>
              )}
            </div>
            <span className="text-[11px] tracking-tight leading-none mt-1">Balanço</span>
            {activeTab === 'balance' && (
              <span className="absolute bottom-1 w-5 h-0.5 bg-sky-600 rounded-full" />
            )}
          </button>

          {/* Aba 4: Família & Configurações */}
          <button
            type="button"
            onClick={() => onChangeTab('family')}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1.5 transition-colors cursor-pointer relative ${
              activeTab === 'family'
                ? 'text-sky-700 font-bold'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all ${activeTab === 'family' ? 'bg-sky-50 shadow-2xs' : ''}`}>
              <Users className="w-5 h-5" />
            </div>
            <span className="text-[11px] tracking-tight leading-none mt-1">Família</span>
            {activeTab === 'family' && (
              <span className="absolute bottom-1 w-5 h-0.5 bg-sky-600 rounded-full" />
            )}
          </button>
        </div>
      </nav>
    </>
  );
};
