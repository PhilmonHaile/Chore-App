import type { ChoreView } from "@/lib/checklists";
import { CADENCE_LABELS } from "@/lib/checklists";

type Props = {
  chore: ChoreView;
  /** Shown as the summary title; defaults to the cadence ("Weekly"). */
  title?: string;
  open?: boolean;
};

/** A chore as a collapsible checklist with its item count and points. */
export function ChoreDetails({ chore, title, open }: Props) {
  return (
    <details open={open} className="border-b border-neutral-100 last:border-b-0">
      <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-2 text-sm">
        <span>{title ?? CADENCE_LABELS[chore.cadence]}</span>
        <span className="shrink-0 text-neutral-500">
          {chore.items.length} items · {chore.points} pts
        </span>
      </summary>
      <ol className="list-decimal space-y-1 px-4 pb-3 pl-9 text-sm text-neutral-700">
        {chore.items.map((item) => (
          <li key={item.id}>{item.label}</li>
        ))}
      </ol>
    </details>
  );
}
