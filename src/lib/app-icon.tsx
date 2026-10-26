/** The crown app icon for generated PNGs (Satori-compatible markup). */
export function AppIconMarkup({ size }: { size: number }) {
  return (
    <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(160deg, #3d2361 0%, #2a1745 55%, #1b0e2e 100%)' }}>
      <svg width={size * 0.66} height={size * 0.55} viewBox="0 0 48 40">
        <path d="M4 14l10 9 10-17 10 17 10-9-4 22H8z" fill="#f4b73a" stroke="#6b4508" strokeWidth="1.6" strokeLinejoin="round" />
        <rect x="8" y="32" width="32" height="5" rx="1.5" fill="#b07a12" />
        <circle cx="4" cy="12" r="3" fill="#c8323c" />
        <circle cx="24" cy="5" r="3.4" fill="#3a6fd8" />
        <circle cx="44" cy="12" r="3" fill="#c8323c" />
        <circle cx="24" cy="26" r="2.6" fill="#fbf0d9" />
      </svg>
    </div>
  );
}
