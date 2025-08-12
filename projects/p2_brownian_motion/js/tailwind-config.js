/* Tailwind CDN config must be defined before loading the CDN script */
window.tailwind = window.tailwind || {};
window.tailwind.config = {
  theme: {
    extend: {
      fontFamily: {
        display: [
          "Inter", "ui-sans-serif", "system-ui", "-apple-system",
          "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "Noto Sans", "sans-serif"
        ],
        mono: [
          "JetBrains Mono", "SFMono-Regular", "Menlo", "Monaco",
          "Consolas", "Liberation Mono", "monospace"
        ]
      }
    }
  },
  darkMode: "class"
};
