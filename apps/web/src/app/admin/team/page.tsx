import { formatDate } from "@saudi-ecom/contracts";
import { btnCls, Field, Flash, inputCls, PageTitle, Table } from "@/components/admin/ui";
import { listTeam } from "@/server/admin/people";
import { adminOrNull } from "@/server/auth/guards";
import { Forbidden } from "@/components/admin/forbidden";
import { createTeamAction, updateTeamAction } from "../actions";

export const metadata = { title: "فريق العمل" };

/** ADMIN ONLY: staff accounts and role management. */
export default async function Team({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const user = await adminOrNull();
  if (!user) return <Forbidden />;
  const team = await listTeam(user);
  return (
    <>
      <PageTitle>فريق العمل</PageTitle>
      <Flash sp={await searchParams} />
      <form action={createTeamAction} className="mb-6 grid gap-2 rounded-lg border border-border bg-card p-4 sm:grid-cols-5">
        <Field label="الاسم"><input name="name" required className={inputCls} /></Field>
        <Field label="البريد"><input name="email" type="email" required dir="ltr" className={inputCls} /></Field>
        <Field label="الدور"><select name="role" className={inputCls}><option value="MANAGER">مدير عمليات</option><option value="ADMIN">مدير عام</option></select></Field>
        <Field label="كلمة مرور مؤقتة (فارغ = دعوة بالبريد)"><input name="password" type="password" minLength={10} autoComplete="new-password" className={inputCls} /></Field>
        <div className="flex items-end"><button className={btnCls}>إضافة</button></div>
      </form>
      <Table head={["الاسم", "البريد", "الدور", "الحالة", "آخر دخول", "تعديل"]} empty={!team.length}>
        {team.map((m) => (
          <tr key={m.id}>
            <td>{m.fullName}{m.id === user.id ? " (أنت)" : ""}</td>
            <td dir="ltr">{m.email}</td>
            <td>{m.role === "ADMIN" ? "مدير عام" : "مدير عمليات"}</td>
            <td>{m.status === "ACTIVE" ? "نشط" : "معطل"}</td>
            <td>{(m.lastLoginAt ? formatDate(m.lastLoginAt, true) : "—")}</td>
            <td>
              {m.id !== user.id && (
                <form action={updateTeamAction} className="flex flex-wrap gap-1">
                  <input type="hidden" name="id" value={m.id} />
                  <select name="role" defaultValue={m.role} className={inputCls + " w-32"} aria-label="الدور"><option value="MANAGER">مدير عمليات</option><option value="ADMIN">مدير عام</option></select>
                  <select name="status" defaultValue={m.status} className={inputCls + " w-24"} aria-label="الحالة"><option value="ACTIVE">نشط</option><option value="DISABLED">معطل</option></select>
                  <button className="text-primary">حفظ</button>
                </form>
              )}
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}
