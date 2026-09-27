export function initialsOf(name?: string | null) {
  if (!name) return "QQ";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return (
    parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || name[0]?.toUpperCase() || "Q"
  );
}

export function timeAgo(iso?: string | null) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  return days === 1 ? "Yesterday" : `${days}d`;
}

export function clockTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
export function dayKey(iso: string) {
  return new Date(iso).toDateString();
}
export function dayLabel(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86400000);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" });
}
export function locationFromMessage(text: string) {
  const match = text.match(/google\.com\/maps\?q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (!match) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
}
export function fileKindLabel(name: string, mime: string | null) {
  const extension = name.split(".").pop()?.toUpperCase();
  if (extension && extension.length <= 5) return `${extension} document`;
  if (mime?.includes("pdf")) return "PDF document";
  return "Encrypted document";
}
