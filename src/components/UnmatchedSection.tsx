interface UnmatchedSectionProps {
  polymarketOnly: string[];
  booksOnly: string[];
}

export function UnmatchedSection({ polymarketOnly, booksOnly }: UnmatchedSectionProps) {
  const total = polymarketOnly.length + booksOnly.length;
  if (total === 0) return null;

  return (
    <details className="border-t border-border">
      <summary className="px-4 py-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
        Unmatched: {polymarketOnly.length} Polymarket-only, {booksOnly.length} books-only
      </summary>
      <div className="px-4 py-3 grid grid-cols-2 gap-6 text-xs">
        {polymarketOnly.length > 0 && (
          <div>
            <span className="font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Polymarket (no book match)
            </span>
            <ul className="space-y-0.5">
              {polymarketOnly.map((t, i) => (
                <li key={i} className="text-muted-foreground">{t}</li>
              ))}
            </ul>
          </div>
        )}
        {booksOnly.length > 0 && (
          <div>
            <span className="font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Books (no Polymarket market)
            </span>
            <ul className="space-y-0.5">
              {booksOnly.map((t, i) => (
                <li key={i} className="text-muted-foreground">{t}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </details>
  );
}
