import React, { useCallback, useEffect, useState } from "react";
import QuickRepliesCard from "../components/Config/QuickRepliesCard";
import {
  Settings as SettingsIcon,
  Save,
  Shield,
  User,
  Mail,
  Phone,
  Lock,
  Loader2,
} from "lucide-react";
import {
  fetchAppSettings,
  upsertAppSetting,
  type AppConfigItem,
} from "../services/api";
import { useDialog } from "../components/Layout/Dialog";

// Known configuration keys wired into this page.
const KEYS = {
  companyName: "general.company_name",
  contactEmail: "general.contact_email",
  phoneNumber: "general.phone_number",
  appDownloadUrl: "APP_DOWNLOAD_URL",
  joiningFee: "joining_fee",
  supportPhone: "SUPPORT_PHONE",
  dispatchOfferSeconds: "DISPATCH_OFFER_SECONDS",
  dispatchParallelOffers: "DISPATCH_PARALLEL_OFFERS",
  hideContactNumbers: "HIDE_CONTACT_NUMBERS",
  callFallbackDirect: "CALL_MASKING_FALLBACK_DIRECT",
  fourEyes: "payout_four_eyes_enabled",
} as const;

const DEFAULTS = {
  appDownloadUrl: "",
  supportPhone: "",
  dispatchOfferSeconds: "30",
  dispatchParallelOffers: "1",
  hideContactNumbers: false,
  callFallbackDirect: true,
  joiningFee: "",
  companyName: "Movezy",
  contactEmail: "admin@movezy.com",
  phoneNumber: "",
  fourEyes: false,
};

function readString(items: AppConfigItem[], key: string, fallback: string) {
  const item = items.find((i) => i.key === key);
  if (item && item.value != null) return String(item.value);
  return fallback;
}

function readBool(items: AppConfigItem[], key: string, fallback: boolean) {
  const item = items.find((i) => i.key === key);
  if (!item || item.value == null) return fallback;
  if (typeof item.value === "boolean") return item.value;
  if (typeof item.value === "string")
    return item.value.toLowerCase() === "true";
  return Boolean(item.value);
}

