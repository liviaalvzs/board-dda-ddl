import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { calculateLandStageRanking } from '@/lib/dash-utils'
import { getKanbanColumnColor } from '@/lib/kanban-columns'
import { DASH_CARD_CLASS } from '@/components/dash/dash-chrome'

export function StageRankingTable({ lands }: { lands: unknown }) {
  const ranking = useMemo(() => calculateLandStageRanking(lands, 10), [lands])

  return (
    <Card className={DASH_CARD_CLASS}>
      <CardHeader>
        <CardTitle className="font-display text-lg font-light text-brand-primary">
          Terras paradas há mais tempo
        </CardTitle>
        <CardDescription className="text-brand-primary/55">
          Contado desde a data de entrada na etapa atual. Terras sem essa data informada não
          aparecem aqui.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {ranking.length === 0 ? (
          <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-brand-primary/15 text-sm text-brand-primary/50">
            Nenhuma terra com data de entrada na etapa informada.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[44%] text-brand-primary/60">Cluster Serial</TableHead>
                  <TableHead className="text-brand-primary/60">Etapa atual</TableHead>
                  <TableHead className="text-right text-brand-primary/60">Tempo na etapa</TableHead>
                  <TableHead className="text-right text-brand-primary/60">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ranking.map((land, idx) => (
                  <TableRow
                    key={land.externalId || idx}
                    className="border-brand-primary/5 hover:bg-brand-background/50"
                  >
                    <TableCell className="font-medium text-brand-primary">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-primary/5 text-[11px] font-bold tabular-nums text-brand-primary/60">
                          {idx + 1}
                        </span>
                        <span className="truncate">{land.clusterSerial || land.name || '—'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{
                            backgroundColor: getKanbanColumnColor(land.status) || '#94a3b8',
                          }}
                        />
                        <span className="text-sm text-brand-primary/80">{land.statusLabel}</span>
                      </div>
                    </TableCell>
                    {/* Coluna de números: tabular-nums para os dígitos alinharem
                        na vertical entre as linhas. */}
                    <TableCell className="text-right font-semibold tabular-nums text-brand-primary">
                      {land.daysInStage} {land.daysInStage === 1 ? 'dia' : 'dias'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-lg border-brand-primary/15 text-brand-primary hover:bg-brand-primary hover:text-white"
                      >
                        <Link to={`/land/${land.externalId}`}>Ver</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
