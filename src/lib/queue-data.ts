import { useCallback, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  createConversationKeyBytes,
  decryptBytes,
  decryptText,
  encryptBytes,
  encryptText,
  unwrapConversationKey,
  wrapConversationKey,
  type WrappedKey,
} from "@/lib/crypto";
import { useQueueAuth, type Profile } from "@/lib/queue-auth";
import { sendPushToUser } from "@/lib/push.functions";


const keyCache = new Map<string, CryptoKey>();

export function clearConversationKeys() {
  keyCache.clear();
}

export type ConversationRow = {
  id: string;
  last_message_at: string;
  peer: Profile | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unread: number;
  pinned: boolean;
  muted: boolean;
  locked: boolean;
  lockPinHash: string | null;
  myWrappedKey: WrappedKey | null;
};

export type ChatMessage = {
  id: string;
  mine: boolean;
  kind: string;
  text: string;
  created_at: string;
  read: boolean;
  mediaPath: string | null;
  mediaMime: string | null;
  mediaIv: string | null;
  durationMs: number | null;
  /** Id of the message this one replies to, when it is a reply. */
  replyToId: string | null;
  /** Set when the sender has edited the message. */
  editedAt: string | null;
  /** Set when the sender deleted the message for everyone (tombstone). */
  deletedAt: string | null;
  /** Whether the signed-in user pinned this message for their own view. */
  pinned: boolean;
  /** Local-only delivery state for optimistic bubbles. */
  pending?: "sending" | "failed";
  /** Local object URL used to preview an attachment before the upload finishes. */
  localUrl?: string | null;
};



export const MEDIA_BUCKET = "message-media";
export const MAX_MEDIA_BYTES = 20 * 1024 * 1024;

async function conversationKey(
  conversationId: string,
  wrapped: WrappedKey | null,
  privateKey: CryptoKey | null,
) {
  const cached = keyCache.get(conversationId);
  if (cached) return cached;
  if (!wrapped?.wrapped_key || !privateKey) return null;
  try {
    const key = await unwrapConversationKey(wrapped, privateKey);
    keyCache.set(conversationId, key);
    return key;
  } catch {
    return null;
  }
}

/** Generates and distributes the shared key for a brand-new conversation. */
export async function seedConversationKey(conversationId: string, memberIds: string[]) {
  const keyBytes = createConversationKeyBytes();
  const { data: keys } = await supabase
    .from("user_keys")
    .select("user_id, public_key")
    .in("user_id", memberIds);
  if (!keys?.length) return;

  for (const entry of keys) {
    const wrapped = await wrapConversationKey(keyBytes, entry.public_key);
    await supabase
      .from("conversation_members")
      .update(wrapped)
      .eq("conversation_id", conversationId)
      .eq("user_id", entry.user_id)
      .is("wrapped_key", null);
  }
  keyCache.delete(conversationId);
}

export function useConversations() {
  const { user, privateKey } = useQueueAuth();

  return useQuery({
    queryKey: ["conversations", user?.id, Boolean(privateKey)],
    enabled: Boolean(user),
    queryFn: async (): Promise<ConversationRow[]> => {
      if (!user) return [];
      const { data: memberships, error } = await supabase
        .from("conversation_members")
        .select(
          "conversation_id, last_read_at, wrapped_key, key_iv, ephemeral_public_key, pinned, muted, locked, lock_pin_hash",
        )
        .eq("user_id", user.id);
      if (error) throw error;
      if (!memberships?.length) return [];

      const ids = memberships.map((m) => m.conversation_id);

      const [{ data: conversations }, { data: members }, { data: messages }] = await Promise.all([
        supabase.from("conversations").select("id, last_message_at").in("id", ids),
        supabase
          .from("conversation_members")
          .select("conversation_id, user_id")
          .in("conversation_id", ids),
        supabase
          .from("messages")
          .select("id, conversation_id, sender_id, kind, ciphertext, iv, created_at")
          .in("conversation_id", ids)
          .order("created_at", { ascending: false })
          .limit(400),
      ]);

      const peerIds = (members ?? [])
        .filter((m) => m.user_id !== user.id)
        .map((m) => m.user_id);
      const { data: profiles } = peerIds.length
        ? await supabase
            .from("profiles")
            .select("id, username, display_name, bio, tone, presence, last_seen_at")
            .in("id", peerIds)
        : { data: [] as Profile[] };

      const profileById = new Map((profiles ?? []).map((p) => [p.id, p as Profile]));


      const rows = await Promise.all(
        (conversations ?? []).map(async (conversation) => {
          const membership = memberships.find((m) => m.conversation_id === conversation.id)!;
          const peerMember = (members ?? []).find(
            (m) => m.conversation_id === conversation.id && m.user_id !== user.id,
          );
          const wrapped: WrappedKey | null = membership.wrapped_key
            ? {
                wrapped_key: membership.wrapped_key,
                key_iv: membership.key_iv ?? "",
                ephemeral_public_key: membership.ephemeral_public_key ?? "",
              }
            : null;
          const key = await conversationKey(conversation.id, wrapped, privateKey);
          const convMessages = (messages ?? []).filter(
            (m) => m.conversation_id === conversation.id,
          );
          const latest = convMessages[0];

          let preview: string | null = null;
          if (latest) {
            if (latest.kind === "text" && key) {
              try {
                preview = await decryptText(key, latest.ciphertext, latest.iv);
              } catch {
                preview = "Encrypted message";
              }
            } else if (latest.kind !== "text") {
              preview = latest.kind === "audio" ? "Voice note" : "Attachment";
            } else {
              preview = "Encrypted message";
            }
          }

          const lastRead = new Date(membership.last_read_at).getTime();
          const unread = convMessages.filter(
            (m) => m.sender_id !== user.id && new Date(m.created_at).getTime() > lastRead,
          ).length;

          return {
            id: conversation.id,
            last_message_at: conversation.last_message_at,
            peer: peerMember ? (profileById.get(peerMember.user_id) ?? null) : null,
            lastMessage: preview,
            lastMessageAt: latest?.created_at ?? null,
            unread,
            pinned: Boolean(membership.pinned),
            muted: Boolean(membership.muted),
            locked: Boolean(membership.locked),
            lockPinHash: membership.lock_pin_hash ?? null,
            myWrappedKey: wrapped,
          } satisfies ConversationRow;
        }),
      );

      return rows.sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
      });
    },
    // Live updates carry the load; this is only a slow safety net.
    refetchInterval: 60000,
  });
}

