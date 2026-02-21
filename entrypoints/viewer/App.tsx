import React, { useEffect, useState } from 'react';
import { PdfViewer } from '../../components/PdfViewer';
import { getAttachment, getAttachmentBlob, getItem } from '../../lib/db/repository';
import { getAnnotationsByAttachmentId } from '../../lib/db/repository';
import type { Annotation } from '../../lib/types';

function getAttachmentIdFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('attachmentId');
}

export default function ViewerApp() {
  const [attachmentId, setAttachmentId] = useState<string | null>(null);
  const [pdfSource, setPdfSource] = useState<string | ArrayBuffer | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAnnotations = async () => {
    if (!attachmentId) return;
    const list = await getAnnotationsByAttachmentId(attachmentId);
    setAnnotations(list);
  };

  useEffect(() => {
    const id = getAttachmentIdFromUrl();
    if (!id) {
      setError('Missing attachmentId in URL');
      setLoading(false);
      return;
    }
    setAttachmentId(id);
  }, []);

  useEffect(() => {
    if (!attachmentId) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const attachment = await getAttachment(attachmentId);
        if (!attachment) {
          setError('Attachment not found');
          setLoading(false);
          return;
        }
        let source: string | ArrayBuffer | null = null;
        const blob = await getAttachmentBlob(attachmentId);
        if (blob) {
          source = await blob.arrayBuffer();
        } else {
          const item = await getItem(attachment.itemId);
          if (item?.url && (item.url.toLowerCase().endsWith('.pdf') || attachment.contentType === 'application/pdf')) {
            const res = await fetch(item.url);
            if (res.ok) source = await res.arrayBuffer();
          }
        }
        if (!source) {
          setError('No PDF data. Attach a PDF file to this item in the library.');
          setLoading(false);
          return;
        }
        setPdfSource(source);
        const list = await getAnnotationsByAttachmentId(attachmentId);
        setAnnotations(list);
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [attachmentId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-800">
        <p className="text-gray-600 dark:text-gray-400">Loading PDF...</p>
      </div>
    );
  }

  if (error || !attachmentId || !pdfSource) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-800 p-4">
        <p className="text-red-600 dark:text-red-400 text-center">{error ?? 'Failed to load PDF'}</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <PdfViewer
        attachmentId={attachmentId}
        pdfSource={pdfSource}
        annotations={annotations}
        onAnnotationsChange={loadAnnotations}
      />
    </div>
  );
}
