/**
 * Bitmap-style pixel fonts shipped under /bitmap_fonts (registered in css/style.css).
 * family strings must match @font-face font-family exactly.
 *
 * These are TTFs with pixel aesthetics; the browser still anti-aliases on canvas — use integer
 * font sizes (DePixel often looks best at multiples of 8 or 16 px) for cleaner thermal output.
 */
window.BITMAP_FONT_FAMILIES = [
  "Qager",
  "Digital Clock",
  "VCR OSD Mono",
  "DePixel Klein",
  "DePixel Schmal",
  "DePixel Breit",
  "DePixel Halbfett",
  "DePixel Illegible",
  "DePixel Breit Fett",
];

/**
 * Warm the font cache so Fabric/canvas text renders on first use (avoids missing glyphs on print).
 */
window.preloadBitmapFonts = function preloadBitmapFonts() {
  if (!document.fonts || !window.BITMAP_FONT_FAMILIES.length) {
    return Promise.resolve();
  }
  const sizes = ["16px", "24px", "32px", "48px", "64px"];
  const promises = [];
  for (const family of window.BITMAP_FONT_FAMILIES) {
    for (const size of sizes) {
      const desc = `${size} "${family}"`;
      promises.push(document.fonts.load(desc).catch(() => {}));
    }
  }
  return Promise.all(promises);
};
