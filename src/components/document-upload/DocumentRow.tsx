import { useState, useRef } from 'react'
import { CheckCircle2, Loader2, Upload, ExternalLink, FileText } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { cn } from '@/lib/utils'
import { uploadDocument } from '@/services/document-upload'

interface DocumentRowProps {
  landId: string
  documentKey: string
  documentLabel: string
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
  const fileUrl = fileName ? pb.files.getURL(check, fileName) : check?.document_url

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
      console.log('[DocumentUpload] DocumentRow: starting upload', {
        landId,
        documentKey,
        fileName: file.name,
        clusterSerial,
      })
      await uploadDocument(landId, documentKey, file, clusterSerial)
      console.log('[DocumentUpload] DocumentRow: upload succeeded', { landId, documentKey })
      toast({ title: `Documento ${documentLabel} enviado com sucesso!` })
      onUploaded()
    } catch (err) {
      console.log('[DocumentUpload] DocumentRow: upload failed', { error: err })
      toast({
        title: err instanceof Error ? err.message : 'Erro ao enviar arquivo. Tente novamente.',
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
      <span
        className={cn(
          'text-sm font-medium flex-1 truncate',
          isCompleted ? 'text-brand-primary/60' : 'text-brand-primary',
        )}
      >
        {documentLabel}
      </span>
      <span
        className={cn(
          'text-xs font-semibold px-2 py-1 rounded-full shrink-0',
          isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700',
        )}
      >
        {isCompleted ? 'Enviado' : 'Pendente'}
      </span>
      {isCompleted && fileUrl && (
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-8 h-8 flex items-center justify-center text-brand-primary/40 hover:text-brand-secondary transition-colors shrink-0"
          aria-label="Ver documento"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
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
