import { useCallback, useEffect, useRef, useState } from 'react'
import { Bot, Loader2, MessageSquare, Plus, Send, X, Minus } from 'lucide-react'
import { streamAgentChat, displayableMessages, type DisplayMessage } from '@/lib/skipAi'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { cn } from '@/lib/utils'

const BACKEND = import.meta.env.VITE_POCKETBASE_URL

interface Conversation {
  id: string
  title: string
  updated: string
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamText, setStreamText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const { toast } = useToast()

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamText, scrollToBottom])

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND}/backend/v1/land-assistant/conversations`, {
        headers: { Authorization: pb.authStore.token },
      })
      if (res.ok) {
        const data = await res.json()
        setConversations(data.conversations ?? data ?? [])
      }
    } catch {
      // network error
    }
  }, [])

  useEffect(() => {
    if (open) loadConversations()
  }, [open, loadConversations])

  const loadMessages = useCallback(async (convId: string) => {
    try {
      const res = await fetch(
        `${BACKEND}/backend/v1/land-assistant/conversations/${convId}/messages`,
        { headers: { Authorization: pb.authStore.token } },
      )
      if (res.ok) {
        const data = await res.json()
        const raw = data.messages ?? data ?? []
        setMessages(displayableMessages(raw))
      }
    } catch {
      // network error
    }
  }, [])

  const selectConversation = useCallback(
    (convId: string) => {
      setActiveConvId(convId)
      setShowHistory(false)
      loadMessages(convId)
    },
    [loadMessages],
  )

  const startNewChat = useCallback(() => {
    setActiveConvId(null)
    setMessages([])
    setStreamText('')
    setShowHistory(false)
  }, [])

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || streaming) return
    setInput('')

    const userMsg: DisplayMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: text,
      created: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])
    setStreaming(true)
    setStreamText('')

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch(`${BACKEND}/backend/v1/land-assistant/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: pb.authStore.token,
        },
        body: JSON.stringify({ message: text, conversation_id: activeConvId }),
        signal: controller.signal,
      })

      const convId = res.headers.get('X-Conversation-Id')
      if (convId && !activeConvId) setActiveConvId(convId)

      const result = await streamAgentChat(res, {
        onChunk: (_delta, full) => setStreamText(full),
        signal: controller.signal,
      })

      const assistantMsg: DisplayMessage = {
        id: result.message_id || `ai-${Date.now()}`,
        role: 'assistant',
        content: result.content,
        citations: result.citations,
        created: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, assistantMsg])
      setStreamText('')
      loadConversations()
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      toast({ title: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }, [input, streaming, activeConvId, toast, loadConversations])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'fixed bottom-5 right-5 z-50 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all',
          open
            ? 'bg-brand-primary text-white scale-90'
            : 'bg-brand-secondary text-white hover:scale-105',
        )}
      >
        {open ? <X className="w-5 h-5" /> : <Bot className="w-6 h-6" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-20 right-5 z-50 w-[380px] max-w-[calc(100vw-2.5rem)] h-[520px] max-h-[calc(100vh-7rem)] bg-white rounded-2xl shadow-2xl border border-brand-primary/10 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-brand-secondary text-white shrink-0">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              <span className="text-sm font-semibold">Assistente de Terras</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowHistory((v) => !v)}
                className="p-1 rounded hover:bg-white/20 transition-colors"
                title="Conversas anteriores"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
              <button
                onClick={startNewChat}
                className="p-1 rounded hover:bg-white/20 transition-colors"
                title="Nova conversa"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded hover:bg-white/20 transition-colors"
                title="Minimizar"
              >
                <Minus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* History dropdown */}
          {showHistory && (
            <div className="border-b border-brand-primary/10 bg-gray-50 max-h-48 overflow-y-auto">
              {conversations.length === 0 ? (
                <p className="text-xs text-brand-primary/40 text-center py-3">
                  Nenhuma conversa ainda
                </p>
              ) : (
                <div className="p-2 space-y-0.5">
                  {conversations.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => selectConversation(c.id)}
                      className={cn(
                        'w-full text-left rounded-lg px-3 py-2 text-xs truncate transition-colors',
                        activeConvId === c.id
                          ? 'bg-brand-secondary/10 text-brand-secondary font-medium'
                          : 'text-brand-primary/70 hover:bg-brand-primary/5',
                      )}
                    >
                      {c.title || 'Conversa sem título'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.length === 0 && !streaming && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-2 opacity-50">
                <Bot className="w-8 h-8 text-brand-secondary" />
                <p className="text-xs text-brand-primary/50 max-w-[240px]">
                  Pergunte sobre status das terras, documentos pendentes, histórico...
                </p>
              </div>
            )}

            {messages.map((m) => (
              <div
                key={m.id}
                className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed whitespace-pre-wrap',
                    m.role === 'user'
                      ? 'bg-brand-secondary text-white rounded-br-md'
                      : 'bg-gray-100 text-brand-primary rounded-bl-md',
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {streaming && streamText && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl rounded-bl-md px-3 py-2 text-[13px] leading-relaxed whitespace-pre-wrap bg-gray-100 text-brand-primary">
                  {streamText}
                </div>
              </div>
            )}

            {streaming && !streamText && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md px-3 py-2 bg-gray-100">
                  <Loader2 className="w-4 h-4 animate-spin text-brand-secondary" />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="shrink-0 border-t border-brand-primary/10 bg-white p-2">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pergunte sobre as terras..."
                rows={1}
                className="flex-1 resize-none rounded-xl border border-brand-primary/15 bg-gray-50 px-3 py-2 text-[13px] text-brand-primary placeholder:text-brand-primary/40 focus:outline-none focus:ring-2 focus:ring-brand-secondary/30 focus:border-brand-secondary"
              />
              <Button
                onClick={sendMessage}
                disabled={!input.trim() || streaming}
                size="icon"
                className="shrink-0 bg-brand-secondary hover:bg-brand-secondary/90 rounded-xl h-9 w-9"
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
