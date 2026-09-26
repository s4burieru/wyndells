import { useEffect, useState } from 'react'
import { LogOutIcon, Settings2Icon, UserPlusIcon, XIcon } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/utils/cn'
import { friendlyError, roleBadgeClass, roleLabel } from '@/utils/format'
import { ConfirmDialog, Modal } from '@/components/common/Modal'
import { UserAvatar } from '@/components/common/UserAvatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ChatConversation, ChatParticipant, Role } from '@/types'
import { AddMembersList } from './NewChatModals'

/** Rename a group, manage its members, add new people, or leave. */
export function GroupSettingsModal({
  open,
  conversation,
  currentUserId,
  currentUserRole,
  onClose,
  onRename,
  onAdd,
  onRemove,
  onLeave,
}: {
  open: boolean
  conversation: ChatConversation | null
  currentUserId: string
  currentUserRole: Role
  onClose: () => void
  onRename: (title: string) => Promise<void>
  onAdd: (memberIds: string[]) => Promise<void>
  onRemove: (userId: string) => Promise<void>
  onLeave: () => Promise<void>
}) {
  const [draftTitle, setDraftTitle] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [leaveConfirm, setLeaveConfirm] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<ChatParticipant | null>(null)
  const [busy, setBusy] = useState(false)

  const participants = conversation?.participants ?? []
  const myRole = participants.find((person) => person.id === currentUserId)?.memberRole
  // Members may manage settings; owners and administrators may remove people.
  const canManage = myRole === 'owner' || currentUserRole === 'admin'

  useEffect(() => {
    if (open && conversation) {
      setDraftTitle(conversation.title)
      setAddOpen(false)
      setLeaveConfirm(false)
      setRemoveTarget(null)
    }
  }, [open, conversation])

  if (!open || !conversation) return null

  const titleChanged = draftTitle.trim() !== conversation.title && draftTitle.trim() !== ''

  const rename = async () => {
    if (!titleChanged || busy) return
    setBusy(true)
    setRenaming(true)
    try {
      await onRename(draftTitle.trim())
    } catch (error) {
      toast.error(friendlyError(error))
    } finally {
      setBusy(false)
      setRenaming(false)
    }
  }

  const leave = async () => {
    setBusy(true)
    try {
      await onLeave()
      setLeaveConfirm(false)
    } catch (error) {
      toast.error(friendlyError(error))
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!removeTarget) return
    setBusy(true)
    try {
      await onRemove(removeTarget.id)
      setRemoveTarget(null)
    } catch (error) {
      toast.error(friendlyError(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      title="Group settings"
      onClose={onClose}
      footer={
        <Button variant="outline" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="grid gap-6">
        <div className="grid gap-1.5">
          <label htmlFor="settings-group-title" className="text-sm font-medium">
            Group name
          </label>
          <div className="flex gap-2">
            <Input
              id="settings-group-title"
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              maxLength={80}
              disabled={busy}
            />
            <Button
              onClick={() => void rename()}
              disabled={!titleChanged || busy || renaming}
              variant="outline"
            >
              {renaming ? 'Saving…' : 'Rename'}
            </Button>
          </div>
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Members · {participants.length}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setAddOpen((value) => !value)}
              disabled={busy}
            >
              <UserPlusIcon />
              {addOpen ? 'Hide' : 'Add members'}
            </Button>
          </div>

          <ul className="grid gap-1">
            {participants.map((person) => {
              const isMe = person.id === currentUserId
              const showRemove = isMe || canManage
              return (
                <li
                  key={person.id}
                  className="flex items-center gap-3 rounded-lg border px-2 py-1.5"
                >
                  <UserAvatar
                    name={person.name}
                    src={person.avatarUrl}
                    role={person.role}
                    size="sm"
                  />
                  <span className="grid min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 truncate text-sm font-medium">
                      {person.name}
                      {isMe ? <span className="text-xs text-muted-foreground">(you)</span> : null}
                    </span>
                  </span>
                  <Badge className={cn('px-1.5 py-0 text-[0.65rem]', roleBadgeClass(person.role))}>
                    {roleLabel(person.role)}
                  </Badge>
                  {person.memberRole === 'owner' ? (
                    <Badge variant="outline" className="px-1.5 py-0 text-[0.65rem]">
                      Owner
                    </Badge>
                  ) : null}
                  {showRemove ? (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      disabled={busy}
                      title={isMe ? 'Leave group' : `Remove ${person.name}`}
                      onClick={() => (isMe ? setLeaveConfirm(true) : setRemoveTarget(person))}
                    >
                      {isMe ? <LogOutIcon className="size-4" /> : <XIcon className="size-4" />}
                      <span className="sr-only">{isMe ? 'Leave group' : 'Remove member'}</span>
                    </Button>
                  ) : null}
                </li>
              )
            })}
          </ul>

          {addOpen ? (
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                <Settings2Icon className="size-4 text-muted-foreground" />
                Add members
              </div>
              <AddMembersList
                open={addOpen}
                existingIds={participants.map((person) => person.id)}
                onAdd={onAdd}
              />
            </div>
          ) : null}
        </div>

        {myRole !== undefined ? (
          <Button
            variant="outline"
            className="justify-start border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setLeaveConfirm(true)}
            disabled={busy}
          >
            <LogOutIcon />
            Leave group
          </Button>
        ) : null}
      </div>

      <ConfirmDialog
        open={leaveConfirm}
        title="Leave group?"
        message="You will stop receiving messages from this group. A group owner can add you back later."
        confirmLabel="Leave"
        onConfirm={() => void leave()}
        onCancel={() => setLeaveConfirm(false)}
      />
      <ConfirmDialog
        open={removeTarget !== null}
        title="Remove member?"
        message={`Remove ${removeTarget?.name ?? 'this member'} from the group? They will no longer see new messages.`}
        confirmLabel="Remove"
        onConfirm={() => void remove()}
        onCancel={() => setRemoveTarget(null)}
      />
    </Modal>
  )
}
