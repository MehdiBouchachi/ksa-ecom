import { Pencil, UserPlus } from "lucide-react";
import { formatDate } from "@saudi-ecom/contracts";
import { Forbidden } from "@/components/admin/forbidden";
import { Overlay, OverlayFooter, SubmitButton } from "@/components/admin/overlay";
import { AdminPageHeader, btnCls, Field, Flash, FormSection, iconBtnCls, inputCls, StatusBadge, Table } from "@/components/admin/ui";
import { getLocale } from "@/i18n/locale";
import { cn } from "@/lib/utils";
import { listTeam } from "@/server/admin/people";
import { adminOrNull } from "@/server/auth/guards";
import { createTeamAction, updateTeamAction } from "../actions";

const T = {
  ar: {
    title: "فريق العمل",
    desc: "حسابات الموظفين وأدوارهم. هذه الصفحة للمدير العام فقط.",
    add: "إضافة عضو",
    addDesc: "يصل العضو الجديد رابط دعوة لتعيين كلمة مروره بنفسه.",
    editTitle: (n: string) => `تعديل «${n}»`,
    edit: "تعديل",
    secPerson: "العضو",
    name: "الاسم الكامل",
    email: "البريد الإلكتروني",
    role: "الدور",
    roleHelp: {
      MANAGER: "الطلبات والشحن والمنتج والخيارات والأسعار والمخزون. لا يرى الموظفين ولا الإعدادات الحساسة.",
      ADMIN: "كل صلاحيات مدير العمليات + العملاء وفريق العمل والإعدادات الحساسة.",
    } as Record<string, string>,
    secAccess: "الدخول",
    invite: "سيُرسل رابط دعوة إلى البريد (موصى به).",
    pwToggle: "تعيين كلمة مرور مؤقتة بدلًا من الدعوة",
    password: "كلمة مرور مؤقتة",
    passwordHint: "10 أحرف على الأقل. شاركها بطريقة آمنة؛ لا تُعرض مرة أخرى.",
    status: "الحالة",
    statusHelp: "الحساب المعطل لا يستطيع الدخول، وتُحفظ سجلاته.",
    create: "إضافة العضو",
    save: "حفظ التغييرات",
    saving: "جارٍ الحفظ…",
    cancel: "إلغاء",
    close: "إغلاق",
    cols: ["العضو", "الدور", "الحالة", "آخر دخول", ""],
    you: "أنت",
    selfNote: "لا يمكنك تعديل دورك أو حالتك بنفسك.",
    roles: { ADMIN: "مدير عام", MANAGER: "مدير عمليات" } as Record<string, string>,
    active: "نشط",
    disabled: "معطل",
    never: "لم يسجل الدخول",
  },
  en: {
    title: "Team",
    desc: "Staff accounts and their roles. This page is for administrators only.",
    add: "Add member",
    addDesc: "The new member receives an invitation link to set their own password.",
    editTitle: (n: string) => `Edit “${n}”`,
    edit: "Edit",
    secPerson: "Member",
    name: "Full name",
    email: "Email",
    role: "Role",
    roleHelp: {
      MANAGER: "Orders, shipping, product, variants, pricing and stock. Cannot see staff or sensitive settings.",
      ADMIN: "Everything a manager can do, plus customers, team and sensitive settings.",
    } as Record<string, string>,
    secAccess: "Sign-in",
    invite: "An invitation link will be emailed (recommended).",
    pwToggle: "Set a temporary password instead of inviting",
    password: "Temporary password",
    passwordHint: "At least 10 characters. Share it securely; it is never shown again.",
    status: "Status",
    statusHelp: "A disabled account cannot sign in; its records are kept.",
    create: "Add member",
    save: "Save changes",
    saving: "Saving…",
    cancel: "Cancel",
    close: "Close",
    cols: ["Member", "Role", "Status", "Last sign-in", ""],
    you: "you",
    selfNote: "You cannot change your own role or status.",
    roles: { ADMIN: "Administrator", MANAGER: "Operations manager" } as Record<string, string>,
    active: "Active",
    disabled: "Disabled",
    never: "Never signed in",
  },
};

export async function generateMetadata() {
  return { title: T[await getLocale()].title };
}

