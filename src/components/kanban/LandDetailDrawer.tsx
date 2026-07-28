import { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Loader2, MapPin, Ruler, User, AlertCircle, Building2, X } from 'lucide-react'
import { fetchLandDetail } from '@/services/lands'
import { getStatusLabel } from '@/lib/status-mapping'
import { useRealtime } from '@/hooks/use-realtime'
import pb from '@/lib/pocketbase/client'

interface LandDetailDrawerProps {
  landId: string | null
  open: boolean
  onClose: () => void
}

const VisuallyHidden = ({ children }: { children: React.ReactNode }) => (
  <span className="sr-only">{children}</span>
)

export function LandDetailDrawer({ landId, open, onClose }: LandDetailDrawerProps) {
  const [land, setLand] = useState<any>(null)
  const [metadata, setMetadata] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const fetchData = async () => {
    if (!landId) return
    setLoading(true)
    try {
      const data = await fetchLandDetail(landId)
      const landData = data?.data || data
      setLand(landData)

      try {
        const clusterSerial = landData?.clusterSerial || landData?.external_id || landId
        const meta = await pb
          .collection('land_metadata')
          .getFirstListItem(`external_id="${landId}" || external_id="${clusterSerial}"`, {
            expand: 'responsible_user,external_offices',
          })
        setMetadata(meta)
      } catch {
        setMetadata(null)
      }
    } catch (err) {
      console.error('Failed to fetch land detail:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && landId) {
      fetchData()
    }
  }, [open, landId])

  useRealtime('land_metadata', (e) => {
    if (
      open &&
      landId &&
      (e.record.external_id === landId || e.record.external_id === land?.clusterSerial)
    ) {
      fetchData()
    }
  })

  const locationStr = `${land?.geomCityName || land?.city || 'N/A'}, ${land?.geomAcronymState || land?.state || 'N/A'}`
  const responsibleName =
    metadata?.expand?.responsible_user?.name || land?.providerEmployee?.name || 'Não atribuído'
  const officeName = metadata?.expand?.external_offices?.name

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetTitle className="sr-only">Detalhes da Terra</SheetTitle>
      <SheetContent className="sm:max-w-[500px] w-full p-0 flex flex-col h-full bg-white shadow-2xl overflow-hidden">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-brand-secondary" />
          </div>
        ) : !land ? (
          <div className="flex-1 flex items-center justify-center p-6 text-center text-brand-primary/60">
            Terra não encontrada.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 border-b border-brand-primary/10">
              <div className="flex items-center gap-2 mb-3">
                <span className="font-label font-bold uppercase tracking-widest text-[10px] text-brand-primary/50 bg-slate-50 px-2 py-0.5 rounded-md border border-brand-primary/10">
                  {land.clusterSerial || land.external_id || land.id}
                </span>
              </div>
              <h2 className="font-display font-light text-2xl text-brand-primary mb-4">
                {land.name || 'Propriedade sem nome'}
              </h2>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className="bg-white border-brand-primary/10 text-brand-primary font-semibold"
                >
                  <MapPin className="w-3 h-3 mr-1" /> {locationStr}
                </Badge>
                <Badge
                  variant="outline"
                  className="bg-white border-brand-primary/10 text-brand-primary font-semibold"
                >
                  <Ruler className="w-3 h-3 mr-1" /> {(land.area || 0).toLocaleString('pt-BR')} ha
                </Badge>
                <Badge
                  variant="outline"
                  className="bg-white border-brand-primary/10 text-brand-primary font-semibold"
                >
                  <AlertCircle className="w-3 h-3 mr-1" />{' '}
                  {getStatusLabel(land.currentStatus?.name || land.status)}
                </Badge>
                {officeName && (
                  <Badge
                    variant="outline"
                    className="bg-white border-brand-primary/10 text-brand-primary font-semibold"
                  >
                    <Building2 className="w-3 h-3 mr-1" /> {officeName}
                  </Badge>
                )}
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-brand-primary/10">
                <h3 className="text-sm font-bold text-brand-primary mb-3 flex items-center gap-2">
                  <User className="w-4 h-4 text-brand-secondary" /> Responsável
                </h3>
                <p className="text-sm text-brand-primary/80">{responsibleName}</p>
              </div>

              {metadata && (
                <div className="bg-slate-50 p-4 rounded-xl border border-brand-primary/10 space-y-3">
                  <h3 className="text-sm font-bold text-brand-primary flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-brand-secondary" /> Metadados
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-xs text-brand-primary/60 font-semibold uppercase">
                        Risco
                      </span>
                      <p className="text-sm text-brand-primary capitalize">
                        {metadata.risk_level || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-brand-primary/60 font-semibold uppercase">
                        DDA
                      </span>
                      <p className="text-sm text-brand-primary capitalize">
                        {metadata.dda_status || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-brand-primary/60 font-semibold uppercase">
                        Estado Civil
                      </span>
                      <p className="text-sm text-brand-primary capitalize">
                        {metadata.owner_marital_status || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-slate-50 p-4 rounded-xl border border-brand-primary/10">
                <h3 className="text-sm font-bold text-brand-primary mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-brand-secondary" /> Informações Adicionais
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-brand-primary/60">Bioma</span>
                    <span className="text-brand-primary font-medium">{land.biome || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brand-primary/60">Tipo de Negociação</span>
                    <span className="text-brand-primary font-medium">
                      {land.landNegotiationType?.description || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brand-primary/60">Probabilidade</span>
                    <span className="text-brand-primary font-medium">
                      {land.closingProbability || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
