import type { ChatMessage } from "@/lib/queue-data";
export function messageSummary(message: ChatMessage | undefined | null) {
  if (!message) return "Original message unavailable.";
  if (message.deletedAt) return "Message deleted";
  if (message.kind === "audio") return "Voice note";
  if (message.kind === "image") return "Photo";
  if (message.kind === "video") return "Video";
  if (message.kind === "file") return message.text || "Document";
  return message.text;
}
export function shortSummary(message: ChatMessage | undefined | null, max = 90) {
  const value = messageSummary(message).replace(/\s+/g, " ").trim();
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
}
