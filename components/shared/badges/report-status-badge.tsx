import { ReportStatus } from "@/types/workflow.types";
import {
  FaCheckCircle,
  FaClock,
  FaFileAlt,
  FaPlayCircle,
  FaSpinner,
  FaTimesCircle,
} from "react-icons/fa";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type Props = {
  status: ReportStatus;
  withBorder?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  withIcon?: boolean;
};

const STATUS_CONFIG = {
  draft: {
    label: "Draft",
    icon: FaFileAlt,
    className:
      "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700",
  },
  plan_generated: {
    label: "Plan Generated",
    icon: FaClock,
    className:
      "bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30",
  },
  plan_approved: {
    label: "Plan Approved",
    icon: FaCheckCircle,
    className:
      "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-300 dark:hover:bg-green-900/30",
  },
  generating: {
    label: "Generating",
    icon: FaSpinner,
    className:
      "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:hover:bg-yellow-900/30",
  },
  completed: {
    label: "Completed",
    icon: FaCheckCircle,
    className:
      "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/30",
  },
  failed: {
    label: "Failed",
    icon: FaTimesCircle,
    className:
      "bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30",
  },
} as const;

function ReportStatusBadge({
  status,
  withBorder = false,
  size = "md",
  className,
  withIcon = true,
}: Props) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <Badge
      className={cn(
        config.className,
        "gap-1.5 rounded-md font-medium",
        withBorder && "border border-current",
        size === "sm" && "text-xs px-2 py-0.5",
        size === "md" && "text-sm px-2.5 py-1",
        size === "lg" && "text-base px-3 py-1.5",
        status === "generating" && withIcon && "animate-pulse",
        className
      )}
      variant="secondary"
    >
      {withIcon && (
        <Icon
          size={size === "sm" ? 12 : size === "md" ? 14 : 16}
          className={status === "generating" ? "animate-spin" : ""}
        />
      )}
      {config.label}
    </Badge>
  );
}

export default ReportStatusBadge;
