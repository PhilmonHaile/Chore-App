"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

type Props = {
  children: ReactNode;
  /** Label while the form's action is running, e.g. "Creating…". */
  pendingLabel: ReactNode;
  className?: string;
};

/** Submit button that disables itself while its form is submitting, so a double click can't submit twice. */
export function SubmitButton({ children, pendingLabel, className }: Props) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-disabled={pending} className={className}>
      {pending ? pendingLabel : children}
    </button>
  );
}
