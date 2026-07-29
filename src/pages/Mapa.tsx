import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { loadLeaflet } from '@/lib/leaflet-loader'
import { calculateCentroid, parseShapeWgs84, FALLBACK_COLOR } from '@/lib/map-utils'
import { fetchKanbanLands } from '@/services/lands'
import { MapLegend } from '@/components/kanban/MapLegend'
import { LandDetailSheet } from '@/components/kanban/LandDetailSheet'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Loader2, MapPin, TrendingUp, MapPinned, Maximize } from 'lucide-react'
import { useRealtime } from '@/hooks/use-realtime'
import { getStatusLabel } from '@/lib/status-mapping'
import { KANBAN_COLUMNS, buildKanbanColorMap } from '@/lib/kanban-columns'

const BRAZIL_CENTER: [number, number] = [-14.235, -51.9253]
const AMPLIFIED_KEY = 'mapa_amplified_indicators'

export default function Mapa() {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const polygonLayerRef = useRef<any>(null)
  const markerLayerRef = useRef<any>(null)
  const cancelledRef = useRef(false)
  const layerByLandIdRef = useRef<Map<string, any>>(new Map())

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lands, setLands] = useState<any[]>([])
  const [metadataMap, setMetadataMap] = useState<Map<string, any>>(new Map())
  const [refreshKey, setRefreshKey] = useState(0)

  const kanbanColorMap = useMemo(() => buildKanbanColorMap(), [])

  const activeColumnIds = useMemo(() => {
    const ids = new Set<string>()
    for (const land of lands) {
      const meta = metadataMap.get(land.id || '') || metadataMap.get(land.external_id || '')
      if (meta?.status) {
        ids.add(meta.status)
      }
    }
    return KANBAN_COLUMNS.filter((c) => ids.has(c.id)).map((c) => c.id)
  }, [lands, metadataMap])

  const [selectedLandId, setSelectedLandId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [amplified, setAmplified] = useState(() => localStorage.getItem(AMPLIFIED_KEY) === 'true')
  const [zoom, setZoom] = useState(4)
  const [viewportStats, setViewportStats] = useState<{ count: number; area: number } | null>(null)

  const selectedLayerRef = useRef<any>(null)
  const selectedOriginalStyleRef = useRef<any>(null)

  const amplifiedRef = useRef(amplified)
  amplifiedRef.current = amplified
  const zoomRef = useRef(zoom)
  zoomRef.current = zoom
  const computeViewportStatsRef = useRef<() => void>(() => {})

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

  const computeViewportStats = useCallback(() => {
    const L = (window as any).L
    if (!L || !mapRef.current || lands.length === 0) {
      setViewportStats(null)
      return
    }
    const mapBounds = mapRef.current.getBounds()
    let count = 0
    let area = 0
    for (const land of lands) {
      const shape = parseShapeWgs84(land.shapeWgs84)
      if (!shape) continue
      const centroid = calculateCentroid(shape)
      const latLng = L.latLng(centroid[0], centroid[1])
      if (mapBounds.contains(latLng)) {
        count++
        area += land.area || 0
      }
    }
    setViewportStats({ count, area })
  }, [lands])

  useEffect(() => {
    computeViewportStatsRef.current = computeViewportStats
  }, [computeViewportStats])

  const getLandMeta = useCallback(
    (land: any) => metadataMap.get(land.id || '') || metadataMap.get(land.external_id || ''),
    [metadataMap],
  )

  const renderMarkers = useCallback(() => {
    const L = (window as any).L
    if (!L || !mapRef.current || !markerLayerRef.current) return

    markerLayerRef.current.clearLayers()

    const markerSize = 26

    for (const land of lands) {
      const shape = parseShapeWgs84(land.shapeWgs84)
      if (!shape) continue

      const centroid = calculateCentroid(shape)
      const meta = getLandMeta(land)
      const stageName = meta?.status || ''
      const markerColor = kanbanColorMap[stageName] || FALLBACK_COLOR
      const landId = land.id || land.external_id

      const markerHtml = `<div class="pulse-marker" style="--marker-color:${markerColor};width:${markerSize}px;height:${markerSize}px;">
        <div class="pulse-marker-ring"></div>
        <div class="pulse-marker-dot"></div>
      </div>`

      const markerIcon = L.divIcon({
        className: 'pulse-marker-icon',
        html: markerHtml,
        iconSize: [markerSize, markerSize],
        iconAnchor: [markerSize / 2, markerSize / 2],
      })

      const marker = L.marker(centroid, { icon: markerIcon, zIndexOffset: 1000 })

      const landName = land.name || 'Propriedade sem nome'
      const landCode = land.clusterSerial || land.external_id || land.id || 'N/A'
      const city = land.geomCityName || land.city || 'N/A'
      const state = land.geomAcronymState || land.state || 'N/A'
      const area = (land.area || 0).toLocaleString('pt-BR')
      const stageLabel = getStatusLabel(stageName) || 'Sem etapa'

      const tooltipContent = `
        <div style="font-family: sans-serif; min-width: 180px;">
          <div style="font-weight: 700; font-size: 13px; color: #1a1a1a; margin-bottom: 4px;">${landName}</div>
          <div style="font-size: 11px; color: #666; margin-bottom: 2px;">Código: <strong>${landCode}</strong></div>
          <div style="font-size: 11px; color: #666; margin-bottom: 2px;">Local: ${city}, ${state}</div>
          <div style="font-size: 11px; color: #666; margin-bottom: 2px;">Área: <strong>${area} ha</strong></div>
          <div style="font-size: 11px; color: #666; display: flex; align-items: center; gap: 4px;">
            Etapa: <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${markerColor};border:1px solid #fff;"></span>
            <strong>${stageLabel}</strong>
          </div>
        </div>
      `

      marker.bindTooltip(tooltipContent, {
        sticky: true,
        direction: 'top',
        className: 'map-marker-tooltip',
      })

      marker.on('click', () => {
        const layer = layerByLandIdRef.current.get(landId)
        if (layer && mapRef.current) {
          try {
            const layerBounds = layer.getBounds()
            mapRef.current.fitBounds(layerBounds, { padding: [60, 60], maxZoom: 16 })
          } catch {
            mapRef.current.setView(centroid, 16)
          }
        } else if (mapRef.current) {
          mapRef.current.setView(centroid, 16)
        }

        restoreSelectedStyle()
        if (layer) {
          const style = {
            color: kanbanColorMap[stageName] || FALLBACK_COLOR,
            weight: 2,
            fillOpacity: 0.4,
          }
          selectedLayerRef.current = layer
          selectedOriginalStyleRef.current = style
          layer.setStyle({
            color: '#f97316',
            weight: 4,
            fillOpacity: 0.5,
          })
          layer.bringToFront()
        }

        setSelectedLandId(landId)
        setDrawerOpen(true)
      })

      markerLayerRef.current.addLayer(marker)
    }
  }, [lands, getLandMeta, kanbanColorMap, restoreSelectedStyle])

  useEffect(() => {
    localStorage.setItem(AMPLIFIED_KEY, amplified ? 'true' : 'false')
    if (mapRef.current && markerLayerRef.current) {
      if (amplified && lands.length > 0) {
        renderMarkers()
      } else {
        markerLayerRef.current.clearLayers()
      }
    }
    if (amplified) {
      computeViewportStats()
    } else {
      setViewportStats(null)
    }
  }, [amplified, computeViewportStats, renderMarkers, lands])

  useEffect(() => {
    if (amplified && mapRef.current && markerLayerRef.current && lands.length > 0) {
      renderMarkers()
    }
  }, [zoom, amplified, renderMarkers, lands])

  const loadData = useCallback(async () => {
    cancelledRef.current = false
    setLoading(true)
    setError(null)

    try {
      const { lands: kanbanLands, metadataMap: metaMap } = await fetchKanbanLands()
      if (cancelledRef.current) return

      setLands(kanbanLands)
      setMetadataMap(metaMap)
    } catch (err) {
      console.error('Error loading map data:', err)
      if (!cancelledRef.current) setError('Falha ao carregar dados do mapa.')
    } finally {
      if (!cancelledRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
    return () => {
      cancelledRef.current = true
    }
  }, [loadData, refreshKey])

  useEffect(() => {
    let mapInstance: any = null

    const initMap = async () => {
      if (!mapContainerRef.current || mapRef.current) return

      try {
        await loadLeaflet()
        const L = (window as any).L
        if (!L || cancelledRef.current || !mapContainerRef.current) return

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

        mapInstance.on('moveend', () => {
          if (amplifiedRef.current) computeViewportStatsRef.current()
        })
        mapInstance.on('zoomend', () => {
          const z = mapInstance.getZoom()
          setZoom(z)
          zoomRef.current = z
          if (amplifiedRef.current) computeViewportStatsRef.current()
        })

        mapRef.current = mapInstance
        zoomRef.current = mapInstance.getZoom()
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
    layerByLandIdRef.current.clear()
    if (selectedLayerRef.current) {
      selectedLayerRef.current = null
      selectedOriginalStyleRef.current = null
    }

    const bounds: any[] = []

    for (const land of lands) {
      const shape = parseShapeWgs84(land.shapeWgs84)
      if (!shape) continue

      const meta = getLandMeta(land)
      const stageName = meta?.status || ''
      const fillColor = kanbanColorMap[stageName] || FALLBACK_COLOR

      const style = {
        color: fillColor,
        weight: 2,
        fillOpacity: 0.4,
      }

      const geoJsonLayer = L.geoJSON(shape, {
        style: style,
        onEachFeature: (feature: any, layer: any) => {
          const landId = land.id || land.external_id
          layerByLandIdRef.current.set(landId, layer)

          const farmCode =
            meta?.external_id || land.external_id || land.clusterSerial || land.id || 'N/A'
          const farmName = meta?.name || land.name || ''
          const tooltipHtml = farmName
            ? `<div style="font-family: sans-serif; min-width: 160px;">
                <div style="font-weight: 700; font-size: 13px; color: #1a1a1a; margin-bottom: 4px;">${farmName}</div>
                <div style="font-size: 11px; color: #666;">Código: <strong>${farmCode}</strong></div>
              </div>`
            : `<div style="font-family: sans-serif; min-width: 120px;">
                <div style="font-size: 11px; color: #666;">Código: <strong>${farmCode}</strong></div>
              </div>`

          layer.bindTooltip(tooltipHtml, {
            sticky: true,
            direction: 'top',
            className: 'map-marker-tooltip',
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

    if (amplifiedRef.current) {
      computeViewportStatsRef.current()
    }
  }, [
    lands,
    metadataMap,
    amplified,
    renderMarkers,
    restoreSelectedStyle,
    kanbanColorMap,
    getLandMeta,
  ])

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
          <MapLegend stages={activeColumnIds} colorMap={kanbanColorMap} />

          <div className="absolute bottom-4 left-4 z-[1000] bg-white rounded-xl shadow-lg border border-brand-primary/10 p-4 flex flex-col gap-3 animate-fade-in-up min-w-[260px]">
            <div className="flex items-center gap-3">
              <Switch checked={amplified} onCheckedChange={setAmplified} />
              <Label className="text-sm font-medium text-brand-primary cursor-pointer">
                Indicadores Amplificados
              </Label>
            </div>
            {amplified && viewportStats && (
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-brand-primary/10 animate-fade-in">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-brand-primary/50">
                    <MapPinned className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-medium uppercase tracking-wide">Visível</span>
                  </div>
                  <span className="text-2xl font-bold text-brand-primary leading-none">
                    {viewportStats.count}
                  </span>
                  <span className="text-[11px] text-brand-primary/50">propriedades</span>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-brand-primary/50">
                    <Maximize className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-medium uppercase tracking-wide">Área</span>
                  </div>
                  <span className="text-2xl font-bold text-brand-primary leading-none">
                    {viewportStats.area.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                  </span>
                  <span className="text-[11px] text-brand-primary/50">hectares</span>
                </div>
                <div className="col-span-2 flex items-center gap-1.5 pt-2 border-t border-brand-primary/10">
                  <TrendingUp className="w-3.5 h-3.5 text-brand-primary/50" />
                  <span className="text-[11px] text-brand-primary/50">
                    {lands.length} propriedades no filtro Kanban
                  </span>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {drawerOpen && selectedLandId && (
        <LandDetailSheet landId={selectedLandId} onClose={handleCloseDrawer} />
      )}
    </div>
  )
}
