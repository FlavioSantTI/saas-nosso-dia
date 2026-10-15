import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Search, X, Calendar, MapPin, User, Cake, Clock, ArrowRight } from 'lucide-react';

export interface CalendarSearchResult {
  item_id: string;
  item_type: 'EVENT' | 'BIRTHDAY';
  title: string;
  event_date: string;
  event_date_formatted: string;
  day_of_week: string;
  time_local: string;
  location_name: string | null;
  responsible_name: string | null;
  participants: Array<{ id: string; name: string; color: string }>;
  days_diff: number;
}

interface CalendarSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  familyId: string;
  onSelectDate: (dateStr: string) => void;
}

export const CalendarSearchModal: React.FC<CalendarSearchModalProps> = ({
  isOpen,
  onClose,
  familyId,
  onSelectDate
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<CalendarSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearchTerm('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const executeSearch = async (term: string) => {
    const cleanTerm = term.trim();
    if (!cleanTerm) {
      setResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const { data, error } = await supabase.rpc('rpc_search_family_calendar', {
        p_family_id: familyId,
        p_query: cleanTerm
      });

      if (!error && Array.isArray(data)) {
        setResults(data as CalendarSearchResult[]);
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error('Erro na busca do calendário:', err);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleChipClick = (term: string) => {
    setSearchTerm(term);
    executeSearch(term);
  };

  const handleItemClick = (dateStr: string) => {
    onSelectDate(dateStr);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-start justify-center p-4 pt-12 sm:pt-20 z-50 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-xl w-full p-5 shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]"
      >
        <div className="relative flex items-center border-b border-slate-200 pb-3 mb-3">
          <Search className="w-5 h-5 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              executeSearch(e.target.value);
            }}
            placeholder="Buscar atividade por título (ex: Voleibol, Unimed, Aniversário)..."
            className="w-full pl-10 pr-10 py-2.5 text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-hidden"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setResults([]);
                inputRef.current?.focus();
              }}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg absolute right-2 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {!searchTerm && (
          <div className="mb-4">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Atalhos rápidos para dúvidas frequentes:
            </p>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleChipClick('aniversário')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
              >
                <Cake className="w-3.5 h-3.5 text-amber-600" />
                <span>Aniversários da Família</span>
              </button>

              <button
                type="button"
                onClick={() => handleChipClick('Voleibol')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-sky-50 text-sky-900 border border-sky-200 hover:bg-sky-100 transition-colors cursor-pointer"
              >
                <span>🏐 Voleibol</span>
              </button>

              <button
                type="button"
                onClick={() => handleChipClick('Festa')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-50 text-purple-900 border border-purple-200 hover:bg-purple-100 transition-colors cursor-pointer"
              >
                <span>🎉 Festas & Eventos</span>
              </button>

              <button
                type="button"
                onClick={() => handleChipClick('Escola')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <span>🏫 Escola</span>
              </button>

              <button
                type="button"
                onClick={() => handleChipClick('Terapia')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                <span>🩺 Terapia / Consultas</span>
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {isSearching && (
            <div className="py-8 text-center text-xs text-slate-400 font-medium">
              Pesquisando atividades no calendário...
            </div>
          )}

          {!isSearching && searchTerm && results.length === 0 && (
            <div className="py-10 text-center text-xs text-slate-400 font-medium space-y-1">
              <p>Nenhuma atividade encontrada com o título "{searchTerm}".</p>
              <p className="text-[11px] text-slate-400">Tente buscar por parte do nome (ex: "unimed", "volei" ou "aniversário").</p>
            </div>
          )}

          {!isSearching &&
            results.map((item) => {
              const isBirthday = item.item_type === 'BIRTHDAY';
              const isToday = item.days_diff === 0;
              const isTomorrow = item.days_diff === 1;
              const isPast = item.days_diff < 0;

              return (
                <div
                  key={`${item.item_type}_${item.item_id}_${item.event_date}`}
                  onClick={() => handleItemClick(item.event_date)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 group ${
                    isBirthday
                      ? 'bg-amber-50/70 border-amber-200 hover:border-amber-300 hover:bg-amber-50'
                      : isPast
                      ? 'bg-slate-50/40 border-slate-200 opacity-75 hover:opacity-100 hover:bg-white'
                      : 'bg-white border-slate-200 hover:border-sky-300 shadow-2xs hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`p-2.5 rounded-xl shrink-0 ${
                        isBirthday
                          ? 'bg-amber-100 text-amber-700'
                          : isToday
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-sky-50 text-sky-700 border border-sky-100'
                      }`}
                    >
                      {isBirthday ? <Cake className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-slate-900 text-sm truncate">{item.title}</h4>

                        {isToday && (
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                            É HOJE! 🎯
                          </span>
                        )}
                        {isTomorrow && (
                          <span className="text-[10px] font-bold text-sky-800 bg-sky-100 px-2 py-0.5 rounded-full">
                            É amanhã
                          </span>
                        )}
                        {!isToday && !isTomorrow && item.days_diff > 1 && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isBirthday
                                ? 'text-amber-800 bg-amber-100'
                                : 'text-slate-600 bg-slate-100'
                            }`}
                          >
                            Em {item.days_diff} dias
                          </span>
                        )}
                        {isPast && (
                          <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            {item.days_diff === -1 ? 'Ontem' : `Há ${Math.abs(item.days_diff)} dias`}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 font-medium mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-slate-900">
                          {item.day_of_week}, {item.event_date_formatted}
                        </span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1 text-slate-500">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {item.time_local}
                        </span>
                        {item.location_name && (
                          <>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1 text-slate-500 truncate max-w-[150px]">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              {item.location_name}
                            </span>
                          </>
                        )}
                      </p>

                      <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500">
                        {item.responsible_name && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" />
                            Responsável: <strong className="text-slate-700">{item.responsible_name}</strong>
                          </span>
                        )}
                        {item.participants && item.participants.length > 0 && (
                          <span className="text-slate-400">
                            ({item.participants.map((p) => p.name).join(', ')})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 text-slate-400 group-hover:text-sky-600 group-hover:translate-x-0.5 transition-all">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              );
            })}
        </div>

        <div className="pt-3 border-t border-slate-100 mt-2 flex items-center justify-between text-[11px] text-slate-400">
          <span>Toque no resultado para abrir o dia diretamente no painel.</span>
          <span className="hidden sm:inline">ESC para fechar</span>
        </div>
      </div>
    </div>
  );
};

export default CalendarSearchModal;
