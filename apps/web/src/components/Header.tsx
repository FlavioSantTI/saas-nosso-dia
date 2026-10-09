import React from 'react';
import { Family } from '../types';
import { Bot, Plus, Users } from 'lucide-react';

interface HeaderProps {
  family: Family;
  onOpenQuickAdd: () => void;
  onOpenNewActivity: () => void;
  onOpenManageFamily: () => void;
  hasActiveAlert?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  family,
  onOpenQuickAdd,
  onOpenNewActivity,
  onOpenManageFamily,
  hasActiveAlert = false,
}) => {
  return (
    <header className="bg-white/85 backdrop-blur-md border-b border-sky-100/80 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-sky-100 text-sky-800 font-extrabold rounded-xl px-3 py-1.5 shadow-2xs text-base tracking-tight flex items-center justify-center">
            ND
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-800 leading-tight">Nosso Dia</h1>
            <p className="text-xs text-slate-500 font-medium">{family.name}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            onClick={onOpenManageFamily}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-sky-100 hover:bg-sky-50/70 text-slate-700 transition-all shadow-2xs cursor-pointer"
            title="Gerenciar Família e Membros"
          >
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Gerenciar</span> Família
          </button>

          <button
            onClick={onOpenQuickAdd}
            className={`relative inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs group cursor-pointer ${
              hasActiveAlert
                ? 'bg-amber-100 text-amber-950 border border-amber-300 ring-4 ring-amber-200/50 scale-105'
                : 'bg-amber-100/90 text-amber-950 hover:bg-amber-200/90 border border-amber-200/80'
            }`}
          >
            <Bot className="w-4 h-4 text-amber-800 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
            <span>Captura com IA</span>
            {/* Status Badge - Radar Ativo em Verde Sálvia */}
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#059669]"></span>
            </span>
          </button>

          <button
            onClick={onOpenNewActivity}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Atividade</span>
          </button>
        </div>
      </div>
    </header>
  );
};

