import type { InstallmentStatus, ObligationStatus } from "@/lib/registry";

const STYLES: Record<InstallmentStatus | ObligationStatus, string> = {
  PENDING: "bg-white/10 text-white/80",
  PAID: "bg-green-500/20 text-green-300",
  OVERDUE: "bg-red-500/20 text-red-300",
  ACTIVE: "bg-blue-500/20 text-blue-300",
  COMPLETED: "bg-green-500/20 text-green-300",
};

export function StatusBadge({
  status,
  testId,
}: {
  status: InstallmentStatus | ObligationStatus;
  testId?: string;
}) {
  return (
    <span data-testid={testId} className={`rounded px-2 py-0.5 text-xs font-semibold ${STYLES[status]}`}>
      {status}
    </span>
  );
}
