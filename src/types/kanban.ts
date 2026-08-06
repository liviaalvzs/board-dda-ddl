export type CardStatus = 'info' | 'warning' | 'alert' | 'critical'

export interface DocumentCheckInfo {
  documentKey: string
  userName: string
  createdAt: string
}

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
  /** Data estimada de recebimento da DDA (coluna legada `data_pedido_dda`). */
  ddaEstimatedDate?: string
  ddaReceivedDate?: string
  createdAt?: string
  updatedAt?: string
  isSaving?: boolean
  documentChecks?: DocumentCheckInfo[]
}

export interface KanbanColumnType {
  id: string
  title: string
  color?: string
}
