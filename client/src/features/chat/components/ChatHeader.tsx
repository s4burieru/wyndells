import { ArrowLeftIcon, LogOutIcon, MoreVerticalIcon, SettingsIcon } from 'lucide-react'
import { roleLabel } from '@/utils/format'
import { UserAvatar } from '@/components/common/UserAvatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { ChatConversation } from '@/types'
import { conversationSubtitle, conversationTitle, directPartner } from '../helpers'

/** Thread header: identity, member subtitle, and the conversation menu. */
export function ChatHeader({
  conversation,
  currentUserId,
  onBack,
  onOpenSettings,
  onLeave,
}: {
  conversation: ChatConversation
  currentUserId: string
  onBack: () => void
  onOpenSettings: () => void
  onLeave: () => void
}) {
  const isGroup = conversation.type === 'group'
  const partner = directPartner(conversation, currentUserId)
  const title = conversationTitle(conversation, currentUserId)

  return (
    <div className="flex items-center gap-3 border-b px-4 py-3">
      <Button variant="ghost" size="icon" className="md:hidden" onClick={onBack}>
        <ArrowLeftIcon />
        <span className="sr-only">Back to conversations</span>
      </Button>

      <UserAvatar
        name={title}
        src={isGroup ? undefined : partner?.avatarUrl}
        role={partner?.role}
        size="sm"
      />
      <div className="grid min-w-0 flex-1">
        <span className="truncate text-sm font-semibold">{title}</span>
        <span className="truncate text-xs text-muted-foreground">
          {conversationSubtitle(conversation, currentUserId, roleLabel)}
        </span>
      </div>

      {isGroup ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVerticalIcon />
              <span className="sr-only">Conversation options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onOpenSettings}>
              <SettingsIcon />
              Group settings
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={onLeave}>
              <LogOutIcon />
              Leave group
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  )
}
