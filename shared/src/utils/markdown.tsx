import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'

export type MdTheme = 'purple' | 'emerald' | 'blue' | 'amber'

const themes: Record<MdTheme, {
  h1Border: string
  h2Text: string; h2BorderL: string; h2BorderB: string
  h3BorderL: string
  emText: string
  strongBg: string
  bqBorder: string; bqBg: string; bqText: string
  codeBg: string; codeText: string; codeBorder: string
  hrVia: string
  theadBg: string; theadText: string; thBorder: string
}> = {
  purple: {
    h1Border: 'border-purple-200',
    h2Text: 'text-purple-800', h2BorderL: 'border-l-purple-500', h2BorderB: 'border-b-purple-100',
    h3BorderL: 'border-l-purple-300',
    emText: 'text-purple-600',
    strongBg: 'bg-amber-50',
    bqBorder: 'border-purple-300', bqBg: 'bg-purple-50/50', bqText: 'text-purple-800',
    codeBg: 'bg-purple-50', codeText: 'text-purple-700', codeBorder: 'border-purple-100',
    hrVia: 'via-purple-200',
    theadBg: 'bg-purple-50', theadText: 'text-purple-800', thBorder: 'border-b-purple-100',
  },
  emerald: {
    h1Border: 'border-emerald-200',
    h2Text: 'text-emerald-800', h2BorderL: 'border-l-emerald-500', h2BorderB: 'border-b-emerald-100',
    h3BorderL: 'border-l-emerald-300',
    emText: 'text-emerald-600',
    strongBg: 'bg-amber-50',
    bqBorder: 'border-emerald-300', bqBg: 'bg-emerald-50/50', bqText: 'text-emerald-800',
    codeBg: 'bg-emerald-50', codeText: 'text-emerald-700', codeBorder: 'border-emerald-100',
    hrVia: 'via-emerald-200',
    theadBg: 'bg-emerald-50', theadText: 'text-emerald-800', thBorder: 'border-b-emerald-100',
  },
  blue: {
    h1Border: 'border-blue-200',
    h2Text: 'text-blue-800', h2BorderL: 'border-l-blue-500', h2BorderB: 'border-b-blue-100',
    h3BorderL: 'border-l-blue-300',
    emText: 'text-blue-600',
    strongBg: 'bg-amber-50',
    bqBorder: 'border-blue-300', bqBg: 'bg-blue-50/50', bqText: 'text-blue-800',
    codeBg: 'bg-blue-50', codeText: 'text-blue-700', codeBorder: 'border-blue-100',
    hrVia: 'via-blue-200',
    theadBg: 'bg-blue-50', theadText: 'text-blue-800', thBorder: 'border-b-blue-100',
  },
  amber: {
    h1Border: 'border-amber-200',
    h2Text: 'text-amber-800', h2BorderL: 'border-l-amber-500', h2BorderB: 'border-b-amber-100',
    h3BorderL: 'border-l-amber-300',
    emText: 'text-amber-600',
    strongBg: 'bg-rose-50',
    bqBorder: 'border-amber-300', bqBg: 'bg-amber-50/50', bqText: 'text-amber-800',
    codeBg: 'bg-amber-50', codeText: 'text-amber-700', codeBorder: 'border-amber-100',
    hrVia: 'via-amber-200',
    theadBg: 'bg-amber-50', theadText: 'text-amber-800', thBorder: 'border-b-amber-100',
  },
}

function createComponents(t: MdTheme): Components {
  const s = themes[t]
  return {
    h1: ({ children }) => (
      <h1 className={`text-2xl font-bold text-slate-900 pb-3 mb-4 border-b-2 ${s.h1Border}`}>{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className={`text-lg font-bold ${s.h2Text} mt-8 mb-3 pb-2 border-b ${s.h2BorderB} pl-3 border-l-4 ${s.h2BorderL}`}>{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className={`text-base font-semibold text-slate-800 mt-5 mb-2 pl-3 border-l-2 ${s.h3BorderL}`}>{children}</h3>
    ),
    h4: ({ children }) => (
      <h4 className="text-sm font-semibold text-slate-700 mt-4 mb-1.5">{children}</h4>
    ),
    p: ({ children }) => (
      <p className="text-sm text-slate-600 leading-relaxed mb-2">{children}</p>
    ),
    ul: ({ children }) => (
      <ul className="mb-3 ml-1 list-none pl-0">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="mb-3 ml-1 list-decimal pl-5">{children}</ol>
    ),
    li: ({ children }) => (
      <li className="text-sm text-slate-700 leading-relaxed mb-1">{children}</li>
    ),
    strong: ({ children }) => (
      <strong className={`font-semibold text-slate-900 ${s.strongBg} px-0.5 rounded`}>{children}</strong>
    ),
    em: ({ children }) => (
      <em className={`italic ${s.emText}`}>{children}</em>
    ),
    blockquote: ({ children }) => (
      <blockquote className={`border-l-4 ${s.bqBorder} ${s.bqBg} rounded-r-lg px-4 py-2 my-3 text-sm ${s.bqText} italic`}>{children}</blockquote>
    ),
    code: ({ className, children }) => {
      const isInline = !className
      if (isInline) {
        return (
          <code className={`text-xs font-mono ${s.codeBg} ${s.codeText} px-1.5 py-0.5 rounded border ${s.codeBorder}`}>{children}</code>
        )
      }
      return (
        <code className={`${className} text-xs font-mono`}>{children}</code>
      )
    },
    pre: ({ children }) => (
      <pre className="bg-slate-800 text-slate-100 rounded-lg p-4 my-3 text-xs font-mono overflow-x-auto leading-relaxed">{children}</pre>
    ),
    hr: () => (
      <hr className={`my-6 border-0 h-px bg-gradient-to-r from-transparent ${s.hrVia} to-transparent`} />
    ),
    table: ({ children }) => (
      <div className="my-3 overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm border-collapse">{children}</table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className={`${s.theadBg} ${s.theadText}`}>{children}</thead>
    ),
    th: ({ children }) => (
      <th className={`px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider border-b ${s.thBorder}`}>{children}</th>
    ),
    td: ({ children }) => (
      <td className="px-3 py-2 text-slate-700 border-b border-slate-100">{children}</td>
    ),
  }
}

export function stripPreamble(md: string): string {
  let text = md
  text = text.replace(/^#\s+.+\n*/m, '')
  text = text.replace(/^(?:好的[，,].*?(?:\n|$)|根据.*?[。.](?:\s*\n|$)|以下是.*?[:：](?:\s*\n|$))/im, '')
  const thinkOpen = '\u003Cthink\u003E'
  const thinkClose = '\u003C/think\u003E'
  let start = text.indexOf(thinkOpen)
  while (start !== -1) {
    const end = text.indexOf(thinkClose, start)
    if (end !== -1) {
      text = text.slice(0, start) + text.slice(end + thinkClose.length)
    } else {
      text = text.slice(0, start)
    }
    start = text.indexOf(thinkOpen)
  }
  return text.trimStart()
}

export function MarkdownContent({ content, theme = 'purple' }: { content: string; theme?: MdTheme }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={createComponents(theme)}>
      {stripPreamble(content)}
    </ReactMarkdown>
  )
}