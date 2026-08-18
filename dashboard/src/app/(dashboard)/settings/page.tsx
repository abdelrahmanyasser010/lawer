"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Building2, CalendarClock, CreditCard, MessageCircle, Plus, Save, Scale, ShieldCheck, Trash2 } from "lucide-react";
import { DashboardApiError, dashboardRequest } from "@/lib/apiClient";
import { PageError, PageLoading } from "@/components/admin/PageFeedback";

 type Setting = { key: string; value: unknown; isSecret: boolean; updatedAt: string };
 type WindowRow = { id?: number; weekday:number; startTime:string; endTime:string; slotMinutes:number; totalCapacity:number; zoomCapacity:number; whatsappCapacity:number; isActive:boolean };
 type ScheduleException = { id:number; date:string; startTime?:string|null; endTime?:string|null; isClosed:boolean; reason?:string|null };
 type SchedulePayload = { timezone:string; windows:WindowRow[]; exceptions:ScheduleException[] };
 type Toast = { kind:"success"|"error"; text:string } | null;

const dayLabels: Record<number,string> = { 0:"الأحد",1:"الاثنين",2:"الثلاثاء",3:"الأربعاء",4:"الخميس",5:"الجمعة",6:"السبت" };
const dayOrder = [6,0,1,2,3,4,5];

function same(a: unknown, b: unknown) { return JSON.stringify(a) === JSON.stringify(b); }
function asText(value: FormDataEntryValue | null) { return String(value ?? ""); }
function asNumber(value: FormDataEntryValue | null, fallback = 0) { const parsed=Number(String(value ?? "")); return Number.isFinite(parsed)?parsed:fallback; }

