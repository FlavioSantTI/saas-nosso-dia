// apps/web/src/components/AlarmPermissionModal.tsx
// Modal contextual e amigável (soft ask) para solicitação de permissão de alarmes e Web Push

import React, { useState } from 'react';
import { BellRing, Volume2, ShieldCheck, X, Loader2, AlertCircle } from 'lucide-react';
import { registerPushService } from '../lib/pushSubscription';

export const ALARM_PROMPT_DISMISSED_KEY = '@nosso-dia:alarm-prompt-dismissed';

interface AlarmPermissionModalProps {
  isOpen: boolean;
  userId?: string;
  familyId?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AlarmPermissionModal: React.FC<AlarmPermissionModalProps> = ({
  isOpen,
  userId,
  familyId,
  onClose,
  onSuccess
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDismiss = () => {
    try {
      localStorage.setItem(ALARM_PROMPT_DISMISSED_KEY, 'true');
    } catch {}
    onClose();
  };

  const handleActivate = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (!userId) {
        setErrorMessage('Você precisa estar conectado para registrar alarmes no seu dispositivo.');
        setIsLoading(false);
        return;
      }

      const result = await registerPushService(userId, familyId);

      if (result.success) {
        try {
          localStorage.setItem(ALARM_PROMPT_DISMISSED_KEY, 'true');
        } catch {}
        if (onSuccess) onSuccess();
        onClose();
      } else {
        if (result.permission === 'denied') {
          setErrorMessage(
            'As notificações foram bloqueadas no navegador. Para ativar, clique no ícone de cadeado na barra de endereços e autorize as notificações.'
          );
        } else {
          setErrorMessage(result.error || 'Não foi possível ativar as notificações no momento.');
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Ocorreu um erro ao ativar os alarmes.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-sky-100 overflow-hidden flex flex-col p-6 sm:p-7">
        {/* Botão Fechar */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Ícone de Destaque */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shadow-2xs mb-4">
          <BellRing className="w-8 h-8 animate-bounce text-[#0284C7]" />
        </div>

        {/* Título e Descrição */}
        <div className="text-center mb-6">
          <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            Não perca os horários da família!
          </h3>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
            Ative os <strong>Alarmes Sonoros</strong> do Nosso Dia para receber avisos em tempo real de caronas, aulas e remédios, mesmo com o celular bloqueado ou o aplicativo fechado.
          </p>
        </div>

        {/* Benefícios em Destaque */}
        <div className="space-y-3 mb-6 bg-[#F4F8FA] p-3.5 rounded-2xl border border-slate-100 text-xs text-slate-700">
          <div className="flex items-center gap-2.5">
            <Volume2 className="w-4 h-4 text-sky-600 shrink-0" />
            <span>Alarme sonoro personalizado no horário exato da atividade.</span>
          </div>
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Zero spam. Apenas compromissos confirmados da sua família.</span>
          </div>
        </div>

        {/* Mensagem de Erro / Orientação */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="leading-snug">{errorMessage}</span>
          </div>
        )}

        {/* Ações */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onClick={handleDismiss}
            className="flex-1 py-3 px-4 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 transition-colors text-center cursor-pointer"
          >
            Depois
          </button>
          <button
            type="button"
            onClick={handleActivate}
            disabled={isLoading}
            className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Ativando...</span>
              </>
            ) : (
              <span>Ativar Alarmes Sonoros</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

