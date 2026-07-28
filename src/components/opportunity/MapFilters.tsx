import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Filter } from 'lucide-react'

export interface MapFilterValues {
  opportunityId: string
  companyId: string
  primaryOwner: string
  stageFilter: string
  healthFilter: string
}

interface MapFiltersProps {
  filters: MapFilterValues
  onChange: (filters: MapFilterValues) => void
  availableStages: string[]
}

export function MapFilters({ filters, onChange, availableStages }: MapFiltersProps) {
  const handleChange = (field: keyof MapFilterValues, value: string) => {
    onChange({ ...filters, [field]: value })
  }

  return (
    <div className="absolute top-4 left-4 z-[1000] bg-white rounded-xl shadow-lg border border-brand-primary/10 p-4 w-[280px] space-y-3 animate-fade-in-up">
      <div className="flex items-center gap-2 pb-2 border-b border-brand-primary/10">
        <Filter className="w-4 h-4 text-brand-secondary" />
        <span className="text-sm font-bold text-brand-primary">Filtros</span>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-brand-primary/60 uppercase tracking-wider">
          Opportunity ID
        </Label>
        <Input
          placeholder="Buscar por ID..."
          value={filters.opportunityId}
          onChange={(e) => handleChange('opportunityId', e.target.value)}
          className="h-9 text-sm border-brand-primary/20 rounded-lg"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-brand-primary/60 uppercase tracking-wider">
          Empresa
        </Label>
        <Input
          placeholder="company_id..."
          value={filters.companyId}
          onChange={(e) => handleChange('companyId', e.target.value)}
          className="h-9 text-sm border-brand-primary/20 rounded-lg"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-brand-primary/60 uppercase tracking-wider">
          Proprietário
        </Label>
        <Input
          placeholder="primary_owner..."
          value={filters.primaryOwner}
          onChange={(e) => handleChange('primaryOwner', e.target.value)}
          className="h-9 text-sm border-brand-primary/20 rounded-lg"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-brand-primary/60 uppercase tracking-wider">
          Etapa (visual)
        </Label>
        <Select
          value={filters.stageFilter}
          onValueChange={(v) => handleChange('stageFilter', v === 'all' ? '' : v)}
        >
          <SelectTrigger className="h-9 text-sm border-brand-primary/20 rounded-lg">
            <SelectValue placeholder="Todas as etapas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as etapas</SelectItem>
            {availableStages.map((stage) => (
              <SelectItem key={stage} value={stage}>
                {stage}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-brand-primary/60 uppercase tracking-wider">
          Saúde (visual)
        </Label>
        <Select
          value={filters.healthFilter}
          onValueChange={(v) => handleChange('healthFilter', v === 'all' ? '' : v)}
        >
          <SelectTrigger className="h-9 text-sm border-brand-primary/20 rounded-lg">
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="high">Alto risco</SelectItem>
            <SelectItem value="medium">Médio risco</SelectItem>
            <SelectItem value="low">Baixo risco</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
