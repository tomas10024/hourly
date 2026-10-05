"use client";

import {
  Briefcase,
  Clock,
  Download,
  FileText,
  FolderOpen,
  Link2,
  ListChecks,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  Settings,
  Square,
  Trash2,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import {
  Badge,
  ProjectStatusBadge,
  ProposalStatusBadge,
  RoleSticker,
  TaskStatusBadge,
} from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, KeyValues } from "@/components/ui/card";
import { CopyField } from "@/components/ui/copy-field";
import { DataTable, type Column } from "@/components/ui/data-table";
import { ConfirmDialog, Dialog, Drawer } from "@/components/ui/dialog";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { Checkbox, Field, Input, RadioCards, Select, Switch, Textarea } from "@/components/ui/field";
import { Logo } from "@/components/ui/logo";
import { Pagination } from "@/components/ui/pagination";
import { Scramble } from "@/components/ui/scramble";
import { BlockProgress, Skeleton, Spinner } from "@/components/ui/spinner";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";

function Section({ id, label, title, children }: { id: string; label: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="grid gap-6 border-t border-border py-14 first:border-t-0">
      <div className="grid gap-2">
        <span className="label">{`// ${label}`}</span>
        <h2 className="font-serif text-[clamp(30px,4vw,40px)] leading-tight">{title}</h2>
      </div>
      {children}
    </section>
  );
}

const SWATCHES = [
  ["Fonas", "bg", "#000000"],
  ["Tekstas", "fg", "#f0f0f0"],
  ["Antrinis", "muted", "#a1a4a5"],
  ["Hack · veiksmas", "hack", "#ff2e88"],
  ["Data · informacija", "data", "#00e5ff"],
  ["Įspėjimas", "warn", "#f5ff3b"],
  ["Atlikta", "ok", "#3dff9a"],
  ["Klaida", "bad", "#ff4d4d"],
] as const;

const GLYPHS = "ĄČĘĖĮŠŲŪŽ ąčęėįšųūž";

type SessionRow = { id: string; date: string; task: string; project: string; minutes: number; amount: string; running?: boolean };

const SESSIONS: SessionRow[] = [
  { id: "1", date: "2026-10-05", task: "Ataskaitų šablonai", project: "Sandėlio likučių ataskaitos", minutes: 83, amount: "62,38 €", running: true },
  { id: "2", date: "2026-10-04", task: "Ataskaitų šablonai", project: "Sandėlio likučių ataskaitos", minutes: 195, amount: "146,25 €" },
  { id: "3", date: "2026-10-03", task: "Užsakymų sąrašas su filtrais", project: "Internetinės parduotuvės administravimo sritis", minutes: 160, amount: "93,33 €" },
  { id: "4", date: "2026-10-01", task: "Registracijos forma", project: "Kirpyklos internetinė svetainė", minutes: 90, amount: "45,00 €" },
];

const duration = (minutes: number) => `${Math.floor(minutes / 60)} val. ${String(minutes % 60).padStart(2, "0")} min.`;