const Settings: React.FC = () => {
  const dialog = useDialog();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const [companyName, setCompanyName] = useState(DEFAULTS.companyName);
  const [contactEmail, setContactEmail] = useState(DEFAULTS.contactEmail);
  const [phoneNumber, setPhoneNumber] = useState(DEFAULTS.phoneNumber);
  const [appDownloadUrl, setAppDownloadUrl] = useState(DEFAULTS.appDownloadUrl);
  const [supportPhone, setSupportPhone] = useState(DEFAULTS.supportPhone);
  const [dispatchOfferSeconds, setDispatchOfferSeconds] = useState(DEFAULTS.dispatchOfferSeconds);
  const [dispatchParallelOffers, setDispatchParallelOffers] = useState(DEFAULTS.dispatchParallelOffers);
  const [hideContactNumbers, setHideContactNumbers] = useState(DEFAULTS.hideContactNumbers);
  const [callFallbackDirect, setCallFallbackDirect] = useState(DEFAULTS.callFallbackDirect);
  const [joiningFee, setJoiningFee] = useState(DEFAULTS.joiningFee);
  const [fourEyes, setFourEyes] = useState(DEFAULTS.fourEyes);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAppSettings();
      const items: AppConfigItem[] = res?.data?.settings ?? res?.settings ?? [];
      setCompanyName(readString(items, KEYS.companyName, DEFAULTS.companyName));
      setContactEmail(readString(items, KEYS.contactEmail, DEFAULTS.contactEmail));
      setPhoneNumber(readString(items, KEYS.phoneNumber, DEFAULTS.phoneNumber));
      setAppDownloadUrl(readString(items, KEYS.appDownloadUrl, DEFAULTS.appDownloadUrl));
      setSupportPhone(readString(items, KEYS.supportPhone, DEFAULTS.supportPhone));
      setDispatchOfferSeconds(readString(items, KEYS.dispatchOfferSeconds, DEFAULTS.dispatchOfferSeconds));
      setDispatchParallelOffers(readString(items, KEYS.dispatchParallelOffers, DEFAULTS.dispatchParallelOffers));
      setHideContactNumbers(readBool(items, KEYS.hideContactNumbers, DEFAULTS.hideContactNumbers));
      setCallFallbackDirect(readBool(items, KEYS.callFallbackDirect, DEFAULTS.callFallbackDirect));
      setJoiningFee(readString(items, KEYS.joiningFee, DEFAULTS.joiningFee));
      setFourEyes(readBool(items, KEYS.fourEyes, DEFAULTS.fourEyes));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load settings";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setBanner(null);
    const jobs: Array<Promise<unknown>> = [
      upsertAppSetting({ key: KEYS.companyName, value: companyName, type: "STRING", category: "general", description: "Company display name" }),
      upsertAppSetting({ key: KEYS.contactEmail, value: contactEmail, type: "STRING", category: "general", description: "Admin contact email" }),
      upsertAppSetting({ key: KEYS.phoneNumber, value: phoneNumber, type: "STRING", category: "general", description: "Admin contact phone" }),
      upsertAppSetting({ key: KEYS.appDownloadUrl, value: appDownloadUrl, type: "STRING", category: "general", description: "App store link used in referral share messages" }),
      upsertAppSetting({ key: KEYS.supportPhone, value: supportPhone, type: "STRING", category: "general", description: "Number shown on the apps' Call Support card" }),
      upsertAppSetting({ key: KEYS.dispatchOfferSeconds, value: Math.min(120, Math.max(10, Number(dispatchOfferSeconds) || 30)), type: "NUMBER", category: "dispatch", description: "Seconds a driver has to answer an offer before it moves to the next nearest driver" }),
      upsertAppSetting({ key: KEYS.dispatchParallelOffers, value: Math.min(10, Math.max(1, Number(dispatchParallelOffers) || 1)), type: "NUMBER", category: "dispatch", description: "How many nearest drivers are rung at once (1 = strictly one at a time)" }),
      upsertAppSetting({ key: KEYS.hideContactNumbers, value: hideContactNumbers ? "true" : "false", type: "STRING", category: "privacy", description: "Mask customer/driver numbers in the apps even without a call-bridging provider" }),
      upsertAppSetting({ key: KEYS.callFallbackDirect, value: callFallbackDirect ? "true" : "false", type: "STRING", category: "privacy", description: "When the masked-call bridge is unavailable, let the app dial the real number directly" }),
      ...(joiningFee.trim() !== "" && Number.isFinite(Number(joiningFee)) && Number(joiningFee) > 0
        ? [upsertAppSetting({ key: KEYS.joiningFee, value: Number(joiningFee), type: "NUMBER", category: "driver", description: "Driver onboarding/joining fee (INR) — the amount Razorpay actually charges" })]
        : []),
      upsertAppSetting({ key: KEYS.fourEyes, value: fourEyes, type: "BOOLEAN", category: "finance", description: "Payouts need a second admin: requester, approver and payer must differ" }),
    ];
    try {
      await Promise.all(jobs);
      setBanner({ kind: "ok", text: "Settings saved." });
      await loadSettings();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to save settings";
      setBanner({ kind: "err", text: msg });
    } finally {
      setSaving(false);
    }
  }, [companyName, contactEmail, phoneNumber, appDownloadUrl, supportPhone, dispatchOfferSeconds, dispatchParallelOffers, hideContactNumbers, callFallbackDirect, fourEyes, joiningFee, loadSettings]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center gap-4">
        <div className="flex-1 min-w-0">
          {error ? (
            <div className="px-4 py-2 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
              {error}
            </div>
          ) : banner ? (
            <div
              className={`px-4 py-2 rounded-xl text-sm border ${
                banner.kind === "ok"
                  ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                  : "bg-red-50 border-red-100 text-red-700"
              }`}
            >
              {banner.text}
            </div>
          ) : null}
        </div>
        <button
          onClick={handleSave}
          disabled={loading || saving}
          className="flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-movezy-600 to-movezy-700 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 shadow-md font-medium disabled:opacity-60 disabled:hover:scale-100"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          <span>{saving ? "Saving…" : "Save Changes"}</span>
        </button>
      </div>

      {/* Settings Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-300">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <SettingsIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">General Settings</h3>
              <p className="text-sm text-gray-500">Printed on customer invoices and used as the platform's contact identity</p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-movezy-500 transition-all disabled:bg-gray-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contact Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-movezy-500 transition-all disabled:bg-gray-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-movezy-500 transition-all disabled:bg-gray-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Support Phone (shown in apps)</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="tel"
                  value={supportPhone}
                  onChange={(e) => setSupportPhone(e.target.value)}
                  disabled={loading}
                  placeholder="Leave blank to hide the Call Support card"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-movezy-500 transition-all disabled:bg-gray-50"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">App Download Link</label>
              <input
                type="url"
                value={appDownloadUrl}
                onChange={(e) => setAppDownloadUrl(e.target.value)}
                disabled={loading}
                placeholder="https://play.google.com/store/apps/details?id=..."
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-movezy-500 transition-all disabled:bg-gray-50"
              />
              <p className="mt-1.5 text-xs text-gray-500">
                Used to build the referral link customers share (the code is appended as
                <code className="mx-1 px-1 bg-gray-100 rounded">?ref=CODE</code>). Left blank,
                referral messages go out with the code only — never a broken link.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Driver Joining Fee (₹)</label>
              <input
                type="number"
                min={1}
                value={joiningFee}
                onChange={(e) => setJoiningFee(e.target.value)}
                disabled={loading}
                placeholder="999"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-movezy-500 transition-all disabled:bg-gray-50"
              />
              <p className="mt-1.5 text-xs text-gray-500">
                The onboarding fee new drivers pay per vehicle. The payment flow reads this
                same setting, so what you save here is exactly what Razorpay charges.
              </p>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-300">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Security</h3>
              <p className="text-sm text-gray-500">Protect your account</p>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() =>
                dialog.alert({
                  title: "Coming soon",
                  message:
                    "Password change from the settings page isn't available yet. Use the 'Forgot password' flow on the login screen to reset it.",
                })
              }
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all group"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <Lock className="w-4 h-4 text-gray-600 group-hover:text-movezy-600 transition-colors" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900">Change Password</p>
                  <p className="text-xs text-gray-500">Update your account password</p>
                </div>
              </div>
              <span className="text-gray-400 group-hover:translate-x-1 transition-transform">→</span>
            </button>

            <button
              onClick={() =>
                dialog.alert({
                  title: "Coming soon",
                  message:
                    "Two-factor authentication isn't available yet.",
                })
              }
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all group"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <Shield className="w-4 h-4 text-gray-600 group-hover:text-movezy-600 transition-colors" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900">Two-Factor Authentication</p>
                  <p className="text-xs text-gray-500">Add an extra layer of security</p>
                </div>
              </div>
              <span className="text-gray-400 group-hover:translate-x-1 transition-transform">→</span>
            </button>
          </div>
        </div>

        {/* Dispatch & calling */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-300">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center">
              <Phone className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Dispatch &amp; calling</h3>
              <p className="text-sm text-gray-500">Nearest-driver offers and number privacy</p>
            </div>
          </div>
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Offer window (seconds)</label>
                <input
                  type="number"
                  min={10}
                  max={120}
                  value={dispatchOfferSeconds}
                  onChange={(e) => setDispatchOfferSeconds(e.target.value)}
                  disabled={loading}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-movezy-500 disabled:bg-gray-50"
                />
                <p className="mt-1.5 text-xs text-gray-500">A driver who does not answer in time loses the offer to the next nearest driver.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Drivers rung at once</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={dispatchParallelOffers}
                  onChange={(e) => setDispatchParallelOffers(e.target.value)}
                  disabled={loading}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-movezy-500 disabled:bg-gray-50"
                />
                <p className="mt-1.5 text-xs text-gray-500">1 = strictly one driver at a time, nearest first.</p>
              </div>
            </div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={hideContactNumbers}
                onChange={(e) => setHideContactNumbers(e.target.checked)}
                disabled={loading}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-medium text-gray-700">Hide phone numbers in the apps</span>
                <span className="block text-xs text-gray-500">
                  Customers and drivers see XXXXXX1234 and call each other through the Movezy number. Turns on
                  automatically when a call-bridging provider is configured on the server.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={callFallbackDirect}
                onChange={(e) => setCallFallbackDirect(e.target.checked)}
                disabled={loading}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-medium text-gray-700">Allow direct dialling when the bridge is unavailable</span>
                <span className="block text-xs text-gray-500">
                  Off = calling is unavailable until the bridge works (chat and support remain).
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={fourEyes}
                onChange={(e) => setFourEyes(e.target.checked)}
                disabled={loading}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-medium text-gray-700">Payouts need a second admin (four-eyes)</span>
                <span className="block text-xs text-gray-500">
                  The admin who requests a payout cannot approve it, and the approver cannot pay it. Leave off
                  while a single admin runs finance, or no payout can complete.
                </span>
              </span>
            </label>
          </div>
        </div>

        <QuickRepliesCard />


      </div>
    </div>
  );
};

export default Settings;
