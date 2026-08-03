import { useState, useRef } from 'react'
import { CheckCircle2, Loader2, Upload, Eye, Download, FileText } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { cn } from '@/lib/utils'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { uploadDocument } from '@/services/document-upload'
import { DocumentInfo } from '@/components/document-upload/DocumentInfo'
import { DeleteDocumentButton } from '@/components/document-upload/DeleteDocumentButton'

interface DocumentRowProps {
  landId: string
  documentKey: string
  documentLabel: string
  documentDescription?: string
  check: any
  onUploaded: () => void
  clusterSerial: string
}

const ALLOWED_MIMES = ['application/pdf', 'image/jpeg', 'image/png']
const MAX_SIZE = 10 * 1024 * 1024

export function DocumentRow({
  landId,
  documentKey,
  documentLabel,
  documentDescription,
  check,
  onUploaded,
  clusterSerial,
}: DocumentRowProps) {
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const fileName = check?.document_file
    ? Array.isArray(check.document_file)
      ? check.document_file[0]
      : check.document_file
    : null
  const isCompleted = check?.is_completed && !!(check?.document_url || fileName)
  // O document_url aponta para o bucket privado do data lake e devolve
  // AccessDenied no navegador — quem serve o arquivo para a interface é sempre a
  // cópia do PocketBase, autenticada pela sessão do usuário.
  const viewUrl = fileName ? pb.files.getURL(check, fileName) : null
  const downloadUrl = fileName ? pb.files.getURL(check, fileName, { download: true }) : null

  const handleFile = async (file: File) => {
    const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
    if (!ALLOWED_MIMES.includes(file.type) && !['.pdf', '.jpg', '.jpeg', '.png'].includes(ext)) {
      toast({ title: 'Formato não permitido. Aceitos: PDF, JPG, PNG.' })
      return
    }
    if (file.size > MAX_SIZE) {
      toast({ title: 'O arquivo excede o tamanho máximo de 10 MB.' })
      return
    }
    setUploading(true)
    try {
      await uploadDocument(landId, documentKey, file, clusterSerial)
      toast({ title: `Documento ${documentLabel} enviado com sucesso!` })
      onUploaded()
    } catch (err) {
      toast({
        title: getErrorMessage(err),
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-brand-primary/[0.02] transition-colors min-h-[44px]">
      <div className="w-5 h-5 flex items-center justify-center shrink-0">
        {isCompleted ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        ) : (
          <FileText className="w-5 h-5 text-amber-500" />
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <span
          className={cn(
            'text-sm font-medium truncate',
            isCompleted ? 'text-brand-primary/60' : 'text-brand-primary',
          )}
        >
          {documentLabel}
        </span>
        <DocumentInfo label={documentLabel} description={documentDescription} />
      </div>
      <span
        className={cn(
          'text-xs font-semibold px-2 py-1 rounded-full shrink-0',
          isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700',
        )}
      >
        {isCompleted ? 'Enviado' : 'Pendente'}
      </span>
      {isCompleted && viewUrl && (
        <a
          href={viewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-8 h-8 flex items-center justify-center text-brand-primary/40 hover:text-brand-secondary transition-colors shrink-0"
          aria-label={`Visualizar ${documentLabel}`}
        >
          <Eye className="w-4 h-4" />
        </a>
      )}
      {isCompleted && downloadUrl && (
        <a
          href={downloadUrl}
          className="w-8 h-8 flex items-center justify-center text-brand-primary/40 hover:text-brand-secondary transition-colors shrink-0"
          aria-label={`Baixar ${documentLabel}`}
        >
          <Download className="w-4 h-4" />
        </a>
      )}
      {isCompleted && check?.id && (
        <DeleteDocumentButton
          checkId={check.id}
          documentLabel={documentLabel}
          onDeleted={onUploaded}
        />
      )}
      {!isCompleted && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
              e.target.value = ''
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-9 h-9 rounded-full bg-brand-secondary hover:bg-brand-secondary/90 text-white flex items-center justify-center shrink-0 disabled:opacity-50 transition-colors"
            aria-label={`Enviar ${documentLabel}`}
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
          </button>
        </>
      )}
    </div>
  )
}
