import { useState, useRef } from 'react'
import { FileText, Loader2, Check, Upload } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { uploadDocument } from '@/services/document-upload'
import type { DocumentType } from '@/services/app-settings'

interface BulkUploadModalProps {
  open: boolean
  onClose: () => void
  pendingDocs: DocumentType[]
  landId: string
  onComplete: () => void
}

export function BulkUploadModal({
  open,
  onClose,
  pendingDocs,
  landId,
  onComplete,
}: BulkUploadModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File>>({})
  const [uploading, setUploading] = useState(false)
  const { toast } = useToast()
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const handleFileSelect = (key: string, file: File) => {
    setSelectedFiles((prev) => ({ ...prev, [key]: file }))
  }

  const handleUpload = async () => {
    const entries = Object.entries(selectedFiles)
    if (entries.length === 0) return
    setUploading(true)
    try {
      await Promise.all(entries.map(([key, file]) => uploadDocument(landId, key, file)))
      toast({ title: `${entries.length} documento(s) enviado(s) com sucesso!` })
      setSelectedFiles({})
      onComplete()
      onClose()
    } catch {
      toast({ title: 'Erro ao enviar alguns documentos. Tente novamente.' })
    } finally {
      setUploading(false)
    }
  }

  const handleClose = () => {
    if (!uploading) {
      setSelectedFiles({})
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-brand-primary">Enviar documentos pendentes</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {pendingDocs.map((doc) => {
            const file = selectedFiles[doc.key]
            return (
              <div
                key={doc.key}
                className="flex items-center gap-3 p-3 rounded-lg border border-brand-primary/10"
              >
                <FileText className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-sm font-medium text-brand-primary flex-1 truncate">
                  {doc.label}
                </span>
                <input
                  ref={(el) => {
                    fileInputRefs.current[doc.key] = el
                  }}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleFileSelect(doc.key, f)
                    e.target.value = ''
                  }}
                />
                <Button
                  variant={file ? 'outline' : 'secondary'}
                  size="sm"
                  disabled={uploading}
                  onClick={() => fileInputRefs.current[doc.key]?.click()}
                  className="min-h-[44px] h-9"
                >
                  {file ? (
                    <>
                      <Check className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                      <span className="text-xs truncate max-w-[80px]">{file.name}</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5 mr-1" />
                      Selecionar
                    </>
                  )}
                </Button>
              </div>
            )
          })}
        </div>
        <Button
          onClick={handleUpload}
          disabled={Object.keys(selectedFiles).length === 0 || uploading}
          className="w-full min-h-[44px] bg-brand-secondary hover:bg-brand-secondary/90"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Enviar {Object.keys(selectedFiles).length} documento(s)
            </>
          )}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
