import { useState, useRef, useEffect } from 'react'
import { X, Send, Loader2, Sparkles } from 'lucide-react'

interface Props {
  open: boolean
  title: string
  systemContext: string
  onGenerate: (content: string) => void
  onClose: () => void
  streamFn: (body: Record<string, unknown>, onChunk: (content: string) => void) => Promise<string>
  streamBody: Record<string, unknown>
}

export default function LLMDialog({ open, title, systemContext, onGenerate, onClose, streamFn, streamBody }: Props) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [streaming, setStreaming] = useState(false)
  const [finalContent, setFinalContent] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, finalContent])

  const handleSend = async () => {
    const userMsg = input.trim()
    if (!userMsg || streaming) return

    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setStreaming(true)
    setFinalContent('')

    try {
      const body = { ...streamBody, userInput: userMsg }
      const result = await streamFn(body, (content) => {
        setFinalContent(content)
      })
      setMessages(prev => [...prev, { role: 'assistant', content: result }])
      setFinalContent('')
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    setMessages(prev => [...prev, { role: 'assistant', content: `❌ 生成失败: ${msg}` }])
      setFinalContent('')
    } finally {
      setStreaming(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleApply = () => {
    const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant')
    if (lastAssistant && !lastAssistant.content.startsWith('❌')) {
      onGenerate(lastAssistant.content)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 shrink-0">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Sparkles size={20} className="text-purple-500" /> {title}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {systemContext && (
          <div className="px-4 pt-3 shrink-0">
            <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500 max-h-24 overflow-y-auto whitespace-pre-wrap">
              {systemContext}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          {messages.length === 0 && !streaming && (
            <div className="text-center py-12 text-slate-400">
              <Sparkles size={40} className="mx-auto mb-3 text-slate-300" />
              <p className="text-sm">输入你的需求，AI将帮你生成报告内容</p>
              <p className="text-xs mt-1 text-slate-300">例如：帮我根据今天的任务情况生成日报</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : msg.content.startsWith('❌')
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-slate-100 text-slate-800'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {streaming && finalContent && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-xl px-4 py-2.5 text-sm whitespace-pre-wrap bg-purple-50 text-slate-800 border border-purple-200">
                {finalContent}
                <span className="inline-block w-1.5 h-4 bg-purple-400 animate-pulse ml-0.5 align-middle" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-slate-200 p-3 shrink-0">
          {messages.some(m => m.role === 'assistant' && !m.content.startsWith('❌')) && !streaming && (
            <div className="mb-2">
              <button
                onClick={handleApply}
                className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition text-sm font-medium flex items-center justify-center gap-1"
              >
                <Sparkles size={14} /> 应用AI生成内容到报告
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-sm resize-none"
              rows={2}
              placeholder="描述你的需求，或补充额外信息..."
              disabled={streaming}
            />
            <button
              onClick={handleSend}
              disabled={streaming || !input.trim()}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-medium disabled:opacity-50 self-end"
            >
              {streaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
