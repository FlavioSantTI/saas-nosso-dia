import React, { useState, useEffect, useRef } from 'react';
import {
  CalendarDays,
  Users,
  AlertTriangle,
  Clock,
  MapPin,
  Sparkles,
  ShieldCheck,
  ChevronDown,
  Menu,
  X,
  Smartphone,
  CheckCircle2,
  Zap,
  FileText,
  Mic,
  Camera,
  FileCheck,
  Sunrise,
  BellRing,
  LayoutGrid,
  HeartHandshake,
  Car,
  FileQuestion,
  BrainCircuit,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Plan } from '../types';
import { FALLBACK_PLANS, LandingPlan, formatPlanPrice } from '../constants/plans';

interface LandingPageProps {
  onOpenLogin: () => void;
  onOpenSignup: () => void;
  onSelectPlan?: (planSlug: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenLogin,
  onOpenSignup,
  onSelectPlan,
}) => {
  // Estado para o menu móvel
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Estado para acordeão do FAQ (índices abertos)
  const [openFaqIndices, setOpenFaqIndices] = useState<number[]>([0]);

  // Planos carregados do Supabase com fallback resiliente
  const [plans, setPlans] = useState<LandingPlan[]>(FALLBACK_PLANS);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansErrorFallback, setPlansErrorFallback] = useState(false);

  // Modal de Política de Privacidade e Termos de Uso
  const [privacyModalOpen, setPrivacyModalOpen] = useState<boolean>(false);
  const [privacyModalType, setPrivacyModalType] = useState<'privacy' | 'terms'>('privacy');

  // Controle de visibilidade do Sticky CTA no mobile (aparece após o Hero e antes do Rodapé)
  const [showStickyCta, setShowStickyCta] = useState(false);
  const heroRef = useRef<HTMLElement | null>(null);
  const footerRef = useRef<HTMLElement | null>(null);

  // Telemetria / Eventos de tracking
  const trackEvent = (eventName: string, payload?: Record<string, any>) => {
    try {
      if (typeof window !== 'undefined') {
        const eventDetail = { eventName, payload, timestamp: new Date().toISOString() };
        window.dispatchEvent(new CustomEvent('app_analytics', { detail: eventDetail }));
        console.log(`[Analytics] ${eventName}`, payload || {});
      }
    } catch {
      // Falha silenciosa
    }
  };

  // Carregamento de planos com timeout de 3s
  useEffect(() => {
    let isMounted = true;
    let timeoutId: any = null;

    const fetchPlansWithTimeout = async () => {
      setPlansLoading(true);

      const timeoutPromise = new Promise<{ isTimeout: true }>((resolve) => {
        timeoutId = setTimeout(() => resolve({ isTimeout: true }), 3000);
      });

      try {
        const queryPromise = supabase
          .from('plans')
          .select('*')
          .eq('is_active', true)
          .order('price_cents', { ascending: true });

        const result: any = await Promise.race([queryPromise, timeoutPromise]);

        if (!isMounted) return;

        if (result?.isTimeout || !result?.data || result?.error || result.data.length === 0) {
          // Timeout de 3s acionado ou falha de rede: fallback seguro
          setPlans(FALLBACK_PLANS);
          setPlansErrorFallback(true);
        } else {
          // Mescla planos do Supabase com os dados visuais do fallback
          const merged: LandingPlan[] = (result.data as Plan[]).map((dbPlan) => {
            const fallbackMatch = FALLBACK_PLANS.find(
              (f) => f.slug === dbPlan.slug || f.name.toLowerCase() === dbPlan.name.toLowerCase()
            );
            return {
              ...dbPlan,
              badge: fallbackMatch?.badge,
              isPopular: fallbackMatch?.isPopular,
              trialDays: fallbackMatch?.trialDays,
              discountNote: fallbackMatch?.discountNote,
              monthly_ai_credits: dbPlan.monthly_ai_credits ?? fallbackMatch?.monthly_ai_credits ?? 0,
              allowed_ai_modalities:
                dbPlan.allowed_ai_modalities ?? fallbackMatch?.allowed_ai_modalities ?? ['TEXT'],
              features:
                Array.isArray(dbPlan.features) && dbPlan.features.length > 0
                  ? dbPlan.features
                  : fallbackMatch?.features || [],
            };
          });

          setPlans(merged.length > 0 ? merged : FALLBACK_PLANS);
          setPlansErrorFallback(false);
        }
      } catch (err) {
        if (isMounted) {
          setPlans(FALLBACK_PLANS);
          setPlansErrorFallback(true);
        }
      } finally {
        if (isMounted) {
          clearTimeout(timeoutId);
          setPlansLoading(false);
        }
      }
    };

    fetchPlansWithTimeout();

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  // Monitoramento de rolagem para exibição do Sticky CTA móvel
  useEffect(() => {
    const handleScroll = () => {
      if (!heroRef.current) return;
      const heroRect = heroRef.current.getBoundingClientRect();
      const heroPassed = heroRect.bottom < 100;

      let footerReached = false;
      if (footerRef.current) {
        const footerRect = footerRef.current.getBoundingClientRect();
        footerReached = footerRect.top < window.innerHeight;
      }

      setShowStickyCta(heroPassed && !footerReached);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fechar menu mobile ao pressionar ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        setPrivacyModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Disparo dos botões
  const handleLoginClick = () => {
    trackEvent('login_header_click');
    setMobileMenuOpen(false);
    onOpenLogin();
  };

  const handleHeroCtaClick = () => {
    trackEvent('cta_hero_click');
    onOpenSignup();
  };

  const handlePlanCtaClick = (plan: LandingPlan) => {
    trackEvent('cta_planos_click', { plan_slug: plan.slug, plan_name: plan.name });
    if (onSelectPlan) {
      onSelectPlan(plan.slug);
    }
    onOpenSignup();
  };

  const toggleFaq = (index: number) => {
    const isCurrentlyOpen = openFaqIndices.includes(index);
    if (!isCurrentlyOpen) {
      trackEvent('faq_open', { faq_index: index });
      setOpenFaqIndices((prev) => [...prev, index]);
    } else {
      setOpenFaqIndices((prev) => prev.filter((i) => i !== index));
    }
  };

  const openPrivacyModal = (type: 'privacy' | 'terms') => {
    setPrivacyModalType(type);
    setPrivacyModalOpen(true);
  };

  const faqItems = [
    {
      q: 'Preciso cadastrar cartão de crédito para testar?',
      a: 'Não. Os 14 dias de teste da Degustação são 100% gratuitos. Nenhum dado financeiro ou cartão de crédito é exigido para criar a conta da família e começar a planejar.',
    },
    {
      q: 'Funciona no iPhone e no Android?',
      a: 'Sim, perfeitamente. O Nosso Dia é um PWA (Progressive Web App) moderno e leve. Você o instala diretamente pelo navegador (Safari no iPhone ou Chrome no Android) e ele opera com tela cheia, sem ocupar memória desnecessária do celular.',
    },
    {
      q: 'Como meu cônjuge acessa?',
      a: 'Muito simples. Após entrar na sua conta, você gera um link dinâmico e seguro de convite familiar e envia diretamente pelo WhatsApp. Ao clicar, seu parceiro ou parceira entra imediatamente sincronizado à mesma grade da casa.',
    },
    {
      q: 'O que acontece após os 14 dias de teste?',
      a: 'Todas as atividades, rotinas e histórico continuam salvos com total segurança. Você poderá escolher o plano de assinatura que melhor atende às necessidades da sua casa para manter o acesso contínuo e os créditos de IA.',
    },
    {
      q: 'Meus dados e os dados dos meus filhos estão seguros?',
      a: 'Sim. Empregamos arquitetura com isolamento hermético via Row Level Security (RLS) no PostgreSQL e criptografia de ponta a ponta. A rotina dos seus filhos é visível unicamente para os adultos cadastrados na sua família.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F4F8FA] text-slate-800 font-sans antialiased flex flex-col overflow-x-hidden selection:bg-sky-100 selection:text-sky-900">
      {/* ============================================================================== */}
      {/* SEÇÃO 1 — HEADER PÚBLICO                                                      */}
      {/* ============================================================================== */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-sky-100/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          {/* Logo e Nome da Aplicação */}
          <a
            href="#"
            className="flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-sky-500 rounded-2xl p-1 -m-1"
            aria-label="Nosso Dia — Página inicial"
          >
            <img
              src="/icons/logo-round-1024.png"
              alt="Logotipo circular do Nosso Dia com símbolo acolhedor de família"
              className="w-10 h-10 rounded-full shadow-sm border border-sky-100 object-cover"
              width="40"
              height="40"
            />
            <div className="flex flex-col">
              <span className="font-extrabold text-lg text-slate-900 tracking-tight leading-tight">
                Nosso Dia
              </span>
              <span className="text-[10px] font-semibold text-sky-700 tracking-wider uppercase">
                Rotina Familiar
              </span>
            </div>
          </a>

          {/* Links Âncora Desktop */}
          <nav
            aria-label="Navegação Principal"
            className="hidden md:flex items-center gap-7 text-xs font-bold text-slate-600"
          >
            <a
              href="#como-funciona"
              className="hover:text-sky-700 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 rounded-lg px-2 py-1"
            >
              Como funciona
            </a>
            <a
              href="#recursos"
              className="hover:text-sky-700 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 rounded-lg px-2 py-1"
            >
              Recursos
            </a>
            <a
              href="#planos"
              className="hover:text-sky-700 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 rounded-lg px-2 py-1"
            >
              Planos
            </a>
            <a
              href="#duvidas"
              className="hover:text-sky-700 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 rounded-lg px-2 py-1"
            >
              Dúvidas
            </a>
          </nav>

          {/* Botões de Ação no Header Desktop */}
          <div className="hidden sm:flex items-center gap-3">
            <button
              type="button"
              onClick={handleLoginClick}
              className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-sky-800 hover:bg-sky-50/80 rounded-xl transition-all cursor-pointer border border-transparent hover:border-sky-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              Já sou cadastrado
            </button>
            <button
              type="button"
              onClick={handleHeroCtaClick}
              className="px-4.5 py-2 text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <span>Testar Grátis</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>

          {/* Botão Menu Hambúrguer Mobile */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500"
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Fechar menu de navegação' : 'Abrir menu de navegação'}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" aria-hidden="true" />
            ) : (
              <Menu className="w-6 h-6" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Menu Colapsável Mobile */}
        {mobileMenuOpen && (
          <div
            id="mobile-navigation"
            className="md:hidden bg-white border-b border-sky-100 px-4 pt-3 pb-6 space-y-3 animate-in slide-in-from-top-2 duration-150"
          >
            <nav className="flex flex-col space-y-2">
              <a
                href="#como-funciona"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 px-3 rounded-xl text-sm font-semibold text-slate-700 hover:bg-sky-50 hover:text-sky-800"
              >
                Como funciona
              </a>
              <a
                href="#recursos"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 px-3 rounded-xl text-sm font-semibold text-slate-700 hover:bg-sky-50 hover:text-sky-800"
              >
                Recursos
              </a>
              <a
                href="#planos"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 px-3 rounded-xl text-sm font-semibold text-slate-700 hover:bg-sky-50 hover:text-sky-800"
              >
                Planos
              </a>
              <a
                href="#duvidas"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 px-3 rounded-xl text-sm font-semibold text-slate-700 hover:bg-sky-50 hover:text-sky-800"
              >
                Dúvidas frequentes
              </a>
            </nav>

            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleLoginClick}
                className="w-full py-2.5 text-center text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Já sou cadastrado (Entrar)
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleHeroCtaClick();
                }}
                className="w-full py-2.5 text-center text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Experimente grátis por 14 dias</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        {/* ============================================================================== */}
        {/* SEÇÃO 2 — HERO SECTION                                                        */}
        {/* ============================================================================== */}
        <section
          ref={heroRef}
          aria-labelledby="hero-heading"
          className="relative pt-10 pb-16 sm:pt-16 sm:pb-24 overflow-hidden"
        >
          {/* Fundo suave com degradê sutil */}
          <div className="absolute inset-0 bg-gradient-to-b from-sky-50/50 via-[#F4F8FA] to-[#F4F8FA] pointer-events-none -z-10" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
              {/* Coluna Texto / Copy do Hero */}
              <div className="lg:col-span-7 text-center lg:text-left space-y-5">
                {/* HeroBadge */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-100/90 border border-sky-200 text-sky-800 text-xs font-bold shadow-2xs">
                  <Sparkles className="w-3.5 h-3.5 text-sky-700" aria-hidden="true" />
                  <span>A central inteligente da rotina familiar</span>
                </div>

                {/* Título Principal Único (h1) */}
                <h1
                  id="hero-heading"
                  className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-[1.15]"
                >
                  Sua família sabe exatamente o que acontece esta semana?
                </h1>

                {/* Subtítulo */}
                <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto lg:mx-0 font-normal">
                  Chega de desencontros e sobrecarga. Organize atividades escolares, treinos e
                  caronas em uma visão semanal clara, com responsáveis definidos.
                </p>

                {/* CTA Primário & Microcopy */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                  <button
                    type="button"
                    onClick={handleHeroCtaClick}
                    className="w-full sm:w-auto px-7 py-3.5 bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-sm rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 transform active:scale-95"
                  >
                    <span>Experimente grátis por 14 dias</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </button>

                  <button
                    type="button"
                    onClick={handleLoginClick}
                    className="w-full sm:w-auto px-5 py-3.5 text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 font-bold text-xs rounded-2xl transition-all cursor-pointer shadow-2xs"
                  >
                    Acessar minha conta
                  </button>
                </div>

                {/* Microcopy Acolhedor */}
                <div className="flex items-center justify-center lg:justify-start gap-2 text-xs font-semibold text-slate-500">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-700 shrink-0" aria-hidden="true" />
                  <span>Sem cartão de crédito · Instale no celular como app (PWA)</span>
                </div>
              </div>

              {/* Coluna Visual Hero: Card da Grade Semanal Ilustrativa */}
              <div className="lg:col-span-5 relative">
                <div className="relative mx-auto max-w-md lg:max-w-none">
                  {/* Card Ilustrativo da Grade Semanal */}
                  <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-xl border border-sky-100 relative z-10 transition-transform duration-300 hover:shadow-2xl">
                    {/* Header do Card Ilustrativo */}
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center text-sky-700 font-bold text-sm">
                          <CalendarDays className="w-5 h-5 text-sky-700" aria-hidden="true" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">Nossa Semana em Foco</p>
                          <p className="text-[11px] font-medium text-slate-400">
                            Segunda a Sexta · 4 membros
                          </p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-700" aria-hidden="true" />
                        Tudo alinhado
                      </span>
                    </div>

                    {/* Simulação de Atividades Didáticas Sem Nomes Reais de Crianças */}
                    <div className="mt-4 space-y-3">
                      {/* Atividade 1 */}
                      <div className="p-3 rounded-2xl bg-sky-50/60 border border-sky-100 transition-colors">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-1">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-sky-600" />
                            Atividade 1 — Escola (Entrada)
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" aria-hidden="true" />
                            07:30
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" aria-hidden="true" />
                            Colégio Principal
                          </span>
                          <span className="font-semibold text-sky-800 bg-white px-2 py-0.5 rounded-lg border border-sky-100">
                            Responsável: Adulto A
                          </span>
                        </div>
                      </div>

                      {/* Atividade 2 */}
                      <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-100 transition-colors">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-1">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-600" />
                            Atividade 2 — Treino Esportivo
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" aria-hidden="true" />
                            15:30
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" aria-hidden="true" />
                            Clube / Ginásio
                          </span>
                          <span className="font-semibold text-amber-900 bg-white px-2 py-0.5 rounded-lg border border-amber-100">
                            Responsável: Adulto B
                          </span>
                        </div>
                      </div>

                      {/* Atividade 3 */}
                      <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-100 transition-colors">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-1">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-600" />
                            Atividade 3 — Natação Infantil
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" aria-hidden="true" />
                            18:00
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" aria-hidden="true" />
                            Academia Aquática
                          </span>
                          <span className="font-semibold text-emerald-800 bg-white px-2 py-0.5 rounded-lg border border-emerald-100">
                            Responsável: Adulto A
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Rodapé do Card Ilustrativo */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="flex items-center gap-1 text-slate-600 font-medium">
                        <HeartHandshake className="w-3.5 h-3.5 text-sky-600" aria-hidden="true" />
                        Logística compartilhada com tranquilidade
                      </span>
                      <span className="font-bold text-sky-700">0 conflitos</span>
                    </div>
                  </div>

                  {/* Detalhe de fundo flutuante decorativo */}
                  <div className="absolute -bottom-4 -right-4 w-48 h-48 bg-sky-200/40 rounded-full blur-2xl -z-0 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================================== */}
        {/* SEÇÃO 3 — A DOR                                                               */}
        {/* ============================================================================== */}
        <section
          id="como-funciona"
          aria-labelledby="dor-heading"
          className="py-16 sm:py-20 bg-white border-y border-sky-100/60"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
              <span className="text-xs font-bold text-sky-700 uppercase tracking-wider bg-sky-50 px-3 py-1 rounded-full border border-sky-100">
                O Desafio do Dia a Dia
              </span>
              <h2
                id="dor-heading"
                className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight mt-3 leading-snug"
              >
                A vida familiar é cheia de amor, mas a logística pode ser um caos.
              </h2>
              <p className="text-sm sm:text-base text-slate-600 mt-3">
                Quando a rotina da casa vive dispersa em mensagens de texto, post-its e memória
                mental, o estresse se instala antes mesmo do dia começar.
              </p>
            </div>

            {/* 3 Cards com Tom Acolhedor */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              {/* Card 1 */}
              <div className="bg-[#F4F8FA] rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-2xs hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-2xl bg-amber-100/90 text-amber-900 flex items-center justify-center mb-5">
                  <FileQuestion className="w-6 h-6 text-amber-800" aria-hidden="true" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  Recados escolares esquecidos
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Datas de provas, uniformes de eventos, autorizações de passeios e cronogramas
                  perdidos no fundo da mochila ou no mar de conversas do WhatsApp.
                </p>
              </div>

              {/* Card 2 */}
              <div className="bg-[#F4F8FA] rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-2xs hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-2xl bg-sky-100/90 text-sky-900 flex items-center justify-center mb-5">
                  <Car className="w-6 h-6 text-sky-800" aria-hidden="true" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">Desencontro de caronas</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Dúvidas de última hora sobre quem leva, quem busca na natação, qual o horário exato
                  e a correria causada por desencontros no trânsito do final de tarde.
                </p>
              </div>

              {/* Card 3 */}
              <div className="bg-[#F4F8FA] rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-2xs hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100/90 text-emerald-900 flex items-center justify-center mb-5">
                  <BrainCircuit className="w-6 h-6 text-emerald-800" aria-hidden="true" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  Sobrecarga mental concentrada
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Um dos parceiros precisando carregar toda a coordenação mental sozinho, cobrando
                  lembretes e sofrendo com a exaustão da carga invisível do lar.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================================== */}
        {/* SEÇÃO 4 — COMO RESOLVE (Os Três Pilares)                                      */}
        {/* ============================================================================== */}
        <section aria-labelledby="pilares-heading" className="py-16 sm:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-14">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                Solução Estruturada
              </span>
              <h2
                id="pilares-heading"
                className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight mt-3"
              >
                Três pilares para uma rotina semanal leve e previsível
              </h2>
              <p className="text-sm sm:text-base text-slate-600 mt-2">
                O Nosso Dia foi desenhado com base na realidade dinâmica de quem educa e cuida.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Pilar 1 */}
              <div className="bg-white rounded-3xl p-7 border border-sky-100 shadow-sm flex flex-col">
                <div className="w-12 h-12 rounded-2xl bg-sky-100 flex items-center justify-center text-sky-800 mb-5 font-black text-base">
                  1
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Semana em foco</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed flex-1">
                  Visão viva em ciclos de 7 dias (segunda a domingo). Você bate o olho e enxerga
                  imediatamente todos os compromissos da casa com seus horários e locais, sem telas
                  congestionadas.
                </p>
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-bold text-sky-700">
                  <CalendarDays className="w-4 h-4" aria-hidden="true" />
                  <span>Visão de segunda a domingo</span>
                </div>
              </div>

              {/* Pilar 2 */}
              <div className="bg-white rounded-3xl p-7 border border-sky-100 shadow-sm flex flex-col">
                <div className="w-12 h-12 rounded-2xl bg-sky-100 flex items-center justify-center text-sky-800 mb-5 font-black text-base">
                  2
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Responsabilidade definida por compromisso
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed flex-1">
                  Cada atividade indica com clareza quem é o adulto responsável por viabilizar
                  (quem leva, quem busca e quem acompanha). Fim dos desencontros e do &quot;achei que era
                  você&quot;.
                </p>
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-bold text-sky-700">
                  <Users className="w-4 h-4" aria-hidden="true" />
                  <span>Papéis e responsáveis visíveis</span>
                </div>
              </div>

              {/* Pilar 3 */}
              <div className="bg-white rounded-3xl p-7 border border-sky-100 shadow-sm flex flex-col">
                <div className="w-12 h-12 rounded-2xl bg-sky-100 flex items-center justify-center text-sky-800 mb-5 font-black text-base">
                  3
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Alertas antes dos conflitos
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed flex-1">
                  O sistema identifica proativamente se o mesmo adulto possui dois compromissos
                  agendados para o mesmo turno e destaca atividades que ainda não têm responsável
                  atribuído.
                </p>
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-bold text-sky-700">
                  <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                  <span>Detecção proativa de choque de agenda</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================================== */}
        {/* SEÇÃO 5 — RECURSOS                                                            */}
        {/* ============================================================================== */}
        <section
          id="recursos"
          aria-labelledby="recursos-heading"
          className="py-16 sm:py-20 bg-white border-y border-sky-100/60"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-14">
              <span className="text-xs font-bold text-sky-700 uppercase tracking-wider bg-sky-50 px-3 py-1 rounded-full border border-sky-100">
                Funcionalidades Completas
              </span>
              <h2
                id="recursos-heading"
                className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight mt-3"
              >
                Tecnologia acolhedora feita para o ritmo da sua casa
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Recurso 1 */}
              <div className="p-6 rounded-3xl bg-[#F4F8FA] border border-slate-200/80 hover:border-sky-300 transition-colors">
                <div className="w-11 h-11 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center mb-4">
                  <LayoutGrid className="w-5 h-5 text-sky-700" aria-hidden="true" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">Kanban semanal interativo</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Arraste e solte atividades entre os dias com facilidade. Filtre por membro da
                  família com um único clique no avatar.
                </p>
              </div>

              {/* Recurso 2 */}
              <div className="p-6 rounded-3xl bg-[#F4F8FA] border border-slate-200/80 hover:border-sky-300 transition-colors">
                <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center mb-4">
                  <Sunrise className="w-5 h-5 text-amber-800" aria-hidden="true" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  Briefing matinal personalizado
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Card diário que resume suas missões do dia, horários de saída e o que o parceiro
                  assumiu, trazendo paz de espírito.
                </p>
              </div>

              {/* Recurso 3 */}
              <div className="p-6 rounded-3xl bg-[#F4F8FA] border border-slate-200/80 hover:border-sky-300 transition-colors">
                <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center mb-4">
                  <Sparkles className="w-5 h-5 text-emerald-800" aria-hidden="true" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  Captura com IA (texto, voz ou foto)
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Grave um áudio falando o compromisso ou tire foto do bilhete escolar. O assistente
                  extrai data, hora e responsável automaticamente.
                </p>
              </div>

              {/* Recurso 4 */}
              <div className="p-6 rounded-3xl bg-[#F4F8FA] border border-slate-200/80 hover:border-sky-300 transition-colors">
                <div className="w-11 h-11 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center mb-4">
                  <BellRing className="w-5 h-5 text-sky-700" aria-hidden="true" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  Lembretes e notificações locais
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Avisos programáveis de 5 a 30 minutos antes de cada compromisso, alertando
                  diretamente no navegador e no smartphone.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================================== */}
        {/* SEÇÃO 6 — PLANOS (#planos)                                                    */}
        {/* ============================================================================== */}
        <section id="planos" aria-labelledby="planos-heading" className="py-16 sm:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-14">
              <span className="text-xs font-bold text-sky-700 uppercase tracking-wider bg-sky-50 px-3 py-1 rounded-full border border-sky-100">
                Planos Transparentes
              </span>
              <h2
                id="planos-heading"
                className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight mt-3"
              >
                Comece grátis e escolha o melhor plano para sua casa
              </h2>
              <p className="text-sm sm:text-base text-slate-600 mt-2">
                14 dias de teste completo sem cartão de crédito em qualquer plano.
              </p>

              {/* Aviso suave se estiver em fallback local */}
              {plansErrorFallback && (
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                  <span>Exibindo catálogo oficial de planos</span>
                </div>
              )}
            </div>

            {/* Renderização dos Cards: Skeleton ou Lista */}
            {plansLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="bg-white rounded-3xl p-6 border border-slate-200 animate-pulse space-y-4"
                  >
                    <div className="h-6 bg-slate-200 rounded-lg w-2/3" />
                    <div className="h-10 bg-slate-200 rounded-lg w-1/2" />
                    <div className="h-8 bg-slate-100 rounded-lg w-full" />
                    <div className="space-y-2 pt-4">
                      <div className="h-4 bg-slate-100 rounded w-full" />
                      <div className="h-4 bg-slate-100 rounded w-4/5" />
                      <div className="h-4 bg-slate-100 rounded w-3/4" />
                    </div>
                    <div className="h-11 bg-slate-200 rounded-xl w-full mt-6" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
                {plans.map((p) => {
                  const isProIa = p.slug === 'pro-ia' || p.isPopular;
                  const isTrial = p.slug === 'trial' || p.price_cents === 0;

                  return (
                    <div
                      key={p.id}
                      className={`relative bg-white rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-200 ${
                        isProIa
                          ? 'border-2 border-sky-600 shadow-xl ring-2 ring-sky-600/10'
                          : 'border border-sky-100 shadow-sm hover:shadow-md'
                      }`}
                    >
                      {/* Badge "Mais Escolhido" ou Destaque */}
                      {p.badge && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                          <span
                            className={`px-3 py-1 rounded-full text-[10px] font-black tracking-wide uppercase shadow-2xs ${
                              isProIa
                                ? 'bg-sky-600 text-white'
                                : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            }`}
                          >
                            {p.badge}
                          </span>
                        </div>
                      )}

                      <div>
                        {/* Nome do Plano */}
                        <div className="pt-2">
                          <h3 className="text-lg font-black text-slate-900 leading-tight">
                            {p.name}
                          </h3>
                          <p className="text-xs text-slate-500 mt-1">
                            {isTrial
                              ? 'Degustação completa sem custo'
                              : p.billing_interval === 'YEARLY'
                              ? 'Faturamento anual inteligente'
                              : 'Mensalidade familiar'}
                          </p>
                        </div>

                        {/* Preço Formatado */}
                        <div className="my-5">
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black text-slate-900">
                              {formatPlanPrice(p.price_cents, p.billing_interval)}
                            </span>
                          </div>
                          {p.discountNote && (
                            <p className="text-[11px] font-bold text-emerald-800 mt-1">
                              {p.discountNote}
                            </p>
                          )}
                        </div>

                        {/* Créditos de IA em Destaque */}
                        <div className="mb-4 p-2.5 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-sky-900">
                            <Zap className="w-3.5 h-3.5 text-sky-700" aria-hidden="true" />
                            <span>
                              {p.monthly_ai_credits && p.monthly_ai_credits > 0
                                ? `${p.monthly_ai_credits} Créditos de IA / mês`
                                : 'Sem créditos de IA'}
                            </span>
                          </div>
                        </div>

                        {/* Selos de Mídias Suportadas */}
                        {p.allowed_ai_modalities && p.allowed_ai_modalities.length > 0 && (
                          <div className="mb-5 flex flex-wrap gap-1.5">
                            {p.allowed_ai_modalities.includes('TEXT') && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                                <FileText className="w-3 h-3 text-slate-500" aria-hidden="true" />
                                Texto
                              </span>
                            )}
                            {p.allowed_ai_modalities.includes('AUDIO') && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                                <Mic className="w-3 h-3 text-slate-500" aria-hidden="true" />
                                Voz
                              </span>
                            )}
                            {p.allowed_ai_modalities.includes('IMAGE') && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                                <Camera className="w-3 h-3 text-slate-500" aria-hidden="true" />
                                Fotos
                              </span>
                            )}
                            {p.allowed_ai_modalities.includes('PDF') && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                                <FileCheck className="w-3 h-3 text-slate-500" aria-hidden="true" />
                                PDFs
                              </span>
                            )}
                          </div>
                        )}

                        {/* Lista de Features */}
                        <div className="pt-2 border-t border-slate-100">
                          <ul className="space-y-2.5 text-xs text-slate-600">
                            {p.features.map((feat, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <CheckCircle2
                                  className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5"
                                  aria-hidden="true"
                                />
                                <span className="leading-snug">{feat}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Botão de Ação do Plano */}
                      <div className="mt-7">
                        <button
                          type="button"
                          onClick={() => handlePlanCtaClick(p)}
                          className={`w-full py-3 px-4 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                            isProIa
                              ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-md hover:shadow-lg'
                              : 'bg-slate-100 hover:bg-sky-50 text-slate-800 hover:text-sky-800 border border-slate-200 hover:border-sky-200'
                          }`}
                        >
                          <span>{isTrial ? 'Experimentar 14 Dias' : 'Escolher este Plano'}</span>
                          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ============================================================================== */}
        {/* SEÇÃO 7 — PRIVACIDADE & LGPD                                                  */}
        {/* ============================================================================== */}
        <section aria-labelledby="privacidade-heading" className="py-12 sm:py-16 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl p-6 sm:p-8 bg-sky-50/70 border border-sky-200 flex flex-col sm:flex-row items-start gap-5 shadow-2xs">
              <div className="w-12 h-12 rounded-2xl bg-white text-sky-800 flex items-center justify-center shadow-xs shrink-0 border border-sky-100">
                <ShieldCheck className="w-6 h-6 text-sky-700" aria-hidden="true" />
              </div>
              <div className="space-y-2">
                <h2
                  id="privacidade-heading"
                  className="text-base sm:text-lg font-bold text-slate-900"
                >
                  Privacidade, Segurança e Conformidade com a LGPD
                </h2>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                  Os dados da sua família são protegidos por criptografia e controles de acesso por
                  linha no banco de dados. Trabalhamos para que a rotina dos seus filhos seja visível
                  apenas para a sua família.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => openPrivacyModal('privacy')}
                    className="inline-flex items-center gap-1 text-xs font-bold text-sky-800 hover:text-sky-950 underline underline-offset-4 cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500 rounded"
                  >
                    <span>Ler Política de Privacidade completa [PENDENTE REVISÃO JURÍDICA]</span>
                    <ExternalLink className="w-3 h-3" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================================== */}
        {/* SEÇÃO 8 — FAQ (Acordeão acessível, 5 perguntas)                               */}
        {/* ============================================================================== */}
        <section id="duvidas" aria-labelledby="faq-heading" className="py-16 sm:py-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <span className="text-xs font-bold text-sky-700 uppercase tracking-wider bg-sky-50 px-3 py-1 rounded-full border border-sky-100">
                Tire suas dúvidas
              </span>
              <h2
                id="faq-heading"
                className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight mt-3"
              >
                Perguntas Frequentes
              </h2>
            </div>

            <div className="space-y-3">
              {faqItems.map((item, index) => {
                const isOpen = openFaqIndices.includes(index);
                const buttonId = `faq-btn-${index}`;
                const panelId = `faq-panel-${index}`;

                return (
                  <div
                    key={index}
                    className="bg-white rounded-2xl border border-sky-100/90 shadow-2xs overflow-hidden transition-all"
                  >
                    <button
                      type="button"
                      id={buttonId}
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => toggleFaq(index)}
                      className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-sm sm:text-base text-slate-900 hover:text-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors cursor-pointer"
                    >
                      <span>{item.q}</span>
                      <ChevronDown
                        className={`w-5 h-5 text-slate-400 transition-transform duration-200 shrink-0 ${
                          isOpen ? 'rotate-180 text-sky-700' : ''
                        }`}
                        aria-hidden="true"
                      />
                    </button>
                    {isOpen && (
                      <div
                        id={panelId}
                        role="region"
                        aria-labelledby={buttonId}
                        className="px-5 pb-5 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-50 pt-3"
                      >
                        <p>{item.a}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      {/* ============================================================================== */}
      {/* SEÇÃO 9 — RODAPÉ                                                               */}
      {/* ============================================================================== */}
      <footer
        ref={footerRef}
        className="py-10 border-t border-sky-100 bg-white text-xs text-slate-500 mt-auto"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
            <div className="flex items-center gap-2">
              <img
                src="/icons/logo-round-1024.png"
                alt="Logo Nosso Dia"
                className="w-6 h-6 rounded-full object-cover"
                width="24"
                height="24"
              />
              <span className="font-extrabold text-slate-900 text-sm">Nosso Dia</span>
            </div>
            <span className="hidden sm:inline text-slate-300">·</span>
            <p>© 2026 Nosso Dia. Todos os direitos reservados.</p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold">
            <button
              type="button"
              onClick={() => openPrivacyModal('privacy')}
              className="text-slate-500 hover:text-sky-800 transition-colors cursor-pointer"
            >
              Política de Privacidade
            </button>
            <span className="text-slate-300">·</span>
            <button
              type="button"
              onClick={() => openPrivacyModal('terms')}
              className="text-slate-500 hover:text-sky-800 transition-colors cursor-pointer"
            >
              Termos de Uso
            </button>
          </div>

          <div className="text-center md:text-right">
            <p className="text-[11px] text-slate-400">
              Desenvolvido pela{' '}
              <strong className="text-slate-600 font-bold">Software House Agêntica</strong>
            </p>
          </div>
        </div>
      </footer>

      {/* ============================================================================== */}
      {/* BARRA INFERIOR FIXA NO MOBILE (Sticky CTA)                                     */}
      {/* ============================================================================== */}
      {showStickyCta && (
        <aside
          aria-label="Ação rápida no celular"
          className="sm:hidden fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-sky-200 shadow-2xl z-40 animate-in slide-in-from-bottom-3 duration-200"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-xs font-black text-slate-900 leading-tight">14 dias grátis</span>
              <span className="text-[10px] text-slate-500">Sem cartão de crédito</span>
            </div>
            <button
              type="button"
              onClick={handleHeroCtaClick}
              className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <span>Experimente grátis</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </aside>
      )}

      {/* ============================================================================== */}
      {/* MODAL DE POLÍTICA DE PRIVACIDADE E TERMOS DE USO [PENDENTE REVISÃO JURÍDICA]    */}
      {/* ============================================================================== */}
      {privacyModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="legal-modal-title"
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-sky-100">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 id="legal-modal-title" className="text-lg font-bold text-slate-900">
                  {privacyModalType === 'privacy'
                    ? 'Política de Privacidade & Proteção de Dados'
                    : 'Termos de Uso da Plataforma'}
                </h3>
                <span className="inline-block mt-1 text-[11px] font-bold text-amber-900 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                  [PENDENTE REVISÃO JURÍDICA]
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPrivacyModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Fechar modal"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto text-xs text-slate-600 space-y-4 leading-relaxed">
              <p>
                <strong>1. Compromisso com a Família e LGPD:</strong> O Nosso Dia tem como princípio
                fundamental a privacidade dos dados de crianças, pais e responsáveis. Todas as
                informações cadastradas são processadas estritamente para a finalidade de
                coordenação da rotina doméstica.
              </p>
              <p>
                <strong>2. Isolamento de Dados (Row Level Security):</strong> Os registros de
                atividades escolares, locais, nomes e contatos são estritamente isolados no banco de
                dados PostgreSQL através de políticas de RLS, garantindo que nenhum terceiro ou outra
                família possa ler ou inferir a rotina da sua casa.
              </p>
              <p>
                <strong>3. Uso de Inteligência Artificial:</strong> As mensagens de texto, gravações de
                áudio e fotografias enviadas para o recurso de captura rápida são processadas de
                forma efêmera unicamente para estruturar os dados do calendário e nunca são utilizadas
                para treinamento público de modelos ou comercializadas com anunciantes.
              </p>
              <p>
                <strong>4. Período de Degustação e Cancelamento:</strong> O período de teste de 14
                dias é concedido de forma irrevogável e sem cobrança automática posterior sem o
                consentimento explícito do titular da conta.
              </p>
              <p className="text-[11px] text-slate-400 italic">
                Nota: Esta minuta encontra-se em estágio técnico de desenvolvimento e está marcada
                como [PENDENTE REVISÃO JURÍDICA] até a chancela de assessoria legal especializada em
                Direito Digital e Proteção de Dados (LGPD).
              </p>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setPrivacyModalOpen(false)}
                className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Compreendi e Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
