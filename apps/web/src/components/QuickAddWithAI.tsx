import React, { useState, useRef, useEffect } from 'react';
import { FamilyMember } from '../types';
import {
  parseTextRoutine,
  parseAudioRoutine,
  parseMediaRoutine,
  GeminiRoutineOutput,
} from '../lib/gemini';
import {
  Bot,
  Sparkles,
  Check,
  Mic,
  Square,
  Upload,
  Clock,
  MapPin,
  Calendar,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';

interface QuickAddProps {
  isOpen: boolean;
  onClose: () => void;
  members: FamilyMember[];
  onConfirmAdd: (data: any) => void;
}

type TabType = 'text' | 'audio' | 'media';

const DAY_LABELS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export const QuickAddWithAI: React.FC<QuickAddProps> = ({
  isOpen,
  onClose,
  members,
  onConfirmAdd,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('text');

  // Aba Texto
  const [inputText, setInputText] = useState('');

  // Aba Áudio / Gravação de Voz
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  // Aba Mídia / Arquivo
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Estado Geral de Processamento com IA
  const [isParsing, setIsParsing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [parsedResult, setParsedResult] = useState<GeminiRoutineOutput | null>(null);

  // Limpa estados ao fechar ou reabrir
  useEffect(() => {
    if (!isOpen) {
      if (isRecording) {
        stopRecording();
      }
      setParsedResult(null);
      setErrorMsg(null);
      setInputText('');
      setSelectedFile(null);
      setRecordingSeconds(0);
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (!isOpen) return null;

  // -------------------------------------------------------------
  // Helpers de Correspondência de Membros
  // -------------------------------------------------------------
  const findMemberByName = (name: string | null | undefined): FamilyMember | null => {
    if (!name) return null;
    const clean = name.toLowerCase().trim();
    return members.find((m) => m.name.toLowerCase().includes(clean)) || null;
  };

  const participantMember = parsedResult
    ? findMemberByName(parsedResult.participant_name) || members[0]
    : null;

  const responsibleMember = parsedResult
    ? findMemberByName(parsedResult.responsible_name)
    : null;

  // -------------------------------------------------------------
  // Ações de Extração com Gemini
  // -------------------------------------------------------------
  const handleExtractFromText = async () => {
    if (!inputText.trim()) return;
    setIsParsing(true);
    setErrorMsg(null);
    try {
      const data = await parseTextRoutine(inputText.trim());
      setParsedResult(data);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Falha ao processar texto com a IA.');
    } finally {
      setIsParsing(false);
    }
  };

  const startRecording = async () => {
    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        await processAudio(audioBlob);
      };

      recorder.start(100);
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Não foi possível acessar o microfone. Verifique as permissões do navegador.');
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const processAudio = async (blob: Blob) => {
    setIsParsing(true);
    setErrorMsg(null);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64 = reader.result as string;
          const data = await parseAudioRoutine(base64, blob.type || 'audio/webm');
          setParsedResult(data);
        } catch (err: any) {
          console.error(err);
          setErrorMsg(err.message || 'Falha ao interpretar áudio com o Gemini.');
        } finally {
          setIsParsing(false);
        }
      };
      reader.readAsDataURL(blob);
    } catch (err: any) {
      setIsParsing(false);
      setErrorMsg('Falha ao processar arquivo de áudio.');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setIsParsing(true);
    setErrorMsg(null);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64 = reader.result as string;
          const data = await parseMediaRoutine(base64, file.type);
          setParsedResult(data);
        } catch (err: any) {
          console.error(err);
          setErrorMsg(err.message || 'Falha ao interpretar documento com a IA.');
        } finally {
          setIsParsing(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setIsParsing(false);
      setErrorMsg('Falha ao ler o arquivo selecionado.');
    }
  };

  // -------------------------------------------------------------
  // Confirmação e Salvamento
  // -------------------------------------------------------------
  const handleConfirmAndSave = () => {
    if (!parsedResult) return;

    onConfirmAdd({
      title: parsedResult.title,
      type: parsedResult.is_routine ? 'RECURRING' : 'SINGLE',
      startTime: parsedResult.start_time || '18:00',
      time: parsedResult.start_time || '18:00',
      duration: parsedResult.duration_minutes || 60,
      days: parsedResult.days_of_week || [],
      date_str: parsedResult.date_str,
      location: parsedResult.location_name,
      locationName: parsedResult.location_name,
      responsible: responsibleMember,
      participant: participantMember,
      participants: participantMember ? [participantMember] : [],
      reminder_minutes: parsedResult.reminder_minutes,
      is_all_day: parsedResult.is_all_day,
    });

    onClose();
  };

  const formatTimer = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-sky-100/80 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-800 shadow-xs">
              <Bot className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight flex items-center gap-1.5">
                Captura Rápida Multimodal
                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                  Gemini IA
                </span>
              </h2>
              <p className="text-xs text-slate-500">Texto do WhatsApp, mensagem de voz ou foto/PDF</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Abas de Navegação */}
        {!parsedResult && (
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100/80 rounded-2xl mt-4 mb-4">
            <button
              type="button"
              onClick={() => setActiveTab('text')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'text'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <span>📝</span> Texto
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('audio')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'audio'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <span>🎙️</span> Gravar Voz
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('media')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'media'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <span>📸</span> Foto / PDF
            </button>
          </div>
        )}

        {/* Mensagem de Erro se houver */}
        {errorMsg && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            <span className="flex-1 leading-snug">{errorMsg}</span>
          </div>
        )}

        {/* Conteúdo Principal com Scroll */}
        <div className="overflow-y-auto flex-1 pr-0.5">
          {/* MODO 1: ENTRADA DE DADOS */}
          {!parsedResult && (
            <div className="space-y-4">
              {/* ABA 1: TEXTO */}
              {activeTab === 'text' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Cole uma mensagem do WhatsApp ou digite o compromisso. O Gemini extrairá participantes, horários e rotinas automaticamente.
                  </p>
                  <textarea
                    rows={4}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Ex: Rafael tem aula de natação terça e quinta às 18h no clube, a Silvia leva."
                    className="w-full text-xs font-medium p-3.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none transition-all resize-none"
                    disabled={isParsing}
                  />
                  <button
                    type="button"
                    onClick={handleExtractFromText}
                    disabled={isParsing || !inputText.trim()}
                    className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold rounded-xl text-xs transition-all shadow-xs disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isParsing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Processando com Gemini...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Interpretar Texto com IA</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* ABA 2: ÁUDIO */}
              {activeTab === 'audio' && (
                <div className="p-6 bg-slate-50 border border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center text-center space-y-3">
                  <div
                    className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                      isRecording
                        ? 'bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/30 ring-4 ring-rose-100'
                        : isParsing
                        ? 'bg-amber-100 text-amber-700 animate-spin'
                        : 'bg-white text-slate-700 border border-slate-200 shadow-xs'
                    }`}
                  >
                    {isParsing ? (
                      <RefreshCw className="w-7 h-7" />
                    ) : (
                      <Mic className="w-7 h-7" />
                    )}
                  </div>

                  {isRecording ? (
                    <div>
                      <span className="text-rose-600 font-mono font-bold text-sm">
                        Gravando: {formatTimer(recordingSeconds)}
                      </span>
                      <p className="text-xs text-slate-500 mt-1">
                        Fale normalmente (ex: "Consulta do Flávio sexta às 15 horas")
                      </p>
                    </div>
                  ) : isParsing ? (
                    <div>
                      <span className="text-slate-800 font-bold text-xs">
                        Gemini analisando o áudio...
                      </span>
                      <p className="text-[11px] text-slate-500">Transcrevendo e estruturando a rotina</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        Clique para gravar sua voz
                      </p>
                      <p className="text-[11px] text-slate-500">
                        O áudio será enviado diretamente para a IA multimodal do Gemini
                      </p>
                    </div>
                  )}

                  {!isParsing && (
                    <div className="pt-2">
                      {!isRecording ? (
                        <button
                          type="button"
                          onClick={startRecording}
                          className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                        >
                          <Mic className="w-4 h-4" />
                          <span>Iniciar Gravação</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={stopRecording}
                          className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                        >
                          <Square className="w-4 h-4 fill-white" />
                          <span>Concluir e Enviar</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ABA 3: FOTO / PDF */}
              {activeTab === 'media' && (
                <div className="space-y-3">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="p-6 bg-slate-50 border-2 border-dashed border-slate-300 hover:border-sky-400 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                      disabled={isParsing}
                    />
                    <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 group-hover:border-sky-300 group-hover:bg-sky-50 flex items-center justify-center text-slate-600 group-hover:text-sky-600 transition-all shadow-xs mb-2">
                      <Upload className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-slate-800">
                      {selectedFile ? selectedFile.name : 'Selecionar Foto ou PDF'}
                    </span>
                    <span className="text-[11px] text-slate-500 mt-0.5">
                      Bilhetes de escola, horários, receitas ou avisos
                    </span>
                  </div>

                  {isParsing && (
                    <div className="flex items-center justify-center gap-2 py-3 text-xs font-semibold text-slate-600">
                      <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                      <span>Analisando imagem com visão computacional do Gemini...</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* MODO 2: CARD DE CONFIRMAÇÃO COM BADGES COLORIDOS */}
          {parsedResult && (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="p-4 bg-slate-50/90 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Atividade Interpretada
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {parsedResult.is_routine ? 'Rotina Recorrente' : 'Evento Único'}
                  </span>
                </div>

                {/* Título da Atividade */}
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    {parsedResult.title}
                  </h3>
                </div>

                {/* Membros Identificados com Badges Coloridos */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500 font-medium min-w-[90px]">Participante:</span>
                    {participantMember ? (
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border shadow-2xs"
                        style={{
                          backgroundColor: `${participantMember.color}15`,
                          borderColor: `${participantMember.color}40`,
                          color: participantMember.color,
                        }}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: participantMember.color }}
                        />
                        {participantMember.name} ({participantMember.role})
                      </span>
                    ) : (
                      <span className="text-slate-600 font-semibold">{parsedResult.participant_name}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500 font-medium min-w-[90px]">Responsável:</span>
                    {responsibleMember ? (
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border shadow-2xs"
                        style={{
                          backgroundColor: `${responsibleMember.color}15`,
                          borderColor: `${responsibleMember.color}40`,
                          color: responsibleMember.color,
                        }}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: responsibleMember.color }}
                        />
                        {responsibleMember.name} (Leva / Busca)
                      </span>
                    ) : (
                      <span className="text-slate-400 italic font-medium bg-slate-200/60 px-2 py-0.5 rounded-md text-[11px]">
                        Não definido (atribuir depois)
                      </span>
                    )}
                  </div>
                </div>

                {/* Detalhes de Agenda e Local */}
                <div className="pt-2 border-t border-slate-200/60 grid grid-cols-2 gap-2 text-xs text-slate-700">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      <strong>{parsedResult.start_time}</strong> ({parsedResult.duration_minutes} min)
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{parsedResult.location_name || 'Local da Família'}</span>
                  </div>

                  <div className="flex items-center gap-1.5 col-span-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      {parsedResult.is_routine && parsedResult.days_of_week?.length > 0 ? (
                        <>
                          <strong>Dias:</strong>{' '}
                          {parsedResult.days_of_week.map((d) => DAY_LABELS[d] || d).join(', ')}
                        </>
                      ) : (
                        <>
                          <strong>Data:</strong> {parsedResult.date_str || 'Data atual'}
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleConfirmAndSave}
                  className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirmar e Salvar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setParsedResult(null)}
                  className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs border border-slate-200 transition-all cursor-pointer"
                >
                  Voltar / Corrigir
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé quando em modo de entrada */}
        {!parsedResult && (
          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-500 hover:text-slate-700 font-semibold text-xs rounded-xl transition-all"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
