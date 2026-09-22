"use client";

import Markdown from "react-markdown";
import type { Components } from "react-markdown";
import { cn } from "@/lib/utils";

const components: Components = {
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  ),
};

/** CRM / Groq notes — never dump raw markdown into JSX. */
export function NoteText({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn("break-words text-[13px] [&_a]:text-cvd [&_a]:underline-offset-2 hover:[&_a]:underline [&_p]:mb-1 [&_p]:last:mb-0 [&_strong]:font-semibold [&_ul]:ml-4 [&_ul]:list-disc", className)}>
      <Markdown components={components}>{text}</Markdown>
    </div>
  );
}
