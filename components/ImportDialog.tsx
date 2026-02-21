import React, { useState } from 'react';
import { parseZoteroExport } from '../lib/zotero/importer';
import { applyImport } from '../lib/zotero/applyImport';
import type { ImportResult } from '../lib/zotero/importer';
import type { ZoteroExport } from '../lib/zotero/types';
import { Button } from './ui/button';
import { Dialog } from './ui/dialog';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

export function ImportDialog({ open, onOpenChange, onImported }: ImportDialogProps) {
  const [preview, setPreview] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setPreview(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result as string;
        const data = JSON.parse(text) as unknown;
        const result = parseZoteroExport(data as ZoteroExport);
        setPreview(result);
      } catch (err) {
        setError('Invalid file. Use a Zotero JSON export (e.g. from Better BibTeX or Zotero export).');
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!preview) return;
    setImporting(true);
    setError(null);
    try {
      await applyImport(preview);
      onImported();
      onOpenChange(false);
      setPreview(null);
    } catch (err) {
      setError(String(err));
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Import from Zotero"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!preview || importing}>
            {importing ? 'Importing...' : 'Import'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Export your Zotero library as JSON (e.g. Better BibTeX JSON export or Zotero translation format), then select the file.
        </p>
        <input
          type="file"
          accept=".json,application/json"
          onChange={handleFileChange}
          className="block w-full text-sm"
        />
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {preview && (
          <div className="text-sm text-gray-700 dark:text-gray-300">
            <p>{preview.items.length} items</p>
            <p>{preview.collections.length} collections</p>
            <p>{preview.tags.length} tags</p>
          </div>
        )}
      </div>
    </Dialog>
  );
}
