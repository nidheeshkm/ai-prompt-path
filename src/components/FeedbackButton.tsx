'use client'

import { useRef, useState } from 'react'
import { MessageSquarePlus, Bug, Lightbulb, X, Upload, ImageIcon, CheckCircle, AlertTriangle } from 'lucide-react'

type Props = {
  courseId?: string
  topicId?: string
}

const CATEGORIES = [
  { value: 'content_error',    label: 'Content Error' },
  { value: 'technical_issue',  label: 'Technical Issue' },
  { value: 'ui_problem',       label: 'UI Problem' },
  { value: 'missing_content',  label: 'Missing Content' },
  { value: 'other',            label: 'Other' },
]

const MAX_CHARS = 2000

export default function FeedbackButton({ courseId, topicId }: Props) {
  const [open, setOpen]               = useState(false)
  const [type, setType]               = useState<'feedback' | 'bug'>('feedback')
  const [category, setCategory]       = useState('')
  const [message, setMessage]         = useState('')
  const [screenshot, setScreenshot]   = useState<File | null>(null)
  const [dragOver, setDragOver]       = useState(false)
  const [submitting, setSubmitting]   = useState(false)
  const [result, setResult]           = useState<'success' | 'rate_limited' | 'error' | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function reset() {
    setType('feedback')
    setCategory('')
    setMessage('')
    setScreenshot(null)
    setResult(null)
    setSubmitting(false)
  }

  function close() {
    setOpen(false)
    setTimeout(reset, 300) // reset after animation
  }

  function handleFile(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith('image/')) return
    if (file.size > 5 * 1024 * 1024) {
      alert('Screenshot must be under 5 MB.')
      return
    }
    setScreenshot(file)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    handleFile(e.dataTransfer.files[0])
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) return
    setSubmitting(true)

    const fd = new FormData()
    fd.append('type', type)
    fd.append('message', message.trim())
    if (category) fd.append('category', category)
    if (courseId) fd.append('courseId', courseId)
    if (topicId)  fd.append('topicId', topicId)
    if (screenshot) fd.append('screenshot', screenshot)

    const res = await fetch('/api/feedback', { method: 'POST', body: fd })
    setSubmitting(false)

    if (res.ok) {
      setResult('success')
    } else if (res.status === 429) {
      setResult('rate_limited')
    } else {
      setResult('error')
    }
  }

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(true)}
        title="Send feedback or report an issue"
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium px-3 py-2 rounded-full shadow-lg transition-all hover:scale-105 active:scale-95"
      >
        <MessageSquarePlus className="w-3.5 h-3.5" />
        Feedback
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) close() }}
        >
          {/* Modal */}
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800 text-base">Share Feedback</h2>
              <button onClick={close} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Result states */}
            {result === 'success' ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 p-10 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-emerald-500" />
                </div>
                <p className="font-semibold text-slate-800">Thanks for your feedback!</p>
                <p className="text-sm text-slate-400">We review every submission and will act on it.</p>
                <button onClick={close} className="mt-2 text-sm text-slate-500 hover:text-slate-800 underline underline-offset-2">
                  Close
                </button>
              </div>
            ) : result === 'rate_limited' ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 p-10 text-center">
                <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-amber-500" />
                </div>
                <p className="font-semibold text-slate-800">Slow down a little</p>
                <p className="text-sm text-slate-400">You can submit up to 5 reports per 24 hours. Try again later.</p>
                <button onClick={close} className="mt-2 text-sm text-slate-500 hover:text-slate-800 underline underline-offset-2">
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="flex-1 overflow-y-auto">
                <div className="p-5 space-y-4">

                  {/* Type toggle */}
                  <div className="flex gap-2">
                    {([
                      { value: 'feedback', label: 'Suggestion', Icon: Lightbulb },
                      { value: 'bug',      label: 'Bug Report',  Icon: Bug       },
                    ] as const).map(({ value, label, Icon }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setType(value)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border text-sm font-medium transition-all ${
                          type === value
                            ? value === 'bug'
                              ? 'border-red-300 bg-red-50 text-red-700'
                              : 'border-amber-300 bg-amber-50 text-amber-700'
                            : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Category */}
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1.5 block">Category (optional)</label>
                    <select
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-amber-400 bg-white"
                    >
                      <option value="">Select a category…</option>
                      {CATEGORIES.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Message */}
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                      {type === 'bug' ? 'Describe the bug and steps to reproduce' : 'Your feedback or suggestion'}
                    </label>
                    <textarea
                      value={message}
                      onChange={e => setMessage(e.target.value.slice(0, MAX_CHARS))}
                      placeholder={type === 'bug'
                        ? 'What happened? What did you expect to happen?'
                        : 'What could be better? What did you find confusing?'
                      }
                      rows={4}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:border-amber-400 resize-none"
                      required
                    />
                    <p className={`text-right text-xs mt-1 ${message.length > MAX_CHARS * 0.9 ? 'text-amber-500' : 'text-slate-300'}`}>
                      {message.length}/{MAX_CHARS}
                    </p>
                  </div>

                  {/* Screenshot upload */}
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                      Screenshot (optional, max 5 MB)
                    </label>
                    {screenshot ? (
                      <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2">
                        <ImageIcon className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-sm text-slate-600 truncate flex-1">{screenshot.name}</span>
                        <button
                          type="button"
                          onClick={() => setScreenshot(null)}
                          className="text-slate-400 hover:text-red-500 transition-colors shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={onDrop}
                        onClick={() => fileRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl px-4 py-5 flex flex-col items-center gap-2 cursor-pointer transition-colors ${
                          dragOver
                            ? 'border-amber-400 bg-amber-50'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <Upload className={`w-5 h-5 ${dragOver ? 'text-amber-400' : 'text-slate-300'}`} />
                        <p className="text-xs text-slate-400">
                          Drop an image here, or <span className="text-amber-600 font-medium">browse</span>
                        </p>
                      </div>
                    )}
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => handleFile(e.target.files?.[0])}
                    />
                  </div>

                  {result === 'error' && (
                    <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                      Something went wrong. Please try again.
                    </p>
                  )}

                  {/* Context tags */}
                  {(courseId || topicId) && (
                    <p className="text-xs text-slate-300">
                      Context attached: {[courseId && `course ${courseId}`, topicId && `topic ${topicId}`].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>

                {/* Footer */}
                <div className="px-5 pb-5">
                  <button
                    type="submit"
                    disabled={submitting || !message.trim()}
                    className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-xl text-sm transition-colors"
                  >
                    {submitting ? 'Sending…' : 'Submit'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
