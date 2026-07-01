import { useState, useEffect } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

interface Option {
  value: string
  label: string
}

interface MetadataPanelProps {
  metadata: any
  users: Array<{ id: string; name: string }>
  offices: Array<{ id: string; name: string }>
  onUpdate: (field: string, value: any) => Promise<void>
  disabled?: boolean
}

const MARITAL_OPTIONS: Option[] = [
  { value: 'solteiro', label: 'Solteiro' },
  { value: 'casado', label: 'Casado' },
  { value: 'divorciado', label: 'Divorciado' },
  { value: 'viuvo', label: 'Viúvo' },
]

const RISK_OPTIONS: Option[] = [
  { value: 'low', label: 'Baixo' },
  { value: 'medium', label: 'Médio' },
  { value: 'high', label: 'Alto' },
]

const DDA_OPTIONS: Option[] = [
  { value: 'existing', label: 'Existente' },
  { value: 'distributed', label: 'Distribuído' },
]

function FieldSelect({
  label,
  value,
  options,
  noneLabel,
  onChange,
  disabled,
  loading,
}: {
  label: string
  value: string
  options: Option[]
  noneLabel: string
  onChange: (val: string) => void
  disabled: boolean
  loading: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-[11px] text-brand-primary/60 font-semibold uppercase tracking-wider">
        {label}
      </Label>
      <div className="flex items-center gap-2">
        <Select value={value} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger className="text-sm font-medium h-9">
            <SelectValue placeholder="Selecionar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none" className="text-brand-primary/60 italic">
              {noneLabel}
            </SelectItem>
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {loading && <Loader2 className="w-3.5 h-3.5 text-brand-secondary animate-spin shrink-0" />}
      </div>
    </div>
  )
}

export function MetadataPanel({
  metadata,
  users,
  offices,
  onUpdate,
  disabled,
}: MetadataPanelProps) {
  const [updatingField, setUpdatingField] = useState<string | null>(null)
  const [statusValue, setStatusValue] = useState(metadata?.status || '')

  useEffect(() => {
    setStatusValue(metadata?.status || '')
  }, [metadata?.status])

  const handleChange = async (field: string, value: any) => {
    setUpdatingField(field)
    try {
      await onUpdate(field, value)
    } finally {
      setUpdatingField(null)
    }
  }

  const handleStatusBlur = () => {
    if (statusValue !== (metadata?.status || '')) {
      handleChange('status', statusValue)
    }
  }

  const isFieldDisabled = (field: string) =>
    disabled || (updatingField !== null && updatingField !== field)
  const isFieldLoading = (field: string) => updatingField === field
  const selectVal = (v: any) => v || 'none'

  return (
    <div className="bg-white p-5 rounded-xl border border-brand-primary/10 shadow-sm space-y-4">
      <h3 className="font-display text-lg text-brand-primary flex items-center gap-2 border-b border-brand-primary/5 pb-3">
        Metadados Editáveis
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label className="text-[11px] text-brand-primary/60 font-semibold uppercase tracking-wider">
            Status
          </Label>
          <div className="relative">
            <Input
              value={statusValue}
              onChange={(e) => setStatusValue(e.target.value)}
              onBlur={handleStatusBlur}
              disabled={isFieldDisabled('status')}
              placeholder="Digite o status..."
              className="text-sm font-medium h-9 pr-8"
            />
            {isFieldLoading('status') && (
              <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-secondary animate-spin" />
            )}
          </div>
        </div>

        <FieldSelect
          label="Responsável"
          value={selectVal(metadata?.responsible_user)}
          noneLabel="Nenhum"
          options={users.map((u) => ({ value: u.id, label: u.name }))}
          onChange={(val) => handleChange('responsible_user', val === 'none' ? null : val)}
          disabled={isFieldDisabled('responsible_user')}
          loading={isFieldLoading('responsible_user')}
        />

        <FieldSelect
          label="Estado Civil"
          value={selectVal(metadata?.owner_marital_status)}
          noneLabel="Não informado"
          options={MARITAL_OPTIONS}
          onChange={(val) => handleChange('owner_marital_status', val === 'none' ? '' : val)}
          disabled={isFieldDisabled('owner_marital_status')}
          loading={isFieldLoading('owner_marital_status')}
        />

        <FieldSelect
          label="Escritório"
          value={selectVal(metadata?.external_offices)}
          noneLabel="Nenhum escritório"
          options={offices.map((o) => ({ value: o.id, label: o.name }))}
          onChange={(val) => handleChange('external_offices', val === 'none' ? null : val)}
          disabled={isFieldDisabled('external_offices')}
          loading={isFieldLoading('external_offices')}
        />

        <FieldSelect
          label="Nível de Risco"
          value={selectVal(metadata?.risk_level)}
          noneLabel="Não definido"
          options={RISK_OPTIONS}
          onChange={(val) => handleChange('risk_level', val === 'none' ? '' : val)}
          disabled={isFieldDisabled('risk_level')}
          loading={isFieldLoading('risk_level')}
        />

        <FieldSelect
          label="Status DDA"
          value={selectVal(metadata?.dda_status)}
          noneLabel="Nenhum"
          options={DDA_OPTIONS}
          onChange={(val) => handleChange('dda_status', val === 'none' ? '' : val)}
          disabled={isFieldDisabled('dda_status')}
          loading={isFieldLoading('dda_status')}
        />
      </div>
      {!metadata?.id && (
        <p className="text-sm text-amber-600 bg-amber-50 rounded-lg p-3 border border-amber-200">
          Nenhum metadado encontrado. Contate um administrador para criar o registro de metadados
          desta terra.
        </p>
      )}
    </div>
  )
}
