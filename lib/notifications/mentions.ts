/**
 * Extract `@username` tokens from a message body. Usernames match the same
 * characters the sign-up validator allows (lowercase letters, digits,
 * underscore, dash), and are returned lowercased + de-duped.
 *
 * Not a replacement for a full grammar — callers still verify each extracted
 * username against the DB before dispatching a notification.
 */
const MENTION_RE = /(?:^|[\s(.,;:!?])@([a-z0-9][a-z0-9_-]{1,31})\b/gi;

export function extractMentions(body: string): string[] {
  if (!body) return [];
  const out = new Set<string>();
  for (const match of body.matchAll(MENTION_RE)) {
    out.add(match[1].toLowerCase());
  }
  return Array.from(out);
}
