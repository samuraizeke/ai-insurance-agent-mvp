// app/fonts.ts
import localFont from "next/font/local";

export const alteHaas = localFont({
  src: [
    { path: "../public/fonts/AlteHaasGroteskRegular.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/AlteHaasGroteskBold.woff2",    weight: "700", style: "normal" }
  ],
  variable: "--font-sans",
  display: "swap",
  preload: true,
});

export const leagueGothic = localFont({
  src: [
    { path: "../public/fonts/LeagueGothic-Regular.woff2", weight: "400", style: "normal" }
  ],
  variable: "--font-display",
  display: "swap",
  preload: true,
});
