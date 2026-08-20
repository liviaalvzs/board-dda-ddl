import { useCallback, useEffect, useRef, useState } from 'react'
import { Bot, Loader2, Plus, Send, X, Minus, Search } from 'lucide-react'
import { streamAgentChat, displayableMessages, type DisplayMessage } from '@/lib/skipAi'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { cn } from '@/lib/utils'
import ChatMarkdown from './ChatMarkdown'

const BACKEND = import.meta.env.VITE_POCKETBASE_URL

type ThinkingPhase = 'thinking' | 'searching' | null

function ThinkingIndicator({ phase }: { phase: ThinkingPhase }) {
  if (!phase) return null

  const label = phase === 'searching' ? 'Consultando dados' : 'Pensando'
  const Icon = phase === 'searching' ? Search : Bot

  return (
    <div className="flex justify-start">
      <div className="rounded-2xl rounded-bl-md px-3 py-2.5 bg-gray-100 flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 text-brand-secondary animate-pulse" />
        <span className="text-[12px] text-brand-primary/50">{label}</span>
        <span className="flex gap-0.5">
          <span className="w-1 h-1 rounded-full bg-brand-secondary/50 animate-bounce [animation-delay:0ms]" />
          <span className="w-1 h-1 rounded-full bg-brand-secondary/50 animate-bounce [animation-delay:150ms]" />
          <span className="w-1 h-1 rounded-full bg-brand-secondary/50 animate-bounce [animation-delay:300ms]" />
        </span>
      </div>
    </div>
  )
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [thinkingPhase, setThinkingPhase] = useState<ThinkingPhase>(null)
  const [hasToolCalls, setHasToolCalls] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const { toast } = useToast()

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamText, thinkingPhase, scrollToBottom])

  const startNewChat = useCallback(() => {
    setActiveConvId(null)
    setMessages([])
    setStreamText('')
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
    setThinkingPhase('thinking')
    setHasToolCalls(false)

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

      let finalText = ''

      const result = await streamAgentChat(res, {
        onChunk: (_delta, full) => {
          finalText = full
          setStreamText(full)
          setThinkingPhase(null)
        },
        onToolCallStart: () => {
          setHasToolCalls(true)
          setThinkingPhase('searching')
          setStreamText('')
          finalText = ''
        },
        onToolCallDone: () => {
          setThinkingPhase('thinking')
        },
        signal: controller.signal,
      })

      const content = result.content || finalText

      const assistantMsg: DisplayMessage = {
        id: result.message_id || `ai-${Date.now()}`,
        role: 'assistant',
        content,
        citations: result.citations,
        created: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, assistantMsg])
      setStreamText('')
      setThinkingPhase(null)
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      toast({ title: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setStreaming(false)
      setThinkingPhase(null)
      setHasToolCalls(false)
      abortRef.current = null
    }
  }, [input, streaming, activeConvId, toast])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const renderContent = (content: string, role: 'user' | 'assistant') => {
    if (role === 'user') return content
    return <ChatMarkdown text={content} />
  }

  const showThinking = streaming && !streamText && thinkingPhase

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
        <div className="fixed bottom-20 right-5 z-50 w-[480px] max-w-[calc(100vw-2.5rem)] h-[70vh] max-h-[calc(100vh-7rem)] bg-white rounded-2xl shadow-2xl border border-brand-primary/10 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-brand-secondary text-white shrink-0">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              <span className="text-sm font-semibold">Assistente re.green</span>
            </div>
            <div className="flex items-center gap-1">
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
                    'max-w-[85%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed',
                    m.role === 'user'
                      ? 'bg-brand-secondary text-white rounded-br-md whitespace-pre-wrap'
                      : 'bg-gray-100 text-brand-primary rounded-bl-md',
                  )}
                >
                  {renderContent(m.content, m.role)}
                </div>
              </div>
            ))}

            {streaming && streamText && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl rounded-bl-md px-3 py-2 text-[13px] leading-relaxed bg-gray-100 text-brand-primary">
                  <ChatMarkdown text={streamText} />
                </div>
              </div>
            )}

            {showThinking && <ThinkingIndicator phase={thinkingPhase} />}

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
