import React, { useState, useRef, useEffect } from 'react';
import { Family, FamilyMember } from '../types';
import {
  Bot,
  Plus,
  Users,
  BarChart3,
  LogIn,
  LogOut,
  ChevronDown,
  Sun,
} from 'lucide-react';

interface HeaderProps {
  family: Family;
  onOpenQuickAdd: () => void;
  onOpenNewActivity: () => void;
  onOpenManageFamily: () => void;
  onOpenSummary: (initialTab?: 'today' | 'week') => void;
  currentUser?: any | null;
  currentMember?: FamilyMember | null;
  onOpenAuth: () => void;
  onLogout: () => Promise<void>;
  hasActiveAlert?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  family,
  onOpenQuickAdd,
  onOpenNewActivity,
  onOpenManageFamily,
  onOpenSummary,
  currentUser,
  currentMember,
  onOpenAuth,
  onLogout,
  hasActiveAlert = false,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Fecha menu do usuário ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayName =
    currentMember?.name ||
    currentUser?.user_metadata?.name ||
    currentUser?.email?.split('@')[0] ||
    'Usuário';

  const memberColor = currentMember?.color || '#0284C7';

  return (
    <header className="bg-white/85 backdrop-blur-md border-b border-sky-100/80 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between">
        {/* Lado Esquerdo: Identidade da Família */}
        <div className="flex items-center space-x-3">
          <div className="bg-sky-100 text-sky-800 font-extrabold rounded-xl px-3 py-1.5 shadow-2xs text-base tracking-tight flex items-center justify-center">
            ND
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-800 leading-tight">
              Nosso Dia
            </h1>
            <p className="text-xs text-slate-500 font-medium">{family.name}</p>
          </div>
        </div>

        {/* Lado Direito: Ações Principais e Perfil de Usuário */}
        <div className="flex items-center space-x-2 sm:space-x-2.5">
          {/* Botão Resumo & Balanço */}
          <button
            onClick={() => onOpenSummary('today')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-sky-100 hover:bg-sky-50 text-slate-700 transition-all shadow-2xs cursor-pointer group"
            title="Painel de Resumo (Meu Dia e Balanço da Semana)"
          >
            <BarChart3 className="w-3.5 h-3.5 text-sky-600 transition-transform group-hover:scale-110" />
            <span className="hidden md:inline">Resumo &</span> Balanço
          </button>

          {/* Botão Gerenciar Família */}
          <button
            onClick={onOpenManageFamily}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-sky-100 hover:bg-sky-50 text-slate-700 transition-all shadow-2xs cursor-pointer"
            title="Gerenciar Família e Membros"
          >
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Família</span>
          </button>

          {/* Botão Captura com IA */}
          <button
            onClick={onOpenQuickAdd}
            className={`relative inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs group cursor-pointer ${
              hasActiveAlert
                ? 'bg-amber-100 text-amber-950 border border-amber-300 ring-4 ring-amber-200/50 scale-105'
                : 'bg-amber-100/90 text-amber-950 hover:bg-amber-200/90 border border-amber-200/80'
            }`}
          >
            <Bot className="w-4 h-4 text-amber-800 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
            <span className="hidden sm:inline">Captura com IA</span>
            <span className="sm:hidden">IA</span>
            {/* Radar Ativo */}
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#059669]"></span>
            </span>
          </button>

          {/* Botão Nova Atividade */}
          <button
            onClick={onOpenNewActivity}
            className="inline-flex items-center gap-1 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nova Atividade</span>
            <span className="sm:hidden">Nova</span>
          </button>

          {/* Seção de Autenticação / Perfil de Usuário */}
          {currentUser ? (
            <div className="relative ml-1" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-1.5 p-1 sm:px-2.5 sm:py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 transition-all shadow-2xs cursor-pointer"
              >
                <div
                  className="w-6 h-6 rounded-lg text-white font-bold text-xs flex items-center justify-center shadow-xs"
                  style={{ backgroundColor: memberColor }}
                >
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-bold text-slate-800 hidden sm:inline max-w-[100px] truncate">
                  {displayName}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Dropdown do Usuário */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="p-2.5 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {displayName}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {currentUser.email}
                    </p>
                    {currentMember && (
                      <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-100">
                        {currentMember.role === 'ADMIN'
                          ? 'Adulto (Admin)'
                          : 'Adulto (Membro)'}
                      </span>
                    )}
                  </div>

                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenSummary('today');
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-2 cursor-pointer"
                    >
                      <Sun className="w-4 h-4 text-amber-500" />
                      <span>Meu Dia Hoje</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenSummary('week');
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-2 cursor-pointer"
                    >
                      <BarChart3 className="w-4 h-4 text-sky-600" />
                      <span>Balanço da Semana</span>
                    </button>
                  </div>

                  <div className="pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={async () => {
                        setIsUserMenuOpen(false);
                        await onLogout();
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sair (Logout)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer shadow-2xs ml-1"
              title="Entrar ou Criar Conta"
            >
              <LogIn className="w-3.5 h-3.5 text-slate-600" />
              <span>Entrar</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
