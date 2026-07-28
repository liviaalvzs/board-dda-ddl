import { useState, useRef } from 'react'
import { CheckCircle2, Loader2, Upload, RefreshCw, ExternalLink, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import pb from '@/lib/pocketbase/client'
import { uploadDocument } from '@/services/document-upload'

interface DocumentItemProps {
  landId: string
  documentKey: string
  documentLabel: string
  check: any
  onUploaded: () => void
}

const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png']
const ALLOWED_MIMES = ['application/pdf', 'image/jpeg', 'image/png']
const MAX_SIZE = 10 * 1024 * 1024

export function DocumentItem({
  landId,
  documentKey,
  documentLabel,
  check,
  onUploaded,
}: DocumentItemProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const fileName = check?.document_file
    ? Array.isArray(check.document_file)
      ? check.document_file[0]
      : check.document_file
    : null
  const isUploaded = check?.is_completed && !!(check?.document_url || fileName)
  const fileUrl = fileName ? pb.files.getURL(check, fileName) : check?.document_url

  const validateFile = (file: File): string | null => {
    const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
    if (!ALLOWED_MIMES.includes(file.type) && !ALLOWED_EXTENSIONS.includes(ext)) {
      return 'Formato de arquivo não permitido. Aceitos: PDF, JPG, PNG.'
    }
    if (file.size > MAX_SIZE) {
      return 'O arquivo excede o tamanho máximo de 10 MB.'
    }
    return null
  }

  const handleFile = async (file: File) => {
    setError('')
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }
    setUploading(true)
    try {
      await uploadDocument(landId, documentKey, file)
      toast({ title: `Documento ${documentLabel} enviado com sucesso!` })
      onUploaded()
    } catch {
      setError('Erro ao enviar arquivo. Tente novamente.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        const file = e.dataTransfer.files?.[0]
        if (file) handleFile(file)
      }}
      className={cn(
        'rounded-xl border p-4 transition-colors',
        isUploaded ? 'border-emerald-200 bg-emerald-50/30' : 'border-brand-primary/10 bg-white',
        dragOver && 'border-brand-secondary bg-brand-secondary/5 ring-2 ring-brand-secondary/20',
      )}
    >
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          {isUploaded ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          ) : (
            <div className="w-5 h-5 rounded-full border-2 border-brand-primary/20 shrink-0" />
          )}
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-primary/40" />
            <span className="text-sm font-semibold text-brand-primary">{documentLabel}</span>
            <span
              className={cn(
                'text-xs font-medium',
                isUploaded ? 'text-emerald-600' : 'text-brand-primary/40',
              )}
            >
              {isUploaded ? 'Enviado' : 'Pendente'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isUploaded && fileUrl && (
            <Button variant="outline" size="sm" asChild>
              <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3.5 h-3.5 mr-1" /> Ver
              </a>
            </Button>
          )}
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
          <Button
            variant={isUploaded ? 'outline' : 'default'}
            size="sm"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              isUploaded
                ? 'border-brand-primary/20 text-brand-primary/60 hover:text-brand-primary'
                : 'bg-brand-secondary hover:bg-brand-secondary/90 text-white',
            )}
          >
            {uploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Enviando...
              </>
            ) : isUploaded ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> Substituir
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5 mr-1" /> Enviar
              </>
            )}
          </Button>
        </div>
      </div>
      {error && <p className="text-xs text-brand-critical mt-2 ml-8">{error}</p>}
    </div>
  )
}
