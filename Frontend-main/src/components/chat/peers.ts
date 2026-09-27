import type { ConversationSummary, ParticipantInfo } from '../../types/messaging';

/**
 * Conversation participants, minus the signed-in user.
 *
 * `ParticipantInfo.userId` is the auth-service user id — the same value as
 * `auth_user.id` — not the customer-service profile id, which is a different
 * UUID for the same person. These two helpers exist because that distinction was
 * previously invented rather than read from the wire: the client typed the
 * participant as `{id, roleName}` while the messaging service serialises
 * `{userId, name, email, role}`, so the filter compared `undefined` against a
 * real id, never excluded anyone, and the thread header then called
 * `.charAt()` on an undefined role and unmounted the whole app.
 *
 * Both the list and the thread header need the same "everyone but me"
 * calculation. It is defined once here so the two cannot drift apart again.
 */
export function currentUserId(): string {
  try {
    return (JSON.parse(localStorage.getItem('auth_user')!) as { id?: string }).id ?? '';
  } catch {
    return '';
  }
}

export function peersOf(
  conversation: Pick<ConversationSummary, 'participants'>,
  meId: string,
): ParticipantInfo[] {
  if (!meId) return conversation.participants;
  return conversation.participants.filter((p) => p.userId !== meId);
}

/**
 * The name shown for a conversation: its title when the creator supplied one,
 * otherwise the other participants' names. Falls back to the email so a
 * participant with no display name is still identifiable.
 */
export function peerLabel(
  conversation: Pick<ConversationSummary, 'title' | 'participants'>,
  meId: string,
  fallback = 'Conversation',
): string {
  if (conversation.title) return conversation.title;
  const names = peersOf(conversation, meId)
    .map((p) => p.name?.trim() || p.email?.trim() || '')
    .filter(Boolean);
  return names.length > 0 ? names.join(', ') : fallback;
}

/** `CUSTOMER` -> `Customer`. Tolerates a missing role rather than throwing. */
export function roleLabel(role: string | null | undefined): string {
  if (!role) return 'Participant';
  return role.charAt(0) + role.slice(1).toLowerCase();
}

/** The role line under the thread title, e.g. `Customer · Admin · Dealer`. */
export function roleSummary(
  conversation: Pick<ConversationSummary, 'participants'>,
  meId: string,
): string {
  const roles = peersOf(conversation, meId).map((p) => roleLabel(p.role));
  return roles.length > 0 ? roles.join(' · ') : roleLabel(null);
}
