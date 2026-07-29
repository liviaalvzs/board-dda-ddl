import { useParams, useNavigate } from 'react-router-dom'
import { LandDetailSheet } from '@/components/kanban/LandDetailSheet'

export default function LandDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  if (!id) return null

  return <LandDetailSheet landId={id} onClose={() => navigate('/')} />
}