export function useMessages(conversationId: string | null) {
  const { user, privateKey } = useQueueAuth();

  return useQuery({
    queryKey: ["messages", conversationId, Boolean(privateKey)],
    enabled: Boolean(conversationId && user),
    queryFn: async (): Promise<ChatMessage[]> => {
      if (!conversationId || !user) return [];

      const [{ data: membership }, { data: rows }, { data: hides }, { data: pins }] =
        await Promise.all([
          supabase
            .from("conversation_members")
            .select("wrapped_key, key_iv, ephemeral_public_key, user_id, last_read_at")
            .eq("conversation_id", conversationId),
          supabase
            .from("messages")
            .select(
              "id, sender_id, kind, ciphertext, iv, created_at, media_path, media_mime, duration_ms, reply_to_id, edited_at, deleted_at",
            )
            .eq("conversation_id", conversationId)
            .order("created_at", { ascending: true })
            .order("id", { ascending: true }),
          supabase
            .from("message_hides")
            .select("message_id")
            .eq("conversation_id", conversationId)
            .eq("user_id", user.id),
          supabase
            .from("message_pins")
            .select("message_id")
            .eq("conversation_id", conversationId)
            .eq("user_id", user.id),
        ]);

      const mine = (membership ?? []).find((m) => m.user_id === user.id);
      const peer = (membership ?? []).find((m) => m.user_id !== user.id);
      const wrapped: WrappedKey | null = mine?.wrapped_key
        ? {
            wrapped_key: mine.wrapped_key,
            key_iv: mine.key_iv ?? "",
            ephemeral_public_key: mine.ephemeral_public_key ?? "",
          }
        : null;
      const key = await conversationKey(conversationId, wrapped, privateKey);
      const peerRead = peer?.last_read_at ? new Date(peer.last_read_at).getTime() : 0;
      const hidden = new Set((hides ?? []).map((h) => h.message_id));
      const pinnedIds = new Set((pins ?? []).map((p) => p.message_id));

      return Promise.all(
        (rows ?? [])
          .filter((row) => !hidden.has(row.id))
          .map(async (row) => {
          let text = row.kind === "audio" ? "Voice note" : "Attachment";
          let mediaIv: string | null = null;

          if (row.deleted_at) {
            text = "";
          } else if (key) {
            const plain = await decryptText(key, row.ciphertext, row.iv).catch(() => null);
            if (plain === null) {
              text = "Encrypted message";
            } else if (row.kind === "text") {
              text = plain;
            } else {
              try {
                const meta = JSON.parse(plain) as { name?: string; mediaIv?: string };
                text = meta.name || text;
                mediaIv = meta.mediaIv ?? null;
              } catch {
                text = plain || text;
              }
            }
          } else {
            text = row.kind === "text" ? "Encrypted message" : text;
          }

          return {
            id: row.id,
            mine: row.sender_id === user.id,
            kind: row.kind,
            text,
            created_at: row.created_at,
            read: new Date(row.created_at).getTime() <= peerRead,
            mediaPath: row.media_path,
            mediaMime: row.media_mime,
            mediaIv,
            durationMs: row.duration_ms,
            replyToId: row.reply_to_id,
            editedAt: row.edited_at,
            deletedAt: row.deleted_at,
            pinned: pinnedIds.has(row.id),
          } satisfies ChatMessage;
        }),
      );
    },

  });
}