export default function SettingsPage() {
  const [items, setItems] = useState<Setting[]>([]);
  const [initialError, setInitialError] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const [fieldError, setFieldError] = useState<Record<string,string>>({});
  const [schedule, setSchedule] = useState<SchedulePayload | null>(null);
  const [scheduleBusy, setScheduleBusy] = useState(false);
  const [scheduleError, setScheduleError] = useState("");
  const [blockDate, setBlockDate] = useState("");
  const [blockStart, setBlockStart] = useState("");
  const [blockEnd, setBlockEnd] = useState("");
  const [blockReason, setBlockReason] = useState("");

  const loadSettings = useCallback(async () => {
    setInitialError("");
    try { setItems(await dashboardRequest<Setting[]>("/api/v1/admin/settings")); }
    catch (caught) { setInitialError(caught instanceof Error ? caught.message : "تعذر تحميل الإعدادات"); }
  }, []);

  const loadSchedule = useCallback(async () => {
    setScheduleError("");
    try { setSchedule(await dashboardRequest<SchedulePayload>("/api/v1/admin/review-schedule")); }
    catch (caught) { setScheduleError(caught instanceof Error ? caught.message : "تعذر تحميل جدول مواعيد مراجعة العقود"); }
  }, []);

  useEffect(() => { void Promise.all([loadSettings(), loadSchedule()]); }, [loadSettings, loadSchedule]);
  useEffect(() => { if (!toast) return; const timer=window.setTimeout(()=>setToast(null),5000); return ()=>window.clearTimeout(timer); }, [toast]);

  const map = useMemo(() => Object.fromEntries(items.map((item) => [item.key, item.value])), [items]);
  const current = (key: string, fallback: unknown = "") => map[key] ?? fallback;
  const rawSelectedChannels = current("customer_portal.communication_channels", ["zoom", "whatsapp"]);
  const selectedChannels = Array.isArray(rawSelectedChannels) ? rawSelectedChannels as string[] : [];
  const formKey = items.map((item) => `${item.key}:${item.updatedAt}`).join("|");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setFieldError({}); setToast(null);
    const form = new FormData(event.currentTarget);
    const channels = ["zoom", "whatsapp"].filter((value) => form.get(`channel_${value}`) === "on");
    const candidates = [
      { key:"office.display_name", value:asText(form.get("office.display_name")), isSecret:false },
      { key:"office.support_email", value:asText(form.get("office.support_email")), isSecret:false },
      { key:"office.address", value:asText(form.get("office.address")), isSecret:false },
      { key:"office.review_whatsapp_number", value:asText(form.get("office.review_whatsapp_number")), isSecret:false },
      { key:"office.support_whatsapp_number", value:asText(form.get("office.support_whatsapp_number")), isSecret:false },
      { key:"office.support_phone", value:asText(form.get("office.support_phone")), isSecret:false },
      { key:"payments.vodafone_cash_number", value:asText(form.get("payments.vodafone_cash_number")), isSecret:false },
      { key:"contracts.self_service_edit_hours", value:asNumber(form.get("contracts.self_service_edit_hours"),24), isSecret:false },
      { key:"customer_portal.communication_channels", value:channels, isSecret:false },
      { key:"notifications.whatsapp_mode", value:asText(form.get("notifications.whatsapp_mode")) || "manual_wa_me", isSecret:false },
      { key:"notifications.web_push_enabled", value:false, isSecret:false },
    ];
    const settings = candidates.filter((item) => !same(item.value, current(item.key, item.key === "notifications.web_push_enabled" ? false : "")));
    if (!settings.length) { setBusy(false); setToast({kind:"success",text:"لا توجد تغييرات جديدة للحفظ."}); return; }
    try {
      await dashboardRequest("/api/v1/admin/settings", { method:"PATCH", body:JSON.stringify({settings}) });
      setToast({kind:"success",text:"تم حفظ الإعدادات بنجاح."});
      await loadSettings();
    } catch (caught) {
      const apiError = caught instanceof DashboardApiError ? caught : null;
      const details = apiError?.details as { settingKey?: string } | undefined;
      if (details?.settingKey) setFieldError({[details.settingKey]:apiError?.message || "قيمة غير صحيحة"});
      setToast({kind:"error",text:caught instanceof Error ? caught.message : "تعذر حفظ الإعدادات"});
    } finally { setBusy(false); }
  }

  function updateWindow(index:number, patch:Partial<WindowRow>) { setSchedule((old)=>old?{...old,windows:old.windows.map((row,i)=>i===index?{...row,...patch}:row)}:old); }
  function addWindow(weekday:number) { setSchedule((old)=>old?{...old,windows:[...old.windows,{weekday,startTime:"09:00",endTime:"17:00",slotMinutes:60,totalCapacity:10,zoomCapacity:5,whatsappCapacity:5,isActive:true}]}:old); }
  function removeWindow(index:number) { setSchedule((old)=>old?{...old,windows:old.windows.filter((_,i)=>i!==index)}:old); }
  function copyDayToOthers(weekday:number) {
    setSchedule((old)=>{
      if(!old)return old;
      const source=old.windows.filter((row)=>row.weekday===weekday);
      if(!source.length){setToast({kind:"error",text:"أضف فترة واحدة على الأقل لهذا اليوم قبل النسخ."});return old;}
      const untouched=old.windows.filter((row)=>row.weekday===weekday);
      const copies=dayOrder.filter((day)=>day!==weekday).flatMap((day)=>source.map((row)=>({...row,id:undefined,weekday:day})));
      setToast({kind:"success",text:`تم نسخ إعدادات ${dayLabels[weekday]} إلى باقي الأيام. اضغط حفظ الجدول لتأكيد التغيير.`});
      return {...old,windows:[...untouched,...copies]};
    });
  }

  async function saveSchedule() {
    if (!schedule) return;
    const invalidCapacity = schedule.windows.find((row) => row.zoomCapacity + row.whatsappCapacity > row.totalCapacity);
    if (invalidCapacity) { const message="مجموع سعة Zoom وواتساب يجب ألا يتجاوز السعة الإجمالية للفترة."; setScheduleError(message); setToast({kind:"error",text:message}); return; }
    setScheduleBusy(true); setScheduleError(""); setToast(null);
    try {
      await dashboardRequest("/api/v1/admin/review-schedule", {method:"PUT",body:JSON.stringify({windows:schedule.windows.map(({id:_,...row})=>row)})});
      setToast({kind:"success",text:"تم حفظ جدول مواعيد مراجعة العقود والسعة لكل قناة."});
      await loadSchedule();
    } catch (caught) { setScheduleError(caught instanceof Error?caught.message:"تعذر حفظ جدول مواعيد مراجعة العقود"); setToast({kind:"error",text:caught instanceof Error?caught.message:"تعذر حفظ جدول مواعيد مراجعة العقود"}); }
    finally { setScheduleBusy(false); }
  }

  async function addBlock(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!blockDate) return;
    setScheduleBusy(true); setScheduleError("");
    try {
      await dashboardRequest("/api/v1/admin/review-schedule/exceptions", {method:"POST",body:JSON.stringify({date:blockDate,startTime:blockStart||null,endTime:blockEnd||null,reason:blockReason||null})});
      setBlockDate(""); setBlockStart(""); setBlockEnd(""); setBlockReason("");
      setToast({kind:"success",text:"تمت إضافة الإغلاق الاستثنائي."}); await loadSchedule();
    } catch(caught){setScheduleError(caught instanceof Error?caught.message:"تعذر إضافة الإغلاق الاستثنائي");setToast({kind:"error",text:caught instanceof Error?caught.message:"تعذر إضافة الإغلاق الاستثنائي"});}
    finally{setScheduleBusy(false);}
  }

  async function deleteBlock(id:number) {
    setScheduleBusy(true);
    try { await dashboardRequest(`/api/v1/admin/review-schedule/exceptions/${id}`,{method:"DELETE"}); setToast({kind:"success",text:"تم حذف الإغلاق الاستثنائي."}); await loadSchedule(); }
    catch(caught){setToast({kind:"error",text:caught instanceof Error?caught.message:"تعذر حذف الإغلاق الاستثنائي"});}
    finally{setScheduleBusy(false);}
  }

  if (initialError && !items.length) return <div className="p-8"><PageError message={initialError} onRetry={loadSettings}/></div>;
  if (!items.length) return <div className="p-8"><PageLoading/></div>;

  return <div className="mx-auto max-w-6xl space-y-6 p-6 sm:p-8">
    <header className="border-b border-slate-200 pb-5"><h1 className="text-3xl font-black text-[#00102e]">إعدادات تشغيل المنصة</h1><p className="mt-1 text-sm text-slate-500">بيانات المكتب والدفع وسياسات التشغيل. أسعار الخدمات تُدار من صفحة الأسعار.</p></header>

    <form key={formKey} onSubmit={save} className="space-y-6">
      <Section icon={Building2} title="هوية المكتب والتواصل" description="تظهر هذه البيانات للعميل وفي كتالوج الخدمات.">
        <Field error={fieldError["office.display_name"]} label="اسم المكتب الظاهر" name="office.display_name" defaultValue={String(current("office.display_name","Z draft"))} required/>
        <Field error={fieldError["office.support_email"]} label="بريد الدعم" name="office.support_email" type="email" defaultValue={String(current("office.support_email",""))}/>
        <Field error={fieldError["office.review_whatsapp_number"]} label="واتساب مراجعة العقود" name="office.review_whatsapp_number" defaultValue={String(current("office.review_whatsapp_number",current("office.whatsapp_number","")))} placeholder="مثال: 2010xxxxxxxx"/>
        <Field error={fieldError["office.support_whatsapp_number"]} label="واتساب الدعم الفني" name="office.support_whatsapp_number" defaultValue={String(current("office.support_whatsapp_number",current("office.whatsapp_number","")))} placeholder="مثال: 2010xxxxxxxx"/>
        <Field error={fieldError["office.support_phone"]} label="هاتف الدعم الفني" name="office.support_phone" defaultValue={String(current("office.support_phone",""))} placeholder="مثال: 010xxxxxxxx"/>
        <label className="sm:col-span-2"><span className="mb-2 block text-xs font-black text-slate-600">عنوان المكتب</span><textarea name="office.address" defaultValue={String(current("office.address",""))} maxLength={500} className="min-h-24 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[#986410]"/>{fieldError["office.address"]&&<FieldError text={fieldError["office.address"]}/>}</label>
      </Section>

      <Section icon={CreditCard} title="الدفع" description="بيانات التحصيل فقط. أسعار مراجعة العقود وإعداد العقود موجودة في صفحة الأسعار.">
        <Field error={fieldError["payments.vodafone_cash_number"]} label="رقم Vodafone Cash" name="payments.vodafone_cash_number" defaultValue={String(current("payments.vodafone_cash_number",""))}/>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-600">أي تحصيل يدوي أو خارجي يُسجل من صفحة المدفوعات حتى يظل الأثر المالي صحيحًا.</div>
      </Section>

      <Section icon={Scale} title="سياسات العقود" description="تنطبق مدة التعديل التالية على عقود الإعداد الذاتي فقط.">
        <Field error={fieldError["contracts.self_service_edit_hours"]} label="مدة تعديل عقد الإعداد الذاتي بعد اعتماد الدفع" name="contracts.self_service_edit_hours" numeric min={1} max={168} defaultValue={String(current("contracts.self_service_edit_hours",24))} suffix="ساعة"/>
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4"><ShieldCheck className="h-5 w-5 shrink-0 text-emerald-700"/><div><div className="text-xs font-black text-emerald-900">تأكيد البريد إلزامي</div><div className="mt-1 text-[10px] leading-5 text-emerald-700">مطلوب قبل الدفع وإنشاء الطلبات الحساسة، وهو سياسة أمان ثابتة وليس خيارًا يمكن تعطيله.</div></div></div>
      </Section>

      <Section icon={MessageCircle} title="قنوات مناقشة مراجعة العقود" description="حدد القنوات التي يمكن للعميل اختيارها. مواعيد وسعة كل قناة تُدار في جدول مراجعة العقود أدناه.">
        <div className="sm:col-span-2"><div className="mb-2 text-xs font-black text-slate-600">القنوات المتاحة للعميل</div><div className="grid gap-3 sm:grid-cols-2">{[["zoom","Zoom"],["whatsapp","واتساب"]].map(([value,label])=><label key={value} className="flex items-center gap-2 rounded-xl border border-slate-200 p-4 text-xs font-black text-slate-700"><input name={`channel_${value}`} type="checkbox" defaultChecked={selectedChannels.includes(value)} className="h-4 w-4 accent-[#986410]"/>{label}</label>)}</div>{fieldError["customer_portal.communication_channels"]&&<FieldError text={fieldError["customer_portal.communication_channels"]}/>}</div>
        <label><span className="mb-2 block text-xs font-black text-slate-600">استخدام واتساب</span><select name="notifications.whatsapp_mode" defaultValue={String(current("notifications.whatsapp_mode","manual_wa_me"))} className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[#986410]"><option value="manual_wa_me">فتح محادثة واتساب عند الحاجة</option><option value="disabled">معطل</option></select></label>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900"><b>واتساب الحالي:</b> يفتح المحادثة مباشرة فقط، ولا توجد رسائل تُرسل تلقائيًا باسم المكتب.</div>
      </Section>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2 text-xs font-bold text-slate-500"><ShieldCheck className="h-5 w-5 text-emerald-600"/>بيانات الدخول الحساسة للبريد والسيرفر لا تظهر في لوحة التحكم.</div><button disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-[#00102e] px-6 py-3 text-xs font-black text-[#d5a84c] disabled:opacity-60"><Save className="h-4 w-4"/>{busy?"جاري الحفظ...":"حفظ الإعدادات"}</button></div>
    </form>

    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex gap-3"><CalendarClock className="mt-0.5 h-6 w-6 text-[#986410]"/><div><h2 className="text-lg font-black text-[#00102e]">مواعيد مراجعة العقود</h2><p className="mt-1 text-xs leading-6 text-slate-500">حدد فترات العمل الأسبوعية، مدة الموعد، والحد الأقصى لحجوزات Zoom وواتساب. التوقيت: {schedule?.timezone||"Africa/Cairo"}.</p></div></div><button type="button" disabled={scheduleBusy||!schedule} onClick={()=>void saveSchedule()} className="inline-flex items-center gap-2 rounded-xl bg-[#00102e] px-5 py-2.5 text-xs font-black text-[#d5a84c] disabled:opacity-50"><Save className="h-4 w-4"/>حفظ الجدول</button></div>
      {scheduleError&&<div className="mt-4 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">{scheduleError}</div>}
      {!schedule&&!scheduleError&&<div className="mt-5"><PageLoading/></div>}
      {schedule&&<div className="mt-5 space-y-4">{dayOrder.map((day)=>{const rows=schedule.windows.map((row,index)=>({row,index})).filter(x=>x.row.weekday===day);return <div key={day} className="rounded-xl border border-slate-200 p-4"><div className="flex items-center justify-between gap-3"><div><div className="text-sm font-black text-[#00102e]">{dayLabels[day]}</div><div className="text-[10px] font-bold text-slate-400">{rows.length?`${rows.length} فترة عمل`:"مغلق"}</div></div><div className="flex flex-wrap items-center gap-2"><button type="button" onClick={()=>copyDayToOthers(day)} disabled={!rows.length} className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-black text-slate-600 disabled:opacity-40">نسخ لباقي الأيام</button><button type="button" onClick={()=>addWindow(day)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-black text-[#00102e]"><Plus className="h-3.5 w-3.5"/>إضافة فترة</button></div></div><div className="mt-3 space-y-3">{rows.map(({row,index})=><div key={`${day}-${index}`} className="grid gap-2 rounded-xl bg-slate-50 p-3 md:grid-cols-[100px_100px_105px_105px_105px_105px_auto] md:items-end"><MiniField label="من" type="time" value={row.startTime} onChange={v=>updateWindow(index,{startTime:v})}/><MiniField label="إلى" type="time" value={row.endTime} onChange={v=>updateWindow(index,{endTime:v})}/><MiniNumber label="مدة الموعد" value={row.slotMinutes} onChange={v=>updateWindow(index,{slotMinutes:v})}/><MiniNumber label="الإجمالي" value={row.totalCapacity} onChange={v=>updateWindow(index,{totalCapacity:v})}/><MiniNumber label="Zoom" value={row.zoomCapacity} onChange={v=>updateWindow(index,{zoomCapacity:v})}/><MiniNumber label="واتساب" value={row.whatsappCapacity} onChange={v=>updateWindow(index,{whatsappCapacity:v})}/><button type="button" onClick={()=>removeWindow(index)} className="flex h-10 items-center justify-center rounded-lg border border-rose-200 bg-white px-3 text-rose-700" aria-label="حذف الفترة"><Trash2 className="h-4 w-4"/></button></div>)}{!rows.length&&<div className="rounded-lg bg-slate-50 p-3 text-center text-[10px] font-bold text-slate-400">لا توجد ساعات عمل في هذا اليوم.</div>}</div></div>;})}</div>}

      {schedule&&<div className="mt-6 border-t border-slate-100 pt-5"><h3 className="text-sm font-black text-[#00102e]">إغلاق استثنائي</h3><form onSubmit={addBlock} className="mt-3 grid gap-2 md:grid-cols-[150px_120px_120px_minmax(0,1fr)_auto]"><input required type="date" value={blockDate} onChange={e=>setBlockDate(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs"/><input type="time" value={blockStart} onChange={e=>setBlockStart(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs"/><input type="time" value={blockEnd} onChange={e=>setBlockEnd(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs"/><input value={blockReason} onChange={e=>setBlockReason(e.target.value)} placeholder="السبب — اختياري" className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs"/><button disabled={scheduleBusy} className="rounded-xl bg-[#986410] px-4 py-2.5 text-xs font-black text-white">إضافة إغلاق</button></form><p className="mt-2 text-[10px] text-slate-400">اترك البداية والنهاية فارغتين لإغلاق اليوم بالكامل.</p><div className="mt-4 space-y-2">{schedule.exceptions.map(ex=><div key={ex.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 text-xs"><div><b className="text-[#00102e]">{new Date(`${ex.date}T12:00:00`).toLocaleDateString("ar-EG",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</b><span className="mr-2 text-slate-500">{ex.startTime&&ex.endTime?`${ex.startTime} — ${ex.endTime}`:"اليوم بالكامل"}{ex.reason?` · ${ex.reason}`:""}</span></div><button type="button" onClick={()=>void deleteBlock(ex.id)} className="rounded-lg p-2 text-rose-700 hover:bg-rose-50" aria-label="حذف الإغلاق الاستثنائي"><Trash2 className="h-4 w-4"/></button></div>)}{schedule.exceptions.length===0&&<div className="text-[10px] font-bold text-slate-400">لا توجد استثناءات مستقبلية.</div>}</div></div>}
    </section>

    <div className="flex justify-end"><Link href="/audit" className="text-[11px] font-black text-slate-500 underline decoration-slate-300 underline-offset-4">الأمان وسجل النظام</Link></div>
    {toast&&<div role="status" className={`fixed bottom-5 left-5 right-5 z-[100] rounded-xl px-4 py-3 text-xs font-black shadow-2xl sm:right-auto sm:min-w-80 ${toast.kind==="success"?"bg-emerald-700 text-white":"bg-red-700 text-white"}`}>{toast.text}</div>}
  </div>;
}

function Section({icon:Icon,title,description,children}:{icon:typeof Building2;title:string;description:string;children:ReactNode}) { return <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#986410]/10"><Icon className="h-5 w-5 text-[#986410]"/></div><div><h2 className="text-lg font-black text-[#00102e]">{title}</h2><p className="mt-1 text-[10px] leading-5 text-slate-400">{description}</p></div></div><div className="mt-5 grid gap-4 sm:grid-cols-2">{children}</div></section>; }
function Field({label,name,defaultValue,type="text",placeholder,required,suffix,numeric,min,max,error}:{label:string;name:string;defaultValue:string;type?:string;placeholder?:string;required?:boolean;suffix?:string;numeric?:boolean;min?:number;max?:number;error?:string}) { return <label><span className="mb-2 block text-xs font-black text-slate-600">{label}</span><div className="relative"><input name={name} type={numeric?"text":type} inputMode={numeric?"numeric":undefined} defaultValue={defaultValue} placeholder={placeholder} required={required} min={numeric?undefined:min} max={numeric?undefined:max} pattern={numeric?"[0-9]+":undefined} className={`w-full rounded-xl border bg-white p-3 text-sm outline-none focus:border-[#986410] ${suffix?"pl-16":""} ${error?"border-red-400":"border-slate-200"}`}/>{suffix&&<span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">{suffix}</span>}</div>{error&&<FieldError text={error}/>}</label>; }
function FieldError({text}:{text:string}) { return <div className="mt-1 text-[10px] font-black text-red-700">{text}</div>; }
function MiniField({label,type,value,onChange}:{label:string;type:string;value:string;onChange:(value:string)=>void}) { return <label><span className="mb-1 block text-[9px] font-black text-slate-500">{label}</span><input type={type} value={value} onChange={e=>onChange(e.target.value)} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs"/></label>; }
function MiniNumber({label,value,onChange}:{label:string;value:number;onChange:(value:number)=>void}) { return <label><span className="mb-1 block text-[9px] font-black text-slate-500">{label}</span><input type="text" inputMode="numeric" pattern="[0-9]+" value={value} onChange={e=>onChange(Math.max(0,Number(e.target.value.replace(/\D/g,""))||0))} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs"/></label>; }
