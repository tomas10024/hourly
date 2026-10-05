// TEMPORARY: the front page is rebuilt in stage E1.
import { ApiStatus } from "@/components/api-status";

const roles = [
  {
    title: "Užsakovas",
    body: "Paskelbia projektą, peržiūri gautus pasiūlymus ir realiu laiku mato darbo eigą bei sukauptas valandas.",
  },
  {
    title: "Specialistas",
    body: "Teikia pasiūlymus, registruoja darbo sesijas prie užduočių ir formuoja ataskaitas pagal sutartą įkainį.",
  },
  {
    title: "Tiesiogiai sutartas darbas",
    body: "Projektą susikuria pats specialistas, o užsakovui darbo eigą parodo laikina tik skaitymo peržiūros nuoroda.",
  },
];

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-6 py-16">
      <header className="flex flex-col gap-4">
        <p className="font-mono text-xs uppercase tracking-widest opacity-60">
          T120B165 · Saityno taikomųjų programų projektavimas
        </p>
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
          Hourly
        </h1>
        <p className="max-w-2xl text-lg opacity-80">
          Darbų užsakovai ir laisvai samdomi specialistai vienoje aplinkoje –
          su skaidria atliktų darbų laiko apskaita.
        </p>
      </header>

      <section id="kaip-veikia" className="grid scroll-mt-20 gap-4 md:grid-cols-3">
        {roles.map((role) => (
          <article
            key={role.title}
            className="rounded-lg border border-black/10 p-5 dark:border-white/15"
          >
            <h2 className="mb-2 font-medium">{role.title}</h2>
            <p className="text-sm opacity-70">{role.body}</p>
          </article>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide opacity-60">
          Aplinkos būsena
        </h2>
        <ApiStatus />
        <p className="text-sm opacity-60">
          Sąsajos dokumentacija:{" "}
          <a
            className="underline underline-offset-4"
            href="/api/docs/"
            target="_blank"
            rel="noreferrer"
          >
            /api/docs
          </a>
        </p>
      </section>
    </div>
  );
}
