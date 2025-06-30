"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useQueryState } from "nuqs";
import React, { useEffect, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import z from "zod";
import { ThinkingComponent } from "./shared";
import { Separator } from "./ui/separator";
import { Form, FormControl, FormField, FormItem, FormMessage } from "./ui/form";
import { PaperclipIcon, XIcon, Loader } from "lucide-react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/text-area";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";

// Form validation schema
const formSchema = z.object({
  message: z
    .string()
    .min(1, "Please enter a message")
    .max(2000, "Message too long"),
  attachments: z.array(z.instanceof(File)).optional(),
});

type FormData = z.infer<typeof formSchema>;

const ChatInterface = () => {
  const [_, setReportId] = useQueryState("report", {
    shallow: false,
  });
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isPending, startTransition] = useTransition();
  const [isTyping, setIsTyping] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  // TODO: move this to layout
  // useEffect(() => {
  //   const handleMouseMove = (e: MouseEvent) => {
  //     setMousePosition({ x: e.clientX, y: e.clientY });
  //   };

  //   window.addEventListener("mousemove", handleMouseMove);
  //   return () => {
  //     window.removeEventListener("mousemove", handleMouseMove);
  //   };
  // }, []);

  // Workflow functions
  const startWorkflow = async (data: FormData) => {
    if (!data.message.trim()) return;

    setIsTyping(true);

    try {
      // Create FormData to handle file uploads
      const formData = new FormData();
      formData.append("userContext", data.message);

      // Append each file
      if (data.attachments && data.attachments.length > 0) {
        data.attachments.forEach((file, index) => {
          formData.append(`attachedFiles`, file);
        });
      }

      const response = await fetch("/api/workflow/start", {
        method: "POST",
        // Remove Content-Type header to let browser set it with boundary for FormData
        body: formData,
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || "Failed to start workflow");
      }

      if (responseData.status === "suspended") {
        // Use search params to show the report page
        setReportId(responseData.reportId);
      } else if (responseData.status === "success") {
      } else if (responseData.status === "failed") {
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsTyping(false);
    }
  };
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      message: "",
      attachments: [],
    },
  });

  const onSubmit = async (data: FormData) => {
    if (data.message.trim()) {
      startTransition(async () => {
        await startWorkflow(data);
      });
    }
  };

  const { reset } = form;
  const formWatcheData = useWatch({ control: form.control });

  return (
    <div className="min-h-screen flex flex-col w-full items-center justify-center bg-transparent text-white p-6 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full mix-blend-normal filter blur-[128px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full mix-blend-normal filter blur-[128px] animate-pulse delay-700" />
        <div className="absolute top-1/4 right-1/3 w-64 h-64 bg-fuchsia-500/10 rounded-full mix-blend-normal filter blur-[96px] animate-pulse delay-1000" />
      </div>

      {/* Main Content */}
      <div className="w-full max-w-4xl mx-auto relative z-10">
        <motion.div
          className="relative z-10 space-y-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="text-center space-y-3">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-block"
            >
              <h1 className="text-3xl font-medium tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white/90 to-white/40 pb-1">
                How can I help today ?
              </h1>
              <motion.div
                className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "100%", opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
              />
            </motion.div>
            <motion.p
              className="text-sm text-white/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Type a topic you want to generate a report on. Attach files for
              additional context.
            </motion.p>
          </div>

          <motion.div
            className="backdrop-blur-2xl bg-white/[0.02] rounded-2xl border border-white/[0.05] shadow-2xl p-4"
            initial={{ scale: 0.98 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Need a report? Ask me anything"
                          className={cn(
                            "w-full px-4 py-3",
                            "bg-transparent",
                            "border-none",
                            "text-white/90 text-sm",
                            "focus:outline-none",
                            "placeholder:text-white/20",
                            "focus-visible:ring-0"
                          )}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              form.handleSubmit(onSubmit)();
                            }
                          }}
                          onFocus={() => setIsInputFocused(true)}
                          onBlur={() => {
                            setIsInputFocused(false);
                          }}
                        />
                      </FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>
                  )}
                />

                <Separator />

                <FormField
                  control={form.control}
                  name="attachments"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            multiple
                            className="hidden"
                            id="file-upload"
                            onChange={(e) => {
                              const files = Array.from(e.target.files || []);
                              field.onChange([
                                ...(field.value || []),
                                ...files,
                              ]);
                            }}
                            accept=".pdf,.doc,.docx,.txt,.md,.csv,.xlsx,.xls,.json,.xml"
                          />
                          <label
                            htmlFor="file-upload"
                            className="flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] rounded-lg cursor-pointer transition-all"
                          >
                            <PaperclipIcon className="w-4 h-4" />
                            Attach Files
                          </label>
                          {field.value && field.value.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap">
                              {field.value.map((file, index) => (
                                <div
                                  key={index}
                                  className="flex items-center gap-1 px-2 py-1 bg-white/[0.1] rounded text-xs text-white/80"
                                >
                                  <span className="max-w-20 truncate">
                                    {file.name}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newFiles =
                                        field.value?.filter(
                                          (_, i) => i !== index
                                        ) || [];
                                      field.onChange(newFiles);
                                    }}
                                    className="text-white/60 hover:text-white"
                                  >
                                    <XIcon className="w-3 h-3 cursor-pointer" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center justify-end w-full">
                  <Button
                    type="submit"
                    disabled={isPending || !formWatcheData.message?.trim()}
                    className="gap-2"
                  >
                    {isPending && <Loader className="w-4 h-4 animate-spin" />}
                    {isPending ? "Generating..." : "Generate"}
                  </Button>
                </div>
              </form>
            </Form>
          </motion.div>
        </motion.div>

        <AnimatePresence>{isTyping && <ThinkingComponent />}</AnimatePresence>
        {isInputFocused && (
          <motion.div
            className="fixed w-[50rem] h-[50rem] rounded-full pointer-events-none z-0 opacity-[0.02] bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500 blur-[96px]"
            animate={{
              x: mousePosition.x - 400,
              y: mousePosition.y - 400,
            }}
            transition={{
              type: "spring",
              damping: 25,
              stiffness: 150,
              mass: 0.5,
            }}
          />
        )}
      </div>
    </div>
  );
};

export default ChatInterface;
