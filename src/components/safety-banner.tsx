import { TriangleAlert } from "lucide-react";

export function SafetyBanner({
  notes,
  compact = false,
}: {
  notes: string[];
  compact?: boolean;
}) {
  if (notes.length === 0) return null;
  return (
    <div
      role="note"
      className="rounded-2xl bg-sand-soft p-4 ring-1 ring-sand/40"
    >
      <p className="flex items-center gap-2 text-sm font-bold text-[#8A6A2F]">
        <TriangleAlert className="h-5 w-5 shrink-0" />
        Техника безопасности
      </p>
      <ul
        className={`mt-2 space-y-1.5 text-sm text-[#6E5628] ${compact ? "" : "list-disc pl-6"}`}
      >
        {notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </div>
  );
}
