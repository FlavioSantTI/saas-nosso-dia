/**
 * Serviço de IA com Google Gemini API para a Fase 2 (Quick Capture Multimodal).
 */

export interface GeminiRoutineOutput {
  title: string;
  participant_name: string; // 'Flávio' | 'Silvia' | 'Rafael'
  responsible_name: string | null;
  is_routine: boolean;
  days_of_week: number[]; // 0 a 6 (0=Dom, 1=Seg...)
  date_str: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  duration_minutes: number;
  location_name: string;
  reminder_minutes: number | null; // 5, 10, 15, 30 ou null
  is_all_day: boolean;
}

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

const PROMPT_CONTEXT = `Você é o assistente inteligente do Nosso Dia (rotina familiar em Palmas/TO).
Membros conhecidos: Flávio (Pai/Adulto), Silvia (Mãe/Adulta), Rafael (Filho/Criança).
Analise a entrada e retorne OBRIGATORIAMENTE um JSON válido com o seguinte formato:
{
  "title": "string",
  "participant_name": "string (Flávio, Silvia ou Rafael)",
  "responsible_name": "string ou null (quem leva ou busca)",
  "is_routine": boolean,
  "days_of_week": [números de 0 a 6 onde 0=Dom, 1=Seg...],
  "date_str": "YYYY-MM-DD",
  "start_time": "HH:MM",
  "duration_minutes": número,
  "location_name": "string",
  "reminder_minutes": número (5, 10, 15, 30 ou null),
  "is_all_day": boolean
}`;

const cleanBase64String = (base64: string): string => {
  if (base64.includes(';base64,')) {
    return base64.split(';base64,')[1];
  }
  return base64;
};

async function callGemini(parts: any[]): Promise<GeminiRoutineOutput> {
  const apiKey = API_KEY;
  if (!apiKey) {
    throw new Error(
      'Chave da API Gemini não configurada. Configure VITE_GEMINI_API_KEY no arquivo .env.'
    );
  }

  const response = await fetch(GEMINI_ENDPOINT, {
    method: 'POST',
    headers: {
      'x-goog-api-key': API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts,
        },
      ],
      generationConfig: {
        response_mime_type: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Erro na chamada da API Gemini (${response.status}): ${errorBody}`);
  }

  const result = await response.json();
  const textContent = result?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textContent) {
    throw new Error('Nenhuma resposta válida retornada pelo modelo Gemini.');
  }

  const cleanedText = textContent.replace(/```json\n?|\n?```/g, '').trim();
  const parsedData = JSON.parse(cleanedText);

  return parsedData as GeminiRoutineOutput;
}

/**
 * Extrai rotina a partir de texto (mensagens de WhatsApp, lembretes, etc).
 */
export async function parseTextRoutine(text: string): Promise<GeminiRoutineOutput> {
  return callGemini([
    {
      text: `${PROMPT_CONTEXT}\n\nEntrada do usuário:\n${text}`,
    },
  ]);
}

/**
 * Extrai rotina a partir de áudio de voz gravado em base64.
 */
export async function parseAudioRoutine(
  base64Audio: string,
  mimeType: string = 'audio/webm'
): Promise<GeminiRoutineOutput> {
  return callGemini([
    {
      text: `${PROMPT_CONTEXT}\n\nAnalise o áudio anexo e extraia a rotina/atividade familiar:`,
    },
    {
      inlineData: {
        mimeType: mimeType || 'audio/webm',
        data: cleanBase64String(base64Audio),
      },
    },
  ]);
}

/**
 * Extrai rotina a partir de mídia (imagem de bilhete escolar, print ou PDF) em base64.
 */
export async function parseMediaRoutine(
  base64File: string,
  mimeType: string
): Promise<GeminiRoutineOutput> {
  return callGemini([
    {
      text: `${PROMPT_CONTEXT}\n\nAnalise o anexo e extraia os dados da rotina ou compromisso:`,
    },
    {
      inlineData: {
        mimeType: mimeType || 'image/jpeg',
        data: cleanBase64String(base64File),
      },
    },
  ]);
}
