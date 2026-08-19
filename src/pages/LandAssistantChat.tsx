import { useCallback, useEffect, useRef, useState } from 'react'
import { Bot, Loader2, MessageSquare, Plus, Send, ChevronLeft } from 'lucide-react'
import { streamAgentChat, displayableMessages, type DisplayMessage } from '@/lib/skipAi'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/pocketbase/errors'

const BACKEND = import.meta.env.VITE_POCKETBASE_URL

interface Conversation {
  id: string
  title: string
  updated: string
}

export default function LandAssistantChat() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [showSidebar, setShowSidebar] = useState(false)
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
    } catch {}
  }, [])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

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
    } catch {}
  }, [])

  const selectConversation = useCallback(
    (convId: string) => {
      setActiveConvId(convId)
      setShowSidebar(false)
      loadMessages(convId)
    },
    [loadMessages],
  )

  const startNewChat = useCallback(() => {
    setActiveConvId(null)
    setMessages([])
    setStreamText('')
    setShowSidebar(false)
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
    <div className="flex h-full bg-gray-50">
      {/* Sidebar - conversas anteriores */}
      <aside
        className={`${
          showSidebar ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 fixed md:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-brand-primary/10 flex flex-col transition-transform`}
      >
        <div className="p-3 border-b border-brand-primary/10">
          <Button
            onClick={startNewChat}
            className="w-full bg-brand-secondary hover:bg-brand-secondary/90"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Nova conversa
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.length === 0 && (
            <p className="text-xs text-brand-primary/40 text-center mt-4">Nenhuma conversa ainda</p>
          )}
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => selectConversation(c.id)}
              className={`w-full text-left rounded-lg px-3 py-2 text-sm truncate transition-colors ${
                activeConvId === c.id
                  ? 'bg-brand-secondary/10 text-brand-secondary font-medium'
                  : 'text-brand-primary/70 hover:bg-brand-primary/5'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 inline mr-1.5 opacity-50" />
              {c.title || 'Conversa sem título'}
            </button>
          ))}
        </div>
      </aside>

      {/* Overlay mobile */}
      {showSidebar && (
        <div
          className="fixed inset-0 bg-black/20 z-20 md:hidden"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center gap-3 px-4 py-3 bg-white border-b border-brand-primary/10 shrink-0">
          <button onClick={() => setShowSidebar(true)} className="md:hidden text-brand-primary/60">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <Bot className="w-5 h-5 text-brand-secondary" />
          <h1 className="text-sm font-bold text-brand-primary">Assistente de Terras</h1>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && !streaming && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 opacity-60">
              <Bot className="w-10 h-10 text-brand-secondary" />
              <p className="text-sm text-brand-primary/60 max-w-sm">
                Pergunte sobre o status das terras, documentos pendentes, histórico de mudanças...
              </p>
            </div>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-brand-secondary text-white rounded-br-md'
                    : 'bg-white border border-brand-primary/10 text-brand-primary rounded-bl-md shadow-sm'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}

          {streaming && streamText && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-2xl rounded-bl-md px-4 py-2.5 text-sm whitespace-pre-wrap bg-white border border-brand-primary/10 text-brand-primary shadow-sm">
                {streamText}
              </div>
            </div>
          )}

          {streaming && !streamText && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-md px-4 py-2.5 bg-white border border-brand-primary/10 shadow-sm">
                <Loader2 className="w-4 h-4 animate-spin text-brand-secondary" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 border-t border-brand-primary/10 bg-white p-3">
          <div className="flex items-end gap-2 max-w-3xl mx-auto">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pergunte sobre as terras..."
              rows={1}
              className="flex-1 resize-none rounded-xl border border-brand-primary/15 bg-gray-50 px-4 py-2.5 text-sm text-brand-primary placeholder:text-brand-primary/40 focus:outline-none focus:ring-2 focus:ring-brand-secondary/30 focus:border-brand-secondary"
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || streaming}
              size="icon"
              className="shrink-0 bg-brand-secondary hover:bg-brand-secondary/90 rounded-xl h-10 w-10"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
