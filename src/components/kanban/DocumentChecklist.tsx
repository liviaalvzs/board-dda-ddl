import { useState, useEffect } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { ExternalLink, FileText, CheckCircle2, Circle } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'

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
      const records = await pb.collection('document_checks').getFullList({
        filter: `land_id="${landId}"`,
      })
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
    if (e.record.land_id === landId) {
      fetchChecks()
    }
  })

  const handleMaritalStatusChange = async (val: string) => {
    try {
      if (metadata?.id) {
        await pb.collection('land_metadata').update(metadata.id, { owner_marital_status: val })
      } else {
        await pb
          .collection('land_metadata')
          .create({ external_id: landId, owner_marital_status: val })
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleCheck = async (key: string, checked: boolean) => {
    const existing = checks[key]
    setChecks((prev) => ({ ...prev, [key]: { ...prev[key], is_completed: checked } }))
    try {
      if (existing?.id) {
        await pb.collection('document_checks').update(existing.id, { is_completed: checked })
      } else {
        await pb.collection('document_checks').create({
          land_id: landId,
          document_key: key,
          is_completed: checked,
        })
      }
    } catch (e) {
      fetchChecks()
    }
  }

  const handleUrlBlur = async (key: string, url: string) => {
    const existing = checks[key]
    if (existing?.document_url === url) return

    setChecks((prev) => ({ ...prev, [key]: { ...prev[key], document_url: url } }))
    try {
      if (existing?.id) {
        await pb.collection('document_checks').update(existing.id, { document_url: url })
      } else {
        await pb.collection('document_checks').create({
          land_id: landId,
          document_key: key,
          document_url: url,
        })
      }
    } catch (e) {
      fetchChecks()
    }
  }

  const baseItems: ChecklistItem[] = [
    { key: 'rg_cpf', label: 'RG/CPF', category: 'Do Proprietário' },
    {
      key: 'comprovante_residencia',
      label: 'Comprovante de Residência',
      category: 'Do Proprietário',
    },
    { key: 'matricula', label: 'Matrícula', category: 'Do Imóvel' },
    { key: 'ccir', label: 'CCIR', category: 'Do Imóvel' },
    { key: 'itr', label: 'ITR', category: 'Do Imóvel' },
    { key: 'car', label: 'CAR', category: 'Do Imóvel' },
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
  ]

  if (maritalStatus === 'divorciado') {
    baseItems.push({
      key: 'documento_divorcio',
      label: 'Documento de Divórcio',
      category: 'Do Proprietário',
    })
  }

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

  const categories = Array.from(new Set(baseItems.map((i) => i.category)))

  if (loading) return null

  return (
    <Accordion type="single" collapsible defaultValue="checklist" className="w-full">
      <AccordionItem
        value="checklist"
        className="border border-brand-primary/5 bg-white rounded-rg shadow-rg-card overflow-hidden"
      >
        <AccordionTrigger className="hover:no-underline hover:bg-brand-primary/[0.02] transition-colors py-5 px-5 group">
          <div className="flex items-center justify-between w-full pr-2">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-brand-primary" strokeWidth={1.5} />
              <span className="font-display text-[1.2rem] text-brand-primary font-light">
                Checklist de Documentos
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-brand-primary/70 font-semibold bg-brand-primary/5 px-3 py-1 rounded-md mr-2">
              {completedCount === totalItems && totalItems > 0 ? (
                <CheckCircle2 className="w-4 h-4 text-brand-secondary" />
              ) : (
                <Circle className="w-4 h-4 text-brand-warning" />
              )}
              {completedCount} / {totalItems} concluídos
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="pb-5 px-5 space-y-6">
          <div className="h-px w-full bg-brand-primary/5 mb-4 -mt-2" />
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-brand-primary/5 p-4 rounded-xl border border-brand-primary/10">
            <Label className="text-sm font-semibold text-brand-primary uppercase tracking-rg text-[11px]">
              Estado Civil do Proprietário
            </Label>
            <Select value={maritalStatus} onValueChange={handleMaritalStatusChange}>
              <SelectTrigger className="w-[180px] bg-white h-9 border-brand-primary/20 text-brand-primary font-medium">
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

          <div className="space-y-8">
            {categories.map((cat) => {
              const catItems = baseItems.filter((i) => i.category === cat)
              const catCompleted = catItems.filter((i) => checks[i.key]?.is_completed).length
              return (
                <div key={cat} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <h4 className="rg-label text-brand-primary">{cat}</h4>
                    <div className="h-px bg-brand-primary/10 flex-1" />
                    <span className="text-[11px] font-semibold text-brand-primary/60">
                      {catCompleted}/{catItems.length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {catItems.map((item) => {
                      const check = checks[item.key]
                      const isCompleted = check?.is_completed || false
                      const url = check?.document_url || ''

                      return (
                        <div
                          key={item.key}
                          className="flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 rounded-xl border border-brand-primary/10 hover:border-brand-secondary/40 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <Checkbox
                              checked={isCompleted}
                              onCheckedChange={(c) => handleCheck(item.key, !!c)}
                              id={`check-${item.key}`}
                              className="data-[state=checked]:bg-brand-secondary data-[state=checked]:text-brand-primary data-[state=checked]:border-brand-secondary w-5 h-5"
                            />
                            <Label
                              htmlFor={`check-${item.key}`}
                              className={`text-sm cursor-pointer select-none font-medium ${
                                isCompleted
                                  ? 'text-brand-primary/50 line-through'
                                  : 'text-brand-primary'
                              }`}
                            >
                              {item.label}
                            </Label>
                          </div>
                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <Input
                              placeholder="URL do documento..."
                              defaultValue={url}
                              onBlur={(e) => handleUrlBlur(item.key, e.target.value)}
                              className="h-9 text-xs flex-1 sm:w-[260px] border-brand-primary/20 focus-visible:ring-brand-secondary"
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 shrink-0 border-brand-primary/20 text-brand-primary hover:bg-brand-secondary/10 hover:text-brand-secondary hover:border-brand-secondary"
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
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
