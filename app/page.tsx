"use client";
import { useChat } from "ai/react";

export default function Home() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/chat",
  });

  return (
    <div className="flex flex-col items-center min-h-screen p-8 bg-gray-50 dark:bg-black">
      <main className="flex flex-col w-full max-w-xl gap-4 mt-10">
        <h2 className="text-2xl font-bold text-center mb-4">Mastra Agent Chat</h2>
        <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-900 rounded-lg shadow p-4 mb-4 h-[60vh] border border-gray-200 dark:border-gray-700">
          {messages.length === 0 && (
            <div className="text-gray-400 text-center mt-10">Start the conversation…</div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`mb-3 flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`px-4 py-2 rounded-lg max-w-[80%] whitespace-pre-line text-sm shadow-sm ${m.role === "user"
                  ? "bg-blue-600 text-white rounded-br-none"
                  : "bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-none"
                  }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="mb-3 flex justify-start">
              <div className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100 max-w-[80%] text-sm animate-pulse">
                Agent is typing…
              </div>
            </div>
          )}
        </div>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <textarea
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-white resize-none"
            rows={2}
            value={input}
            onChange={handleInputChange}
            placeholder="Type your message..."
            disabled={isLoading}
            required
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            disabled={isLoading || !input.trim()}
          >
            Send
          </button>
        </form>
      </main>
    </div>
  );
}
