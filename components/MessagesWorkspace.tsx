'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import { formatDateTime, formatRelative } from '@/lib/format'
import type { MailFolderKey, MailMessageSummary } from '@/lib/zohoMail'

type Mode = 'read' | 'compose'

function msToDate(value: string | null) {
  if (!value) return null
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  const date = new Date(n)
  return Number.isNaN(date.getTime()) ? null : date
}

function displayWhen(message: MailMessageSummary) {
  const date =
    msToDate(message.receivedTime) || msToDate(message.sentDateInGMT)
  if (!date) return '—'
  return formatRelative(date)
}

function displayWhenFull(message: MailMessageSummary) {
  const date =
    msToDate(message.receivedTime) || msToDate(message.sentDateInGMT)
  if (!date) return '—'
  return formatDateTime(date)
}

function replySubject(subject: string) {
  const trimmed = subject.trim()
  if (/^re:\s/i.test(trimmed)) return trimmed
  return `Re: ${trimmed || '(no subject)'}`
}

/** Soften HTML for sandboxed iframe srcDoc (scripts already blocked by sandbox). */
function embedEmailHtml(html: string) {
  const cleaned = html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<\/(?:html|body|head)>/gi, '')
  return `<!DOCTYPE html><html><head><meta charset="utf-8" /><base target="_blank" /><style>body{margin:0;padding:1rem 0.25rem;font:15px/1.55 Figtree,Segoe UI,sans-serif;color:#1c1418;word-wrap:break-word;}a{color:#9a2349;}img{max-width:100%;height:auto;}</style></head><body>${cleaned}</body></html>`
}

