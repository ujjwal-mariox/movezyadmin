import React, { useMemo, useRef } from "react";
import { RotateCcw } from "lucide-react";

/**
 * Referral share messages (client request, 16 Nov 2026). The server fills in
 * the same placeholders when a customer or driver taps Share; see
 * backend/src/services/referral-message.service.ts.
 */

export type ReferralAudience = "customer" | "driver";

/** The client's wording. Keep in sync with DEFAULT_REFERRAL_MESSAGES on the server. */
export const REFERRAL_DEFAULTS: Record<ReferralAudience, string> = {
  customer: [
    "🚚 Need a reliable partner for your transportation needs?",
    "",
    "Meet Movezy – Speed Meets Reliability!",
    "",
    "Book a Bike, Goods Vehicle or Mini Truck for your local deliveries and goods transportation.",
    "",
    "✅ Quick and convenient bookings",
    "✅ Affordable and transparent pricing",
    "✅ Verified driver partners",
    "✅ Reliable doorstep delivery",
    "",
    "🎁 Join Movezy using my referral link and unlock exciting rewards!",
    "",
    "👉 Download the Movezy App:",
    "📱 Android: {play_store_link}",
    "🍎 iPhone: {app_store_link}",
    "",
    "🔗 My Invite Link: {referral_link}",
    "",
    "🎟️ Referral Code: {referral_code}",
    "",
    "Your next delivery is just a few taps away!",
    "",
    "Movezy – Speed Meets Reliability.",
  ].join("\n"),
  driver: [
    "🚚 Want to earn more with your vehicle? Join Movezy!",
    "",
    "Become a Movezy Driver Partner and earn through delivery and transportation opportunities.",
    "",
    "Whether you own a:",
    "🏍️ Two-Wheeler",
    "🛵 Scooter",
    "🚚 Goods Vehicle / Mini Truck",
    "",
    "Movezy connects you with customers looking for reliable transportation services.",
    "",
    "✅ Flexible working opportunities",
    "✅ Multiple delivery categories",
    "✅ Easy-to-use driver app",
    "✅ Opportunity to grow your earnings",
    "",
    "🎁 Join Movezy using my referral link and unlock exciting rewards!",
    "",
    "📱 Download the Movezy Driver App:",
    "{play_store_link}",
    "",
    "🔗 My Invite Link: {referral_link}",
    "",
    "🎟️ Referral Code: {referral_code}",
    "",
    "Movezy – Your Vehicle, Your Opportunity, Your Earnings!",
  ].join("\n"),
};

const TOKEN = /\{([a-z_]+)\}/gi;

/**
 * Same rules as the server (referral-message.service.ts): a line whose link
 * isn't set is left out, and so is a heading left with nothing under it.
 */
export const renderReferralMessage = (template: string, values: Record<string, string>) => {
  const known = (t: string) => Object.prototype.hasOwnProperty.call(values, t.toLowerCase());
  const kept: (string | null)[] = template
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) =>
      [...line.matchAll(TOKEN)].every(([, t]) => !known(t) || values[t.toLowerCase()])
        ? line.replace(TOKEN, (m, t) => (known(t) ? values[t.toLowerCase()] : m))
        : null,
    );
  for (let i = 0; i < kept.length; i++) {
    if (kept[i] !== null) continue;
    let h = i - 1;
    while (h >= 0 && kept[h] === null) h--;
    let n = i + 1;
    while (n < kept.length && kept[n] === null) n++;
    if (h >= 0 && /:\s*$/.test(kept[h] as string) && (n >= kept.length || !(kept[n] as string).trim())) {
      kept[h] = null;
    }
  }
  return kept
    .filter((l): l is string => l !== null)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

const SAMPLE_CODE = "AB12CD34";

const TOKENS: Record<ReferralAudience, { token: string; label: string }[]> = {
  customer: [
    { token: "{referral_code}", label: "Referral code" },
    { token: "{referral_link}", label: "Invite link" },
    { token: "{play_store_link}", label: "Play Store link" },
    { token: "{app_store_link}", label: "App Store link" },
  ],
  driver: [
    { token: "{referral_code}", label: "Referral code" },
    { token: "{referral_link}", label: "Invite link" },
    { token: "{play_store_link}", label: "Play Store link" },
  ],
};

interface Props {
  audience: ReferralAudience;
  title: string;
  value: string;
  onChange: (v: string) => void;
  playUrl: string;
  appStoreUrl?: string;
  disabled?: boolean;
}

const ReferralMessageEditor: React.FC<Props> = ({
  audience,
  title,
  value,
  onChange,
  playUrl,
  appStoreUrl = "",
  disabled,
}) => {
  const ref = useRef<HTMLTextAreaElement>(null);

  const preview = useMemo(() => {
    const play = playUrl.trim();
    const link = play ? `${play}${play.includes("?") ? "&" : "?"}ref=${SAMPLE_CODE}` : "";
    return renderReferralMessage(value || REFERRAL_DEFAULTS[audience], {
      referral_code: SAMPLE_CODE,
      referral_link: link,
      play_store_link: play,
      app_store_link: audience === "customer" ? appStoreUrl.trim() : "",
    });
  }, [value, playUrl, appStoreUrl, audience]);

  // Put a placeholder where the cursor is, then keep the cursor after it.
  const insert = (token: string) => {
    const el = ref.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    onChange(value.slice(0, start) + token + value.slice(end));
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-semibold text-gray-800">{title}</label>
        <button
          type="button"
          onClick={() => onChange(REFERRAL_DEFAULTS[audience])}
          disabled={disabled || value === REFERRAL_DEFAULTS[audience]}
          className="flex items-center gap-1 text-xs font-medium text-movezy-600 hover:text-movezy-700 disabled:text-gray-300"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset to default
        </button>
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={14}
        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-movezy-500 transition-all disabled:bg-gray-50"
      />
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-gray-500 mr-1">Insert:</span>
        {TOKENS[audience].map((t) => (
          <button
            key={t.token}
            type="button"
            onClick={() => insert(t.token)}
            disabled={disabled}
            title={t.token}
            className="px-2.5 py-1 rounded-full text-xs font-medium bg-movezy-50 text-movezy-700 hover:bg-movezy-100 disabled:opacity-50"
          >
            {t.label}
          </button>
        ))}
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500 mb-1.5">
          Preview (sample code {SAMPLE_CODE})
        </p>
        <div className="max-h-72 overflow-y-auto rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-800 whitespace-pre-wrap break-words">
          {preview}
        </div>
      </div>
    </div>
  );
};

export default ReferralMessageEditor;
