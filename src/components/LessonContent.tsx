'use client'

import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeHighlight from 'rehype-highlight'
import { Copy, Check, Clock, Info, Lightbulb, AlertTriangle } from 'lucide-react'
import type { Components } from 'react-markdown'

// ── Read time ───────────────────────────────────────────────────────────────
function estimateReadTime(text: string): number {
  const words = text.trim().split(/\s+/).length
  return Math.max(1, Math.ceil(words / 200))
}

// ── Copy button for code blocks ─────────────────────────────────────────────
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
      className="absolute top-2 right-2 p-1.5 rounded-md bg-gray-700/60 hover:bg-gray-600/80 text-gray-400 hover:text-white transition-all"
      title="Copy code"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

// ── Callout box detection ────────────────────────────────────────────────────
type CalloutType = 'note' | 'tip' | 'warning' | null

function detectCallout(text: string): CalloutType {
  if (/^\[!NOTE\]/i.test(text)) return 'note'
  if (/^\[!TIP\]/i.test(text)) return 'tip'
  if (/^\[!WARNING\]/i.test(text)) return 'warning'
  return null
}

const calloutConfig = {
  note:    { Icon: Info,           bg: 'bg-blue-900/15',   border: 'border-blue-700/40',   text: 'text-blue-300',   label: 'Note' },
  tip:     { Icon: Lightbulb,      bg: 'bg-emerald-900/15',border: 'border-emerald-700/40',text: 'text-emerald-300',label: 'Tip' },
  warning: { Icon: AlertTriangle,  bg: 'bg-amber-900/15',  border: 'border-amber-700/40',  text: 'text-amber-300',  label: 'Warning' },
}

// ── Scroll progress bar ──────────────────────────────────────────────────────
function ScrollProgress({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> }) {
  const [pct, setPct] = useState(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    // Walk up to find the scrollable ancestor
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
    <div className="w-full h-0.5 bg-gray-800 rounded-full overflow-hidden mb-6">
      <div
        className="h-full bg-emerald-500 rounded-full transition-all duration-100"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

// ── Custom renderers ─────────────────────────────────────────────────────────
function buildComponents(): Components {
  return {
    // Code blocks with copy + language badge
    code({ className, children, ...props }) {
      const isInline = !className
      if (isInline) {
        return (
          <code className="bg-gray-800 text-emerald-300 px-1.5 py-0.5 rounded text-[0.85em] font-mono" {...props}>
            {children}
          </code>
        )
      }
      const lang = (className ?? '').replace('language-', '') || 'code'
      const codeText = String(children).replace(/\n$/, '')
      return (
        <div className="relative group my-4">
          <div className="flex items-center justify-between bg-gray-800 border border-gray-700 rounded-t-lg px-3 py-1.5">
            <span className="text-xs text-gray-400 font-mono">{lang}</span>
          </div>
          <div className="relative bg-gray-900 border border-t-0 border-gray-700 rounded-b-lg overflow-x-auto">
            <CopyButton code={codeText} />
            <pre className="p-4 text-sm overflow-x-auto">
              <code className={className} {...props}>{children}</code>
            </pre>
          </div>
        </div>
      )
    },

    // Callout boxes for blockquotes starting with [!NOTE], [!TIP], [!WARNING]
    blockquote({ children }) {
      // Extract raw text from children to detect callout marker
      const rawText = children
        ? (Array.isArray(children) ? children : [children])
            .map(c => (typeof c === 'string' ? c : (c as { props?: { children?: string } })?.props?.children ?? ''))
            .join('')
        : ''
      const calloutType = detectCallout(rawText.trim())

      if (!calloutType) {
        return (
          <blockquote className="border-l-4 border-gray-600 pl-4 my-4 text-gray-400 italic">
            {children}
          </blockquote>
        )
      }

      const { Icon, bg, border, text, label } = calloutConfig[calloutType]
      // Strip the [!TYPE] marker from visible content
      return (
        <div className={`${bg} ${border} border rounded-xl p-4 my-4`}>
          <div className={`flex items-center gap-2 ${text} font-semibold text-sm mb-2`}>
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </div>
          <div className="text-sm text-gray-300 [&>p]:m-0">
            {children}
          </div>
        </div>
      )
    },

    // Style tables
    table({ children }) {
      return (
        <div className="overflow-x-auto my-4">
          <table className="w-full text-sm border-collapse">{children}</table>
        </div>
      )
    },
    th({ children }) {
      return <th className="border border-gray-700 bg-gray-800 px-3 py-2 text-left text-gray-300 font-medium">{children}</th>
    },
    td({ children }) {
      return <td className="border border-gray-700 px-3 py-2 text-gray-400">{children}</td>
    },
  }
}

// ── Main component ───────────────────────────────────────────────────────────
export default function LessonContent({ content }: { content: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const readTime = estimateReadTime(content)
  const components = buildComponents()

  return (
    <div ref={ref}>
      {/* Read time + scroll progress */}
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
        <Clock className="w-3.5 h-3.5" />
        <span>~{readTime} min read</span>
      </div>
      <ScrollProgress containerRef={ref} />

      <div className="lesson-content prose prose-invert prose-sm max-w-none
        prose-headings:text-white prose-headings:font-bold
        prose-h1:text-2xl prose-h1:mb-4 prose-h1:mt-6
        prose-h2:text-xl prose-h2:mb-3 prose-h2:mt-8 prose-h2:border-b prose-h2:border-gray-800 prose-h2:pb-2
        prose-h3:text-base prose-h3:mb-2 prose-h3:mt-6 prose-h3:text-gray-200
        prose-p:text-gray-300 prose-p:leading-relaxed prose-p:my-3
        prose-ul:text-gray-300 prose-li:my-1
        prose-ol:text-gray-300
        prose-strong:text-white prose-strong:font-semibold
        prose-a:text-emerald-400 prose-a:no-underline hover:prose-a:underline
        prose-hr:border-gray-800
        [&_pre]:!m-0 [&_pre]:!p-0 [&_pre]:!bg-transparent [&_pre]:!border-0">
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