type MessageCacheUpdater = (messages: ChatMessage[]) => ChatMessage[];

/** Stable chat order: server time first, message id as a deterministic tiebreak. */
function sortMessages(messages: ChatMessage[]): ChatMessage[] {
  return [...messages].sort((a, b) => {
    const delta = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return delta !== 0 ? delta : a.id.localeCompare(b.id);
  });
}


/** Applies a change to every cached variant of one conversation's message list. */
function patchMessages(
  queryClient: ReturnType<typeof useQueryClient>,
  conversationId: string,
  update: MessageCacheUpdater,
) {
  queryClient.setQueriesData<ChatMessage[]>(
    { queryKey: ["messages", conversationId] },
    (current) => (current ? update(current) : current),
  );
}

function markFailed(
  queryClient: ReturnType<typeof useQueryClient>,
  conversationId: string,
  tempId: string,
) {
  patchMessages(queryClient, conversationId, (messages) =>
    messages.map((message) =>
      message.id === tempId ? { ...message, pending: "failed" as const } : message,
    ),
  );
}

export type TextDraft = { text: string; tempId: string; replyToId?: string | null };

/** Neutral label for a media message — no decrypted content ever leaves the device. */
function mediaSummary(kind: "image" | "video" | "file" | "audio") {
  if (kind === "image") return "Sent you a photo";
  if (kind === "video") return "Sent you a video";
  if (kind === "audio") return "Sent you a voice note";
  return "Sent you a file";
}

/** Fire-and-forget push so the recipient hears about a new message while Queue is closed. */
function notifyPeer(
  peer: Profile | null,
  conversationId: string,
  body: string,
  senderName?: string | null,
) {
  if (!peer?.id) return;
  sendPushToUser({
    data: {
      userId: peer.id,
      title: senderName || "New message",
      body,
      tag: `chat-${conversationId}`,
    },
  }).catch(() => undefined);
}

