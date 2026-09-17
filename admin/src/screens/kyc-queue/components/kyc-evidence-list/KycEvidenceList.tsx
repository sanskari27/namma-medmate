import { fetchKycDocument, type KycDocumentItem } from '@/services/kyc';
import { useState } from 'react';

type KycEvidenceListProps = {
  packId: string;
  documents: KycDocumentItem[];
};

export function KycEvidenceList({ packId, documents }: KycEvidenceListProps) {
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  async function onOpen(documentId: string) {
    setFailed(false);
    setOpeningId(documentId);
    try {
      const blob = await fetchKycDocument(packId, documentId);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      setFailed(true);
    } finally {
      setOpeningId(null);
    }
  }

  return (
    <ul className="space-y-2">
      {failed ? (
        <li role="alert" className="text-sm text-ink">
          Could not open evidence. Try again.
        </li>
      ) : null}
      {documents.map((doc) => (
        <li
          key={doc.id}
          className="flex items-center justify-between gap-2 border border-line px-3 py-2"
        >
          <div>
            <p className="text-sm text-ink">{doc.docType}</p>
            <p className="font-mono text-[11px] text-muted">{doc.originalFilename}</p>
          </div>
          <button
            type="button"
            className="text-sm text-brand underline"
            disabled={openingId === doc.id}
            onClick={() => void onOpen(doc.id)}
          >
            {openingId === doc.id ? 'Opening…' : 'Open evidence'}
          </button>
        </li>
      ))}
    </ul>
  );
}
