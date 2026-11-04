import React, { useState, useRef } from 'react';
import { FamilyMember } from '../types';
import {
  extractRoutineWithGemini,
  getGeminiApiKey,
  ExtractedRoutineData
} from '../lib/gemini';
import {
  prepareAttachment,
  PreparedAttachment,
  ATTACHMENT_ACCEPT,
  formatFileSize
} from '../lib/documentExtract';
import {
  Sparkles,
  Mic,
  MicOff,
  Camera,
  Paperclip,
  FileText,
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

  // Anexo: foto do bilhete, PDF, DOC, DOCX, TXT ou MD
  const [attachment, setAttachment] = useState<PreparedAttachment | null>(null);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
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

  const resetInputs = () => {
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setIsReadingFile(true);
    try {
      const prepared = await prepareAttachment(file);
      setAttachment(prepared);
    } catch (err: any) {
      setAttachment(null);
      setErrorMessage(err?.message || 'Não foi possível ler o arquivo.');
    } finally {
      setIsReadingFile(false);
      resetInputs();
    }
  };

  const handleRemoveAttachment = () => {
    setAttachment(null);
    resetInputs();
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

    if (!inputText.trim() && !attachment) {
      setErrorMessage('Digite uma mensagem, grave um áudio ou anexe uma foto ou documento.');
      return;
    }

    try {
      setIsParsing(true);
      const data = await extractRoutineWithGemini(
        inputText,
        attachment?.base64 ?? null,
        attachment?.mimeType ?? null,
        members,
        attachment?.text ?? null,
        attachment?.fileName ?? null
      );
      setInputText('');
      setAttachment(null);
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
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:pb-6">
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-3 sm:hidden" aria-hidden="true" />
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-50 text-[#EA580C] rounded-xl border border-amber-200">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Captura Inteligente com IA</h2>
              <p className="text-[11px] text-slate-600 font-medium">Google Gemini 2.0 / 2.5 Flash Multimodal</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-500 hover:text-slate-700 font-bold text-lg p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <label htmlFor="quick-add-ai-input" className="block text-xs text-slate-600 mb-3 leading-relaxed">
          Cole a mensagem do WhatsApp, fale pelo microfone, tire uma foto do bilhete ou anexe um documento (PDF, DOC, DOCX, TXT, MD). A IA identificará o horário, o filho e o responsável.
        </label>

        <div className="relative">
          <textarea
            id="quick-add-ai-input"
            rows={4}
            maxLength={1500}
            value={inputText}
            onChange={(e) => setInputText(e.target.value.slice(0, 1500))}
            placeholder="Ex: Rafael tem natação terça e quinta às 18h no clube, eu levo"
            className="w-full text-base sm:text-sm p-3.5 pb-14 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-sky-500 focus:outline-hidden bg-slate-50/50"
          />

          <div className="absolute right-2.5 bottom-2.5 flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleListening}
              title={isListening ? 'Parar gravação' : 'Ditar por voz (Microfone)'}
              aria-label={isListening ? 'Parar gravação' : 'Ditar por voz'}
              className={`min-w-[42px] min-h-[42px] flex items-center justify-center p-2 rounded-xl transition-all cursor-pointer ${
                isListening
                  ? 'bg-rose-500 text-white animate-pulse shadow-md'
                  : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
              }`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <input
              type="file"
              ref={cameraInputRef}
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={isReadingFile}
              title="Tirar foto do bilhete escolar"
              aria-label="Tirar foto do bilhete escolar"
              className="min-w-[42px] min-h-[42px] flex items-center justify-center p-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Camera className="w-4 h-4" />
            </button>

            <input
              type="file"
              ref={fileInputRef}
              accept={ATTACHMENT_ACCEPT}
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isReadingFile}
              title="Anexar arquivo (foto, PDF, DOC, DOCX, TXT, MD)"
              aria-label="Anexar arquivo"
              className="min-w-[42px] min-h-[42px] flex items-center justify-center p-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isReadingFile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {attachment && (
          <div className="mt-2.5 p-2 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              {attachment.previewUrl ? (
                <img
                  src={attachment.previewUrl}
                  alt="Foto do bilhete"
                  className="w-12 h-12 object-cover rounded-xl border border-slate-200 shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl border border-sky-200 bg-sky-50 text-sky-700 flex flex-col items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                  <span className="text-[9px] font-bold uppercase">
                    {attachment.fileName.split('.').pop()?.slice(0, 4)}
                  </span>
                </div>
              )}
              <div className="min-w-0 text-xs">
                <p className="font-bold text-slate-800 truncate">
                  {attachment.kind === 'image' ? 'Foto anexada' : attachment.fileName}
                </p>
                <p className="text-[11px] text-slate-600">
                  {formatFileSize(attachment.sizeBytes)} · A IA lerá o conteúdo
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRemoveAttachment}
              className="min-w-[42px] min-h-[42px] flex items-center justify-center p-1.5 text-slate-500 hover:text-rose-600 rounded-lg cursor-pointer"
              title="Remover anexo"
              aria-label="Remover anexo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex justify-between items-center text-[11px] text-slate-600 mt-1.5 px-1">
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
          disabled={isParsing || isReadingFile || (!inputText.trim() && !attachment)}
          className="w-full min-h-[48px] mt-3 py-3 bg-[#0284C7] hover:bg-sky-700 text-white font-bold rounded-2xl text-sm transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
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
