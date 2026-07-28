import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadLeaflet } from '@/lib/leaflet-loader'
import { getStageColor, getRiskColor, calculateCentroid, parseShapeWgs84 } from '@/lib/map-utils'
import {
  fetchLandIds,
  fetchLandGeometries,
  fetchAllLandMetadata,
  fetchOpportunitiesByFilter,
} from '@/services/lands'
import { MapFilters, type MapFilterValues } from '@/components/opportunity/MapFilters'
import { MapLegend } from '@/components/kanban/MapLegend'
import { LandDetailDrawer } from '@/components/kanban/LandDetailDrawer'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Loader2, MapPin } from 'lucide-react'
import { useRealtime } from '@/hooks/use-realtime'
import { getStatusLabel } from '@/lib/status-mapping'

const BRAZIL_CENTER: [number, number] = [-14.235, -51.9253]
const AMPLIFIED_KEY = 'mapa_amplified_indicators'

export default function Mapa() {
  const navigate = useNavigate()
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const polygonLayerRef = useRef<any>(null)
  const markerLayerRef = useRef<any>(null)
  const cancelledRef = useRef(false)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lands, setLands] = useState<any[]>([])
  const [metadataMap, setMetadataMap] = useState<Map<string, any>>(new Map())
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedLandId, setSelectedLandId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [amplified, setAmplified] = useState(() => localStorage.getItem(AMPLIFIED_KEY) === 'true')
  const [filters, setFilters] = useState<MapFilterValues>({
    opportunityId: '',
    companyId: '',
    primaryOwner: '',
    stageFilter: '',
    healthFilter: '',
  })
  const [availableStages, setAvailableStages] = useState<string[]>([])

  const selectedLayerRef = useRef<any>(null)
  const selectedOriginalStyleRef = useRef<any>(null)

  useRealtime('land_metadata', () => {
    setRefreshKey((k) => k + 1)
  })

  const restoreSelectedStyle = useCallback(() => {
    if (selectedLayerRef.current && selectedOriginalStyleRef.current) {
      selectedLayerRef.current.setStyle(selectedOriginalStyleRef.current)
      selectedLayerRef.current = null
      selectedOriginalStyleRef.current = null
    }
  }, [])

  const handleCloseDrawer = useCallback(() => {
    setDrawerOpen(false)
    restoreSelectedStyle()
  }, [restoreSelectedStyle])

  useEffect(() => {
    localStorage.setItem(AMPLIFIED_KEY, amplified ? 'true' : 'false')
    if (mapRef.current && markerLayerRef.current) {
      markerLayerRef.current.clearLayers()
      if (amplified && lands.length > 0) {
        renderMarkers()
      }
    }
  }, [amplified])

  const renderMarkers = useCallback(() => {
    const L = (window as any).L
    if (!L || !mapRef.current || !markerLayerRef.current) return

    markerLayerRef.current.clearLayers()

    for (const land of lands) {
      const shape = parseShapeWgs84(land.shapeWgs84)
      if (!shape) continue

      const centroid = calculateCentroid(shape)
      const meta = metadataMap.get(land.id || land.external_id || '')
      const markerColor = getRiskColor(meta?.risk_level) || getStageColor(land.currentStatus?.etapa)

      const marker = L.circleMarker(centroid, {
        radius: 8,
        fillColor: markerColor,
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8,
      })

      const pulseIcon = L.divIcon({
        className: 'map-pulse-marker',
        html: `<div style="position:relative;width:20px;height:20px;">
          <div style="position:absolute;inset:0;border-radius:50%;background:${markerColor};opacity:0.4;animation:map-pulse 1.5s ease-out infinite;"></div>
          <div style="position:absolute;inset:3px;border-radius:50%;background:${markerColor};border:2px solid #fff;box-shadow:0 0 4px rgba(0,0,0,0.3);"></div>
        </div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      })

      const pulseMarker = L.marker(centroid, { icon: pulseIcon })
      pulseMarker.on('click', () => {
        const landId = land.id || land.external_id
        setSelectedLandId(landId)
        setDrawerOpen(true)
      })
      markerLayerRef.current.addLayer(pulseMarker)
    }
  }, [lands, metadataMap])

  const loadData = useCallback(async () => {
    cancelledRef.current = false
    setLoading(true)
    setError(null)

    try {
      const [allIds, metaMap] = await Promise.all([fetchLandIds(), fetchAllLandMetadata()])
      if (cancelledRef.current) return

      let filteredIds = allIds

      if (filters.opportunityId || filters.companyId || filters.primaryOwner) {
        try {
          const matchingLandIds = await fetchOpportunitiesByFilter({
            opportunityId: filters.opportunityId || undefined,
            companyId: filters.companyId || undefined,
            primaryOwner: filters.primaryOwner || undefined,
          })
          if (matchingLandIds.length > 0) {
            filteredIds = allIds.filter((id) => matchingLandIds.includes(id))
          } else {
            filteredIds = []
          }
        } catch {
          filteredIds = []
        }
      }

      const geometries = await fetchLandGeometries(filteredIds)
      if (cancelledRef.current) return

      setLands(geometries)
      setMetadataMap(metaMap)

      const stages = new Set<string>()
      for (const land of geometries) {
        const stage = land.currentStatus?.etapa || land.currentStatus?.name
        if (stage) stages.add(stage)
      }
      setAvailableStages(Array.from(stages))
    } catch (err) {
      console.error('Error loading map data:', err)
      if (!cancelledRef.current) setError('Falha ao carregar dados do mapa.')
    } finally {
      if (!cancelledRef.current) setLoading(false)
    }
  }, [filters.opportunityId, filters.companyId, filters.primaryOwner])

  useEffect(() => {
    loadData()
    return () => {
      cancelledRef.current = true
    }
  }, [loadData, refreshKey])

  const filteredLands = useMemo(() => {
    return lands.filter((land) => {
      const stage = land.currentStatus?.etapa || land.currentStatus?.name || ''
      if (filters.stageFilter && stage !== filters.stageFilter) return false

      if (filters.healthFilter) {
        const meta = metadataMap.get(land.id || land.external_id || '')
        const risk = meta?.risk_level
        if (risk !== filters.healthFilter) return false
      }

      return true
    })
  }, [lands, filters.stageFilter, filters.healthFilter, metadataMap])

  const activeStages = useMemo(() => {
    const stages = new Set<string>()
    for (const land of filteredLands) {
      const stage = land.currentStatus?.etapa || land.currentStatus?.name
      if (stage) stages.add(stage)
    }
    return Array.from(stages)
  }, [filteredLands])

  useEffect(() => {
    let mapInstance: any = null

    const initMap = async () => {
      if (!mapContainerRef.current || mapRef.current) return

      try {
        const L = await loadLeaflet()
        if (cancelledRef.current || !mapContainerRef.current) return

        mapInstance = L.map(mapContainerRef.current, {
          center: BRAZIL_CENTER,
          zoom: 4,
          scrollWheelZoom: true,
          zoomControl: true,
        })

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(mapInstance)

        polygonLayerRef.current = L.layerGroup().addTo(mapInstance)
        markerLayerRef.current = L.layerGroup().addTo(mapInstance)

        mapRef.current = mapInstance
      } catch (err) {
        console.error('Failed to load Leaflet:', err)
        if (!cancelledRef.current) setError('Falha ao carregar o mapa.')
      }
    }

    initMap()

    return () => {
      if (mapInstance) {
        mapInstance.remove()
        mapRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const L = (window as any).L
    if (!L || !mapRef.current || !polygonLayerRef.current) return

    polygonLayerRef.current.clearLayers()
    if (selectedLayerRef.current) {
      selectedLayerRef.current = null
      selectedOriginalStyleRef.current = null
    }

    const bounds: any[] = []

    for (const land of filteredLands) {
      const shape = parseShapeWgs84(land.shapeWgs84)
      if (!shape) continue

      const stageName = land.currentStatus?.etapa || land.currentStatus?.name
      const fillColor = getStageColor(stageName)
      const style = {
        color: fillColor,
        weight: 2,
        fillOpacity: 0.4,
      }

      const geoJsonLayer = L.geoJSON(shape, {
        style: style,
        onEachFeature: (feature: any, layer: any) => {
          const landId = land.id || land.external_id
          const meta = metadataMap.get(landId)
          const landName = land.name || 'Propriedade sem nome'
          const landCode = land.clusterSerial || land.external_id || land.id || 'N/A'
          const city = land.geomCityName || land.city || 'N/A'
          const state = land.geomAcronymState || land.state || 'N/A'
          const area = (land.area || 0).toLocaleString('pt-BR')
          const stageLabel = getStatusLabel(stageName) || 'Sem etapa'
          const dotColor = getStageColor(stageName)

          const tooltipContent = `
            <div style="font-family: sans-serif; min-width: 180px;">
              <div style="font-weight: 700; font-size: 13px; color: #1a1a1a; margin-bottom: 4px;">${landName}</div>
              <div style="font-size: 11px; color: #666; margin-bottom: 2px;">Código: <strong>${landCode}</strong></div>
              <div style="font-size: 11px; color: #666; margin-bottom: 2px;">Local: ${city}, ${state}</div>
              <div style="font-size: 11px; color: #666; margin-bottom: 2px;">Área: <strong>${area} ha</strong></div>
              <div style="font-size: 11px; color: #666; display: flex; align-items: center; gap: 4px;">
                Etapa: <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${dotColor};border:1px solid #fff;"></span>
                <strong>${stageLabel}</strong>
              </div>
            </div>
          `

          layer.bindTooltip(tooltipContent, {
            sticky: true,
            direction: 'top',
            className: 'map-custom-tooltip',
          })

          layer.on('mouseover', () => {
            layer.setStyle({ fillOpacity: 0.6, weight: 3 })
          })

          layer.on('mouseout', () => {
            if (layer !== selectedLayerRef.current) {
              layer.setStyle(style)
            }
          })

          layer.on('click', () => {
            restoreSelectedStyle()
            selectedLayerRef.current = layer
            selectedOriginalStyleRef.current = style
            layer.setStyle({
              color: '#f97316',
              weight: 4,
              fillOpacity: 0.5,
            })
            layer.bringToFront()

            setSelectedLandId(landId)
            setDrawerOpen(true)
          })

          try {
            const layerBounds = layer.getBounds()
            bounds.push(layerBounds)
          } catch {
            /* intentionally ignored */
          }
        },
      })

      polygonLayerRef.current.addLayer(geoJsonLayer)
    }

    if (bounds.length > 0 && mapRef.current) {
      const combinedBounds = bounds.reduce((acc, b) => acc.extend(b), bounds[0])
      mapRef.current.fitBounds(combinedBounds, { padding: [50, 50] })
    }

    if (amplified) {
      renderMarkers()
    }
  }, [filteredLands, metadataMap, amplified, renderMarkers, restoreSelectedStyle])

  return (
    <div className="flex-1 relative h-full">
      {loading && (
        <div className="absolute inset-0 z-[1100] flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-brand-secondary" />
            <span className="text-sm font-medium text-brand-primary/60">Carregando mapa...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 z-[1100] flex items-center justify-center bg-white">
          <div className="text-center space-y-2">
            <MapPin className="w-8 h-8 text-brand-critical mx-auto" />
            <p className="text-sm font-medium text-brand-primary">{error}</p>
          </div>
        </div>
      )}

      <div ref={mapContainerRef} className="w-full h-full" style={{ minHeight: '400px' }} />

      {!loading && !error && (
        <>
          <MapFilters filters={filters} onChange={setFilters} availableStages={availableStages} />

          <MapLegend stages={activeStages} />

          <div className="absolute bottom-4 left-4 z-[1000] bg-white rounded-xl shadow-lg border border-brand-primary/10 p-4 flex items-center gap-3 animate-fade-in-up">
            <Switch checked={amplified} onCheckedChange={setAmplified} />
            <Label className="text-sm font-medium text-brand-primary cursor-pointer">
              Indicadores Amplificados
            </Label>
          </div>
        </>
      )}

      <LandDetailDrawer landId={selectedLandId} open={drawerOpen} onClose={handleCloseDrawer} />
    </div>
  )
}
