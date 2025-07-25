"use client";

import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

interface MermaidRendererProps {
  code: string;
  className?: string;
}

export function MermaidRenderer({ code, className = "" }: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(true);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!containerRef.current || !code) return;

      try {
        setIsRendering(true);
        setError(null);

        // Initialize mermaid with custom config
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          themeVariables: {
            primaryColor: "#8b5cf6",
            primaryTextColor: "#e5e7eb",
            primaryBorderColor: "#7c3aed",
            lineColor: "#a78bfa",
            secondaryColor: "#4c1d95",
            tertiaryColor: "#1e1b4b",
            background: "rgba(255, 255, 255, 0.02)",
            mainBkg: "rgba(255, 255, 255, 0.05)",
            secondBkg: "rgba(255, 255, 255, 0.03)",
            tertiaryBkg: "rgba(255, 255, 255, 0.02)",
            textColor: "#e5e7eb",
            nodeTextColor: "#e5e7eb",
            borderColor: "rgba(255, 255, 255, 0.1)",
            edgeLabelBackground: "rgba(0, 0, 0, 0.5)",
          },
          securityLevel: "loose",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        });

        // Generate unique ID for this diagram
        const id = `mermaid-${Math.random().toString(36).substring(2, 11)}`;
        
        // Render the diagram
        const { svg } = await mermaid.render(id, code);
        
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (err) {
        console.error("Mermaid rendering error:", err);
        setError(err instanceof Error ? err.message : "Failed to render diagram");
      } finally {
        setIsRendering(false);
      }
    };

    renderDiagram();
  }, [code]);

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400">
        <p className="font-semibold mb-2">Failed to render diagram</p>
        <p className="text-sm opacity-80">{error}</p>
        <details className="mt-3">
          <summary className="cursor-pointer text-sm opacity-60">Show code</summary>
          <pre className="mt-2 text-xs bg-black/20 p-2 rounded overflow-x-auto">
            {code}
          </pre>
        </details>
      </div>
    );
  }

  return (
    <div className={`mermaid-container relative ${className}`}>
      {isRendering && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/[0.02] rounded-lg">
          <div className="animate-pulse text-white/50">Rendering diagram...</div>
        </div>
      )}
      <div
        ref={containerRef}
        className="mermaid-diagram overflow-x-auto rounded-lg bg-white/[0.02] p-4 border border-white/[0.05]"
        style={{ minHeight: isRendering ? "200px" : "auto" }}
      />
    </div>
  );
}