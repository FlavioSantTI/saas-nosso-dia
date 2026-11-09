import { FamilyMember } from '../types';
import { supabase } from './supabase';
import { getLocalDateString } from './dateUtils';

export function getFallbackGeminiApiKey(): string {
  return import.meta.env.VITE_GEMINI_API_KEY || '';
}

/**
 * Obtém a chave ativa da API do Gemini:
 * 1. Obtém a chave corporativa descriptografada em memória (RAM) via RPC do Supabase
 *    armazenada com OpenPGP AES-256 na tabela platform_settings.
 * 2. Em caso de fallback (modo dev local), utiliza a variável de ambiente VITE_GEMINI_API_KEY.
 */
export async function getGeminiApiKey(): Promise<string> {
  try {
    const { data, error } = await supabase.rpc('get_active_ai_key', { p_provider: 'gemini' });
    if (!error && data && typeof data === 'string' && data.trim()) {
      return data.trim();
    }
  } catch (err) {
    // Silencioso se offline ou não autenticado
  }

  return getFallbackGeminiApiKey();
}

export interface ExtractedRoutineData {
  title: string;
  type: 'RECURRING' | 'SINGLE';
  date_str?: string | null;
  days: string[];
  startTime: string;
  time: string;
  duration: number;
  is_all_day: boolean;
  participant?: FamilyMember;
  participants: FamilyMember[];
  responsible: FamilyMember | null;
  location: string;
}

interface RawGeminiOutput {
  title?: string;
  type?: 'RECURRING' | 'SINGLE';
  date_str?: string;
  days?: string[];
  is_all_day?: boolean;
  participant_names?: string[];
  participant_name?: string;
  responsible_name?: string;
  time?: string;
  duration?: number;
  location?: string;
}

