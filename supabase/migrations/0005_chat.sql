-- ============================================================================
-- Wyndell's — staff chat
-- Direct messages and group conversations between everyone who can sign in
-- to the staff portal (administrators and managers alike). Messages arrive in
-- real time over Socket.io; these tables are the durable history.
-- The Express API signs in with the service-role key (bypasses RLS); no
-- policies are defined, matching the convention of every earlier migration.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------

create type chat_conversation_type as enum ('direct', 'group');

create type chat_member_role as enum ('owner', 'member');

-- 'text' when the message is words only; 'image' / 'file' when it carries an
-- attachment uploaded to the `chat-attachments` storage bucket.
create type chat_message_kind as enum ('text', 'image', 'file');

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------

create table chat_conversations (
  id uuid primary key default gen_random_uuid(),
  type chat_conversation_type not null,
  -- Group name. Empty for direct conversations (they take their name from
  -- the other participant on the way out of the API).
  title text not null default '',
  -- 'uuidA:uuidB' with the pair sorted, so a direct conversation between two
  -- people can never be created twice. Null for groups.
  direct_key text unique,
  created_by uuid not null references users (id) on delete cascade,
  -- Newest message timestamp; drives the order of the conversation list.
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index chat_conversations_last_message_idx on chat_conversations (last_message_at desc);

create table chat_participants (
  conversation_id uuid not null references chat_conversations (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  role chat_member_role not null default 'member',
  -- When this person last opened the conversation; unread counts and read
  -- receipts are both derived from it.
  last_read_at timestamptz not null default now(),
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create index chat_participants_user_idx on chat_participants (user_id, conversation_id);

create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references chat_conversations (id) on delete cascade,
  sender_id uuid not null references users (id) on delete cascade,
  -- Empty for attachment-only messages; cleared when the message is deleted.
  body text not null default '',
  kind chat_message_kind not null default 'text',
  attachment_url text not null default '',
  attachment_name text not null default '',
  attachment_mime text not null default '',
  attachment_size bigint not null default 0,
  -- Set when the sender edits the message; set when they delete it (the row
  -- stays so everyone still sees "This message was deleted").
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create index chat_messages_conversation_idx on chat_messages (conversation_id, created_at desc, id desc);
create index chat_messages_sender_idx on chat_messages (sender_id, created_at desc);

create trigger chat_conversations_updated_at before update on chat_conversations
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- Row-level security
-- ----------------------------------------------------------------------------
-- No policies: the Express API uses the service-role key, which bypasses RLS
-- (same convention as 0001 / 0002 / 0003 / 0004).

alter table chat_conversations enable row level security;
alter table chat_participants enable row level security;
alter table chat_messages enable row level security;
