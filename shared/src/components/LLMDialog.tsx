import { useState, useRef, useEffect } from 'react'
import { X, Send, Loader2, Sparkles, Bot } from 'lucide-react'

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
      const msg = err instanceof Error ? err.message : String(err)
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1e3a5f]/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col border border-[#e2e8f0]">
        <div className="flex items-center justify-between p-5 border-b border-[#e2e8f0] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#eff6ff] rounded-xl flex items-center justify-center">
              <Sparkles size={20} className="text-[#3b82f6]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#1e293b]">{title}</h3>
              <p className="text-xs text-[#64748b]">AI 辅助生成</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#f1f5f9] rounded-lg transition-colors">
            <X size={20} className="text-[#94a3b8]" />
          </button>
        </div>

        {systemContext && (
          <div className="px-5 pt-4 shrink-0">
            <div className="bg-[#f8fafc] rounded-xl p-3 text-xs text-[#64748b] max-h-24 overflow-y-auto whitespace-pre-wrap border border-[#e2e8f0]">
              <span className="font-semibold text-[#1e3a5f]">上下文：</span>{systemContext}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0">
          {messages.length === 0 && !streaming && (
            <div className="text-center py-12 text-[#94a3b8]">
              <div className="w-16 h-16 bg-[#eff6ff] rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <Bot size={32} className="text-[#3b82f6]" />
              </div>
              <p className="text-sm font-medium text-[#64748b]">输入你的需求，AI将帮你生成报告内容</p>
              <p className="text-xs mt-2 text-[#94a3b8]">例如：帮我根据今天的任务情况生成日报</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap shadow-sm ${
                msg.role === 'user'
                  ? 'bg-[#1e3a5f] text-white'
                  : msg.content.startsWith('❌')
                    ? 'bg-[#fee2e2] text-[#991b1b] border border-[#fecaca]'
                    : 'bg-[#f1f5f9] text-[#1e293b] border border-[#e2e8f0]'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {streaming && finalContent && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap bg-[#eff6ff] text-[#1e293b] border border-[#bfdbfe] shadow-sm">
                {finalContent}
                <span className="inline-block w-1.5 h-4 bg-[#3b82f6] animate-pulse ml-1 align-middle" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-[#e2e8f0] p-5 shrink-0">
          {messages.some(m => m.role === 'assistant' && !m.content.startsWith('❌')) && !streaming && (
            <div className="mb-3">
              <button
                onClick={handleApply}
                className="w-full px-4 py-2.5 bg-[#10b981] text-white rounded-xl hover:bg-[#059669] transition text-sm font-semibold flex items-center justify-center gap-2 shadow-sm"
              >
                <Sparkles size={14} /> 应用AI生成内容到报告
              </button>
            </div>
          )}
          <div className="flex gap-3">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 px-4 py-3 border border-[#e2e8f0] rounded-xl focus:ring-2 focus:ring-[#3b82f6] focus:border-[#3b82f6] outline-none text-sm resize-none bg-[#f8fafc]"
              rows={2}
              placeholder="描述你的需求，或补充额外信息..."
              disabled={streaming}
            />
            <button
              onClick={handleSend}
              disabled={streaming || !input.trim()}
              className="px-5 py-3 bg-[#3b82f6] text-white rounded-xl hover:bg-[#2563eb] transition text-sm font-semibold disabled:opacity-50 self-end shadow-sm flex items-center gap-2"
            >
              {streaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}