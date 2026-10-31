import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#15131F", soft: "#4A4760", mute: "#8A879C", faint: "#B9B7C7" },
        paper: { DEFAULT: "#FFFFFF", off: "#FAFAFC", soft: "#F0F0F4", line: "#ECEBF2" },
        grape: { DEFAULT: "#8257FF", soft: "#F1ECFF", deep: "#5B33E0" },
        sky: { DEFAULT: "#4285FF", soft: "#EAF2FF", deep: "#1F63E0" },
        coral: { DEFAULT: "#FF668C", soft: "#FFEDF2", deep: "#E03A64" },
        tang: { DEFAULT: "#FF984F", soft: "#FFF2E8", deep: "#D9651A" },
        mint: { DEFAULT: "#35C98A", soft: "#E7F8F0", deep: "#17935F" },
        sun: { DEFAULT: "#FFD65A", soft: "#FFF8DD", deep: "#A87F00" },
        aqua: { DEFAULT: "#42C9E8", soft: "#E6F8FC", deep: "#118BA8" },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: { "4xl": "2rem", "5xl": "2.5rem" },
      boxShadow: {
        card: "0 1px 2px rgba(21,19,31,.04), 0 4px 16px -6px rgba(21,19,31,.06)",
        lift: "0 2px 4px rgba(21,19,31,.04), 0 18px 40px -12px rgba(21,19,31,.14)",
        pop: "0 30px 80px -20px rgba(130,87,255,.35)",
        glow: "0 8px 24px -6px rgba(130,87,255,.45)",
      },
      backgroundImage: {
        "brand-grad": "linear-gradient(135deg,#8257FF 0%,#FF668C 55%,#FF984F 100%)",
        "match-grad": "linear-gradient(135deg,#FF668C 0%,#FF984F 100%)",
        "ai-grad": "linear-gradient(135deg,#8257FF 0%,#42C9E8 100%)",
        "event-grad": "linear-gradient(135deg,#35C98A 0%,#FFD65A 100%)",
        "project-grad": "linear-gradient(135deg,#4285FF 0%,#42C9E8 100%)",
      },
      keyframes: {
        shimmer: { "100%": { transform: "translateX(100%)" } },
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-6px)" } },
      },
      animation: { shimmer: "shimmer 1.4s infinite", float: "float 5s ease-in-out infinite" },
    },
  },
  plugins: [],
} satisfies Config;
