import { supabase } from '@/lib/supabase';
import type { VetDocumentExtraction, VetDocumentType } from '@/lib/vetDocumentTypes';

export interface ParseVetDocumentParams {
  sessionId: string;
  documentUrl: string;
  documentType?: VetDocumentType;
  forceReparse?: boolean;
}

export interface ParseVetDocumentResult {
  success: boolean;
  extraction?: VetDocumentExtraction;
  error?: string;
}

export async function parseVetDocument(
  params: ParseVetDocumentParams,
): Promise<ParseVetDocumentResult> {
  const { data, error } = await supabase.functions.invoke<ParseVetDocumentResult>(
    'parse-vet-document',
    {
      body: {
        session_id: params.sessionId,
        document_url: params.documentUrl,
        document_type: params.documentType ?? 'lab_results',
        force_reparse: params.forceReparse ?? false,
      },
    },
  );

  if (error) {
    return { success: false, error: error.message || 'No se pudo analizar el documento.' };
  }

  if (!data) {
    return { success: false, error: 'Respuesta vacía del analizador de documentos.' };
  }

  if (!data.success) {
    return { success: false, error: data.error || 'No se pudo analizar el documento.' };
  }

  return data;
}

export function formatExtractionPreview(extraction: VetDocumentExtraction): string {
  if (extraction.summary?.trim()) return extraction.summary.trim();

  const structured = extraction.structured_data;
  if (structured?.summary?.trim()) return structured.summary.trim();

  const highlights = structured?.abnormal_highlights ?? [];
  if (highlights.length > 0) {
    return `Valores a revisar: ${highlights.slice(0, 4).join('; ')}`;
  }

  if (extraction.parse_status === 'failed') {
    return extraction.parse_error || 'No se pudo analizar el documento.';
  }

  if (extraction.parse_status === 'processing' || extraction.parse_status === 'pending') {
    return 'Analizando documento…';
  }

  return 'Documento sin resumen disponible.';
}
