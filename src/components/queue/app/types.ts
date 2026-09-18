export type Screen = "inbox" | "chat" | "calls" | "profile";
export type SettingsSheetKind = "privacy" | "notification-settings" | "media" | "policy";
export type SheetKind =
  | "account"
  | "connect"
  | "status"
  | "edit-profile"
  | "attachment"
  | "call"
  | SettingsSheetKind
  | null;
export type ConnectMode = "generate" | "redeem";
export type MainTab = "chats" | "calls" | "profile";
