export function webUrl(value: unknown): string;
export function storeUrl(value: unknown, platform: 'android' | 'ios'): string;
export function clientSettings(env: Record<string, unknown>): {
  demo: boolean; domainConfirmed: boolean; url: string; legalName: string;
  channels: { label: string; email: string; phone: string }[];
  whatsapp: string; playStoreUrl: string; appStoreUrl: string; driverPlayStoreUrl: string;
  searchConsoleVerification: string; ga4Id: string;
};
