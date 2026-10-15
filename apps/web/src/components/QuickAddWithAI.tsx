import React, { useState, useRef } from 'react';
import { FamilyMember } from '../types';
import {
  extractRoutineWithGemini,
  getGeminiApiKey,
  ExtractedRoutineData
} from '../lib/gemini';
import {
  Sparkles,
  Mic,
  MicOff,
  Camera,
  X,
  AlertCircle,
  Loader2,
  Check
} from 'lucide-react';

interface QuickAddProps {
  isOpen: boolean;
  onClose: () => void;
  members: FamilyMember[];
  family?: any;
  onOpenUpgrade?: () => void;
  onConfirmAdd: (data: ExtractedRoutineData) => void;
}

export const QuickAddWithAI: React.FC<QuickAddProps> = ({
  isOpen,
  onClose,
  members,
  onConfirmAdd
}) => {
  const [inputText, setInputText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Foto do Bilhete / Calendário
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ditado por Voz (Web Speech API)
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Prévia Estruturada
  const [parsedPreview, setParsedPreview] = useState<ExtractedRoutineData | null>(null);

  if (!isOpen) return null;

  const toggleListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('O reconhecimento de voz não é suportado por este navegador. Digite o texto normalmente.');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'pt-BR';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
      };

      recognition.onerror = (event: any) => {
        console.error('Erro no microfone:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Falha ao iniciar microfone:', err);
      setIsListening(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert('A imagem é muito grande. Escolha uma foto de até 8MB.');
      return;
    }

    setImageMimeType(file.type || 'image/jpeg');
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImagePreview(result);
      const base64Data = result.split(',')[1];
      setImageBase64(base64Data);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setImageBase64(null);
    setImageMimeType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExtractWithGemini = async () => {
    setErrorMessage(null);

    const activeKey = await getGeminiApiKey();
    if (!activeKey) {
      setErrorMessage(
        'O assistente de IA está temporariamente indisponível. Solicite a ativação ao administrador da plataforma.'
      );
      return;
    }

    if (!inputText.trim() && !imageBase64) {
      setErrorMessage('Digite uma mensagem, grave um áudio ou anexe uma foto de bilhete.');
      return;
    }

    try {
      setIsParsing(true);
      const data = await extractRoutineWithGemini(
        inputText,
        imageBase64,
        imageMimeType,
        members
      );
      setParsedPreview(data);
    } catch (err: any) {
      console.error('Erro na extração com IA:', err);
      setErrorMessage(err?.message || 'Falha ao processar com a IA.');
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-50 text-[#EA580C] rounded-xl border border-amber-200">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Captura Inteligente com IA</h2>
              <p className="text-[11px] text-slate-500 font-medium">Google Gemini 2.0 / 2.5 Flash Multimodal</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold text-lg p-1.5 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-slate-500 mb-3 leading-relaxed">
          Cole a mensagem do WhatsApp, fale pelo microfone ou anexe a foto do bilhete escolar. A IA identificará o horário, o filho e o responsável.
        </p>

        <div className="relative">
          <textarea
            rows={3}
            maxLength={1500}
            value={inputText}
            onChange={(e) => setInputText(e.target.value.slice(0, 1500))}
            placeholder="Ex: Rafael tem natação terça e quinta às 18h no clube, eu levo"
            className="w-full text-sm p-3.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-sky-500 focus:outline-hidden pr-20 bg-slate-50/50"
          />

          <div className="absolute right-2.5 bottom-3.5 flex items-center gap-1">
            <button
              type="button"
              onClick={toggleListening}
              title={isListening ? 'Parar gravação' : 'Ditar por voz (Microfone)'}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                isListening
                  ? 'bg-rose-500 text-white animate-pulse shadow-md'
                  : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
              }`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              capture="environment"
              onChange={handleImageSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Tirar foto do bilhete escolar"
              className="p-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors cursor-pointer"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>
        </div>

        {imagePreview && (
          <div className="mt-2.5 p-2 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={imagePreview}
                alt="Foto do bilhete"
                className="w-12 h-12 object-cover rounded-xl border border-slate-200 shrink-0"
              />
              <div className="min-w-0 text-xs">
                <p className="font-bold text-slate-800 truncate">Foto do bilhete anexada</p>
                <p className="text-[11px] text-slate-400">A IA lerá o texto da foto</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRemoveImage}
              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
              title="Remover foto"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1 px-1">
          <span>{isListening ? '🎙️ Ouvindo... Fale agora.' : 'Dica: Mencione quem leva e o horário'}</span>
          <span>{inputText.length}/1500 caracteres</span>
        </div>

        {errorMessage && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {!parsedPreview && (
          <button
            type="button"
            onClick={handleExtractWithGemini}
            disabled={isParsing || (!inputText.trim() && !imageBase64)}
            className="w-full mt-3 py-3 bg-[#0284C7] hover:bg-sky-700 text-white font-bold rounded-2xl text-xs transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isParsing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analisando com Gemini 1.5 Flash...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Interpretar Rotina com IA</span>
              </>
            )}
          </button>
        )}

        {parsedPreview && (
          <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600" />
                Confirmação dos Dados Extraídos
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Você pode ajustar antes de salvar</span>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Atividade:</label>
              <input
                type="text"
                maxLength={120}
                value={parsedPreview.title}
                onChange={(e) => setParsedPreview({ ...parsedPreview, title: e.target.value.slice(0, 120) })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-sky-500 font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Participante (Filho):</label>
                <select
                  value={parsedPreview.participant?.id}
                  onChange={(e) => {
                    const sel = members.find((m) => m.id === e.target.value);
                    if (sel) {
                      setParsedPreview({
                        ...parsedPreview,
                        participant: sel,
                        participants: [sel]
                      });
                    }
                  }}
                  className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nickname || m.name} ({m.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Responsável (Leva/Busca):</label>
                <select
                  value={parsedPreview.responsible?.id}
                  onChange={(e) => {
                    const sel = members.find((m) => m.id === e.target.value);
                    if (sel) setParsedPreview({ ...parsedPreview, responsible: sel });
                  }}
                  className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nickname || m.name} ({m.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Horário de Início:</label>
                <input
                  type="time"
                  value={parsedPreview.time}
                  onChange={(e) =>
                    setParsedPreview({
                      ...parsedPreview,
                      time: e.target.value,
                      startTime: e.target.value
                    })
                  }
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-sky-500 font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Duração (minutos):</label>
                <input
                  type="number"
                  min={5}
                  max={480}
                  value={parsedPreview.duration}
                  onChange={(e) =>
                    setParsedPreview({
                      ...parsedPreview,
                      duration: Number(e.target.value) || 60
                    })
                  }
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Local:</label>
              <input
                type="text"
                maxLength={80}
                value={parsedPreview.location}
                onChange={(e) => setParsedPreview({ ...parsedPreview, location: e.target.value.slice(0, 80) })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  onConfirmAdd({
                    ...parsedPreview,
                    startTime: parsedPreview.time,
                    participants: [parsedPreview.participant]
                  });
                  onClose();
                }}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-colors shadow-2xs cursor-pointer"
              >
                Confirmar e Adicionar à Rotina
              </button>
              <button
                type="button"
                onClick={() => setParsedPreview(null)}
                className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Editar Texto
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
