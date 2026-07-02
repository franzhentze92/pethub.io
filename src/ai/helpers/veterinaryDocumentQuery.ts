import type { VetDocumentStructuredData, VetLabFinding } from '@/lib/vetDocumentTypes';

export interface DocumentQueryResult {
  answer: string;
  sources: string[];
  findings_matched?: VetLabFinding[];
}

function normalizeQuery(q: string): string {
  return q.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
}

/** Query structured vet document data without full RAG — fast analyte lookup + text search. */
export function queryVetDocument(
  structured: VetDocumentStructuredData | null | undefined,
  rawText: string | null | undefined,
  question: string,
): DocumentQueryResult {
  const q = normalizeQuery(question.trim());
  const sources: string[] = [];
  const findings = structured?.findings ?? [];

  if (!q) {
    return {
      answer: structured?.summary ?? 'No hay suficiente información en el documento.',
      sources: ['summary'],
    };
  }

  const analytePatterns = [
    'glucosa',
    'creatinina',
    'urea',
    'albúmina',
    'albumina',
    'hemoglobina',
    'hematocrito',
    'leucocitos',
    'plaquetas',
    'colesterol',
    'trigliceridos',
    'triglicéridos',
    'alt',
    'ast',
    'fosfatasa',
  ];

  const matchedFindings = findings.filter((f) => {
    const name = normalizeQuery(f.name ?? '');
    return q.split(/\s+/).some((word) => word.length >= 3 && name.includes(word));
  });

  if (matchedFindings.length > 0) {
    sources.push('structured_data.findings');
    const lines = matchedFindings.map((f) => {
      const flag =
        f.flag === 'high' ? ' (ALTO)' : f.flag === 'low' ? ' (BAJO)' : f.flag === 'normal' ? ' (normal)' : '';
      const range = f.reference_range ? ` · ref: ${f.reference_range}` : '';
      return `**${f.name}**: ${f.value ?? '—'} ${f.unit ?? ''}${flag}${range}`;
    });

    if (structured?.abnormal_highlights?.length) {
      const relevant = structured.abnormal_highlights.filter((h) =>
        normalizeQuery(h).split(/\s+/).some((w) => q.includes(w) || w.length >= 4 && q.includes(w.slice(0, 4))),
      );
      if (relevant.length) {
        sources.push('abnormal_highlights');
        return {
          answer: `${lines.join('\n')}\n\nDestacados anormales: ${relevant.join('; ')}`,
          sources,
          findings_matched: matchedFindings,
        };
      }
    }

    return {
      answer: lines.join('\n'),
      sources,
      findings_matched: matchedFindings,
    };
  }

  for (const analyte of analytePatterns) {
    if (q.includes(analyte)) {
      const found = findings.find((f) => normalizeQuery(f.name ?? '').includes(analyte));
      if (found) {
        sources.push('structured_data.findings');
        return {
          answer: `**${found.name}**: ${found.value ?? '—'} ${found.unit ?? ''} (ref: ${found.reference_range ?? 'N/D'}) — ${found.flag ?? 'unknown'}`,
          sources,
          findings_matched: [found],
        };
      }
    }
  }

  if (/\b(resumen|general|qué dice|que dice|hallazgos)\b/i.test(q) && structured?.summary) {
    sources.push('summary');
    let answer = structured.summary;
    if (structured.abnormal_highlights?.length) {
      answer += `\n\nValores destacados: ${structured.abnormal_highlights.join('; ')}`;
      sources.push('abnormal_highlights');
    }
    return { answer, sources };
  }

  if (rawText) {
    const lowerRaw = rawText.toLowerCase();
    const words = q.split(/\s+/).filter((w) => w.length >= 4);
    const hits = words.filter((w) => lowerRaw.includes(w));
    if (hits.length > 0) {
      const idx = lowerRaw.indexOf(hits[0]);
      const snippet = rawText.slice(Math.max(0, idx - 80), idx + 200).trim();
      sources.push('raw_text');
      return {
        answer: `Fragmento del documento:\n_"${snippet}…"_`,
        sources,
      };
    }
  }

  if (structured?.vet_notes) {
    sources.push('vet_notes');
    return { answer: structured.vet_notes, sources };
  }

  return {
    answer:
      structured?.summary ??
      'No encontré información específica sobre eso en el documento. Prueba preguntar por un analito concreto (ej. glucosa, creatinina).',
    sources: structured?.summary ? ['summary'] : [],
  };
}
