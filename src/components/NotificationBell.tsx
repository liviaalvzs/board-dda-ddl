import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Bell, FileText, ArrowRightLeft, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'

interface Notification {
  id: string
  type: 'document' | 'stage_change'
  title: string
  message: string
  land_id: string
  land_name: string
  actor_name: string
  created: string
}

type FilterType = 'all' | 'document' | 'stage_change'

const FILTERS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'Tudo' },
  { value: 'document', label: 'Documentos' },
  { value: 'stage_change', label: 'Etapas' },
]

const LAST_SEEN_KEY = 'notifications_last_seen'

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins}min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filter, setFilter] = useState<FilterType>('all')
  const [lastSeen, setLastSeen] = useState<string>(() => {
    try {
      return localStorage.getItem(LAST_SEEN_KEY) || ''
    } catch {
      return ''
    }
  })
  const panelRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      const records = await pb.collection('notifications').getList(1, 50, {
        sort: '-created',
      })
      setNotifications(records.items as unknown as Notification[])
    } catch {
      setNotifications([])
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  useRealtime('notifications', () => {
    fetchNotifications()
  })

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleOpen = () => {
    setOpen((v) => {
      if (!v) {
        const now = new Date().toISOString()
        setLastSeen(now)
        try {
          localStorage.setItem(LAST_SEEN_KEY, now)
        } catch {}
      }
      return !v
    })
  }

  const unreadCount = useMemo(() => {
    if (!lastSeen) return notifications.length
    return notifications.filter((n) => new Date(n.created) > new Date(lastSeen)).length
  }, [notifications, lastSeen])

  const filtered = useMemo(() => {
    if (filter === 'all') return notifications
    return notifications.filter((n) => n.type === filter)
  }, [notifications, filter])

  return (
    <div className="relative" ref={panelRef}>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleOpen}
        className="relative text-brand-primary/60 hover:text-brand-primary"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand-secondary px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-xl border border-brand-primary/10 bg-white shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-brand-primary/10">
            <h3 className="text-sm font-bold text-brand-primary">Notificações</h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-brand-primary/40 hover:text-brand-primary"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex gap-1 px-3 py-2 border-b border-brand-primary/5">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  filter === f.value
                    ? 'bg-brand-secondary/10 text-brand-secondary'
                    : 'text-brand-primary/50 hover:bg-brand-primary/5',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-brand-primary/5">
            {filtered.length === 0 ? (
              <div className="py-8 text-center text-sm text-brand-primary/40">
                Nenhuma notificação
              </div>
            ) : (
              filtered.map((n) => {
                const isUnread = !lastSeen || new Date(n.created) > new Date(lastSeen)
                const Icon = n.type === 'document' ? FileText : ArrowRightLeft
                return (
                  <div
                    key={n.id}
                    className={cn(
                      'flex gap-3 px-4 py-3 transition-colors',
                      isUnread && 'bg-brand-secondary/[0.03]',
                    )}
                  >
                    <div
                      className={cn(
                        'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                        n.type === 'document'
                          ? 'bg-blue-50 text-blue-500'
                          : 'bg-purple-50 text-purple-500',
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-brand-primary leading-snug">
                        {n.title}
                      </p>
                      <p className="text-xs text-brand-primary/60 leading-snug mt-0.5">
                        {n.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {n.actor_name && (
                          <span className="text-[11px] text-brand-primary/40">{n.actor_name}</span>
                        )}
                        <span className="text-[11px] text-brand-primary/30">
                          {timeAgo(n.created)}
                        </span>
                      </div>
                    </div>
                    {isUnread && (
                      <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-secondary" />
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
