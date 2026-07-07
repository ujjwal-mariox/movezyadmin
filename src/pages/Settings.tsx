import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Settings as SettingsIcon,
  Save,
  Bell,
  Shield,
  Palette,
  User,
  Mail,
  Phone,
  Globe,
  Moon,
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
  notifyEmail: "notifications.email_enabled",
  notifySms: "notifications.sms_enabled",
  notifyPush: "notifications.push_enabled",
  theme: "appearance.theme",
  language: "appearance.language",
} as const;

type NotificationChannel = "email" | "sms" | "push";

const DEFAULTS = {
  companyName: "Movezy",
  contactEmail: "admin@movezy.com",
  phoneNumber: "",
  notifyEmail: true,
  notifySms: false,
  notifyPush: true,
  theme: "Light Mode",
  language: "English",
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
  const [notifications, setNotifications] = useState<Record<NotificationChannel, boolean>>({
    email: DEFAULTS.notifyEmail,
    sms: DEFAULTS.notifySms,
    push: DEFAULTS.notifyPush,
  });
  const [theme, setTheme] = useState(DEFAULTS.theme);
  const [language, setLanguage] = useState(DEFAULTS.language);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAppSettings();
      const items: AppConfigItem[] = res?.data?.settings ?? res?.settings ?? [];
      setCompanyName(readString(items, KEYS.companyName, DEFAULTS.companyName));
      setContactEmail(readString(items, KEYS.contactEmail, DEFAULTS.contactEmail));
      setPhoneNumber(readString(items, KEYS.phoneNumber, DEFAULTS.phoneNumber));
      setNotifications({
        email: readBool(items, KEYS.notifyEmail, DEFAULTS.notifyEmail),
        sms: readBool(items, KEYS.notifySms, DEFAULTS.notifySms),
        push: readBool(items, KEYS.notifyPush, DEFAULTS.notifyPush),
      });
      setTheme(readString(items, KEYS.theme, DEFAULTS.theme));
      setLanguage(readString(items, KEYS.language, DEFAULTS.language));
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
      upsertAppSetting({ key: KEYS.notifyEmail, value: notifications.email, type: "BOOLEAN", category: "notifications", description: "Email notifications enabled" }),
      upsertAppSetting({ key: KEYS.notifySms, value: notifications.sms, type: "BOOLEAN", category: "notifications", description: "SMS notifications enabled" }),
      upsertAppSetting({ key: KEYS.notifyPush, value: notifications.push, type: "BOOLEAN", category: "notifications", description: "Push notifications enabled" }),
      upsertAppSetting({ key: KEYS.theme, value: theme, type: "STRING", category: "appearance", description: "Admin UI theme" }),
      upsertAppSetting({ key: KEYS.language, value: language, type: "STRING", category: "appearance", description: "Admin UI language" }),
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
  }, [companyName, contactEmail, phoneNumber, notifications, theme, language, loadSettings]);

  const toggleItems = useMemo(
    () => [
      { id: "email" as const, label: "Email Notifications", desc: "Receive updates via email" },
      { id: "sms" as const, label: "SMS Notifications", desc: "Receive updates via SMS" },
      { id: "push" as const, label: "Push Notifications", desc: "Receive browser notifications" },
    ],
    [],
  );

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
              <p className="text-sm text-gray-500">Basic platform information</p>
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
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-300">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
              <Bell className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Notifications</h3>
              <p className="text-sm text-gray-500">Manage alert preferences</p>
            </div>
          </div>

          <div className="space-y-4">
            {toggleItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.label}</p>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications[item.id]}
                    disabled={loading}
                    onChange={(e) =>
                      setNotifications((prev) => ({ ...prev, [item.id]: e.target.checked }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-movezy-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-movezy-600"></div>
                </label>
              </div>
            ))}
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

        {/* Appearance Settings */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-300">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
              <Palette className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Appearance</h3>
              <p className="text-sm text-gray-500">Customize look and feel</p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
              <div className="relative">
                <Moon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-movezy-500 appearance-none bg-white cursor-pointer hover:border-gray-300 transition-colors disabled:bg-gray-50"
                >
                  <option>Light Mode</option>
                  <option>Dark Mode</option>
                  <option>Auto</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  disabled={loading}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-movezy-500 appearance-none bg-white cursor-pointer hover:border-gray-300 transition-colors disabled:bg-gray-50"
                >
                  <option>English</option>
                  <option>Hindi</option>
                  <option>Spanish</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
