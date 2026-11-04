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
  ShieldCheck,
  Loader2,
  RefreshCw,
  Crown,
  Zap,
  X,
  Calendar,
  Clock,
  Search
} from 'lucide-react';
import { APP_VERSION } from '../constants/version';

interface HeaderProps {
  family: Family;
  onOpenQuickAdd: () => void;
  onOpenNewActivity: () => void;
  onOpenManageFamily: () => void;
  onOpenSummary: (initialTab?: 'today' | 'week') => void;
  onOpenSearch?: () => void;
  currentUser?: any | null;
  currentMember?: FamilyMember | null;
  isSuperAdmin?: boolean;
  onOpenAuth: () => void;
  onLogout: () => Promise<void>;
  onOpenAdmin?: () => void;
  hasActiveAlert?: boolean;
  hasUpdate?: boolean;
  onReloadApp?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  family,
  onOpenQuickAdd,
  onOpenNewActivity,
  onOpenManageFamily,
  onOpenSummary,
  onOpenSearch,
  currentUser,
  currentMember,
  isSuperAdmin = false,
  onOpenAuth,
  onLogout,
  onOpenAdmin,
  hasActiveAlert = false,
  hasUpdate = false,
  onReloadApp,
}) => {
  const [logoError, setLogoError] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const [showPlanModal, setShowPlanModal] = useState(false);

  const planBadgeText = family.plan_badge || 'Pro IA';
  const planFullName = family.plan_name || 'Família Pro IA Anual';
  const isTrial = family.plan_status === 'TRIAL';
  const daysRemaining = family.plan_days_remaining ?? 365;
  const expiresAtFormatted = family.plan_expires_at || '15/10/2027';

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
  const hasActiveSession = !!currentUser;

  return (
    <>
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
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-sm sm:text-lg font-bold tracking-tight text-slate-800 leading-tight truncate">
                Nosso Dia
              </h1>
              {/* Tag de Versão PWA */}
              {!hasUpdate ? (
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md shrink-0">
                  v{APP_VERSION}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={onReloadApp}
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-2 py-0.5 rounded-full transition-colors animate-pulse cursor-pointer shrink-0"
                  title="Nova versão disponível! Toque para atualizar"
                >
                  <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                  <span>Novo Update</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className="text-[10px] sm:text-xs text-slate-500 font-medium truncate max-w-[110px] sm:max-w-xs">
                {family.name}
              </span>
              <span className="text-slate-300 text-xs">•</span>
              <button
                type="button"
                onClick={() => setShowPlanModal(true)}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all shadow-2xs cursor-pointer ${
                  isTrial
                    ? 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                    : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
                }`}
                title="Ver vigência e detalhes da assinatura"
              >
                <Crown className="w-2.5 h-2.5 text-indigo-600" />
                <span>
                  {planBadgeText}
                  {isTrial ? ` (${daysRemaining} dias)` : ''}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Lado Direito do Header: Limpo, Arejado e sem sobrecarga */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Botão de Busca Rápida (Sempre Visível, Limpo e Acessível) */}
          {onOpenSearch && (
            <button
              type="button"
              onClick={onOpenSearch}
              className="w-11 h-11 flex items-center justify-center rounded-xl bg-white border border-sky-100 hover:bg-sky-50 text-slate-700 hover:text-sky-800 transition-colors shadow-2xs cursor-pointer"
              title="Buscar Atividades (Ctrl+K)"
              aria-label="Buscar Atividades"
            >
              <Search className="w-4 h-4 text-slate-600" />
            </button>
          )}

          {/* No Desktop: Botão de Criação Rápida */}
          <div className="hidden sm:flex items-center space-x-2">
            <button
              onClick={onOpenQuickAdd}
              className={`relative inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                hasActiveAlert
                  ? 'bg-amber-100 text-amber-950 border border-amber-300 ring-2 ring-amber-200/50'
                  : 'bg-amber-100/90 text-amber-950 hover:bg-amber-200/90 border border-amber-200/80'
              }`}
              title="Captura com IA"
            >
              <Bot className="w-4 h-4 text-amber-800" />
              <span>IA</span>
            </button>
            <button
              onClick={onOpenNewActivity}
              className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-xs transition-all cursor-pointer"
              title="Nova Atividade"
            >
              <Plus className="w-4 h-4" />
              <span>Nova</span>
            </button>
          </div>

          {/* Menu de Perfil / Conta (Mobile & Desktop) */}
          {hasActiveSession ? (
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 transition-all shadow-2xs cursor-pointer"
                title="Opções da Conta e Família"
                aria-label="Opções da Conta"
              >
                <div
                  className="w-7 h-7 sm:w-6 sm:h-6 rounded-lg text-white font-bold text-xs flex items-center justify-center shadow-xs"
                  style={{ backgroundColor: memberColor }}
                >
                  {firstName.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-bold text-slate-800 hidden sm:inline max-w-[100px] truncate">
                  {firstName}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
              </button>

              {/* Dropdown do Usuário com Versão, Super-Admin e Créditos */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="p-2.5 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {rawDisplayName}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {currentUser?.email || family.name}
                    </p>
                    {currentMember && (
                      <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-100">
                        {currentMember.role === 'ADMIN' ? 'Administrador' : 'Membro'}
                      </span>
                    )}
                  </div>

                  <div className="py-1 space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenManageFamily();
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-2.5 cursor-pointer"
                    >
                      <Users className="w-4 h-4 text-slate-500" />
                      <span>Gerenciar Família & Membros</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenSummary('week');
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-2.5 cursor-pointer"
                    >
                      <BarChart3 className="w-4 h-4 text-slate-500" />
                      <span>Resumo & Equilíbrio Semanal</span>
                    </button>
                    {isSuperAdmin && onOpenAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onOpenAdmin();
                        }}
                        className="w-full px-3 py-2 text-left text-xs font-bold text-indigo-700 hover:bg-indigo-50 rounded-xl flex items-center gap-2.5 cursor-pointer transition-colors"
                      >
                        <ShieldCheck className="w-4 h-4 text-indigo-600" />
                        <span>🛡️ Painel Super-Admin (/admin)</span>
                      </button>
                    )}
                  </div>

                  {/* Informações Institucionais no Lugar Correto (Menu da Conta) */}
                  <div className="p-2.5 border-t border-slate-100 bg-slate-50/70 rounded-xl my-1 text-[11px] text-slate-500">
                    <div className="flex items-center justify-between font-bold text-slate-700">
                      <span>Nosso Dia</span>
                      <span className="text-[10px] bg-sky-100 text-sky-800 px-1.5 py-0.2 rounded font-extrabold">v{APP_VERSION}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                      Powered by <strong className="text-sky-700 font-semibold">Flavio Santiago Consultor IA</strong> — 2026
                    </p>
                  </div>

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
          ) : (
            <button
              onClick={onOpenAuth}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white transition-all cursor-pointer shadow-xs"
              title="Entrar ou Criar Conta"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Entrar</span>
            </button>
          )}
        </div>
      </div>
    </header>

      {/* Modal de Detalhes da Vigência e Assinatura */}
      {showPlanModal && (
        <div
          onClick={() => setShowPlanModal(false)}
          className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{planFullName}</h3>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full mt-0.5">
                    <ShieldCheck className="w-3 h-3" /> Assinatura Ativa
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowPlanModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg font-bold cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Caixa de Vigência */}
            <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-3.5 mb-4 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" /> Válido até:
                </span>
                <strong className="text-slate-900">{expiresAtFormatted}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" /> Dias restantes:
                </span>
                <strong className="text-indigo-700">{daysRemaining} dias</strong>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
              Recursos liberados para a sua casa:
            </p>

            <div className="space-y-2.5 text-xs text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 mb-5">
              <div className="flex items-center gap-2 font-medium">
                <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Captura Inteligente com Gemini IA (Texto, Voz e Fotos)</span>
              </div>
              <div className="flex items-center gap-2 font-medium">
                <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Resumo Familiar & Briefing Matinal no WhatsApp</span>
              </div>
              <div className="flex items-center gap-2 font-medium">
                <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Alarmes no Celular e Membros Ilimitados</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowPlanModal(false)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors shadow-2xs cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </>
  );
};
