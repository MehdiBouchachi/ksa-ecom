import { Plus } from "lucide-react";
import { Alert } from "@/components/ui/card";

/** Minimal, safe text renderer for merchant content: "## " headings, "- " bullets, blank-line paragraphs. No raw HTML. */
export function ContentBody({ body, approved, variant = "prose" }: { body: string; approved: boolean; variant?: "prose" | "faq" }) {
  const blocks = body.replace(/\r/g, "").split(/\n{2,}/);
  const qa = blocks.map((b) => b.split("\n").filter(Boolean)).filter((l) => l[0]?.startsWith("## "));
  if (variant === "faq" && qa.length > 0 && qa.length === blocks.filter((b) => b.trim()).length) {
    // Every block is "## question" + answer → accessible accordion (native <details>).
    return (
      <div className="max-w-3xl">
        {!approved && <Alert tone="warning" className="mb-4">هذا المحتوى مسودة بانتظار مراجعة واعتماد التاجر/المستشار القانوني.</Alert>}
        <div className="divide-y divide-border border-y border-border">
          {qa.map((l, i) => (
            <details key={i} className="group" open={i === 0}>
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-base font-semibold [&::-webkit-details-marker]:hidden">
                {l[0]!.slice(3)}
                <Plus className="size-5 shrink-0 text-primary transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none" aria-hidden />
              </summary>
              <div className="pb-5 leading-8 text-muted-foreground">
                {l.slice(1).map((x, j) => (
                  <p key={j}>{x}</p>
                ))}
              </div>
            </details>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="prose-ar max-w-3xl">
      {!approved && <Alert tone="warning" className="mb-4">هذا المحتوى مسودة بانتظار مراجعة واعتماد التاجر/المستشار القانوني.</Alert>}
      {blocks.map((b, i) => {
        const lines = b.split("\n").filter(Boolean);
        if (lines[0]?.startsWith("## ")) {
          return (
            <div key={i}>
              <h2>{lines[0].slice(3)}</h2>
              {lines.slice(1).map((l, j) => <p key={j}>{l}</p>)}
            </div>
          );
        }
        if (lines.every((l) => l.startsWith("- "))) return <ul key={i}>{lines.map((l, j) => <li key={j}>{l.slice(2)}</li>)}</ul>;
        return <p key={i}>{lines.join(" ")}</p>;
      })}
    </div>
  );
}
