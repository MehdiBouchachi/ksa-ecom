import { formatSAR } from "@saudi-ecom/contracts";

export function Price({ halalas, compareAt, className }: { halalas: number; compareAt?: number | null; className?: string }) {
  return (
    <span className={className}>
      <span className="font-bold">{formatSAR(halalas)}</span>
      {compareAt && compareAt > halalas ? (
        <>
          {" "}
          <s className="text-sm text-muted-foreground" aria-label={`السعر السابق ${formatSAR(compareAt)}`}>
            {formatSAR(compareAt)}
          </s>
        </>
      ) : null}
    </span>
  );
}
