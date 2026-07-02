"use client";

import { genConfig, type AvatarFullConfig } from "react-nice-avatar";
import type { Gender } from "@/lib/gender";

export function getGenderedAvatarConfig(
  seed: string,
  gender: Gender,
): AvatarFullConfig {
  const config = genConfig(`${seed}:${gender}`);
  const variant = [...seed].reduce((total, char) => total + char.charCodeAt(0), 0);

  const bgColors = [
    "#b8a4ed", // Lavender
    "#ffb084", // Peach
    "#a4d4c5", // Mint
    "#e8b94a", // Ochre
    "#ff6b5a", // Coral
    "#ff4d8b", // Pink
  ];
  const bgColor = bgColors[variant % bgColors.length];

  return {
    ...config,
    faceColor: "#F9C9B6",
    bgColor,
    sex: gender === "male" ? "man" : "woman",
    hairStyle:
      gender === "male"
        ? (["normal", "thick"] as const)[variant % 2]
        : (["normal", "womanLong", "womanShort"] as const)[variant % 3],
    eyeBrowStyle: gender === "male" ? "up" : "upWoman",
  };
}