export function useSendMessage(conversationId: string | null, peer: Profile | null) {
  const { user, privateKey, profile } = useQueueAuth();
  const queryClient = useQueryClient();


  return useMutation<void, Error, TextDraft>({
    mutationFn: async ({ text, tempId, replyToId }: TextDraft) => {
      if (!conversationId || !user) throw new Error("No conversation");
      const { data: mine } = await supabase
        .from("conversation_members")
        .select("wrapped_key, key_iv, ephemeral_public_key")
        .eq("conversation_id", conversationId)
        .eq("user_id", user.id)
        .maybeSingle();

      const wrapped: WrappedKey | null = mine?.wrapped_key
        ? {
            wrapped_key: mine.wrapped_key,
            key_iv: mine.key_iv ?? "",
            ephemeral_public_key: mine.ephemeral_public_key ?? "",
          }
        : null;
      const key = await conversationKey(conversationId, wrapped, privateKey);
      if (!key) throw new Error("This conversation is still setting up its encryption key.");

      const { ciphertext, iv } = await encryptText(key, text);
      const { error } = await supabase.from("messages").insert({
        // The optimistic bubble already uses this id, so the live row replaces it exactly.
        id: tempId,
        conversation_id: conversationId,
        sender_id: user.id,
        kind: "text",
        ciphertext,
        iv,
        reply_to_id: replyToId ?? null,
      });
      if (error) throw error;

      notifyPeer(peer, conversationId, "Sent you a message", profile?.display_name);


    },
    onMutate: ({ text, tempId, replyToId }: TextDraft) => {
      if (!conversationId) return;
      patchMessages(queryClient, conversationId, (messages) => [
        ...messages.filter((message) => message.id !== tempId),
        {
          id: tempId,
          mine: true,
          kind: "text",
          text,
          created_at: new Date().toISOString(),
          read: false,
          mediaPath: null,
          mediaMime: null,
          mediaIv: null,
          durationMs: null,
          replyToId: replyToId ?? null,
          editedAt: null,
          deletedAt: null,
          pinned: false,
          pending: "sending",
        },
      ]);
    },

    onError: (_error, { tempId }) => {
      if (conversationId) markFailed(queryClient, conversationId, tempId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export type MediaDraft = {
  file: Blob;
  name: string;
  mime: string;
  kind: "image" | "video" | "file" | "audio";
  durationMs?: number;
  tempId: string;
  replyToId?: string | null;
};


/** Encrypts a photo, file or voice note on the device, uploads it, and posts the message. */
export function useSendMedia(conversationId: string | null, peer: Profile | null) {
  const { user, privateKey, profile } = useQueueAuth();
  const queryClient = useQueryClient();


  return useMutation<void, Error, MediaDraft>({
    mutationFn: async (draft: MediaDraft) => {
      if (!conversationId || !user) throw new Error("No conversation");
      if (draft.file.size > MAX_MEDIA_BYTES) {
        throw new Error("That file is larger than 20 MB.");
      }

      const { data: mine } = await supabase
        .from("conversation_members")
        .select("wrapped_key, key_iv, ephemeral_public_key")
        .eq("conversation_id", conversationId)
        .eq("user_id", user.id)
        .maybeSingle();

      const wrapped: WrappedKey | null = mine?.wrapped_key
        ? {
            wrapped_key: mine.wrapped_key,
            key_iv: mine.key_iv ?? "",
            ephemeral_public_key: mine.ephemeral_public_key ?? "",
          }
        : null;
      const key = await conversationKey(conversationId, wrapped, privateKey);
      if (!key) throw new Error("This conversation is still setting up its encryption key.");

      const plainBytes = await draft.file.arrayBuffer();
      const { data: cipherBytes, iv: mediaIv } = await encryptBytes(key, plainBytes);
      const path = `${conversationId}/${crypto.randomUUID()}`;

      const { error: uploadError } = await supabase.storage
        .from(MEDIA_BUCKET)
        .upload(path, new Blob([cipherBytes as BlobPart], { type: "application/octet-stream" }), {
          contentType: "application/octet-stream",
          upsert: false,
        });
      if (uploadError) throw new Error("Upload failed. Check your connection and try again.");

      const { ciphertext, iv } = await encryptText(
        key,
        JSON.stringify({ name: draft.name, mediaIv }),
      );

      const { error } = await supabase.from("messages").insert({
        id: draft.tempId,
        conversation_id: conversationId,
        sender_id: user.id,
        kind: draft.kind,
        ciphertext,
        iv,
        media_path: path,
        media_mime: draft.mime,
        duration_ms: draft.durationMs ?? null,
        reply_to_id: draft.replyToId ?? null,
      });
      if (error) {
        await supabase.storage.from(MEDIA_BUCKET).remove([path]);
        throw error;
      }

      notifyPeer(peer, conversationId, mediaSummary(draft.kind), profile?.display_name);


    },
    onMutate: (draft: MediaDraft) => {
      if (!conversationId) return;
      const localUrl =
        typeof URL !== "undefined" && (draft.kind === "image" || draft.kind === "video" || draft.kind === "audio")
          ? URL.createObjectURL(draft.file)
          : null;
      patchMessages(queryClient, conversationId, (messages) => [
        ...messages.filter((message) => message.id !== draft.tempId),
        {
          id: draft.tempId,
          mine: true,
          kind: draft.kind,
          text: draft.name,
          created_at: new Date().toISOString(),
          read: false,
          mediaPath: null,
          mediaMime: draft.mime,
          mediaIv: null,
          durationMs: draft.durationMs ?? null,
          replyToId: draft.replyToId ?? null,
          editedAt: null,
          deletedAt: null,
          pinned: false,
          pending: "sending",
          localUrl,
        },
      ]);
    },

    onError: (_error, draft) => {
      if (conversationId) markFailed(queryClient, conversationId, draft.tempId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}


/** Downloads and decrypts one attachment, returning a browser URL for it. */
export function useDecryptedMedia(conversationId: string | null, message: ChatMessage | null) {
  const { privateKey } = useQueueAuth();

  const query = useQuery({
    queryKey: ["media", message?.id, Boolean(privateKey)],
    enabled: Boolean(conversationId && message?.mediaPath && message?.mediaIv),
    staleTime: Infinity,
    queryFn: async (): Promise<Blob | null> => {
      if (!conversationId || !message?.mediaPath || !message.mediaIv) return null;
      const key = keyCache.get(conversationId) ?? null;
      if (!key) return null;

      const { data, error } = await supabase.storage.from(MEDIA_BUCKET).download(message.mediaPath);
      if (error || !data) throw new Error("Could not download this attachment.");

      const plain = await decryptBytes(key, await data.arrayBuffer(), message.mediaIv);
      return new Blob([plain], { type: message.mediaMime ?? "application/octet-stream" });
    },
  });

  const blob = query.data instanceof Blob ? query.data : null;

  const mediaUrl = useMemo(
    () => (blob && typeof URL !== "undefined" && typeof URL.createObjectURL === "function" ? URL.createObjectURL(blob) : null),
    [blob],
  );

  useEffect(() => {
    return () => {
      if (mediaUrl) URL.revokeObjectURL(mediaUrl);
    };
  }, [mediaUrl]);


  return { ...query, data: mediaUrl };
}



export function useMarkRead(conversationId: string | null) {
  const { user } = useQueueAuth();
  const queryClient = useQueryClient();

  return useCallback(async () => {
    if (!conversationId || !user) return;
    await supabase
      .from("conversation_members")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id);
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
  }, [conversationId, queryClient, user]);
}


/* ------------------------- edit, delete and pin ------------------------- */

/** Re-encrypts and saves new text for one of my own messages. RLS keeps this sender-only. */
export function useEditMessage(conversationId: string | null) {
  const { user, privateKey } = useQueueAuth();
  const queryClient = useQueryClient();

  return useMutation<void, Error, { messageId: string; text: string }>({
    mutationFn: async ({ messageId, text }) => {
      if (!conversationId || !user) throw new Error("No conversation");
      const trimmed = text.trim();
      if (!trimmed) throw new Error("A message cannot be empty.");

      const { data: mine } = await supabase
        .from("conversation_members")
        .select("wrapped_key, key_iv, ephemeral_public_key")
        .eq("conversation_id", conversationId)
        .eq("user_id", user.id)
        .maybeSingle();
      const wrapped: WrappedKey | null = mine?.wrapped_key
        ? {
            wrapped_key: mine.wrapped_key,
            key_iv: mine.key_iv ?? "",
            ephemeral_public_key: mine.ephemeral_public_key ?? "",
          }
        : null;
      const key = await conversationKey(conversationId, wrapped, privateKey);
      if (!key) throw new Error("This conversation is still setting up its encryption key.");

      const { ciphertext, iv } = await encryptText(key, trimmed);
      const { error } = await supabase
        .from("messages")
        .update({ ciphertext, iv, edited_at: new Date().toISOString() })
        .eq("id", messageId)
        .eq("sender_id", user.id);
      if (error) throw error;
    },
    onMutate: ({ messageId, text }) => {
      if (!conversationId) return;
      patchMessages(queryClient, conversationId, (messages) =>
        messages.map((message) =>
          message.id === messageId
            ? { ...message, text: text.trim(), editedAt: new Date().toISOString() }
            : message,
        ),
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

/** Hides a message for the signed-in user only. */
export function useDeleteForMe(conversationId: string | null) {
  const { user } = useQueueAuth();
  const queryClient = useQueryClient();

  return useMutation<void, Error, { messageId: string }>({
    mutationFn: async ({ messageId }) => {
      if (!conversationId || !user) throw new Error("No conversation");
      const { error } = await supabase
        .from("message_hides")
        .insert({ message_id: messageId, conversation_id: conversationId, user_id: user.id });
      if (error && error.code !== "23505") throw error;
    },
    onMutate: ({ messageId }) => {
      if (!conversationId) return;
      patchMessages(queryClient, conversationId, (messages) =>
        messages.filter((message) => message.id !== messageId),
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

/** Tombstones a message for both people. Only the sender can do this (enforced by RLS). */
export function useDeleteForEveryone(conversationId: string | null) {
  const { user } = useQueueAuth();
  const queryClient = useQueryClient();

  return useMutation<void, Error, { messageId: string; mediaPath?: string | null }>({
    mutationFn: async ({ messageId, mediaPath }) => {
      if (!conversationId || !user) throw new Error("No conversation");
      const { error } = await supabase
        .from("messages")
        .update({
          deleted_at: new Date().toISOString(),
          media_path: null,
          media_mime: null,
        })
        .eq("id", messageId)
        .eq("sender_id", user.id);
      if (error) throw error;
      if (mediaPath) {
        await supabase.storage.from(MEDIA_BUCKET).remove([mediaPath]);
      }
    },
    onMutate: ({ messageId }) => {
      if (!conversationId) return;
      patchMessages(queryClient, conversationId, (messages) =>
        messages.map((message) =>
          message.id === messageId
            ? {
                ...message,
                text: "",
                deletedAt: new Date().toISOString(),
                mediaPath: null,
                mediaIv: null,
                localUrl: null,
              }
            : message,
        ),
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

/** Pins or unpins a message for the signed-in user's own view. */
export function useTogglePinMessage(conversationId: string | null) {
  const { user } = useQueueAuth();
  const queryClient = useQueryClient();

  return useMutation<void, Error, { messageId: string; pinned: boolean }>({
    mutationFn: async ({ messageId, pinned }) => {
      if (!conversationId || !user) throw new Error("No conversation");
      if (pinned) {
        const { error } = await supabase
          .from("message_pins")
          .delete()
          .eq("message_id", messageId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("message_pins")
          .insert({ message_id: messageId, conversation_id: conversationId, user_id: user.id });
        if (error && error.code !== "23505") throw error;
      }
    },
    onMutate: ({ messageId, pinned }) => {
      if (!conversationId) return;
      patchMessages(queryClient, conversationId, (messages) =>
        messages.map((message) =>
          message.id === messageId ? { ...message, pinned: !pinned } : message,
        ),
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
    },
  });
}

/* ------------------------------ connection codes ------------------------------ */


const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

export function useMyCodes() {
  const { user } = useQueueAuth();
  return useQuery({
    queryKey: ["codes", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("connection_codes")
        .select("id, code, expires_at, used_at, revoked_at, created_at")
        .eq("creator_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useGenerateCode() {
  const { user } = useQueueAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Signed out");
      const code = randomCode();
      const { data, error } = await supabase
        .from("connection_codes")
        .insert({ code, creator_id: user.id })
        .select("id, code, expires_at")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["codes"] }),
  });
}

export function useRevokeCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("connection_codes")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["codes"] }),
  });
}

export type RedeemFailure = "invalid" | "used" | "expired" | "revoked" | "own" | "error";

export type RedeemResult = { status: "ok"; conversationId: string } | { status: RedeemFailure };

export function useRedeemCode() {
  const { user } = useQueueAuth();
  const queryClient = useQueryClient();

  return useMutation<RedeemResult, Error, string>({
    mutationFn: async (code: string): Promise<RedeemResult> => {
      if (!user) throw new Error("Signed out");
      const { data, error } = await supabase.rpc("redeem_connection_code", { p_code: code });
      if (error) return { status: "error" };
      const row = Array.isArray(data) ? data[0] : data;
      if (!row || row.status !== "ok" || !row.conversation_id || !row.peer_id) {
        return { status: (row?.status ?? "error") as RedeemFailure };
      }
      await seedConversationKey(row.conversation_id, [user.id, row.peer_id]);
      return { status: "ok", conversationId: row.conversation_id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["codes"] });
    },
  });
}

/* ------------------------------ notifications ------------------------------ */

export function useNotifications() {
  const { user } = useQueueAuth();
  return useQuery({
    queryKey: ["notifications", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, kind, title, body, data, read_at, created_at")
        .neq("kind", "message")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMarkNotificationsRead() {
  const { user } = useQueueAuth();
  const queryClient = useQueryClient();
  return useCallback(async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }, [queryClient, user]);
}

export function useMarkNotificationRead() {
  const { user } = useQueueAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) return;
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useDeleteNotification() {
  const { user } = useQueueAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) return;
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useDeleteAllNotifications() {
  const { user } = useQueueAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("user_id", user.id)
        .neq("kind", "message");
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

/* ------------------------------ calls ------------------------------ */

export function useCallHistory() {
  const { user } = useQueueAuth();
  return useQuery({
    queryKey: ["calls", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calls")
        .select(
          "id, conversation_id, caller_id, callee_id, kind, status, duration_seconds, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/* ------------------------------ statuses ------------------------------ */

export function useStatuses() {
  const { user } = useQueueAuth();
  return useQuery({
    queryKey: ["statuses", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("statuses")
        .select("id, user_id, note, tone, created_at, expires_at, media_path, media_mime, media_kind")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = data ?? [];
      const userIds = [...new Set(rows.map((s) => s.user_id))];
      const { data: profiles } = userIds.length
        ? await supabase
            .from("profiles")
            .select("id, username, display_name, bio, tone, presence")
            .in("id", userIds)
        : { data: [] as Profile[] };
      const byId = new Map((profiles ?? []).map((p) => [p.id, p as Profile]));
      const { data: views } = rows.length
        ? await supabase
            .from("status_views")
            .select("status_id")
            .eq("viewer_id", user?.id ?? "")
            .in(
              "status_id",
              rows.map((s) => s.id),
            )
        : { data: [] as { status_id: string }[] };
      const seenIds = new Set((views ?? []).map((v) => v.status_id));
      return rows
        .map((status) => ({
          ...status,
          profile: byId.get(status.user_id) ?? null,
          seen: status.user_id === user?.id || seenIds.has(status.id),
        }))
        .sort((a, b) => {
          if (a.seen !== b.seen) return a.seen ? 1 : -1;
          return b.created_at.localeCompare(a.created_at);
        });
    },
  });
}

export function useMarkStatusSeen() {
  const { user } = useQueueAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (statusId: string) => {
      if (!user) return;
      await supabase
        .from("status_views")
        .upsert({ status_id: statusId, viewer_id: user.id }, { onConflict: "status_id,viewer_id" });
    },
    onSettled: () => queryClient.setQueryData(["statuses-stale"], Date.now()),
  });
}

export const STATUS_BUCKET = "status-media";

export type StatusDraft = { note: string; file?: File | null; tone?: string };

export function usePostStatus() {
  const { user, profile } = useQueueAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: StatusDraft | string) => {
      if (!user) throw new Error("Signed out");
      const draft: StatusDraft = typeof input === "string" ? { note: input } : input;
      const note = draft.note.trim();
      const file = draft.file ?? null;
      if (!note && !file) throw new Error("Add a note, photo or video.");

      let mediaPath: string | null = null;
      let mediaMime: string | null = null;
      let mediaKind: string | null = null;

      if (file) {
        if (file.size > MAX_MEDIA_BYTES) {
          throw new Error("That file is too large. Keep status media under 20 MB.");
        }
        const isVideo = file.type.startsWith("video/");
        if (!isVideo && !file.type.startsWith("image/")) {
          throw new Error("Only photos and videos can be shared as a status.");
        }
        const ext = file.name.includes(".") ? file.name.split(".").pop() : isVideo ? "mp4" : "jpg";
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from(STATUS_BUCKET)
          .upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
        if (uploadError) throw new Error("Could not upload that file.");
        mediaPath = path;
        mediaMime = file.type || null;
        mediaKind = isVideo ? "video" : "image";
      }

      const { error } = await supabase.from("statuses").insert({
        user_id: user.id,
        note,
        tone: draft.tone ?? profile?.tone ?? "bg-pastel-lilac",
        media_path: mediaPath,
        media_mime: mediaMime,
        media_kind: mediaKind,
      });
      if (error) {
        if (mediaPath) await supabase.storage.from(STATUS_BUCKET).remove([mediaPath]);
        throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["statuses"] }),
  });
}

/** Signed URL for a status photo or video, valid for an hour. */
export function useStatusMedia(mediaPath: string | null | undefined) {
  return useQuery({
    queryKey: ["status-media", mediaPath],
    enabled: Boolean(mediaPath),
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from(STATUS_BUCKET)
        .createSignedUrl(mediaPath!, 3600);
      if (error) throw error;
      return data?.signedUrl ?? null;
    },
  });
}

/* ------------------------------ realtime ------------------------------ */

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  kind: string;
  ciphertext: string;
  iv: string;
  created_at: string;
  media_path: string | null;
  media_mime: string | null;
  duration_ms: number | null;
  reply_to_id?: string | null;
  edited_at?: string | null;
  deleted_at?: string | null;
};

/** Turns a live message row into a chat bubble using the cached conversation key. */
async function decodeMessageRow(row: MessageRow, userId: string): Promise<ChatMessage | null> {
  const key = keyCache.get(row.conversation_id);
  if (!key) return null;

  let text = row.kind === "audio" ? "Voice note" : "Attachment";
  let mediaIv: string | null = null;

  if (row.deleted_at) {
    text = "";
  } else {
    const plain = await decryptText(key, row.ciphertext, row.iv).catch(() => null);
    if (plain === null) {
      text = "Encrypted message";
    } else if (row.kind === "text") {
      text = plain;
    } else {
      try {
        const meta = JSON.parse(plain) as { name?: string; mediaIv?: string };
        text = meta.name || text;
        mediaIv = meta.mediaIv ?? null;
      } catch {
        text = plain || text;
      }
    }
  }

  return {
    id: row.id,
    mine: row.sender_id === userId,
    kind: row.kind,
    text,
    created_at: row.created_at,
    read: false,
    mediaPath: row.media_path,
    mediaMime: row.media_mime,
    mediaIv,
    durationMs: row.duration_ms,
    replyToId: row.reply_to_id ?? null,
    editedAt: row.edited_at ?? null,
    deletedAt: row.deleted_at ?? null,
    pinned: false,
  } satisfies ChatMessage;
}


export function useQueueRealtime() {
  const { user } = useQueueAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;
    const userId = user.id;

    const channel = supabase
      .channel(`queue-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async ({ new: raw }) => {
          const row = raw as MessageRow;
          const decoded = await decodeMessageRow(row, userId);
          if (decoded) {
            patchMessages(queryClient, row.conversation_id, (messages) => {
              const existing = messages.find((message) => message.id === decoded.id);
              // The sender inserts with the optimistic id, so this replaces it exactly.
              const rest = messages.filter((message) => message.id !== decoded.id);
              const merged: ChatMessage = existing
                ? { ...decoded, pinned: existing.pinned, read: existing.read }
                : decoded;
              return sortMessages([...rest, merged]);
            });
          } else {
            queryClient.invalidateQueries({ queryKey: ["messages", row.conversation_id] });
          }
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        async ({ new: raw }) => {
          const row = raw as MessageRow;
          const decoded = await decodeMessageRow(row, userId);
          if (!decoded) {
            queryClient.invalidateQueries({ queryKey: ["messages", row.conversation_id] });
            return;
          }
          patchMessages(queryClient, row.conversation_id, (messages) => {
            if (!messages.some((message) => message.id === decoded.id)) return messages;
            return messages.map((message) =>
              message.id === decoded.id
                ? { ...decoded, pinned: message.pinned, read: message.read }
                : message,
            );
          });
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "messages" },
        ({ old: raw }) => {
          const row = raw as Partial<MessageRow>;
          if (!row.conversation_id || !row.id) {
            queryClient.invalidateQueries({ queryKey: ["messages"] });
          } else {
            patchMessages(queryClient, row.conversation_id, (messages) =>
              messages.filter((message) => message.id !== row.id),
            );
          }
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_pins" },
        ({ new: fresh, old: stale }) => {
          const row = (fresh ?? stale) as { conversation_id?: string; user_id?: string };
          if (row?.user_id && row.user_id !== userId) return;
          if (row?.conversation_id) {
            queryClient.invalidateQueries({ queryKey: ["messages", row.conversation_id] });
          } else {
            queryClient.invalidateQueries({ queryKey: ["messages"] });
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_hides" },
        ({ new: fresh, old: stale }) => {
          const row = (fresh ?? stale) as { conversation_id?: string; user_id?: string };
          if (row?.user_id && row.user_id !== userId) return;
          if (row?.conversation_id) {
            queryClient.invalidateQueries({ queryKey: ["messages", row.conversation_id] });
          } else {
            queryClient.invalidateQueries({ queryKey: ["messages"] });
          }
        },
      )

      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conversation_members" },
        ({ new: raw }) => {
          const row = raw as { conversation_id?: string };
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
          if (row.conversation_id) {
            // Read receipts live on the peer's membership row.
            queryClient.invalidateQueries({ queryKey: ["messages", row.conversation_id] });
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "conversation_members" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
        },
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => {
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => {
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "calls" }, () => {
        queryClient.invalidateQueries({ queryKey: ["calls"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, user]);
}

export function useUnreadCounts() {
  const conversations = useConversations();
  const notifications = useNotifications();

  return useMemo(
    () => ({
      chats: (conversations.data ?? []).reduce((sum, c) => sum + c.unread, 0),
      notifications: (notifications.data ?? []).filter((n) => !n.read_at).length,
    }),
    [conversations.data, notifications.data],
  );
}

/* ------------------------------ chat controls ------------------------------ */

export type ChatSettingsPatch = {
  conversationId: string;
  pinned?: boolean;
  muted?: boolean;
  locked?: boolean;
  lock_pin_hash?: string | null;
};

export async function hashPin(pin: string) {
  const bytes = new TextEncoder().encode(`queue-lock:${pin}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function useUpdateChatSettings() {
  const { user } = useQueueAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, ...patch }: ChatSettingsPatch) => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("conversation_members")
        .update(patch)
        .eq("conversation_id", conversationId)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onMutate: async ({ conversationId, ...patch }) => {
      const keys = queryClient.getQueryCache().findAll({ queryKey: ["conversations"] });
      for (const entry of keys) {
        queryClient.setQueryData<ConversationRow[]>(entry.queryKey, (rows) =>
          rows?.map((row) =>
            row.id === conversationId
              ? {
                  ...row,
                  pinned: patch.pinned ?? row.pinned,
                  muted: patch.muted ?? row.muted,
                  locked: patch.locked ?? row.locked,
                  lockPinHash:
                    patch.lock_pin_hash === undefined ? row.lockPinHash : patch.lock_pin_hash,
                }
              : row,
          ),
        );
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["conversations"] }),
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase.from("conversations").delete().eq("id", conversationId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["conversations"] }),
  });
}

/* ------------------------------ blocking ------------------------------ */

export type BlockedContact = {
  id: string;
  blocked_id: string;
  created_at: string;
  profile: Profile | null;
};

export function useBlockedContacts() {
  const { user } = useQueueAuth();
  return useQuery({
    queryKey: ["blocked", user?.id],
    enabled: Boolean(user),
    queryFn: async (): Promise<BlockedContact[]> => {
      const { data, error } = await supabase
        .from("blocked_users")
        .select("id, blocked_id, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = data ?? [];
      if (!rows.length) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, display_name, bio, tone, presence")
        .in("id", rows.map((r) => r.blocked_id));
      const byId = new Map((profiles ?? []).map((p) => [p.id, p as Profile]));
      return rows.map((r) => ({ ...r, profile: byId.get(r.blocked_id) ?? null }));
    },
  });
}

export function useBlockContact() {
  const { user } = useQueueAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, blocked }: { userId: string; blocked: boolean }) => {
      if (!user) throw new Error("Not signed in");
      if (blocked) {
        const { error } = await supabase
          .from("blocked_users")
          .insert({ blocker_id: user.id, blocked_id: userId });
        if (error && error.code !== "23505") throw error;
      } else {
        const { error } = await supabase
          .from("blocked_users")
          .delete()
          .eq("blocker_id", user.id)
          .eq("blocked_id", userId);
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["blocked"] }),
  });
}
