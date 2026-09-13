// Centralized "Amber Paper" theme
// Flat, high-contrast campus-stationery palette: sun-amber canvas, ink outlines,
// paper-white slates. No gradients, no blur, no glow.
export const theme = {
  colors: {
    // ── Amber Paper tokens ────────────────────────────────────────────
    sun: '#F9C74A',        // brand amber - primary page canvas
    sunDeep: '#F0B429',    // pressed / active amber
    sunTint: '#FDE9AE',    // pale amber wash - highlights, system notices
    ink: '#1C1C1E',        // near-black - dark canvas, buttons, headings, outlines
    inkSoft: '#2C2C2E',    // raised surface on the dark canvas
    paper: '#FFFFFF',      // white cards and sheets
    paperAlt: '#F7F7F8',   // recessed wells - toolbars, inputs
    line: '#E5E5EA',       // hairline dividers
    muted: '#8A8A8E',      // secondary text, timestamps
    blue: '#2D7FF9',       // outgoing bubbles, badge pins, links
    blueSoft: '#7FB2F7',
    orange: '#F59033',     // notification tags, emphasis
    green: '#34C759',      // connected / live
    red: '#FF3B30',        // stop / disconnect

    // ── Legacy aliases ────────────────────────────────────────────────
    // Kept so any component not yet migrated still resolves a colour
    // instead of rendering `undefined`.
    spotifyGreen: '#1C1C1E',
    spotifyGreenDark: '#2C2C2E',
    spotifyGreenDarker: '#000000',
    black: '#1C1C1E',
    appBg: '#F9C74A',
    surface: '#FFFFFF',
    surfaceAlt: '#F7F7F8',
    textPrimary: '#1C1C1E',
    textSecondary: '#8A8A8E',
    border: '#E5E5EA',
  },

  // Corner radii, per the design system
  radii: {
    card: '28px',    // cards & modal sheets
    panel: '20px',   // panels & sub-containers
    bubble: '18px',  // chat bubbles
    control: '14px', // inputs & chunky buttons
    pill: '999px',
  },

  // Hard offset block shadow (0 blur) - the only "elevation" this system uses
  shadow: {
    block: '0 4px 0 #1C1C1E',
    blockSm: '0 2px 0 #1C1C1E',
    none: 'none',
  },

  font: {
    family: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  },

  breakpoint: '768px',
};

export function alpha(hex, a) {
  // Accept #RRGGBB or #RGB
  let r, g, b;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.slice(1, 3), 16);
    g = parseInt(hex.slice(3, 5), 16);
    b = parseInt(hex.slice(5, 7), 16);
  } else {
    return hex;
  }
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