export async function extractRoutineWithGemini(
  promptText: string,
  imageBase64: string | null,
  imageMimeType: string | null,
  members: FamilyMember[],
  documentText?: string | null,
  documentName?: string | null
): Promise<ExtractedRoutineData> {
  const apiKey = await getGeminiApiKey();

  if (!apiKey) {
    throw new Error('Chave da API do Google Gemini não configurada. Configure no Painel Super-Admin.');
  }

  const now = new Date();
  const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  
  const todayStr = getLocalDateString(now);

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = getLocalDateString(tomorrow);

  // Tabela explícita dos próximos 7 dias no horário local (evita qualquer confusão de timezone com UTC às 21h/22h)
  const upcomingSchedule: string[] = [];
  for (let i = 0; i <= 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    const dateStr = getLocalDateString(d);
    const name = dayNames[d.getDay()];
    const label = i === 0 ? `HOJE (${name})` : i === 1 ? `AMANHÃ (${name})` : name;
    upcomingSchedule.push(`- ${label}: ${dateStr}`);
  }

  const membersContext = members
    .map((m) => `- Nome: "${m.name}" (Apelido: "${m.nickname || m.name}"), Papel: ${m.role}`)
    .join('\n');

  const systemInstruction = `Você é o assistente inteligente do aplicativo familiar "Nosso Dia".
Sua tarefa é analisar o texto (mensagem de WhatsApp, áudio ou bilhete escolar) e extrair os dados estruturados do compromisso familiar.

TABELA OFICIAL DE DATAS DO USUÁRIO (Fuso Horário Local: NUNCA use UTC):
${upcomingSchedule.join('\n')}

REGRAS TEMPORAIS ESTRITAS (MUITO IMPORTANTE):
- Se o usuário disser "hoje", a data retornada em "date_str" DEVE SER OBRIGATORIAMENTE "${todayStr}".
- Se o usuário disser "amanhã", a data retornada em "date_str" DEVE SER OBRIGATORIAMENTE "${tomorrowStr}". (Exemplo: se hoje é dia ${todayStr.split('-')[2]}, amanhã é dia ${tomorrowStr.split('-')[2]}). NUNCA pule dias!
- Se o usuário disser um dia da semana (ex: "nesta sexta", "sábado"), use a data exata YYYY-MM-DD indicada na tabela acima. NUNCA invente outra data.

Membros cadastrados na família:
${membersContext}

REGRAS DE CLASSIFICAÇÃO:
1. "type":
   - "SINGLE" para compromissos pontuais/avulsos com data específica (ex: "dentista amanhã", "consulta médica dia 20", "festa no sábado").
   - "RECURRING" para atividades com repetição semanal frequente (ex: "natação toda terça e quinta", "escola de segunda a sexta").
2. "date_str":
   - Se type for "SINGLE", retorne OBRIGATORIAMENTE a data calculada no formato "YYYY-MM-DD".
   - Se type for "RECURRING", retorne null.
3. "days":
   - Se type for "RECURRING", retorne array com os identificadores dos dias da semana: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].
   - Se type for "SINGLE", retorne [].
4. "is_all_day":
   - true se for dia inteiro (aniversário, feriado, viagem), caso contrário false.
5. "participant_names":
   - Array com o nome ou apelido de todos os membros que participam da atividade (pode ser um filho, o pai, a mãe, ou múltiplos membros).
6. "responsible_name":
   - Adulto (pai ou mãe / ADMIN) responsável por levar, buscar ou acompanhar. Se não explícito e um adulto falar "eu vou / meu nome é X", atribua a esse adulto.

Formato OBRIGATÓRIO de saída (JSON puro):
{
  "title": "Nome da atividade (ex: Dentista, Natação, Aniversário) com até 80 chars",
  "type": "SINGLE" | "RECURRING",
  "date_str": "YYYY-MM-DD" | null,
  "days": ["mon", "wed"],
  "is_all_day": false,
  "participant_names": ["Flávio"],
  "responsible_name": "Flávio",
  "time": "14:00",
  "duration": 60,
  "location": "Bertoal Odontologia Avançada"
}`;

  const parts: any[] = [];
  const defaultPrompt = imageMimeType === 'application/pdf' || documentText
    ? 'Analise o documento anexo e extraia o compromisso/rotina.'
    : 'Analise a imagem anexa e extraia a rotina escolar.';
  let fullText = `${systemInstruction}\n\nConteúdo a analisar:\n"${promptText || defaultPrompt}"`;
  if (documentText) {
    fullText += `\n\nDocumento anexo${documentName ? ` (${documentName})` : ''}:\n"""\n${documentText}\n"""`;
  }
  parts.push({ text: fullText });

  if (imageBase64 && imageMimeType) {
    parts.push({
      inline_data: {
        mime_type: imageMimeType,
        data: imageBase64
      }
    });
  }

  const payload = {
    contents: [{ parts }],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.1
    }
  };

  // Modelos suportados em ordem de preferência e modernidade (evita erros 404 de descontinuação)
  const candidateModels = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-2.0-flash-exp',
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash'
  ];

  let result: any = null;
  let lastErrorMessage = '';

  for (const model of candidateModels) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        result = await response.json();
        break; // Modelo respondeu com sucesso!
      }

      const errorData = await response.json().catch(() => ({}));
      lastErrorMessage = errorData?.error?.message || `Erro na API do Gemini (${response.status}: ${response.statusText})`;

      // Se não for erro 404 (modelo inexistente nesta versão), aborta para não mascarar erro de auth/cota
      if (response.status !== 404) {
        throw new Error(lastErrorMessage);
      }
    } catch (err: any) {
      if (err.message && !err.message.includes('not found') && !err.message.includes('404')) {
        throw err;
      }
      lastErrorMessage = err.message;
    }
  }

  if (!result) {
    throw new Error(lastErrorMessage || 'Nenhum dos modelos disponíveis do Gemini respondeu à requisição.');
  }
  const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  const cleanJson = rawText.replace(/```json\n?|```/g, '').trim();

  let parsed: RawGeminiOutput;
  try {
    parsed = JSON.parse(cleanJson);
  } catch {
    throw new Error('A IA não conseguiu estruturar a resposta em JSON válido.');
  }

  // Identifica participantes
  const identifiedParticipants: FamilyMember[] = [];
  const rawNames = Array.isArray(parsed.participant_names) && parsed.participant_names.length > 0
    ? parsed.participant_names
    : [parsed.participant_name || ''];

  for (const name of rawNames) {
    if (!name) continue;
    const cleanN = name.toLowerCase().trim();
    const found = members.find(
      (m) => m.name.toLowerCase().includes(cleanN) || (m.nickname && m.nickname.toLowerCase().includes(cleanN))
    );
    if (found && !identifiedParticipants.some((p) => p.id === found.id)) {
      identifiedParticipants.push(found);
    }
  }

  if (identifiedParticipants.length === 0) {
    identifiedParticipants.push(members[0]);
  }

  // Identifica responsável adulto
  let matchedResponsible: FamilyMember | null = null;
  if (parsed.responsible_name) {
    const cleanR = parsed.responsible_name.toLowerCase().trim();
    matchedResponsible =
      members.find(
        (m) => (m.name.toLowerCase().includes(cleanR) || (m.nickname && m.nickname.toLowerCase().includes(cleanR))) && m.role === 'ADMIN'
      ) ||
      members.find((m) => m.name.toLowerCase().includes(cleanR) || (m.nickname && m.nickname.toLowerCase().includes(cleanR))) ||
      null;
  }
  if (!matchedResponsible) {
    matchedResponsible = members.find((m) => m.role === 'ADMIN') || members[0] || null;
  }

  const cleanTime = (parsed.time || '14:00').trim().slice(0, 5);
  const timeFormatted = cleanTime.length === 5 ? cleanTime : '14:00';

  // Normaliza dias da semana para os códigos ('mon', 'tue', etc.)
  const dayCodeMap: { [k: string]: string } = {
    'seg': 'mon', 'segunda': 'mon', 'mon': 'mon',
    'ter': 'tue', 'terça': 'tue', 'tue': 'tue',
    'qua': 'wed', 'quarta': 'wed', 'wed': 'wed',
    'qui': 'thu', 'quinta': 'thu', 'thu': 'thu',
    'sex': 'fri', 'sexta': 'fri', 'fri': 'fri',
    'sab': 'sat', 'sáb': 'sat', 'sábado': 'sat', 'sat': 'sat',
    'dom': 'sun', 'domingo': 'sun', 'sun': 'sun'
  };

  const normalizedDays: string[] = [];
  if (Array.isArray(parsed.days)) {
    for (const d of parsed.days) {
      const k = String(d).toLowerCase().trim().replace('-feira', '');
      if (dayCodeMap[k] && !normalizedDays.includes(dayCodeMap[k])) {
        normalizedDays.push(dayCodeMap[k]);
      }
    }
  }

  const activityType: 'RECURRING' | 'SINGLE' =
    parsed.type === 'SINGLE' || (!parsed.type && Boolean(parsed.date_str))
      ? 'SINGLE'
      : 'RECURRING';

  return {
    title: (parsed.title || 'Atividade').trim().slice(0, 100),
    type: activityType,
    date_str: parsed.date_str || (activityType === 'SINGLE' ? todayStr : null),
    days: normalizedDays,
    startTime: timeFormatted,
    time: timeFormatted,
    duration: Number(parsed.duration) || 60,
    is_all_day: Boolean(parsed.is_all_day),
    participant: identifiedParticipants[0],
    participants: identifiedParticipants,
    responsible: matchedResponsible,
    location: (parsed.location || '').trim().slice(0, 100)
  };
}

