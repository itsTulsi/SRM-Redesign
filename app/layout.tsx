// The real root layout (with <html lang>) is app/[locale]/layout.tsx; this pass-through lets
// app/not-found.tsx exist for paths that never reach a locale.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
