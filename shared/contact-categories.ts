export const CONTACT_CATEGORIES = {
  NEW_BOOKING: "New Booking", EXISTING_BOOKING: "Existing Booking",
  BUSINESS_ENQUIRY: "Business Enquiry", DRIVER_PARTNERSHIP: "Driver Partnership",
  FLEET_PARTNERSHIP: "Fleet Partnership", PAYMENT_BILLING: "Payment/Billing",
  TECHNICAL_ISSUE: "Technical Issue", OTHER: "Other",
} as const;
export type ContactCategory = keyof typeof CONTACT_CATEGORIES;
