'use client'

import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeHighlight from 'rehype-highlight'
import { Copy, Check, Clock, Info, Lightbulb, AlertTriangle } from 'lucide-react'
import type { Components } from 'react-markdown'

function estimateReadTime(text: string): number {
  const words = text.trim().split(/\s+/).length
  return Math.max(1, Math.ceil(words / 200))
}

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={copy}
      className="absolute top-2 right-2 p-1.5 rounded-md bg-slate-700/60 hover:bg-slate-600/80 text-slate-400 hover:text-white transition-all"
      title="Copy code"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

type CalloutType = 'note' | 'tip' | 'warning' | null

function detectCallout(text: string): CalloutType {
  if (/^\[!NOTE\]/i.test(text)) return 'note'
  if (/^\[!TIP\]/i.test(text)) return 'tip'
  if (/^\[!WARNING\]/i.test(text)) return 'warning'
  return null
}

const calloutConfig = {
  note:    { Icon: Info,          bg: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-700',    body: 'text-blue-800',    label: 'Note' },
  tip:     { Icon: Lightbulb,    bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', body: 'text-emerald-800', label: 'Tip' },
  warning: { Icon: AlertTriangle, bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   body: 'text-amber-800',   label: 'Warning' },
}

function ScrollProgress({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> }) {
  const [pct, setPct] = useState(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const scrollable = el.closest('[class*="overflow-y-auto"]') as HTMLElement | null
    if (!scrollable) return

    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollable
      const max = scrollHeight - clientHeight
      setPct(max > 0 ? Math.min(100, (scrollTop / max) * 100) : 0)
    }
    scrollable.addEventListener('scroll', onScroll, { passive: true })
    return () => scrollable.removeEventListener('scroll', onScroll)
  }, [containerRef])

  return (
    <div className="w-full h-0.5 bg-slate-100 rounded-full overflow-hidden mb-6">
      <div
        className="h-full bg-emerald-500 rounded-full transition-all duration-100"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function buildComponents(): Components {
  return {
    code({ className, children, ...props }) {
      const isInline = !className
      if (isInline) {
        return (
          <code className="bg-slate-100 text-emerald-700 border border-slate-200 px-1.5 py-0.5 rounded text-[0.85em] font-mono" {...props}>
            {children}
          </code>
        )
      }
      const lang = (className ?? '').replace('language-', '') || 'code'
      const codeText = String(children).replace(/\n$/, '')
      return (
        <div className="relative group my-5">
          <div className="flex items-center justify-between bg-slate-800 border border-slate-700 rounded-t-lg px-3 py-1.5">
            <span className="text-xs text-slate-400 font-mono">{lang}</span>
          </div>
          <div className="relative bg-slate-900 border border-t-0 border-slate-700 rounded-b-lg overflow-x-auto">
            <CopyButton code={codeText} />
            <pre className="p-4 text-sm overflow-x-auto">
              <code className={className} {...props}>{children}</code>
            </pre>
          </div>
        </div>
      )
    },

    blockquote({ children }) {
      const rawText = children
        ? (Array.isArray(children) ? children : [children])
            .map(c => (typeof c === 'string' ? c : (c as { props?: { children?: string } })?.props?.children ?? ''))
            .join('')
        : ''
      const calloutType = detectCallout(rawText.trim())

      if (!calloutType) {
        return (
          <blockquote className="border-l-4 border-slate-300 bg-slate-50 pl-4 pr-3 py-2 my-4 rounded-r-lg text-slate-600 italic">
            {children}
          </blockquote>
        )
      }

      const { Icon, bg, border, text, body, label } = calloutConfig[calloutType]
      return (
        <div className={`${bg} ${border} border rounded-xl p-4 my-4`}>
          <div className={`flex items-center gap-2 ${text} font-semibold text-sm mb-2`}>
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </div>
          <div className={`text-sm ${body} [&>p]:m-0`}>
            {children}
          </div>
        </div>
      )
    },

    table({ children }) {
      return (
        <div className="overflow-x-auto my-5 rounded-xl border border-slate-200 shadow-sm">
          <table className="w-full text-sm border-collapse">{children}</table>
        </div>
      )
    },
    th({ children }) {
      return <th className="border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-left text-slate-700 font-semibold">{children}</th>
    },
    td({ children }) {
      return <td className="border-b border-slate-100 px-4 py-2.5 text-slate-600">{children}</td>
    },

    h1({ children }) {
      return <h1 className="text-2xl font-bold text-slate-900 mt-8 mb-4">{children}</h1>
    },
    h2({ children }) {
      return <h2 className="text-xl font-bold text-slate-900 mt-10 mb-3 pb-2 border-b border-slate-200">{children}</h2>
    },
    h3({ children }) {
      return <h3 className="text-base font-semibold text-slate-800 mt-6 mb-2">{children}</h3>
    },
    h4({ children }) {
      return <h4 className="text-sm font-semibold text-slate-700 mt-4 mb-1.5 uppercase tracking-wide">{children}</h4>
    },

    p({ children }) {
      return <p className="text-slate-600 leading-relaxed my-3">{children}</p>
    },

    ul({ children }) {
      return <ul className="list-disc list-outside pl-5 my-3 space-y-1.5 text-slate-600">{children}</ul>
    },
    ol({ children }) {
      return <ol className="list-decimal list-outside pl-5 my-3 space-y-1.5 text-slate-600">{children}</ol>
    },
    li({ children }) {
      return <li className="leading-relaxed">{children}</li>
    },

    strong({ children }) {
      return <strong className="font-semibold text-slate-900">{children}</strong>
    },

    a({ href, children }) {
      return (
        <a
          href={href}
          className="text-emerald-600 hover:text-emerald-700 underline underline-offset-2 transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          {children}
        </a>
      )
    },

    hr() {
      return <hr className="border-slate-200 my-8" />
    },
  }
}

export default function LessonContent({ content }: { content: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const readTime = estimateReadTime(content)
  const components = buildComponents()

  return (
    <div ref={ref}>
      <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
        <Clock className="w-3.5 h-3.5" />
        <span>~{readTime} min read</span>
      </div>
      <ScrollProgress containerRef={ref} />

      <div className="lesson-content [&_pre]:!m-0 [&_pre]:!p-0 [&_pre]:!bg-transparent [&_pre]:!border-0">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw, rehypeHighlight]}
          components={components}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  )
}
