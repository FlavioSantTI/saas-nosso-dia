import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Key,
  KeyRound,
  Eye,
  EyeOff,
  Sparkles,
  Check,
  Copy,
  AlertCircle,
  RefreshCw,
  Send,
  ExternalLink,
  ShieldCheck,
  Mail,
  CheckCircle2,
} from 'lucide-react';

interface AdminUserManagementProps {
  initialEmail?: string;
  onSuccess?: (email: string) => void;
  className?: string;
}

const EASY_PASSWORDS = [
  'NossoDia2026!',
  'Familia2026!',
  'AcessoFacil26',
  'RotinaLeve26!',
  'VidaFeliz2026!',
  'NossoDiaSeguro26!',
  'FamíliaSantiago26!',
];

export const AdminUserManagement: React.FC<AdminUserManagementProps> = ({
  initialEmail = '',
  onSuccess,
  className = '',
}) => {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ email: string; password: string } | null>(null);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  // Atualiza campo caso initialEmail mude
  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  // Gerador de senhas fáceis e memoráveis
  const handleGenerateEasyPassword = () => {
    // Escolhe aleatoriamente ou diferente da atual
    const available = EASY_PASSWORDS.filter((p) => p !== password);
    const chosen = available[Math.floor(Math.random() * available.length)] || EASY_PASSWORDS[0];
    setPassword(chosen);
    setShowPassword(true);
    setErrorMessage(null);
  };

  // Validação de formato de e-mail
  const isValidEmail = (val: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  };

  // Disparo da RPC no Supabase
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setErrorMessage('Por favor, informe o e-mail do usuário.');
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      setErrorMessage('Por favor, informe um endereço de e-mail válido (ex: usuario@email.com).');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMessage('A senha precisa ter no mínimo 6 caracteres.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const { error } = await supabase.rpc('admin_set_user_credentials', {
        p_target_email: cleanEmail,
        p_new_password: password,
      });

      if (error) {
        throw error;
      }

      // Sucesso na ativação e definição de senha
      setSuccessData({
        email: cleanEmail,
        password: password,
      });

      if (onSuccess) {
        onSuccess(cleanEmail);
      }
    } catch (err: any) {
      console.error('[AdminUserManagement] Erro ao definir credenciais:', err);
      setErrorMessage(
        err.message || 'Falha ao ativar usuário e definir senha. Verifique se o e-mail está correto.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Texto formatado exato para WhatsApp
  const buildWhatsAppMessage = (userEmail: string, userPass: string) => {
    return `Oi! Já deixei seu acesso pronto no Nosso Dia.

📱 Link: https://nossodia.flaviosantiago.com.br
📧 E-mail: ${userEmail}
🔑 Senha: ${userPass}

É só abrir o link, colocar esse e-mail e senha e entrar. Não precisa confirmar nada no e-mail!`;
  };

  // Copiar para a área de transferência
  const handleCopyWhatsApp = async () => {
    if (!successData) return;
    const text = buildWhatsAppMessage(successData.email, successData.password);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedWhatsApp(true);
      setTimeout(() => setCopiedWhatsApp(false), 3000);
    } catch (err) {
      console.error('Erro ao copiar texto:', err);
    }
  };

  const handleCopyPasswordOnly = async () => {
    if (!successData) return;
    try {
      await navigator.clipboard.writeText(successData.password);
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2500);
    } catch (err) {
      console.error('Erro ao copiar senha:', err);
    }
  };

  const handleResetForm = () => {
    setSuccessData(null);
    setEmail('');
    setPassword('');
    setErrorMessage(null);
    setCopiedWhatsApp(false);
    setCopiedPassword(false);
  };

  return (
    <div
      className={`bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-sm transition-all ${className}`}
    >
      {/* Cabeçalho do Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base tracking-tight">
                Ativação Direta & Gestão de Senhas
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-800 border border-indigo-200 uppercase tracking-wider">
                Root Admin
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Crie acesso imediato ou redefina senhas sem depender de links ou e-mails de confirmação.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl self-start sm:self-auto">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Confirmação Instantânea</span>
        </div>
      </div>

      {/* Conteúdo Principal: Se houver Sucesso, exibe Card com WhatsApp; se não, exibe Formulário */}
      {successData ? (
        <div className="mt-5 space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 sm:p-6 text-white shadow-md">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-base sm:text-lg tracking-tight">
                  Conta Ativada & Senha Definida com Sucesso!
                </h4>
                <p className="text-xs text-emerald-50 leading-relaxed">
                  O usuário já foi confirmado no banco de dados e pode entrar imediatamente na plataforma.
                </p>
              </div>
            </div>

            {/* Caixa com as Credenciais */}
            <div className="mt-5 bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 space-y-2 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-white/10">
                <span className="text-emerald-100 font-medium">E-mail de Acesso:</span>
                <span className="font-bold font-mono text-white select-all break-all">
                  {successData.email}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-1">
                <span className="text-emerald-100 font-medium">Senha Definida:</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold font-mono text-white text-sm bg-black/20 px-2.5 py-0.5 rounded-lg select-all">
                    {successData.password}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyPasswordOnly}
                    className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
                    title="Copiar apenas a senha"
                  >
                    {copiedPassword ? (
                      <Check className="w-3.5 h-3.5 text-emerald-200" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Ações de Compartilhamento WhatsApp */}
            <div className="mt-5 pt-4 border-t border-white/15 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                type="button"
                onClick={handleCopyWhatsApp}
                className="flex-1 py-3 px-4 rounded-xl font-black text-xs bg-white text-emerald-900 hover:bg-emerald-50 transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                {copiedWhatsApp ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Copiado para Área de Transferência!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-emerald-700" />
                    <span>📋 Copiar Acesso para WhatsApp</span>
                  </>
                )}
              </button>

              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                  buildWhatsAppMessage(successData.email, successData.password)
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 px-4 rounded-xl font-bold text-xs bg-emerald-700/60 hover:bg-emerald-700/90 text-white transition-colors flex items-center justify-center gap-1.5 border border-white/20"
                title="Abrir diretamente no WhatsApp"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Abrir WhatsApp Web</span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </a>
            </div>
          </div>

          {/* Botão de Nova Operação */}
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleResetForm}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              + Ativar ou Redefinir Outro Usuário
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong>Erro na operação:</strong> {errorMessage}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Campo E-mail */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                E-mail do Usuário <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="exemplo@email.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrorMessage(null);
                  }}
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Se a conta já existir, a senha será sobrescrita e o e-mail confirmado. Se não existir, será criada e ativada.
              </p>
            </div>

            {/* Campo Senha com Toggle e Botão de Gerar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">
                  Nova Senha <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleGenerateEasyPassword}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Sparkles className="w-3 h-3 text-indigo-500" />
                  <span>Gerar Senha Fácil</span>
                </button>
              </div>

              <div className="relative">
                <Key className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Digite ou clique em 'Gerar Senha Fácil'"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrorMessage(null);
                  }}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                  title={showPassword ? 'Ocultar senha' : 'Exibir senha visível'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                A senha fica visível para você conferir antes de compartilhar via WhatsApp.
              </p>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleGenerateEasyPassword}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Sugerir Senha Amigável</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading || !email.trim() || !password}
              className="px-6 py-2.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Ativando & Definindo...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Ativar & Definir Senha</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default AdminUserManagement;