/** ADMIN ONLY: staff accounts and role management (re-checked server-side in every action). */
export default async function Team({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const user = await adminOrNull();
  if (!user) return <Forbidden />;
  const locale = await getLocale();
  const t = T[locale];
  const team = await listTeam(user);

  const roleCards = (current: string) => (
    <fieldset className="sm:col-span-2">
      <legend className="mb-1.5 text-sm font-medium">
        {t.role}
        <span className="ms-0.5 text-destructive" aria-hidden>*</span>
      </legend>
      <div className="grid grid-cols-1 gap-2">
        {(["MANAGER", "ADMIN"] as const).map((r) => (
          <label key={r} className="flex cursor-pointer gap-3 rounded-md border border-border p-3 has-checked:border-primary has-checked:bg-primary-soft has-focus-visible:ring-2 has-focus-visible:ring-ring/40">
            <input type="radio" name="role" value={r} defaultChecked={current === r} required className="mt-1 size-4 accent-primary" />
            <span>
              <span className="block text-sm font-medium">{t.roles[r]}</span>
              <span className="block text-xs text-muted-foreground">{t.roleHelp[r]}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );

  const addButton = (
    <Overlay trigger={<><UserPlus className="size-4" aria-hidden /> {t.add}</>} triggerClassName={btnCls} title={t.add} description={t.addDesc} closeLabel={t.close}>
      <form action={createTeamAction} className="space-y-6">
        <FormSection title={t.secPerson}>
          <Field label={t.name} required><input name="name" required dir="auto" autoComplete="off" className={inputCls} /></Field>
          <Field label={t.email} required><input name="email" type="email" required dir="ltr" autoComplete="off" className={inputCls} /></Field>
          {roleCards("MANAGER")}
        </FormSection>
        <FormSection title={t.secAccess} cols={1}>
          <p className="text-sm text-muted-foreground">{t.invite}</p>
          <details className="rounded-md border border-border">
            <summary className="flex min-h-11 cursor-pointer list-none items-center px-3 text-sm font-medium [&::-webkit-details-marker]:hidden">{t.pwToggle}</summary>
            <div className="border-t border-border p-3">
              <Field label={t.password} hint={t.passwordHint}><input name="password" type="password" minLength={10} autoComplete="new-password" className={inputCls} /></Field>
            </div>
          </details>
        </FormSection>
        <OverlayFooter cancelLabel={t.cancel}>
          <SubmitButton className={btnCls} pendingLabel={t.saving}>{t.create}</SubmitButton>
        </OverlayFooter>
      </form>
    </Overlay>
  );

  return (
    <>
      <AdminPageHeader title={t.title} description={t.desc} primary={addButton} />
      <Flash sp={await searchParams} />
      <Table head={t.cols} empty={!team.length} caption={t.title}>
        {team.map((m) => (
          <tr key={m.id} className={cn(m.status !== "ACTIVE" && "text-muted-foreground")}>
            <td>
              <span className="flex items-center gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary" aria-hidden>
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
            <td><StatusBadge tone={m.role === "ADMIN" ? "primary" : "neutral"} dot={false}>{t.roles[m.role] ?? m.role}</StatusBadge></td>
            <td><StatusBadge tone={m.status === "ACTIVE" ? "success" : "neutral"}>{m.status === "ACTIVE" ? t.active : t.disabled}</StatusBadge></td>
            <td className="whitespace-nowrap text-xs text-muted-foreground">{m.lastLoginAt ? formatDate(m.lastLoginAt, true, locale) : t.never}</td>
            <td className="w-px text-end">
              {m.id === user.id ? (
                <span className="sr-only">{t.selfNote}</span>
              ) : (
                <Overlay trigger={<Pencil className="size-4" aria-hidden />} triggerClassName={iconBtnCls} triggerLabel={`${t.edit} — ${m.fullName}`} title={t.editTitle(m.fullName)} description={<span dir="ltr">{m.email}</span>} closeLabel={t.close}>
                  <form action={updateTeamAction} className="space-y-6">
                    <input type="hidden" name="id" value={m.id} />
                    <FormSection title={t.role}>{roleCards(m.role)}</FormSection>
                    <FormSection title={t.status} description={t.statusHelp}>
                      <Field label={t.status}>
                        <select name="status" defaultValue={m.status} className={inputCls}>
                          <option value="ACTIVE">{t.active}</option>
                          <option value="DISABLED">{t.disabled}</option>
                        </select>
                      </Field>
                    </FormSection>
                    <OverlayFooter cancelLabel={t.cancel}>
                      <SubmitButton className={btnCls} pendingLabel={t.saving}>{t.save}</SubmitButton>
                    </OverlayFooter>
                  </form>
                </Overlay>
              )}
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}
