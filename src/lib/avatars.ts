/** Gemeinsame Avatar-Optionen für Client und Server */
export const AVATAR_COLORS = ["#7aa2ff", "#3ddc97", "#ff6b5a", "#c792ff", "#ff9f43", "#4dd0e1", "#f06fb0", "#ffc83d"] as const;

export const AVATAR_ICONS = [
  "cat", "dog", "rabbit", "bird", "fish", "turtle", "squirrel", "snail",
  "rocket", "ghost", "crown", "flame", "zap", "star", "moon", "sun",
  "pizza", "coffee", "music", "gamepad", "anchor", "leaf", "skull", "heart",
] as const;

export type AvatarIcon = (typeof AVATAR_ICONS)[number];
