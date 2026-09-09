import type { ReactNode } from "react";
import { SITE } from "../config/site";

/**
 * Play Store / App Store buttons. A store without a published link renders
 * as "Coming soon" rather than a dead link — the URLs come from `.env`
 * (VITE_PLAY_STORE_URL / VITE_APP_STORE_URL) once the apps are live.
 */
interface Props {
  compact?: boolean;
  variant?: "dark" | "light";
}

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
    <path fill="#34A853" d="M3.6 2.4 13.4 12 3.6 21.6c-.4-.3-.6-.8-.6-1.4V3.8c0-.6.2-1.1.6-1.4Z" />
    <path fill="#FBBC04" d="m16.7 8.7 3.4 1.9c1 .6 1 1.9 0 2.5l-3.4 2L13.4 12l3.3-3.3Z" />
    <path fill="#4285F4" d="M3.6 2.4c.4-.3.9-.4 1.4-.1l11.7 6.4L13.4 12 3.6 2.4Z" />
    <path fill="#EA4335" d="m13.4 12 3.3 3.1L5 21.7c-.5.3-1 .2-1.4-.1L13.4 12Z" />
  </svg>
);

const AppleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true">
    <path d="M16.4 12.7c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9-.7 0-1.8-.8-3-.8-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.8 3-.8s1.8.8 3 .7c1.3 0 2.1-1.1 2.8-2.3.9-1.3 1.3-2.6 1.3-2.7-.1 0-2.5-1-2.5-3.6ZM14.1 5.9c.6-.8 1.1-1.9.9-3-.9 0-2 .6-2.7 1.4-.6.7-1.1 1.8-1 2.9 1.1.1 2.1-.5 2.8-1.3Z" />
  </svg>
);

function Badge({
  href,
  icon,
  small,
  big,
  variant,
}: {
  href: string;
  icon: ReactNode;
  small: string;
  big: string;
  variant: "dark" | "light";
}) {
  const live = Boolean(href);
  const base =
    variant === "dark"
      ? "bg-ink text-white hover:bg-gray-800"
      : "bg-white text-ink border border-gray-200 hover:border-movezy-300";
  const content = (
    <>
      <span className={variant === "dark" ? "text-white" : "text-ink"}>{icon}</span>
      <span className="flex flex-col leading-tight">
        <span className="text-[10px] uppercase tracking-wide opacity-80">{live ? small : "Coming soon"}</span>
        <span className="text-sm font-semibold">{big}</span>
      </span>
    </>
  );
  const cls = `inline-flex items-center gap-2.5 rounded-xl px-4 py-2.5 transition ${base} ${live ? "" : "cursor-default opacity-70"}`;
  return live ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
      {content}
    </a>
  ) : (
    <span className={cls} aria-disabled="true" title="Not published yet">
      {content}
    </span>
  );
}

export default function StoreBadges({ compact, variant = "dark" }: Props) {
  return (
    <div className={`flex flex-wrap items-center gap-3 ${compact ? "" : "sm:gap-4"}`}>
      <Badge href={SITE.playStoreUrl} icon={<PlayIcon />} small="Get it on" big="Google Play" variant={variant} />
      <Badge href={SITE.appStoreUrl} icon={<AppleIcon />} small="Download on the" big="App Store" variant={variant} />
    </div>
  );
}
