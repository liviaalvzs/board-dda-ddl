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
  externalOffice?: string
  stageId: string
  completedDocs?: number
  completedDda?: number
  riskLevel?: 'low' | 'medium' | 'high' | ''
  ddaStatusLabel?: 'existing' | 'distributed' | 'none' | ''
  createdAt?: string
  updatedAt?: string
  isSaving?: boolean
}

export interface KanbanColumnType {
  id: string
  title: string
  color?: string
}
