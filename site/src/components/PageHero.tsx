import type { ReactNode } from "react";

interface Props {
  eyebrow: string;
  title: string;
  lead: string;
  children?: ReactNode;
}

/** Inner-page header: orange eyebrow, big title, one-paragraph lead. */
export default function PageHero({ eyebrow, title, lead, children }: Props) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-movezy-50 to-white">
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-movezy-100 blur-3xl" />
      <div className="container-x relative py-16 sm:py-20">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight text-ink sm:text-5xl">{title}</h1>
        <p className="lead mt-5 max-w-2xl">{lead}</p>
        {children && <div className="mt-8">{children}</div>}
      </div>
    </section>
  );
}
