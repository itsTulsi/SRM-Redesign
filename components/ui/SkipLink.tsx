export function SkipLink({ label }: { label: string }) {
  return (
    <a
      href="#main"
      className="fixed top-3 left-3 z-[100] max-w-[calc(100vw-1.5rem)] -translate-y-24 rounded-md bg-action px-4 py-3 font-semibold text-on-action no-underline focus:translate-y-0"
    >
      {label}
    </a>
  );
}
