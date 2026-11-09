import { Alert } from "@/components/ui/card";

/** Minimal, safe text renderer for merchant content: "## " headings, "- " bullets, blank-line paragraphs. No raw HTML. */
export function ContentBody({ body, approved }: { body: string; approved: boolean }) {
  const blocks = body.replace(/\r/g, "").split(/\n{2,}/);
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
