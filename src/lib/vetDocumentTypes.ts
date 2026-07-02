export type VetDocumentType = 'lab_results' | 'invoice';
export type VetDocumentParseStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface VetLabFinding {
  name: string;
  value?: string | null;
  unit?: string | null;
  reference_range?: string | null;
  flag?: 'normal' | 'high' | 'low' | 'unknown' | null;
}

export interface VetDocumentStructuredData {
  summary?: string;
  patient_name?: string | null;
  test_date?: string | null;
  clinic_name?: string | null;
  findings?: VetLabFinding[];
  abnormal_highlights?: string[];
  vet_notes?: string | null;
  document_kind?: VetDocumentType;
}

export interface VetDocumentExtraction {
  id: string;
  session_id: string;
  owner_id: string;
  document_url: string;
  document_type: VetDocumentType;
  raw_text?: string | null;
  structured_data?: VetDocumentStructuredData | null;
  summary?: string | null;
  parse_status: VetDocumentParseStatus;
  parse_error?: string | null;
  parsed_at?: string | null;
  created_at: string;
  updated_at: string;
}
