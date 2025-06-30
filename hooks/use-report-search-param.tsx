import { useQueryState } from "nuqs";

export const useReportSearchParam = () =>
  useQueryState("report", {
    shallow: false,
  });
