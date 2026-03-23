"use client";

import { Loader2 } from "lucide-react";

interface ToolCallBadgeProps {
  toolInvocation: {
    toolName: string;
    args: Record<string, unknown>;
    state: string;
    result?: unknown;
  };
}

function getToolCallLabel(toolName: string, args: Record<string, unknown>): string {
  const path = typeof args.path === "string" ? args.path : undefined;
  const command = typeof args.command === "string" ? args.command : undefined;

  if (toolName === "str_replace_editor") {
    const verb =
      command === "create" ? "Creating"
      : command === "str_replace" ? "Editing"
      : command === "insert" ? "Editing"
      : command === "view" ? "Reading"
      : command === "undo_edit" ? "Undoing edit in"
      : "Editing";
    return path ? `${verb} ${path}` : verb;
  }

  if (toolName === "file_manager") {
    if (command === "rename") {
      const newPath = typeof args.new_path === "string" ? args.new_path : undefined;
      if (path && newPath) return `Renaming ${path} → ${newPath}`;
      if (path) return `Renaming ${path}`;
      return "Renaming";
    }
    if (command === "delete") {
      return path ? `Deleting ${path}` : "Deleting";
    }
    return path ? `Managing ${path}` : "Managing";
  }

  return toolName;
}

export function ToolCallBadge({ toolInvocation }: ToolCallBadgeProps) {
  const label = getToolCallLabel(toolInvocation.toolName, toolInvocation.args);
  const isDone = toolInvocation.state === "result" && toolInvocation.result;

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isDone ? (
        <>
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          <span className="text-neutral-700">{label}</span>
        </>
      ) : (
        <>
          <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
          <span className="text-neutral-700">{label}</span>
        </>
      )}
    </div>
  );
}
