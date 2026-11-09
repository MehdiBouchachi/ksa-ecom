/** Re-mounts on every admin navigation → short enter transition instead of a hard content swap. */
export default function AdminTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-in">{children}</div>;
}
