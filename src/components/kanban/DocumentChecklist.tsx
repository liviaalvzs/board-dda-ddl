import { useState, useEffect } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { ExternalLink, CheckCircle2, User, FileText } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface ChecklistItem {
  key: string
  label: string
  category: string
}

export function DocumentChecklist({ landId, metadata }: { landId: string; metadata: any }) {
  const [checks, setChecks] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)

  const maritalStatus = metadata?.owner_marital_status || 'solteiro'

  const fetchChecks = async () => {
    try {
      const records = await pb
        .collection('document_checks')
        .getFullList({ filter: `land_id="${landId}"` })
      const map: Record<string, any> = {}
      records.forEach((r) => {
        map[r.document_key] = r
      })
      setChecks(map)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchChecks()
  }, [landId])
  useRealtime('document_checks', (e) => {
    if (e.record.land_id === landId) fetchChecks()
  })

  const handleMaritalStatusChange = async (val: string) => {
    try {
      if (metadata?.id)
        await pb.collection('land_metadata').update(metadata.id, { owner_marital_status: val })
      else
        await pb
          .collection('land_metadata')
          .create({ external_id: landId, owner_marital_status: val })
    } catch (err) {
      console.error(err)
    }
  }

  const handleCheck = async (key: string, checked: boolean) => {
    const existing = checks[key]
    setChecks((prev) => ({
      ...prev,
      [key]: { ...prev[key], is_completed: checked, updated: new Date().toISOString() },
    }))
    try {
      if (existing?.id)
        await pb.collection('document_checks').update(existing.id, { is_completed: checked })
      else
        await pb
          .collection('document_checks')
          .create({ land_id: landId, document_key: key, is_completed: checked })
    } catch (e) {
      fetchChecks()
    }
  }

  const handleUrlBlur = async (key: string, url: string) => {
    const existing = checks[key]
    if (existing?.document_url === url) return
    setChecks((prev) => ({ ...prev, [key]: { ...prev[key], document_url: url } }))
    try {
      if (existing?.id)
        await pb.collection('document_checks').update(existing.id, { document_url: url })
      else
        await pb
          .collection('document_checks')
          .create({ land_id: landId, document_key: key, document_url: url })
    } catch (e) {
      fetchChecks()
    }
  }

  const baseItems: ChecklistItem[] = [
    { key: 'rg_cpf', label: 'RG/CPF', category: 'Documentos do Proprietário' },
    {
      key: 'comprovante_residencia',
      label: 'Comprovante de Residência',
      category: 'Documentos do Proprietário',
    },
    { key: 'matricula', label: 'Matrícula', category: 'Documentos do Imóvel' },
    { key: 'ccir', label: 'CCIR', category: 'Documentos do Imóvel' },
    { key: 'itr', label: 'ITR', category: 'Documentos do Imóvel' },
    { key: 'car', label: 'CAR', category: 'Documentos do Imóvel' },
    { key: 'ibama', label: 'IBAMA', category: 'Certidões Ambientais e Fiscais' },
    {
      key: 'trabalho_escravo',
      label: 'Trabalho Escravo',
      category: 'Certidões Ambientais e Fiscais',
    },
    {
      key: 'debitos_federais',
      label: 'Débitos Federais',
      category: 'Certidões Ambientais e Fiscais',
    },
    { key: 'dda_existente', label: 'DDA Existente', category: 'DDA' },
    { key: 'dda_distribuida', label: 'DDA Distribuída', category: 'DDA' },
  ]

  if (maritalStatus === 'divorciado')
    baseItems.push({
      key: 'documento_divorcio',
      label: 'Documento de Divórcio',
      category: 'Documentos do Proprietário',
    })
  if (maritalStatus === 'casado') {
    baseItems.push({
      key: 'rg_cpf_conjuge',
      label: 'RG/CPF do Cônjuge',
      category: 'Documentos do Cônjuge',
    })
    baseItems.push({
      key: 'certidao_casamento',
      label: 'Certidão de Casamento',
      category: 'Documentos do Cônjuge',
    })
  }

  const totalItems = baseItems.length
  const completedCount = baseItems.filter((i) => checks[i.key]?.is_completed).length
  const progressPercent = totalItems > 0 ? (completedCount / totalItems) * 100 : 0
  const categories = Array.from(new Set(baseItems.map((i) => i.category)))

  if (loading) return null

  return (
    <div className="space-y-6">
      {/* Global Progress */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-brand-primary/10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-4">
          <div>
            <h3 className="text-xl font-display text-brand-primary flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-brand-secondary" /> Progresso da Due Diligence
            </h3>
            <p className="text-sm font-medium text-brand-primary/60 mt-1">
              {completedCount} de {totalItems} documentos validados
            </p>
          </div>
          <span className="text-3xl font-bold text-brand-secondary leading-none">
            {Math.round(progressPercent)}%
          </span>
        </div>
        <Progress
          value={progressPercent}
          className="h-3 bg-brand-primary/5"
          indicatorClassName="bg-brand-secondary transition-all duration-500 ease-in-out"
        />
      </div>

      {/* Marital Status Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-brand-primary/10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-primary/5 flex items-center justify-center shrink-0">
            <User className="w-5 h-5 text-brand-primary/60" />
          </div>
          <div>
            <Label className="text-sm font-bold text-brand-primary">
              Estado Civil do Proprietário
            </Label>
            <p className="text-xs text-brand-primary/60">
              Define os documentos exigidos para o cônjuge.
            </p>
          </div>
        </div>
        <Select value={maritalStatus} onValueChange={handleMaritalStatusChange}>
          <SelectTrigger className="w-full sm:w-[200px] bg-white h-10 border-brand-primary/20 text-brand-primary font-semibold">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="solteiro">Solteiro</SelectItem>
            <SelectItem value="casado">Casado</SelectItem>
            <SelectItem value="divorciado">Divorciado</SelectItem>
            <SelectItem value="viuvo">Viúvo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Categories */}
      <div className="space-y-4">
        {categories.map((cat) => {
          const catItems = baseItems.filter((i) => i.category === cat)
          const catCompleted = catItems.filter((i) => checks[i.key]?.is_completed).length

          return (
            <div
              key={cat}
              className="bg-white rounded-xl border border-brand-primary/10 shadow-sm overflow-hidden animate-slide-up"
            >
              <div className="bg-brand-primary/[0.02] px-5 py-4 border-b border-brand-primary/5 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-brand-primary/50" />
                  <h4 className="font-semibold text-brand-primary text-[15px]">{cat}</h4>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 bg-white rounded-md text-brand-primary/60 border border-brand-primary/10 shadow-sm">
                  {catCompleted}/{catItems.length}
                </span>
              </div>
              <div className="divide-y divide-brand-primary/5">
                {catItems.map((item) => {
                  const check = checks[item.key]
                  const isCompleted = check?.is_completed || false
                  const url = check?.document_url || ''

                  return (
                    <div
                      key={item.key}
                      className={cn(
                        'flex flex-col md:flex-row md:items-center gap-4 p-5 transition-colors hover:bg-brand-primary/[0.01]',
                        isCompleted && 'bg-emerald-50/30',
                      )}
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <Checkbox
                          checked={isCompleted}
                          onCheckedChange={(c) => handleCheck(item.key, !!c)}
                          id={`check-${item.key}`}
                          className="data-[state=checked]:bg-emerald-500 data-[state=checked]:text-white data-[state=checked]:border-emerald-500 w-5 h-5 mt-0.5 rounded shadow-sm border-brand-primary/20"
                        />
                        <div className="flex flex-col">
                          <Label
                            htmlFor={`check-${item.key}`}
                            className={cn(
                              'text-sm cursor-pointer select-none font-semibold',
                              isCompleted ? 'text-brand-primary/60' : 'text-brand-primary',
                            )}
                          >
                            {item.label}
                          </Label>
                          {isCompleted && check?.updated && (
                            <span className="text-[10px] font-medium text-emerald-600 mt-1 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Concluído em{' '}
                              {format(new Date(check.updated), 'dd/MM/yyyy')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 w-full md:w-auto md:min-w-[300px]">
                        <Input
                          placeholder="URL do documento no Sharepoint..."
                          defaultValue={url}
                          onBlur={(e) => handleUrlBlur(item.key, e.target.value)}
                          className={cn(
                            'h-9 text-xs flex-1 border-brand-primary/20 bg-white',
                            url && 'pr-8',
                          )}
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className={cn(
                            'h-9 w-9 shrink-0 shadow-sm transition-colors',
                            url
                              ? 'border-brand-secondary text-brand-secondary hover:bg-brand-secondary hover:text-white'
                              : 'border-brand-primary/10 text-brand-primary/30',
                          )}
                          disabled={!url}
                          onClick={() => window.open(url, '_blank')}
                          title="Abrir documento"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
