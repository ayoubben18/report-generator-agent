import { useReportSearchParam } from "@/hooks/use-report-search-param";
import { ReportType } from "@/types/workflow.types";
import { motion } from "framer-motion";
import { RefreshCwIcon, XIcon } from "lucide-react";

type Props = {
  report: ReportType;
};

const FailedInterface = ({ report }: Props) => {
  const [_, setReportId] = useReportSearchParam();
  return (
    <div className="w-full max-w-4xl mx-auto relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="backdrop-blur-2xl bg-white/[0.02] rounded-2xl border border-red-500/20 shadow-2xl p-8 text-center"
      >
        <div className="space-y-6">
          <motion.div
            className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
          >
            <XIcon className="w-8 h-8 text-red-400" />
          </motion.div>
          <div>
            <h3 className="text-xl font-semibold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-red-400 to-red-300">
              Report Generation Failed
            </h3>
            <div className="backdrop-blur-xl bg-red-500/[0.05] border border-red-500/20 rounded-xl p-4 mb-4">
              <p className="text-sm text-red-300">
                {report.title ? `"${report.title}"` : "This report"} could not
                be generated due to an error.
              </p>
              {report.userPrompt && (
                <p className="text-xs text-red-400/70 mt-2">
                  Original request: {report.userPrompt}
                </p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <motion.button
                onClick={() => setReportId(null)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-3 bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 rounded-xl transition-all flex items-center gap-2 justify-center"
              >
                <RefreshCwIcon className="w-4 h-4" />
                Try Again
              </motion.button>
              <motion.button
                onClick={() => setReportId(null)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-3 bg-white/[0.05] hover:bg-white/[0.1] text-white/70 hover:text-white rounded-xl transition-all"
              >
                Go to Home
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default FailedInterface;
