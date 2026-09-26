import { useState } from 'react'
import { FileTextIcon, MoreHorizontalIcon, PaperclipIcon, PencilIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/utils/cn'
import { friendlyError } from '@/utils/format'
import { UserAvatar } from '@/components/common/UserAvatar'
import { ConfirmDialog } from '@/components/common/Modal'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Textarea } from '@/components/ui/textarea'
import type { ChatMessage } from '@/types'
import { fileSize, messageTime } from '../helpers'

/** One message: text, attachment, or the tombstone left by a delete. */
export function MessageBubble({
  message,
  isOwn,
  showSender,
  onEdit,
  onDelete,
}: {
  message: ChatMessage
  isOwn: boolean
  showSender: boolean
  onEdit: (messageId: string, body: string) => Promise<void>
  onDelete: (messageId: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(message.body)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [busy, setBusy] = useState(false)

  const deleted = message.deletedAt !== null
  const attachment = message.attachment
  const isImage = attachment?.mime.startsWith('image/') ?? false

  const startEditing = () => {
    setDraft(message.body)
    setEditing(true)
  }

  const saveEdit = async () => {
    const next = draft.trim()
    if (!next || next === message.body) {
      setEditing(false)
      return
    }
    setBusy(true)
    try {
      await onEdit(message._id, next)
      setEditing(false)
    } catch (error) {
      // Stay in edit mode so the text is not lost.
      toast.error(friendlyError(error))
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    try {
      await onDelete(message._id)
      setConfirmingDelete(false)
    } catch (error) {
      toast.error(friendlyError(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={cn('group flex w-full items-start gap-2', isOwn && 'flex-row-reverse')}>
      {!isOwn ? (
        showSender ? (
          <UserAvatar name={message.sender.name} src={message.sender.avatarUrl} role={message.sender.role} size="xs" />
        ) : (
          <span className="size-8 shrink-0" aria-hidden />
        )
      ) : null}

      <div className={cn('grid max-w-[85%] gap-1', isOwn && 'justify-items-end')}>
        {showSender && !isOwn ? (
          <span className="px-1 text-xs font-medium text-muted-foreground">
            {message.sender.name}
          </span>
        ) : null}

        {editing ? (
          <div className="grid w-72 max-w-full gap-2 rounded-2xl border bg-card p-2">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={2}
              autoFocus
              aria-label="Edit message"
              className="min-h-16 resize-none text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={busy}>
                Cancel
              </Button>
              <Button size="sm" onClick={() => void saveEdit()} disabled={busy || !draft.trim()}>
                Save
              </Button>
            </div>
          </div>
        ) : (
          <div
            className={cn(
              'grid gap-2 rounded-2xl px-3 py-2 text-sm',
              isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
              deleted && 'bg-muted/60 text-muted-foreground italic',
            )}
          >
            {deleted ? (
              <span className="text-xs italic">This message was deleted</span>
            ) : (
              <>
                {attachment ? (
                  isImage ? (
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block"
                      title={attachment.name}
                    >
                      <img
                        src={attachment.url}
                        alt={attachment.name}
                        loading="lazy"
                        className="max-h-72 w-full max-w-xs rounded-lg object-cover"
                      />
                    </a>
                  ) : (
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noreferrer"
                      download={attachment.name}
                      className={cn(
                        'flex items-center gap-2 rounded-lg border px-3 py-2',
                        isOwn
                          ? 'border-primary-foreground/30 bg-primary-foreground/10 hover:bg-primary-foreground/20'
                          : 'border-border bg-background hover:bg-accent',
                      )}
                    >
                      {attachment.mime === 'application/pdf' ? (
                        <FileTextIcon className="size-5 shrink-0" />
                      ) : (
                        <PaperclipIcon className="size-5 shrink-0" />
                      )}
                      <span className="grid min-w-0 gap-0.5">
                        <span className="truncate text-xs font-medium">{attachment.name}</span>
                        <span
                          className={cn(
                            'text-[0.65rem]',
                            isOwn ? 'text-primary-foreground/80' : 'text-muted-foreground',
                          )}
                        >
                          {fileSize(attachment.size)}
                        </span>
                      </span>
                    </a>
                  )
                ) : null}

                {message.body ? <p className="break-words whitespace-pre-wrap">{message.body}</p> : null}
              </>
            )}
          </div>
        )}

        {!editing ? (
          <div className="flex items-center gap-1.5 px-1">
            {message.editedAt && !deleted ? (
              <span className="text-[0.65rem] text-muted-foreground">edited</span>
            ) : null}
            <span className="text-[0.65rem] text-muted-foreground">{messageTime(message.createdAt)}</span>

            {isOwn && !deleted ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="rounded-md p-0.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                    aria-label="Message options"
                  >
                    <MoreHorizontalIcon className="size-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={isOwn ? 'start' : 'end'}>
                  <DropdownMenuItem onClick={startEditing}>
                    <PencilIcon />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onClick={() => setConfirmingDelete(true)}>
                    <Trash2Icon />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmingDelete}
        title="Delete message?"
        message="This message will be removed for everyone in the conversation."
        confirmLabel="Delete"
        onConfirm={() => void remove()}
        onCancel={() => setConfirmingDelete(false)}
      />
    </div>
  )
}
