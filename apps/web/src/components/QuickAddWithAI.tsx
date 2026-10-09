import React, { useState } from 'react';
import { FamilyMember } from '../types';
import { Bot, Sparkles, Check } from 'lucide-react';

interface QuickAddProps {
  isOpen: boolean;
  onClose: () => void;
  members: FamilyMember[];
  onConfirmAdd: (data: any) => void;
}

export const QuickAddWithAI: React.FC<QuickAddProps> = ({ isOpen, onClose, members, onConfirmAdd }) => {
  const [inputText, setInputText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<any>(null);

  if (!isOpen) return null;

  const handleSimulateExtraction = () => {
    setIsParsing(true);
    // Simulação do parser estruturado da LLM no MVP
    setTimeout(() => {
      setIsParsing(false);
      setParsedPreview({
        title: 'Natação do Rafael',
        participant: members.find((m) => m.name.toLowerCase().includes('rafael')) || members[0],
        responsible: members.find((m) => m.role === 'ADMIN') || members[0],
        time: '18:00',
        duration: 60,
        days: ['Terça', 'Quinta'],
        location: 'Clube'
      });
    }, 600);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-sky-100/80">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">Captura Rápida com IA</h2>
              <p className="text-xs text-slate-500">Transforme mensagens em rotinas organizadas</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg hover:bg-slate-100 cursor-pointer">✕</button>
        </div>

        <p className="text-xs text-slate-600 mb-3 leading-relaxed">
          Digite ou cole a rotina da forma que ela veio no WhatsApp ou e-mail. A IA organizará os campos para sua confirmação.
        </p>

        <textarea
          rows={3}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ex: Rafael tem natação terça e quinta às 18h no clube, eu levo"
          className="w-full text-sm p-3.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none transition-all resize-none font-medium"
        />

        {!parsedPreview && (
          <button
            type="button"
            onClick={handleSimulateExtraction}
            disabled={isParsing || !inputText.trim()}
            className="w-full mt-3.5 py-2.5 bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold rounded-xl text-xs transition-all shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isParsing ? 'Processando com IA...' : 'Interpretar Rotina'}</span>
          </button>
        )}

        {parsedPreview && (
          <div className="mt-4 p-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl text-xs space-y-2.5">
            <div className="font-bold text-slate-800 text-sm border-b border-slate-200/60 pb-1.5 flex items-center gap-1.5">
              <span>📋</span> Confirmação de Dados:
            </div>
            <div><strong>Atividade:</strong> {parsedPreview.title}</div>
            <div><strong>Participante:</strong> {parsedPreview.participant?.name}</div>
            <div><strong>Responsável pela ida:</strong> {parsedPreview.responsible?.name}</div>
            <div><strong>Horário:</strong> {parsedPreview.time} ({parsedPreview.duration} min)</div>
            <div><strong>Dias:</strong> {parsedPreview.days.join(', ')}</div>
            <div><strong>Local:</strong> {parsedPreview.location}</div>

            <div className="pt-3 flex gap-2 border-t border-slate-200/60">
              <button
                type="button"
                onClick={() => {
                  onConfirmAdd(parsedPreview);
                  onClose();
                }}
                className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                Confirmar e Salvar
              </button>
              <button
                type="button"
                onClick={() => setParsedPreview(null)}
                className="px-3.5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs border border-slate-200 transition-all cursor-pointer"
              >
                Editar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
