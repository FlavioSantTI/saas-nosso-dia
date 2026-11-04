/**
 * Preparação de anexos para o assistente de IA (Gemini).
 *
 * - Imagens e PDF: enviados nativamente ao Gemini via inline_data (base64).
 * - TXT / MD: lidos como texto e anexados ao prompt.
 * - DOCX: descompactado no navegador (DecompressionStream) e extraído o texto de word/document.xml.
 * - DOC (Word 97-2003, binário): extração heurística do texto legível.
 *
 * Sem dependências externas.
 */

export const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024; // 8MB
export const MAX_DOCUMENT_TEXT_CHARS = 20000;

export const ATTACHMENT_ACCEPT = [
  'image/*',
  'application/pdf',
  '.pdf',
  'text/plain',
  '.txt',
  'text/markdown',
  '.md',
  '.markdown',
  'application/msword',
  '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.docx'
].join(',');

export type AttachmentKind = 'image' | 'pdf' | 'text' | 'docx' | 'doc';

export interface PreparedAttachment {
  kind: AttachmentKind;
  fileName: string;
  sizeBytes: number;
  /** Data URL para pré-visualização (somente imagens) */
  previewUrl?: string;
  /** Base64 puro para envio via inline_data (imagens e PDF) */
  base64?: string;
  mimeType?: string;
  /** Texto extraído (TXT, MD, DOC, DOCX) */
  text?: string;
}

function getExtension(name: string): string {
  const idx = name.lastIndexOf('.');
  return idx >= 0 ? name.slice(idx + 1).toLowerCase() : '';
}

export function detectAttachmentKind(file: File): AttachmentKind | null {
  const ext = getExtension(file.name);
  const type = (file.type || '').toLowerCase();

  if (type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'gif'].includes(ext)) {
    return 'image';
  }
  if (type === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (ext === 'docx' || type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return 'docx';
  }
  if (ext === 'doc' || type === 'application/msword') return 'doc';
  if (type.startsWith('text/') || ['txt', 'md', 'markdown'].includes(ext)) return 'text';
  return null;
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
    reader.readAsDataURL(file);
  });
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&');
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  if (typeof (window as any).DecompressionStream === 'undefined') {
    throw new Error('Seu navegador não suporta leitura de arquivos .docx. Salve o documento como PDF e tente novamente.');
  }
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new (window as any).DecompressionStream('deflate-raw'));
  const buf = await new Response(stream).arrayBuffer();
  return new Uint8Array(buf);
}

/** Lê um arquivo específico de dentro de um ZIP (formato usado pelo .docx). */
async function readZipEntry(buffer: ArrayBuffer, entryName: string): Promise<Uint8Array | null> {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  // Localiza o End Of Central Directory (assinatura 0x06054b50)
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return null;

  const entries = view.getUint16(eocd + 10, true);
  let ptr = view.getUint32(eocd + 16, true);
  const decoder = new TextDecoder();

  for (let n = 0; n < entries; n++) {
    if (view.getUint32(ptr, true) !== 0x02014b50) break;
    const method = view.getUint16(ptr + 10, true);
    const compSize = view.getUint32(ptr + 20, true);
    const nameLen = view.getUint16(ptr + 28, true);
    const extraLen = view.getUint16(ptr + 30, true);
    const commentLen = view.getUint16(ptr + 32, true);
    const localOffset = view.getUint32(ptr + 42, true);
    const name = decoder.decode(bytes.subarray(ptr + 46, ptr + 46 + nameLen));

    if (name === entryName) {
      const lNameLen = view.getUint16(localOffset + 26, true);
      const lExtraLen = view.getUint16(localOffset + 28, true);
      const start = localOffset + 30 + lNameLen + lExtraLen;
      const raw = bytes.subarray(start, start + compSize);
      if (method === 0) return raw;
      if (method === 8) return inflateRaw(raw);
      return null;
    }
    ptr += 46 + nameLen + extraLen + commentLen;
  }
  return null;
}

async function extractDocxText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const xmlBytes = await readZipEntry(buffer, 'word/document.xml');
  if (!xmlBytes) {
    throw new Error('Não foi possível ler o conteúdo do .docx. Salve como PDF e tente novamente.');
  }
  const xml = new TextDecoder('utf-8').decode(xmlBytes);
  const text = xml
    .replace(/<w:tab\/>/g, '\t')
    .replace(/<w:br[^>]*\/>/g, '\n')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<[^>]+>/g, '');
  return decodeXmlEntities(text);
}

/**
 * Extração heurística para .doc binário (Word 97-2003).
 * Captura sequências legíveis em UTF-16LE e em Latin-1 e escolhe a mais completa.
 */
async function extractLegacyDocText(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const isReadable = (c: number) =>
    c === 9 || c === 10 || c === 13 || (c >= 32 && c < 127) || (c >= 0xc0 && c <= 0xff);

  const collect = (step: 1 | 2): string => {
    const runs: string[] = [];
    let current = '';
    for (let i = 0; i + step - 1 < bytes.length; i += step) {
      const code = step === 2 ? bytes[i] | (bytes[i + 1] << 8) : bytes[i];
      if (code < 256 && isReadable(code)) {
        current += code === 13 ? '\n' : String.fromCharCode(code);
      } else {
        if (current.trim().length >= 4) runs.push(current);
        current = '';
      }
    }
    if (current.trim().length >= 4) runs.push(current);
    return runs.join('\n');
  };

  const utf16 = collect(2);
  const latin1 = collect(1);
  // Texto do Word 97 geralmente está em UTF-16LE; Latin-1 cobre arquivos "compressed text"
  return utf16.replace(/\s/g, '').length >= latin1.replace(/\s/g, '').length * 0.5 ? utf16 : latin1;
}

function normalizeText(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_DOCUMENT_TEXT_CHARS);
}

export async function prepareAttachment(file: File): Promise<PreparedAttachment> {
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error('O arquivo é muito grande. Escolha um arquivo de até 8MB.');
  }

  const kind = detectAttachmentKind(file);
  if (!kind) {
    throw new Error('Formato não suportado. Envie foto, PDF, DOC, DOCX, TXT ou MD.');
  }

  const base: PreparedAttachment = { kind, fileName: file.name, sizeBytes: file.size };

  if (kind === 'image' || kind === 'pdf') {
    const dataUrl = await readAsDataURL(file);
    return {
      ...base,
      previewUrl: kind === 'image' ? dataUrl : undefined,
      base64: dataUrl.split(',')[1],
      mimeType: kind === 'pdf' ? 'application/pdf' : file.type || 'image/jpeg'
    };
  }

  let text = '';
  if (kind === 'text') text = await file.text();
  else if (kind === 'docx') text = await extractDocxText(file);
  else text = await extractLegacyDocText(file);

  text = normalizeText(text);
  if (!text) {
    throw new Error('Não encontramos texto legível neste documento. Tente salvar como PDF.');
  }
  return { ...base, text };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
