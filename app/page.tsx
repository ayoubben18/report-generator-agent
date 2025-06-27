import Image from "next/image";
import { invokeReportGeneration } from "./actions";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string; eventId?: string }>;
}) {
  const { error, success, eventId } = await searchParams;
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        {/* Report Generation Section */}
        <div className="w-full max-w-md space-y-4">
          <h2 className="text-xl font-semibold text-center">Generate Report</h2>

          {/* Success/Error Messages */}
          {success && (
            <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded-md">
              <p className="font-medium">✅ Success!</p>
              <p className="text-sm">{success}</p>
              {eventId && <p className="text-xs mt-1">Event ID: {eventId}</p>}
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
              <p className="font-medium">❌ Error</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          <form action={invokeReportGeneration} className="space-y-4">
            <div>
              <label
                htmlFor="message"
                className="block text-sm font-medium mb-2"
              >
                Report Request Message
              </label>
              <textarea
                id="message"
                name="message"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                placeholder="Enter your report generation request..."
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Generate Report
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
