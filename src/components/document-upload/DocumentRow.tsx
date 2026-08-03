import { useState, useRef } from 'react'
import { CheckCircle2, Loader2, Upload, RefreshCw, FileText } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { uploadDocument } from '@/services/document-upload'
import { DocumentInfo } from '@/components/document-upload/DocumentInfo'
import { DocumentFileActions } from '@/components/document-upload/DocumentFileActions'

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

  const isCompleted = !!(check?.is_completed && check?.document_url)

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
      toast({
        title: isCompleted
          ? `Documento ${documentLabel} substituído. A versão anterior foi arquivada.`
          : `Documento ${documentLabel} enviado com sucesso!`,
      })
      onUploaded()
    } catch (err) {
      toast({ title: getErrorMessage(err) })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div
      className={cn(
        'px-4 py-3.5 transition-colors',
        isCompleted ? 'bg-emerald-50/40' : 'hover:bg-brand-primary/[0.02]',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">
          {isCompleted ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          ) : (
            <FileText className="w-5 h-5 text-amber-500" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Nome com largura total e quebra livre: os rótulos dos anexos são
              longos e vários só se distinguem no final ("...do cônjuge"). */}
          <div className="flex items-start gap-1">
            <span
              className={cn(
                'text-sm font-medium leading-snug break-words',
                isCompleted ? 'text-brand-primary/60' : 'text-brand-primary',
              )}
            >
              {documentLabel}
            </span>
            <DocumentInfo label={documentLabel} description={documentDescription} />
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span
              className={cn(
                'text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0',
                isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700',
              )}
            >
              {isCompleted ? 'Enviado' : 'Pendente'}
            </span>

            <div className="flex items-center gap-1.5 ml-auto">
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

              {isCompleted && check?.id && (
                <DocumentFileActions checkId={check.id} documentLabel={documentLabel} />
              )}

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className={cn(
                  'h-10 px-4 rounded-lg flex items-center gap-1.5 text-xs font-semibold disabled:opacity-50 transition-colors',
                  isCompleted
                    ? 'border border-brand-primary/15 text-brand-primary/70 hover:text-brand-secondary hover:border-brand-secondary/40'
                    : 'bg-brand-secondary hover:bg-brand-secondary/90 text-white',
                )}
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isCompleted ? (
                  <RefreshCw className="w-4 h-4" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {uploading ? 'Enviando' : isCompleted ? 'Substituir' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
