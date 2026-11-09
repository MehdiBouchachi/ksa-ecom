import { UserPlus } from "lucide-react";
import { formatDate } from "@saudi-ecom/contracts";
import { btnCls, btnOutlineCls, Field, Flash, inputCls, PageTitle, Section, StatusPill, Table } from "@/components/admin/ui";
import { Forbidden } from "@/components/admin/forbidden";
import { getLocale } from "@/i18n/locale";
import { cn } from "@/lib/utils";
import { listTeam } from "@/server/admin/people";
import { adminOrNull } from "@/server/auth/guards";
import { createTeamAction, updateTeamAction } from "../actions";

const T = {
  ar: {
    title: "فريق العمل",
    count: (n: number) => `${n} عضو`,
    add: "إضافة عضو",
    name: "الاسم",
    email: "البريد",
    role: "الدور",
    password: "كلمة مرور مؤقتة",
    passwordHint: "فارغ = دعوة بالبريد",
    create: "إضافة",
    cols: ["العضو", "الدور", "الحالة", "آخر دخول", "تعديل"],
    you: "أنت",
    roles: { ADMIN: "مدير عام", MANAGER: "مدير عمليات" } as Record<string, string>,
    status: "الحالة",
    active: "نشط",
    disabled: "معطل",
    save: "حفظ",
  },
  en: {
    title: "Team",
    count: (n: number) => `${n} member${n === 1 ? "" : "s"}`,
    add: "Add member",
    name: "Name",
    email: "Email",
    role: "Role",
    password: "Temporary password",
    passwordHint: "Empty = email invitation",
    create: "Add",
    cols: ["Member", "Role", "Status", "Last login", "Edit"],
    you: "you",
    roles: { ADMIN: "Administrator", MANAGER: "Operations manager" } as Record<string, string>,
    status: "Status",
    active: "Active",
    disabled: "Disabled",
    save: "Save",
  },
};

export async function generateMetadata() {
  return { title: T[await getLocale()].title };
}

/** ADMIN ONLY: staff accounts and role management. */
export default async function Team({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const user = await adminOrNull();
  if (!user) return <Forbidden />;
  const locale = await getLocale();
  const t = T[locale];
  const team = await listTeam(user);
  const small = cn(inputCls, "min-h-9 w-auto");
  return (
    <>
      <PageTitle description={t.count(team.length)}>{t.title}</PageTitle>
      <Flash sp={await searchParams} />
      <Section className="mb-6" title={<span className="flex items-center gap-2"><UserPlus className="size-4 text-primary" aria-hidden /> {t.add}</span>}>
        <form action={createTeamAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_1fr_auto]">
          <Field label={t.name}><input name="name" required dir="auto" className={inputCls} /></Field>
          <Field label={t.email}><input name="email" type="email" required dir="ltr" className={inputCls} /></Field>
          <Field label={t.role}>
            <select name="role" className={inputCls}>
              <option value="MANAGER">{t.roles.MANAGER}</option>
              <option value="ADMIN">{t.roles.ADMIN}</option>
            </select>
          </Field>
          <Field label={t.password} hint={t.passwordHint}><input name="password" type="password" minLength={10} autoComplete="new-password" className={inputCls} /></Field>
          <div className="lg:pt-[1.625rem]"><button className={cn(btnCls, "w-full")}>{t.create}</button></div>
        </form>
      </Section>
      <Table head={t.cols} empty={!team.length}>
        {team.map((m) => (
          <tr key={m.id}>
            <td>
              <span className="flex items-center gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-primary" aria-hidden>
                  {m.fullName.trim().slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="block font-medium">
                    {m.fullName}
                    {m.id === user.id && <span className="ms-1.5 rounded bg-muted px-1.5 py-0.5 text-[11px] font-normal text-muted-foreground">{t.you}</span>}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground" dir="ltr">{m.email}</span>
                </span>
              </span>
            </td>
            <td>
              <span className={cn("rounded-md px-2 py-0.5 text-xs font-medium", m.role === "ADMIN" ? "bg-violet-50 text-violet-700" : "bg-sky-50 text-sky-700")}>{t.roles[m.role] ?? m.role}</span>
            </td>
            <td><StatusPill on={m.status === "ACTIVE"} labels={[t.active, t.disabled]} /></td>
            <td className="whitespace-nowrap text-xs text-muted-foreground">{m.lastLoginAt ? formatDate(m.lastLoginAt, true, locale) : "—"}</td>
            <td>
              {m.id !== user.id && (
                <form action={updateTeamAction} className="flex flex-nowrap items-center gap-1.5">
                  <input type="hidden" name="id" value={m.id} />
                  <select name="role" defaultValue={m.role} className={small} aria-label={t.role}>
                    <option value="MANAGER">{t.roles.MANAGER}</option>
                    <option value="ADMIN">{t.roles.ADMIN}</option>
                  </select>
                  <select name="status" defaultValue={m.status} className={small} aria-label={t.status}>
                    <option value="ACTIVE">{t.active}</option>
                    <option value="DISABLED">{t.disabled}</option>
                  </select>
                  <button className={cn(btnOutlineCls, "min-h-9 px-3 text-primary")}>{t.save}</button>
                </form>
              )}
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}
