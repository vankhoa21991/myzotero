import React, { useEffect, useState, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import type { Annotation } from '../lib/types';
import { createAnnotation, deleteAnnotation } from '../lib/db/repository';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { Highlighter, StickyNote, Square, Trash2 } from 'lucide-react';

function initPdfWorker() {
  if (typeof browser === 'undefined') return;
  const lib = pdfjsLib as unknown as { GlobalWorkerOptions: { workerSrc: string } };
  lib.GlobalWorkerOptions = { workerSrc: browser.runtime.getURL('/pdf.worker.min.mjs') };
}

interface PdfViewerProps {
  attachmentId: string;
  pdfSource: string | ArrayBuffer;
  annotations: Annotation[];
  onAnnotationsChange: () => void;
}

type Tool = 'select' | 'highlight' | 'note' | 'rect';

export function PdfViewer({
  attachmentId,
  pdfSource,
  annotations,
  onAnnotationsChange,
}: PdfViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [tool, setTool] = useState<Tool>('select');
  const [selectedAnnId, setSelectedAnnId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    initPdfWorker();
  }, []);

  useEffect(() => {
    const loadingTask = pdfjsLib.getDocument(pdfSource);
    loadingTask.promise.then((doc) => {
      setPdfDoc(doc);
      setNumPages(doc.numPages);
    });
    return () => {
      loadingTask.promise.then((doc) => doc.destroy());
    };
  }, [pdfSource]);

  const renderPage = useCallback(
    async (pageNum: number) => {
      if (!pdfDoc || !canvasRef.current) return;
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = canvasRef.current;
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      await page.render({ canvasContext: ctx, viewport }).promise;
      page.cleanup();
    },
    [pdfDoc],
  );

  useEffect(() => {
    if (pdfDoc && currentPage >= 1 && currentPage <= numPages) {
      renderPage(currentPage);
    }
  }, [pdfDoc, currentPage, numPages, renderPage]);

  const pageAnnotations = annotations.filter((a) => a.page === currentPage);

  const handleAddNote = async () => {
    if (tool !== 'note') return;
    await createAnnotation({
      attachmentId,
      type: 'note',
      page: currentPage,
      position: { pageIndex: currentPage - 1, x: 100, y: 100 },
      content: 'New note',
      color: '#fef08a',
    });
    onAnnotationsChange();
  };

  const handleAddRect = async () => {
    if (tool !== 'rect') return;
    await createAnnotation({
      attachmentId,
      type: 'rect',
      page: currentPage,
      position: { pageIndex: currentPage - 1, x: 50, y: 50, width: 100, height: 60 },
      color: '#93c5fd',
    });
    onAnnotationsChange();
  };

  const handleDeleteSelected = async () => {
    if (!selectedAnnId) return;
    await deleteAnnotation(selectedAnnId);
    setSelectedAnnId(null);
    onAnnotationsChange();
  };

  return (
    <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-800">
      <div className="flex items-center gap-2 p-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant={tool === 'select' ? 'default' : 'ghost'}
            onClick={() => setTool('select')}
            title="Select"
          >
            Select
          </Button>
          <Button
            size="sm"
            variant={tool === 'highlight' ? 'default' : 'ghost'}
            onClick={() => setTool('highlight')}
            title="Highlight"
          >
            <Highlighter className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant={tool === 'note' ? 'default' : 'ghost'}
            onClick={() => setTool('note')}
            title="Add note"
          >
            <StickyNote className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant={tool === 'rect' ? 'default' : 'ghost'}
            onClick={() => setTool('rect')}
            title="Rectangle"
          >
            <Square className="w-4 h-4" />
          </Button>
        </div>
        {tool === 'note' && (
          <Button size="sm" onClick={handleAddNote}>
            Add note on page
          </Button>
        )}
        {tool === 'rect' && (
          <Button size="sm" onClick={handleAddRect}>
            Add rectangle
          </Button>
        )}
        {selectedAnnId && (
          <Button size="sm" variant="destructive" onClick={handleDeleteSelected}>
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
        <div className="flex-1" />
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Page {currentPage} / {numPages}
        </span>
        <Button
          size="sm"
          variant="outline"
          disabled={currentPage <= 1}
          onClick={() => setCurrentPage((p) => p - 1)}
        >
          Prev
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={currentPage >= numPages}
          onClick={() => setCurrentPage((p) => p + 1)}
        >
          Next
        </Button>
      </div>
      <div ref={containerRef} className="flex-1 overflow-auto p-4 flex justify-center">
        <div className="relative inline-block">
          <canvas ref={canvasRef} className="shadow-lg" />
          <div className="absolute inset-0 pointer-events-none">
            {pageAnnotations.map((ann) => (
              <div
                key={ann.id}
                className={cn(
                  'absolute border-2 pointer-events-auto cursor-pointer',
                  selectedAnnId === ann.id ? 'border-blue-500 ring-2 ring-blue-300' : 'border-transparent',
                )}
                style={
                  ann.type === 'note' && 'x' in ann.position && 'y' in ann.position
                    ? {
                        left: (ann.position as { x: number }).x,
                        top: (ann.position as { y: number }).y,
                        minWidth: 80,
                        minHeight: 40,
                        backgroundColor: ann.color ?? '#fef08a',
                      }
                    : ann.type === 'rect' && 'width' in ann.position && 'height' in ann.position
                      ? {
                          left: (ann.position as { x: number }).x,
                          top: (ann.position as { y: number }).y,
                          width: (ann.position as { width: number }).width,
                          height: (ann.position as { height: number }).height,
                          backgroundColor: (ann.color ?? '#93c5fd') + '80',
                        }
                      : undefined
                }
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedAnnId(ann.id);
                }}
              >
                {ann.type === 'note' && ann.content && (
                  <span className="text-xs p-1 block">{ann.content}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