export interface ExtractedBoardItemDraft {
  id: string;
  selected: boolean;
  type: 'EXAM' | 'ASSIGNMENT' | 'SUPPLY' | 'PERMISSION' | 'NOTE';
  title: string;
  due_date: string | null; // YYYY-MM-DD
  subject: string;
  grade_composition: string;
  study_tips: string;
  delivery_format: string;
  estimated_cost: string;
  notes: string;
  checklist: { id: string; text: string; done: boolean }[];
}

export async function extractBoardItemsWithGemini(
  promptText: string,
  attachment?: {
    kind?: 'image' | 'pdf' | 'docx' | 'doc' | 'text';
    mimeType?: string;
    base64?: string;
    base64Data?: string;
    text?: string;
    extractedText?: string;
    fileName?: string;
  } | null
): Promise<ExtractedBoardItemDraft[]> {
  const apiKey = await getGeminiApiKey();
  if (!apiKey) {
    throw new Error('Chave da API do Google Gemini não configurada. Configure no Painel Super-Admin.');
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const todayStr = getLocalDateString(now);

  const systemInstruction = `
Você é um assistente especialista em organização escolar e familiar do aplicativo "Nosso Dia".
Sua tarefa é ler um comunicado escolar, calendário de provas, circular, lista de materiais ou foto de aviso e extrair TODOS os avisos/tarefas relevantes para o Mural da Família em formato JSON.

Contexto Temporal:
- Hoje é ${todayStr} (Ano corrente: ${currentYear}).
- Quando o documento mencionar datas como "13/11" ou "26/11", converta para o formato ISO "YYYY-MM-DD" usando o ano ${currentYear} (ex: "${currentYear}-11-13"). Se não houver data explícita para um trabalho ou aviso, use null em due_date.

REGRAS OBRIGATÓRIAS DE EXTRAÇÃO (DECISÕES DA FAMÍLIA):
1. AGLUTINAÇÃO POR DATA CONFORME O COMUNICADO:
   - Se o calendário tiver duas disciplinas na mesma linha/data (ex: "26/11 - HISTÓRIA e GEOGRAFIA"), mantenha-as AGLUTINADAS em UM ÚNICO card do tipo "EXAM" (ex: title: "Prova de História e Geografia", subject: "História e Geografia"), listando os capítulos de ambas as matérias no checklist (identificando a matéria no texto do tópico, ex: "História - Cap. 13: ...").
2. EXTRAÇÃO DE TRABALHOS EMBUTIDOS (ASSIGNMENT):
   - Inspecione atentamente a coluna "Composição da Nota" e os rodapés/observações do documento!
   - Se houver menção a trabalhos, leituras de livros paradidáticos, projetos ou entregas avaliativas (ex: "Trabalho do livro Paradidático - As aventuras de um cão chamado Petit", "Projeto Bimestral de Inglês", "Trabalhos de Arte, LIV e Ensino Religioso"), EXTRAIA CADA UM DELES como um card separado do tipo "ASSIGNMENT".
   - Se o trabalho estiver vinculado à nota de uma matéria que tem data no calendário e não tiver outra data própria explícita, você pode usar a mesma due_date da matéria ou null, explicando em grade_composition quanto vale o trabalho.
3. CHECKLIST ACIONÁVEL:
   - Transforme cada capítulo, tópico do conteúdo programático, páginas do livro ou plataforma de estudo (ex: "Atividades do Eureka", "Estudar pelo suplemento") em itens individuais dentro do array "checklist".
4. TIPOS SUPORTADOS (campo "type"):
   - "EXAM": Provas, avaliações, simulados, testes.
   - "ASSIGNMENT": Trabalhos escolares, projetos, leitura de paradidático, maquetes, deveres avaliativos.
   - "SUPPLY": Compra ou envio de materiais, livros, uniforme, itens de feira/festa.
   - "PERMISSION": Autorizações de passeio, assinatura de documentos, matrículas, pagamentos.
   - "NOTE": Comunicados ou avisos gerais importantes.

Retorne EXCLUSIVAMENTE um objeto JSON válido com a propriedade "items" seguindo exatamente esta estrutura:
{
  "items": [
    {
      "type": "EXAM" | "ASSIGNMENT" | "SUPPLY" | "PERMISSION" | "NOTE",
      "title": "Título claro e direto (ex: Prova de Matemática / Trabalho Paradidático: Petit)",
      "due_date": "YYYY-MM-DD" ou null,
      "subject": "Disciplina(s) (ex: Matemática, Português, História e Geografia)",
      "grade_composition": "Resumo da pontuação (ex: Avaliação: 4,0 pts | Simulado: 2,0 pts | Sala: 2,0 pts | Eureka: 1,0 pt | Qualitativa: 1,0 pt)",
      "study_tips": "Sugestões de estudo ou orientações gerais (ex: Estudar pelo livro, suplemento, caderno e SAS/Eureka)",
      "delivery_format": "Formato de entrega se for ASSIGNMENT (ex: Trabalho escrito / Apresentação / Leitura)",
      "estimated_cost": "Valor estimado se for SUPPLY ou PERMISSION (ex: R$ 45,00)",
      "notes": "Observações adicionais relevantes",
      "checklist": [
        "Cap. 12: Porcentagem, números decimais e fracionários",
        "Cap. 13: Informações e dados em tabelas e gráficos",
        "Realizar atividades do Eureka"
      ]
    }
  ]
}
`;

  const parts: any[] = [{ text: systemInstruction }];

  if (attachment) {
    const b64 = attachment.base64 || attachment.base64Data;
    const docText = attachment.text || attachment.extractedText;
    if ((attachment.kind === 'image' || attachment.kind === 'pdf') && b64 && attachment.mimeType) {
      parts.push({
        inline_data: {
          mime_type: attachment.mimeType,
          data: b64
        }
      });
    } else if (docText) {
      parts.push({
        text: `\n--- CONTEÚDO EXTRAÍDO DO DOCUMENTO (${attachment.fileName || 'anexo'}) ---\n${docText}\n--- FIM DO DOCUMENTO ---\n`
      });
    }
  }

  if (promptText && promptText.trim()) {
    parts.push({ text: `Instruções / Texto adicional do usuário: "${promptText.trim()}"` });
  } else {
    parts.push({ text: 'Extraia todos os itens (provas, trabalhos embutidos na nota, entregas e avisos) deste documento.' });
  }

  const payload = {
    contents: [{ parts }],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.1
    }
  };

  const candidateModels = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-2.0-flash-exp',
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash'
  ];

  let result: any = null;
  let lastErrorMessage = '';

  for (const model of candidateModels) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        result = await response.json();
        break;
      }

      const errorData = await response.json().catch(() => ({}));
      lastErrorMessage = errorData?.error?.message || `Erro na API do Gemini (${response.status})`;

      if (response.status !== 404) {
        throw new Error(lastErrorMessage);
      }
    } catch (err: any) {
      if (err.message && !err.message.includes('not found') && !err.message.includes('404')) {
        throw err;
      }
      lastErrorMessage = err.message;
    }
  }

  if (!result) {
    throw new Error(lastErrorMessage || 'Nenhum modelo do Gemini respondeu à leitura do documento.');
  }

  const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  const cleanJson = rawText.replace(/```json\n?|```/g, '').trim();

  let parsed: any;
  try {
    parsed = JSON.parse(cleanJson);
  } catch {
    throw new Error('A IA não conseguiu estruturar os avisos do documento em JSON válido.');
  }

  const rawItems: any[] = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.items)
    ? parsed.items
    : [];

  const validTypes = new Set(['EXAM', 'ASSIGNMENT', 'SUPPLY', 'PERMISSION', 'NOTE']);

  return rawItems.map((raw, idx) => {
    const itemType = validTypes.has(String(raw.type).toUpperCase())
      ? (String(raw.type).toUpperCase() as ExtractedBoardItemDraft['type'])
      : 'EXAM';

    const rawChecklist = Array.isArray(raw.checklist) ? raw.checklist : [];
    const checklist = rawChecklist
      .map((entry: any, cIdx: number) => {
        const text = typeof entry === 'string' ? entry.trim() : String(entry?.text || '').trim();
        if (!text) return null;
        return {
          id: `chk-${Date.now()}-${idx}-${cIdx}`,
          text,
          done: false
        };
      })
      .filter(Boolean) as { id: string; text: string; done: boolean }[];

    const cleanDate =
      typeof raw.due_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.due_date.trim())
        ? raw.due_date.trim()
        : null;

    return {
      id: `draft-${Date.now()}-${idx}`,
      selected: true,
      type: itemType,
      title: String(raw.title || 'Aviso Escolar').trim().slice(0, 140),
      due_date: cleanDate,
      subject: String(raw.subject || '').trim(),
      grade_composition: String(raw.grade_composition || '').trim(),
      study_tips: String(raw.study_tips || '').trim(),
      delivery_format: String(raw.delivery_format || '').trim(),
      estimated_cost: String(raw.estimated_cost || '').trim(),
      notes: String(raw.notes || '').trim(),
      checklist
    };
  });
}

