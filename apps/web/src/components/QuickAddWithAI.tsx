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
  Loader2
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
      setInputText('');
      setImagePreview(null);
      setImageBase64(null);
      setImageMimeType(null);
      onConfirmAdd(data);
      onClose();
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

        <button
          type="button"
          onClick={handleExtractWithGemini}
          disabled={isParsing || (!inputText.trim() && !imageBase64)}
          className="w-full mt-3 py-3 bg-[#0284C7] hover:bg-sky-700 text-white font-bold rounded-2xl text-xs transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {isParsing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Analisando com IA...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Interpretar Rotina com IA</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