export default function MessagesWorkspace({ fromEmail }: { fromEmail: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const prefillApplied = useRef(false)

  const [folder, setFolder] = useState<MailFolderKey>('inbox')
  const [messages, setMessages] = useState<MailMessageSummary[]>([])
  const [selected, setSelected] = useState<MailMessageSummary | null>(null)
  const [bodyHtml, setBodyHtml] = useState('')
  const [mode, setMode] = useState<Mode>('read')
  const [loadingList, setLoadingList] = useState(true)
  const [loadingBody, setLoadingBody] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [to, setTo] = useState('')
  const [cc, setCc] = useState('')
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')

  const loadList = useCallback(async (nextFolder: MailFolderKey) => {
    setLoadingList(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/messages?folder=${nextFolder}&start=1&limit=50`
      )
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Could not load messages')
        setMessages([])
        return
      }
      setMessages(data.messages || [])
    } catch {
      setError('Network error — could not load messages')
      setMessages([])
    } finally {
      setLoadingList(false)
    }
  }, [])

  useEffect(() => {
    void loadList(folder)
  }, [folder, loadList])

  async function openMessage(message: MailMessageSummary) {
    setMode('read')
    setSelected(message)
    setBodyHtml('')
    setLoadingBody(true)
    setError(null)
    setNotice(null)
    try {
      const params = new URLSearchParams({
        folderId: message.folderId,
        messageId: message.messageId,
      })
      const res = await fetch(`/api/messages/content?${params}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Could not load message')
        return
      }
      setBodyHtml(data.content || '')
    } catch {
      setError('Network error — could not load message body')
    } finally {
      setLoadingBody(false)
    }
  }

  const startCompose = useCallback(
    (prefill?: { to?: string; subject?: string; content?: string }) => {
      setMode('compose')
      setSelected(null)
      setBodyHtml('')
      setError(null)
      setNotice(null)
      setTo(prefill?.to || '')
      setCc('')
      setSubject(prefill?.subject || '')
      setContent(prefill?.content || '')
    },
    []
  )

  useEffect(() => {
    if (prefillApplied.current) return
    if (searchParams.get('compose') !== '1') return
    prefillApplied.current = true

    const toParam = searchParams.get('to') || ''
    const name = searchParams.get('name') || ''
    const subjectParam = searchParams.get('subject')
    const bodyParam = searchParams.get('body')

    startCompose({
      to: toParam,
      subject:
        subjectParam ??
        (name ? `Stavarkling — a note for ${name}` : 'Stavarkling — a quick note'),
      content: bodyParam ?? (name ? `Hello ${name},\n\n` : 'Hello,\n\n'),
    })

    router.replace('/messages', { scroll: false })
  }, [searchParams, router, startCompose])

  function startReply() {
    if (!selected) return
    startCompose({
      to: selected.fromAddress,
      subject: replySubject(selected.subject),
      content: '',
    })
  }

  async function sendMessage(e: FormEvent) {
    e.preventDefault()
    setSending(true)
    setError(null)
    setNotice(null)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to,
          cc: cc.trim() || undefined,
          subject,
          content,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Could not send message')
        return
      }
      setNotice(`Sent to ${data.to}`)
      setTo('')
      setCc('')
      setSubject('')
      setContent('')
      setFolder('sent')
      setMode('read')
      await loadList('sent')
    } catch {
      setError('Network error — message was not sent')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="messages-shell panel">
      <div className="messages-toolbar">
        <div className="messages-tabs" role="tablist" aria-label="Mail folders">
          <button
            type="button"
            role="tab"
            aria-selected={folder === 'inbox'}
            className={folder === 'inbox' ? 'is-active' : ''}
            onClick={() => {
              setFolder('inbox')
              setSelected(null)
              setMode('read')
              setNotice(null)
            }}
          >
            Inbox
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={folder === 'sent'}
            className={folder === 'sent' ? 'is-active' : ''}
            onClick={() => {
              setFolder('sent')
              setSelected(null)
              setMode('read')
              setNotice(null)
            }}
          >
            Sent
          </button>
        </div>
        <div className="messages-toolbar-actions">
          <p className="messages-from">From {fromEmail}</p>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => void loadList(folder)}
            disabled={loadingList}
          >
            Refresh
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => startCompose()}
          >
            Compose
          </button>
        </div>
      </div>

      {error ? <p className="form-error messages-banner">{error}</p> : null}
      {notice ? <p className="form-success messages-banner">{notice}</p> : null}

      <div className="messages-layout">
        <aside className="messages-list" aria-label="Message list">
          {loadingList ? (
            <p className="messages-empty">Loading messages…</p>
          ) : messages.length === 0 ? (
            <div className="messages-empty">
              <p className="empty-title font-display">No messages</p>
              <p className="empty-text">
                {folder === 'inbox'
                  ? 'Inbox is empty for this mailbox.'
                  : 'No sent mail yet from this address.'}
              </p>
            </div>
          ) : (
            <ul>
              {messages.map((message) => {
                const active =
                  selected?.messageId === message.messageId && mode === 'read'
                const unread = folder === 'inbox' && message.status === '0'
                return (
                  <li key={`${message.folderId}-${message.messageId}`}>
                    <button
                      type="button"
                      className={`messages-item${active ? ' is-active' : ''}${unread ? ' is-unread' : ''}`}
                      onClick={() => void openMessage(message)}
                    >
                      <span className="messages-item-top">
                        <span className="messages-item-from">
                          {folder === 'sent'
                            ? message.toAddress || '—'
                            : message.fromAddress || message.sender || '—'}
                        </span>
                        <span className="messages-item-time">
                          {displayWhen(message)}
                        </span>
                      </span>
                      <span className="messages-item-subject">
                        {message.subject}
                      </span>
                      {message.summary ? (
                        <span className="messages-item-preview">
                          {message.summary}
                        </span>
                      ) : null}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </aside>

        <section className="messages-pane" aria-live="polite">
          {mode === 'compose' ? (
            <form className="messages-compose" onSubmit={sendMessage}>
              <h2 className="panel-title font-display">New message</h2>
              <p className="panel-sub">
                Sends from {fromEmail} through Zoho Mail API.
              </p>

              <label className="field">
                <span>To</span>
                <input
                  type="email"
                  required
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  autoComplete="off"
                />
              </label>
              <label className="field">
                <span>Cc (optional)</span>
                <input
                  type="email"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  autoComplete="off"
                />
              </label>
              <label className="field">
                <span>Subject</span>
                <input
                  type="text"
                  required
                  maxLength={500}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </label>
              <label className="field">
                <span>Message</span>
                <textarea
                  required
                  rows={12}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </label>

              <div className="messages-compose-actions">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => {
                    setMode('read')
                    setNotice(null)
                  }}
                  disabled={sending}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={sending}>
                  {sending ? 'Sending…' : 'Send'}
                </button>
              </div>
            </form>
          ) : !selected ? (
            <div className="messages-empty messages-empty-pane">
              <p className="empty-title font-display">Select a message</p>
              <p className="empty-text">
                Choose a conversation from the list, or compose a new email.
              </p>
            </div>
          ) : (
            <article className="messages-read">
              <header className="messages-read-header">
                <h2 className="font-display">{selected.subject}</h2>
                <dl className="messages-meta">
                  <div>
                    <dt>From</dt>
                    <dd>{selected.fromAddress || selected.sender || '—'}</dd>
                  </div>
                  <div>
                    <dt>To</dt>
                    <dd>{selected.toAddress || '—'}</dd>
                  </div>
                  <div>
                    <dt>Date</dt>
                    <dd>{displayWhenFull(selected)}</dd>
                  </div>
                </dl>
                {folder === 'inbox' ? (
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={startReply}
                  >
                    Reply
                  </button>
                ) : null}
              </header>

              {loadingBody ? (
                <p className="messages-empty">Loading content…</p>
              ) : (
                <iframe
                  className="messages-iframe"
                  title={selected.subject}
                  sandbox=""
                  referrerPolicy="no-referrer"
                  srcDoc={embedEmailHtml(bodyHtml)}
                />
              )}
            </article>
          )}
        </section>
      </div>
    </div>
  )
}
