export type CardStatus = 'info' | 'warning' | 'alert' | 'critical'

export interface KanbanCardType {
  id: string
  title: string
  name?: string
  clusterSerial?: string
  code?: string
  location: {
    city: string
    state: string
  }
  owner: string
  area: number
  ddaStatus: string
  statusType: CardStatus
  responsible: string
  stageId: string
  completedDocs?: number
}

export interface KanbanColumnType {
  id: string
  title: string
  color?: string
}
