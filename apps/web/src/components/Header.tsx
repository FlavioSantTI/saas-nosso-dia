import React, { useState, useRef, useEffect } from 'react';
import { Family, FamilyMember } from '../types';
import { getMemberDisplayName, getFirstName } from '../lib/formatters';
import {
  Bot,
  Plus,
  Users,
  BarChart3,
  LogIn,
  LogOut,
  ChevronDown,
  Sun,
  MoreVertical,
  ShieldCheck,
  Loader2,
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
  onOpenAdmin?: () => void;
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
  onOpenAdmin,
  hasActiveAlert = false,
}) => {
  const [logoError, setLogoError] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const handleLogoutClick = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await onLogout();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Fecha menus ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setIsUserMenuOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(target)) {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const rawDisplayName =
    currentMember?.name ||
    currentUser?.user_metadata?.name ||
    currentUser?.email?.split('@')[0] ||
    'Família';

  const firstName = currentMember
    ? getMemberDisplayName(currentMember)
    : getFirstName(rawDisplayName) || 'Família';
  const memberColor = currentMember?.color || '#0284C7';
  const hasActiveSession = !!family || !!currentUser;

  return (
    <header className="bg-white/85 backdrop-blur-md border-b border-sky-100/80 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-2.5 flex items-center justify-between">
        {/* Lado Esquerdo: Identidade da Família (Compacto no Mobile) */}
        <div className="flex items-center space-x-2.5 sm:space-x-3 shrink-0">
          {!logoError ? (
            <img
              src="/icons/logo-round-1024.png"
              alt="Logo Nosso Dia"
              onError={() => setLogoError(true)}
              className="w-10 h-10 rounded-full object-cover shadow-xs border border-sky-100 shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-sky-100 text-sky-800 font-extrabold flex items-center justify-center text-sm shadow-xs border border-sky-100 shrink-0">
              ND
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-sm sm:text-lg font-bold tracking-tight text-slate-800 leading-tight truncate">
              Nosso Dia
            </h1>
            <p className="text-[10px] sm:text-xs text-slate-500 font-medium truncate max-w-[90px] sm:max-w-xs">
              {family.name}
            </p>
          </div>
        </div>

        {/* Lado Direito: VERSÃO DESKTOP (sm: e superior) */}
        <div className="hidden sm:flex items-center space-x-2 sm:space-x-2.5">
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
            <span>Família</span>
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
            <span>Captura com IA</span>
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
            <span>Nova Atividade</span>
          </button>

          {/* Seção de Autenticação / Perfil de Usuário com Botão de Sair */}
          {hasActiveSession ? (
            <div className="flex items-center gap-1.5 ml-1">
              {/* Menu com Nome e Avatar */}
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-1.5 p-1 sm:px-2.5 sm:py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 transition-all shadow-2xs cursor-pointer"
                  title="Opções da Conta"
                >
                  <div
                    className="w-6 h-6 rounded-lg text-white font-bold text-xs flex items-center justify-center shadow-xs"
                    style={{ backgroundColor: memberColor }}
                  >
                    {firstName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-bold text-slate-800 hidden sm:inline max-w-[100px] truncate">
                    {firstName}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {/* Dropdown do Usuário Desktop */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="p-2.5 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {rawDisplayName}
                      </p>
                      {currentUser?.email ? (
                        <p className="text-[11px] text-slate-500 truncate">
                          {currentUser.email}
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-500 truncate">
                          {family.name}
                        </p>
                      )}
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

                    {onOpenAdmin && (
                      <div className="py-1 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            onOpenAdmin();
                          }}
                          className="w-full px-3 py-2 text-left text-xs font-bold text-indigo-700 hover:bg-indigo-50 rounded-xl flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <ShieldCheck className="w-4 h-4 text-indigo-600" />
                          <span>Painel Super-Admin</span>
                        </button>
                      </div>
                    )}

                    <div className="pt-1 border-t border-slate-100">
                      <button
                        type="button"
                        disabled={isLoggingOut}
                        onClick={async () => {
                          setIsUserMenuOpen(false);
                          await handleLogoutClick();
                        }}
                        className="w-full px-3 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
                      >
                        {isLoggingOut ? (
                          <Loader2 className="w-4 h-4 text-rose-600 animate-spin" />
                        ) : (
                          <LogOut className="w-4 h-4" />
                        )}
                        <span>{isLoggingOut ? 'Saindo...' : 'Sair da Conta'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Botão de Ação Direta: [ 🚪 Sair ] */}
              <button
                type="button"
                disabled={isLoggingOut}
                onClick={handleLogoutClick}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100/80 border border-rose-200/70 transition-all shadow-2xs cursor-pointer disabled:opacity-60"
                title="Sair da Conta e Família"
              >
                {isLoggingOut ? (
                  <Loader2 className="w-3.5 h-3.5 text-rose-600 animate-spin" />
                ) : (
                  <LogOut className="w-3.5 h-3.5 text-rose-600" />
                )}
                <span className="hidden md:inline">{isLoggingOut ? 'Saindo...' : 'Sair'}</span>
              </button>
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

        {/* Lado Direito: VERSÃO MOBILE (< 640px / smartphone) */}
        <div className="flex sm:hidden items-center space-x-1.5">
          {/* Botão Prioritário Compacto: 🤖 IA */}
          <button
            onClick={onOpenQuickAdd}
            className={`relative inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
              hasActiveAlert
                ? 'bg-amber-100 text-amber-950 border border-amber-300 ring-2 ring-amber-200/50'
                : 'bg-amber-100/90 text-amber-950 hover:bg-amber-200 border border-amber-200/80'
            }`}
            title="Captura Rápida com IA"
          >
            <Bot className="w-3.5 h-3.5 text-amber-800" />
            <span>IA</span>
            <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#059669]"></span>
            </span>
          </button>

          {/* Botão Prioritário Compacto: + Nova */}
          <button
            onClick={onOpenNewActivity}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-xs transition-all cursor-pointer"
            title="Nova Atividade"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova</span>
          </button>

          {/* Menu Suspenso Mobile (3 pontinhos '⋮') */}
          <div className="relative" ref={mobileMenuRef}>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-slate-700 transition-all shadow-2xs cursor-pointer flex items-center justify-center"
              title="Mais Opções"
              aria-label="Mais Opções"
            >
              <MoreVertical className="w-4 h-4 text-slate-600" />
            </button>

            {isMobileMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                {/* Se houver sessão ativa, exibe identificação limpa com primeiro nome */}
                {hasActiveSession && (
                  <div className="p-2 border-b border-slate-100 mb-1">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-5 h-5 rounded-md text-white font-bold text-[10px] flex items-center justify-center shrink-0"
                        style={{ backgroundColor: memberColor }}
                      >
                        {firstName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {firstName}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">
                          {currentUser?.email || family.name}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenSummary('week');
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-sky-50 hover:text-sky-800 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <BarChart3 className="w-4 h-4 text-sky-600" />
                    <span>Balanço da Semana</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenSummary('today');
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-amber-50 hover:text-amber-800 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <Sun className="w-4 h-4 text-amber-500" />
                    <span>Meu Dia Hoje</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenManageFamily();
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <Users className="w-4 h-4 text-slate-500" />
                    <span>Gerenciar Família</span>
                  </button>

                  {onOpenAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onOpenAdmin();
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-bold text-indigo-700 hover:bg-indigo-50 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4 text-indigo-600" />
                      <span>Painel Super-Admin</span>
                    </button>
                  )}
                </div>

                <div className="pt-1 mt-1 border-t border-slate-100">
                  {hasActiveSession ? (
                    <button
                      type="button"
                      disabled={isLoggingOut}
                      onClick={async () => {
                        setIsMobileMenuOpen(false);
                        await handleLogoutClick();
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer disabled:opacity-60"
                    >
                      {isLoggingOut ? (
                        <Loader2 className="w-4 h-4 text-rose-600 animate-spin" />
                      ) : (
                        <LogOut className="w-4 h-4" />
                      )}
                      <span>{isLoggingOut ? 'Saindo...' : 'Sair da Conta'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        onOpenAuth();
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-bold text-sky-700 hover:bg-sky-50 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <LogIn className="w-4 h-4 text-sky-600" />
                      <span>Entrar / Cadastrar</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
