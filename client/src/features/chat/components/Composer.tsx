import { useRef, useState } from 'react'
import { Loader2Icon, PaperclipIcon, SendIcon, XIcon } from 'lucide-react'
import { toast } from 'sonner'
import { friendlyError } from '@/utils/format'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { uploadChatAttachment } from '@/services/api/chat'
import { emitTyping } from '@/services/chatSocket'
import type { ChatAttachment } from '@/types'
import { fileSize } from '../helpers'

/** How often a keystroke refreshes the typing signal. */
const TYPING_THROTTLE_MS = 2500
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
const MAX_TEXTAREA_HEIGHT_PX = 160

/** Message input: text, file attachment (uploaded first), and typing signal. */
export function Composer({
  conversationId,
  onSend,
}: {
  conversationId: string
  onSend: (body: string, attachment: ChatAttachment | null) => Promise<void>
}) {
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [attachment, setAttachment] = useState<ChatAttachment | null>(null)
  const [uploading, setUploading] = useState(false)
  const [sending, setSending] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const lastTypingRef = useRef(0)

  const canSend = (text.trim() !== '' || attachment !== null) && !uploading
  const busy = uploading || sending

  const notifyTyping = (value: string) => {
    const now = Date.now()
    if (value.trim()) {
      if (now - lastTypingRef.current >= TYPING_THROTTLE_MS) {
        lastTypingRef.current = now
        emitTyping(conversationId, true)
      }
    } else if (lastTypingRef.current > 0) {
      lastTypingRef.current = 0
      emitTyping(conversationId, false)
    }
  }

  const handleChange = (value: string) => {
    setText(value)
    notifyTyping(value)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void handleSend()
    }
  }

  const handlePickFile = async (picked: File | null) => {
    if (!picked) return
    if (picked.size > MAX_FILE_SIZE_BYTES) {
      toast.error('That file is too large. Please choose a file up to 10 MB.')
      return
    }
    setFile(picked)
    setUploading(true)
    try {
      setAttachment(await uploadChatAttachment(picked))
    } catch (error) {
      setFile(null)
      setAttachment(null)
      toast.error(friendlyError(error))
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const clearAttachment = () => {
    if (uploading) return
    setFile(null)
    setAttachment(null)
  }

  const handleSend = async () => {
    const body = text.trim()
    if (!canSend || sending) return
    setSending(true)
    try {
      await onSend(body, attachment)
      setText('')
      setFile(null)
      setAttachment(null)
      lastTypingRef.current = 0
      emitTyping(conversationId, false)
    } catch (error) {
      // Keep the draft so the message can be retried.
      toast.error(friendlyError(error))
    } finally {
      setSending(false)
    }
  }

  const growTextarea = (element: HTMLTextAreaElement) => {
    element.style.height = 'auto'
    element.style.height = `${Math.min(element.scrollHeight, MAX_TEXTAREA_HEIGHT_PX)}px`
  }

  return (
    <div className="border-t p-3">
      {attachment || uploading ? (
        <div className="mb-2 flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-xs">
          <PaperclipIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate">{attachment?.name ?? file?.name ?? ''}</span>
          {uploading ? (
            <span className="flex items-center gap-1 text-muted-foreground">
              <Loader2Icon className="size-3.5 animate-spin" />
              Uploading…
            </span>
          ) : (
            <span className="text-muted-foreground">{fileSize(attachment?.size ?? 0)}</span>
          )}
          <button
            type="button"
            onClick={clearAttachment}
            disabled={uploading}
            className="rounded-md p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-50"
            aria-label="Remove attachment"
          >
            <XIcon className="size-4" />
          </button>
        </div>
      ) : null}

      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(event) => void handlePickFile(event.target.files?.[0] ?? null)}
          aria-label="Attach a file"
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy || attachment !== null}
          title="Attach file"
        >
          <PaperclipIcon />
          <span className="sr-only">Attach file</span>
        </Button>

        <Textarea
          value={text}
          onChange={(event) => {
            growTextarea(event.target)
            handleChange(event.target.value)
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (lastTypingRef.current > 0) {
              lastTypingRef.current = 0
              emitTyping(conversationId, false)
            }
          }}
          rows={1}
          placeholder="Type a message…"
          aria-label="Message"
          className="max-h-40 min-h-10 flex-1 resize-none overflow-y-auto"
        />

        <Button onClick={() => void handleSend()} disabled={!canSend || sending} title="Send">
          {sending ? <Loader2Icon className="animate-spin" /> : <SendIcon />}
          <span className="sr-only">Send</span>
        </Button>
      </div>
    </div>
  )
}