export function Showcase() {
  const toast = useToast();
  const [dialog, setDialog] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [drawer, setDrawer] = useState<"left" | "right" | null>(null);
  const [tab, setTab] = useState<"tasks" | "proposals" | "shares" | "report" | "settings">("tasks");
  const [page, setPage] = useState(3);
  const [mode, setMode] = useState<"CLIENT" | "SPECIALIST">("CLIENT");
  const [budgetMax, setBudgetMax] = useState("800");
  const [reportVersion, setReportVersion] = useState(0);
  const [reportLoading, setReportLoading] = useState(false);

  // `/ui?open=dialog|confirm|left|right` opens one on load (screenshots).
  useEffect(() => {
    const open = new URLSearchParams(window.location.search).get("open");
    const timer = setTimeout(() => {
      if (open === "dialog") setDialog(true);
      if (open === "confirm") setConfirm(true);
      if (open === "left" || open === "right") setDrawer(open);
    });
    return () => clearTimeout(timer);
  }, []);

  const budgetError = Number(budgetMax) <= 1200 ? "Turi būti didesnis už apatinę ribą (1 200 €)" : undefined;

  const columns: Column<SessionRow>[] = [
    { key: "date", header: "Data", cell: (r) => <span className="tabular">{r.date}</span>, mobile: "meta" },
    { key: "task", header: "Užduotis", cell: (r) => r.task, mobile: "title" },
    { key: "project", header: "Projektas", cell: (r) => <span className="text-muted">{r.project}</span>, mobile: "hidden" },
    {
      key: "duration",
      header: "Trukmė",
      numeric: true,
      cell: (r) => (r.running ? <Badge tone="hack" live>vykdoma</Badge> : duration(r.minutes)),
      mobile: "meta",
    },
    { key: "amount", header: "Suma", numeric: true, cell: (r) => r.amount, mobile: "meta" },
    {
      key: "menu",
      header: <span className="sr-only">Veiksmai</span>,
      className: "w-12",
      mobile: "aside",
      cell: (r) => (
        <DropdownMenu
          items={[
            { label: "Redaguoti", icon: Pencil, onSelect: () => setDialog(true) },
            ...(r.running ? [{ label: "Sustabdyti", icon: Square, onSelect: () => toast.success("> sesija_sustabdyta [200]", "Užregistruota 1 val. 23 min. – 62,38 €.") }] : []),
            { label: "Šalinti", icon: Trash2, danger: true, onSelect: () => setConfirm(true) },
          ]}
        />
      ),
    },
  ];

  const reloadReport = () => {
    setReportLoading(true);
    setTimeout(() => {
      setReportLoading(false);
      setReportVersion((v) => v + 1);
    }, 900);
  };

  return (
    <main className="mx-auto w-full max-w-[1120px] px-[clamp(16px,4vw,32px)] pb-24">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border py-5">
        <Logo />
        <span className="label">Dizaino sistema · tik kūrimo režime</span>
      </header>

      <div className="grid gap-4 pt-14 pb-6">
        <span className="label">{"// resend × watch dogs"}</span>
        <h1 className="heading-display text-[clamp(44px,7vw,84px)]">
          Laikas, kurį galima <em>parodyti</em>
        </h1>
        <p className="max-w-[60ch] text-[17px] text-muted">
          Visi komponentai su visomis būsenomis. Užveskite pelę ant rožinių mygtukų, atidarykite modalus,
          susiaurinkite langą žemiau 768 px.
        </p>
      </div>

      <Section id="palete" label="paletė" title="Juoda bazė, trys neoniniai akcentai">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4">
          {SWATCHES.map(([name, token, hex]) => (
            <div key={token} className="overflow-hidden rounded-2xl border border-border bg-surface">
              <div className="h-[76px] border-b border-border" style={{ background: `var(--color-${token})` }} />
              <div className="grid gap-0.5 px-3 py-2.5 text-[13px]">
                <strong className="font-semibold">{name}</strong>
                <span className="tabular text-xs text-muted">
                  {hex} · {token}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section id="sriftai" label="šriftai" title="Keturi šriftai, kiekvienas savo darbui">
        <Card className="grid gap-0 divide-y divide-border p-0">
          {[
            ["Instrument Serif", "antraštės", "font-serif text-[clamp(32px,5vw,48px)] leading-tight", "Sandėlio likučių ataskaitos"],
            ["Inter", "tekstas, formos", "font-sans", "Projektas sukurtas kaip juodraštis. Paskelbus jį pamatys specialistai."],
            ["Geist Mono", "skaičiai, laikmatis", "font-mono text-xl", "01:23:10 · 967,50 € · 45 €/val."],
            ["Tiny5", "etiketės", "font-pixel text-lg tracking-[0.06em]", "// PROJEKTAI · VYKDOMAS · 404"],
          ].map(([font, role, className, sample]) => (
            <div key={font} className="grid gap-2 p-5 md:grid-cols-[180px_1fr] md:gap-5">
              <span className="label">
                {font}
                <br />
                {role}
              </span>
              <div className={className}>
                {sample}
                <span className={`mt-1.5 block text-sm text-muted ${className.split(" ")[0]}`}>{GLYPHS}</span>
              </div>
            </div>
          ))}
        </Card>
      </Section>

      <Section id="mygtukai" label="mygtukai ir ženkleliai" title="Veiksmai ir būsenos">
        <Card className="grid gap-6">
          <div className="flex flex-wrap items-center gap-2.5">
            <Button variant="hack" icon={Plus} glitch onClick={() => setDialog(true)}>
              Naujas projektas
            </Button>
            <Button>Paskelbti</Button>
            <Button variant="secondary" icon={Download}>
              CSV
            </Button>
            <Button variant="ghost">Atšaukti</Button>
            <Button variant="danger" icon={Trash2} onClick={() => setConfirm(true)}>
              Šalinti
            </Button>
            <Button variant="secondary" loading>
              Generuojama…
            </Button>
            <Button variant="secondary" size="sm" icon={RefreshCw}>
              Mažas
            </Button>
            <Button variant="secondary" size="icon" icon={Settings} aria-label="Nustatymai" />
            <Button disabled>Neaktyvus</Button>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <ProjectStatusBadge status="DRAFT" />
            <ProjectStatusBadge status="PUBLISHED" />
            <ProjectStatusBadge status="IN_PROGRESS" />
            <ProjectStatusBadge status="COMPLETED" />
            <ProjectStatusBadge status="CANCELLED" />
            <TaskStatusBadge status="BLOCKED" />
            <ProposalStatusBadge status="PENDING" />
            <Badge tone="warn">Baigiasi po 2 d.</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <RoleSticker role="SPECIALIST" />
            <RoleSticker role="CLIENT" />
            <RoleSticker role="ADMIN" />
          </div>
        </Card>
      </Section>

      <Section id="laukai" label="formos" title="Įvedimo elementai">
        <Card className="grid gap-4 md:grid-cols-2">
          <Field label="Paieška aikštelėje" className="md:col-span-2">
            {(p) => <Input {...p} type="search" placeholder="pvz., svetainė, API, logotipas" />}
          </Field>
          <Field label="Būsena">
            {(p) => (
              <Select {...p} defaultValue="PUBLISHED">
                <option value="">Visos</option>
                <option value="PUBLISHED">Paskelbtas</option>
                <option value="IN_PROGRESS">Vykdomas</option>
              </Select>
            )}
          </Field>
          <Field label="Pageidaujamas terminas">{(p) => <Input {...p} type="date" defaultValue="2026-11-30" />}</Field>
          <Field label="Pradžia" hint="Vietos laiku; į API siunčiama UTC.">
            {(p) => <Input {...p} type="datetime-local" defaultValue="2026-10-03T09:00" />}
          </Field>
          <Field label="Įkainis, €/val.">{(p) => <Input {...p} type="number" min={0} step={0.5} defaultValue={45} />}</Field>
          <Field label="Biudžetas iki, €" error={budgetError}>
            {(p) => <Input {...p} type="number" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} />}
          </Field>
          <Field label="El. paštas">{(p) => <Input {...p} type="email" defaultValue="tomas@frontend.lt" />}</Field>
          <Field label="Aprašymas" className="md:col-span-2">
            {(p) => <Textarea {...p} defaultValue="Klientai užsisako kavą iš anksto ir atsiima be eilės." />}
          </Field>
          <RadioCards
            name="mode"
            legend="Užduotis sudaro"
            value={mode}
            onChange={setMode}
            options={[
              { value: "CLIENT", label: "Užsakovas", description: "aš" },
              { value: "SPECIALIST", label: "Specialistas", description: "laimėjęs" },
            ]}
          />
          <div className="grid content-end gap-3">
            <Switch label="Tik vykdomos sesijos" defaultChecked />
            <Checkbox label="Sutinku su naudojimo taisyklėmis" />
          </div>
        </Card>
      </Section>

      <Section id="korteles" label="kortelės ir skirtukai" title="Kortelės, lentelė, navigacija">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card hud>
            <ProjectStatusBadge status="PUBLISHED" />
            <h3 className="mt-2.5 mb-1 text-[17px] font-semibold">Kavinės išankstinių užsakymų sistema</h3>
            <p className="text-sm text-muted">Kavinė „Pupa“</p>
            <KeyValues
              className="my-4"
              rows={[
                ["Biudžetas", "1 200–2 000 €"],
                ["Terminas", "2026-11-30"],
              ]}
            />
            <div className="flex justify-between border-t border-border pt-3.5 text-[13px] text-muted">
              <span>3 pasiūlymai</span>
              <span className="text-fg">Peržiūrėti →</span>
            </div>
          </Card>
          <Card hud className="grid gap-3.5">
            <div className="flex items-center gap-3.5">
              <div className="grid size-[52px] place-items-center border border-data font-pixel text-base font-bold text-data">TJ</div>
              <div>
                <h3 className="font-semibold">Tomas Jankauskas</h3>
                <span className="text-[13px] text-muted">tomas@frontend.lt</span>
              </div>
            </div>
            <dl className="grid grid-cols-[112px_1fr] gap-x-3 gap-y-1.5 font-mono text-[13px]">
              <dt className="label pt-0.5">Rolė</dt>
              <dd>Specialistas</dd>
              <dt className="label pt-0.5">Įkainis</dt>
              <dd>35 €/val.</dd>
              <dt className="label pt-0.5">Užregistruota</dt>
              <dd>128,5 val.</dd>
            </dl>
          </Card>
          <Card className="grid gap-3">
            <span className="label">{"// nuoroda (rodoma kartą)"}</span>
            <CopyField label="Peržiūros nuoroda" value="https://hourly.lt/p/k3Jd9xQe2m7LpA0" />
            <p className="text-[13px] text-muted">Galioja iki 2026-10-19 · tik skaitymas</p>
          </Card>
        </div>

        <Card className="grid gap-5">
          <Tabs
            label="Projekto skiltys"
            value={tab}
            onChange={setTab}
            items={[
              { value: "tasks", label: "Užduotys", icon: ListChecks, count: 4 },
              { value: "proposals", label: "Pasiūlymai", icon: Send, count: 3 },
              { value: "shares", label: "Nuorodos", icon: Link2 },
              { value: "report", label: "Ataskaita", icon: FileText },
              { value: "settings", label: "Nustatymai", icon: Settings },
            ]}
          />
          <DataTable caption="Darbo sesijos" columns={columns} rows={SESSIONS} rowKey={(r) => r.id} />
          <Pagination page={page} totalPages={8} onChange={setPage} />
        </Card>
      </Section>

      <Section id="eiga" label="duomenys ir grįžtamasis ryšys" title="Krovimas, iššifravimas, pranešimai">
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="grid content-start gap-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="label">{"// ataskaita"}</span>
                <h3 className="font-semibold">
                  <Scramble key={reportVersion} text="Sandėlio likučių ataskaitos" />
                </h3>
              </div>
              <Button variant="secondary" icon={RefreshCw} loading={reportLoading} onClick={reloadReport}>
                Atnaujinti
              </Button>
            </div>
            {reportLoading ? (
              <div className="grid gap-3">
                <BlockProgress />
                <Skeleton className="w-[90%]" />
                <Skeleton className="w-3/4" />
                <Skeleton className="w-[82%]" />
              </div>
            ) : (
              <KeyValues
                rows={[
                  ["Duomenų šaltinių auditas", <Scramble key={`a${reportVersion}`} text="540,00 €" />],
                  ["Ataskaitų šablonai", <Scramble key={`b${reportVersion}`} text="427,50 €" />],
                  ["Iš viso", <Scramble key={`c${reportVersion}`} text="967,50 €" />],
                ]}
              />
            )}
          </Card>
          <Card className="grid content-start gap-4">
            <span className="label">{"// pranešimai (vietoj alert)"}</span>
            <div className="flex flex-wrap gap-2.5">
              <Button
                variant="secondary"
                onClick={() => toast.success("> projektas_sukurtas [201]", "„Kavinės išankstinių užsakymų sistema“ išsaugotas kaip juodraštis.")}
              >
                Sėkmė
              </Button>
              <Button variant="ghost" onClick={() => toast.error("> session_overlap [409]", "Jau turite vykdomą sesiją. Pirmiausia sustabdykite ją.")}>
                Klaida
              </Button>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted">
              <Spinner /> Sukutis mygtuke ir eilutėje
            </div>
          </Card>
        </div>
      </Section>

      <Section id="tuscia" label="tuščios būsenos" title="Kai nėra ką rodyti">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <EmptyState art="clock" title="Dar nėra darbo sesijų" action={<Button variant="hack" icon={Clock} glitch>Pradėti laikmatį</Button>}>
              Pradėkite laikmatį prie užduoties arba įveskite sesiją rankiniu būdu.
            </EmptyState>
          </Card>
          <Card>
            <EmptyState art="folder" title="Projektų nėra" action={<Button variant="secondary" icon={Briefcase}>Naršyti aikštelę</Button>}>
              Paskelbti projektai ir jūsų pasiūlymai atsiras čia.
            </EmptyState>
          </Card>
          <Card>
            <EmptyState art="signal" title="Signalas prarastas">
              Tokio projekto nėra arba neturite teisės jo matyti.
            </EmptyState>
          </Card>
        </div>
      </Section>

      <Section id="modalai" label="modaliniai langai" title="Dialogai ir šoniniai skydeliai">
        <div className="flex flex-wrap gap-2.5">
          <Button variant="hack" icon={Plus} onClick={() => setDialog(true)}>
            Forma modale
          </Button>
          <Button variant="danger" icon={Trash2} onClick={() => setConfirm(true)}>
            Patvirtinimas
          </Button>
          <Button variant="secondary" icon={FolderOpen} onClick={() => setDrawer("right")}>
            Skydelis dešinėje
          </Button>
          <Button variant="secondary" onClick={() => setDrawer("left")}>
            Meniu kairėje
          </Button>
        </div>
      </Section>

      <Dialog
        open={dialog}
        onClose={() => setDialog(false)}
        title="Naujas projektas"
        onSubmit={() => {
          setDialog(false);
          toast.success("> projektas_sukurtas [201]", "Projektas išsaugotas kaip juodraštis.");
        }}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialog(false)}>
              Atšaukti
            </Button>
            <Button type="submit" variant="hack" glitch>
              Sukurti
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Field label="Pavadinimas">{(p) => <Input {...p} defaultValue="Kavinės išankstinių užsakymų sistema" />}</Field>
          <Field label="Aprašymas">{(p) => <Textarea {...p} />}</Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nuo, €">{(p) => <Input {...p} type="number" defaultValue={1200} />}</Field>
            <Field label="Iki, €">{(p) => <Input {...p} type="number" defaultValue={2000} />}</Field>
          </div>
        </div>
      </Dialog>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Šalinti užduotį?"
        confirmLabel="Šalinti"
        loading={deleting}
        onConfirm={() => {
          setDeleting(true);
          setTimeout(() => {
            setDeleting(false);
            setConfirm(false);
            toast.success("> uzduotis_pasalinta [204]", "„Automatinis siuntimas“ ir jos sesijos pašalintos.");
          }, 700);
        }}
      >
        „Automatinis siuntimas“ ir visos jos darbo sesijos bus pašalintos negrįžtamai.
      </ConfirmDialog>

      <Drawer open={drawer !== null} side={drawer ?? "right"} onClose={() => setDrawer(null)} title={drawer === "left" ? "Meniu" : "Ataskaitų šablonai"}>
        <div className="grid gap-4">
          <TaskStatusBadge status="IN_PROGRESS" />
          <KeyValues
            rows={[
              ["Įvertis", "14 val."],
              ["Užregistruota", "9,5 val."],
              ["Suma", "427,50 €"],
            ]}
          />
        </div>
      </Drawer>
    </main>
  );
}
