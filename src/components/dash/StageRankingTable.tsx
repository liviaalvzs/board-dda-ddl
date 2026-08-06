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

export function StageRankingTable({ lands }: { lands: unknown }) {
  const ranking = useMemo(() => calculateLandStageRanking(lands, 10), [lands])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Terras paradas há mais tempo</CardTitle>
        <CardDescription>
          Contado desde a data de entrada na etapa atual. Terras sem essa data informada não
          aparecem aqui.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {ranking.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            Nenhuma terra com data de entrada na etapa informada.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Cluster Serial</TableHead>
                  <TableHead>Etapa atual</TableHead>
                  <TableHead className="text-right">Tempo na etapa</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ranking.map((land, idx) => (
                  <TableRow key={land.externalId || idx}>
                    <TableCell className="font-medium">
                      {land.clusterSerial || land.name || '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{
                            backgroundColor: getKanbanColumnColor(land.status) || '#94a3b8',
                          }}
                        />
                        <span className="text-sm">{land.statusLabel}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {land.daysInStage} {land.daysInStage === 1 ? 'dia' : 'dias'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
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
