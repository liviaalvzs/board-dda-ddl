import { useState, useRef } from 'react'
import { FileText, Loader2, Check, Upload, User, FileStack } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { uploadDocument } from '@/services/document-upload'
import type { DocumentType } from '@/services/app-settings'
import { DocumentInfo } from '@/components/document-upload/DocumentInfo'
import { instanceKey } from '@/lib/document-groups'

export interface PendingInstance {
  doc: DocumentType
  subjectId: string
  subjectLabel: string
}

interface BulkUploadModalProps {
  open: boolean
  onClose: () => void
  /** Instâncias pendentes: o mesmo tipo pode aparecer para vários sujeitos. */
  pendingInstances: PendingInstance[]
  landId: string
  clusterSerial: string
  onComplete: () => void
}

export function BulkUploadModal({
  open,
  onClose,
  pendingInstances,
  landId,
  clusterSerial,
  onComplete,
}: BulkUploadModalProps) {
  // Indexado por instância, não por tipo: com dois proprietários, o mesmo
  // documento aparece duas vezes e a chave crua sobrescreveria um pelo outro.
  const [selectedFiles, setSelectedFiles] = useState<
    Record<string, { file: File; documentKey: string; subjectId: string }>
  >({})
  const [uploading, setUploading] = useState(false)
  const { toast } = useToast()
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const handleFileSelect = (uiKey: string, documentKey: string, subjectId: string, file: File) => {
    setSelectedFiles((prev) => ({ ...prev, [uiKey]: { file, documentKey, subjectId } }))
  }

  const handleUpload = async () => {
    const entries = Object.entries(selectedFiles)
    if (entries.length === 0) return
    setUploading(true)
    try {
      console.log('[DocumentUpload] BulkUploadModal: starting bulk upload', {
        landId,
        entries: entries.map(([uiKey, entry]) => ({ uiKey, fileName: entry.file.name })),
      })
      await Promise.all(
        entries.map(([, entry]) =>
          uploadDocument(landId, entry.documentKey, entry.file, clusterSerial, entry.subjectId),
        ),
      )
      console.log('[DocumentUpload] BulkUploadModal: all uploads succeeded', {
        count: entries.length,
      })
      toast({ title: `${entries.length} documento(s) enviado(s) com sucesso!` })
      setSelectedFiles({})
      onComplete()
      onClose()
    } catch (error) {
      console.log('[DocumentUpload] BulkUploadModal: upload failed', { error })
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
          {pendingInstances.map(({ doc, subjectId, subjectLabel }) => {
            const uiKey = instanceKey(doc.key, subjectId)
            const entry = selectedFiles[uiKey]
            const SubjectIcon = doc.category === 'Imóvel' ? FileStack : User
            return (
              <div
                key={uiKey}
                className="flex items-center gap-3 p-3 rounded-lg border border-brand-primary/10"
              >
                <FileText className="w-4 h-4 text-amber-500 shrink-0" />
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm font-medium text-brand-primary truncate">
                      {doc.label}
                    </span>
                    <DocumentInfo label={doc.label} description={doc.description} />
                  </div>
                  {/* Sem o sujeito não dá para saber de qual proprietário ou
                      matrícula é a linha — o nome do documento se repete. */}
                  <span className="mt-0.5 flex items-center gap-1 text-[11px] text-brand-primary/50">
                    <SubjectIcon className="h-3 w-3 shrink-0" />
                    <span className="truncate">{subjectLabel}</span>
                  </span>
                </div>
                <input
                  ref={(el) => {
                    fileInputRefs.current[uiKey] = el
                  }}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleFileSelect(uiKey, doc.key, subjectId, f)
                    e.target.value = ''
                  }}
                />
                <Button
                  variant={entry ? 'outline' : 'secondary'}
                  size="sm"
                  disabled={uploading}
                  onClick={() => fileInputRefs.current[uiKey]?.click()}
                  className="min-h-[44px] h-9"
                >
                  {entry ? (
                    <>
                      <Check className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                      <span className="text-xs truncate max-w-[80px]">{entry.file.name}</span>
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
