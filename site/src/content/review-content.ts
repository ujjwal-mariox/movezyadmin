// Explicitly sample review copy, never a CMS publication or binding policy.
export const FARE_REVIEW = [
  'The estimate uses the chosen vehicle and city rate card, route, stops, selected extras, demand adjustments, tax and discounts.',
  'Waiting beyond the configured free allowance can add a charge. The amount depends on the applicable vehicle rate.',
  'The trip-completion calculation can add waiting charges and additional tolls and recalculate tax. It currently retains the original distance and duration fare.',
  'Cancellation is separate from the trip fare: the current trip stage and selected cancellation reason affect the fee and refundable amount. Review the in-app cancellation preview before confirming.',
];
export const POLICY_PREVIEWS = {
  PRIVACY: [
    ['Information used by the service', 'Sample disclosure: accounts use contact details; bookings use pickup, drop, receiver and trip details. Driver onboarding uses identity, licence, vehicle and payment information. The partner app uses location while online, including background location with permission.'],
    ['Messages and payments', 'Sample disclosure: booking chat, support enquiries and transaction records are stored to provide the service. Website enquiries include the selected enquiry category.'],
    ['Service providers', 'Review the engineering data inventory before approval. Integrations include database and file storage, payment, mapping, notification and communication providers. Which providers are active depends on deployment configuration.'],
    ['Client input still needed', 'Insert the approved legal entity, privacy contact, retention periods, rights and deletion process, international-transfer disclosures and lawyer-approved wording. No retention period or legal guarantee is asserted by this mock.'],
  ],
  REFUND: [
    ['Review before cancelling', 'Sample wording: open the booking in the app and review the cancellation preview for the current trip stage and selected reason before confirming.'],
    ['How the amount is determined', 'The configured trip-stage refund limit caps the selected reason’s refund percentage. A non-refundable reason gives no refund. A configured fixed or percentage fee is deducted from the refundable slice, capped at that slice.'],
    ['Payment outcome', 'An unpaid booking has no paid-money refund. Eligible gateway refunds are requested through the payment provider; unsuccessful requests remain pending. Enterprise credit release and spent-coin restoration follow separate system paths.'],
    ['Client input still needed', 'Approve the actual stage limits and cancellation reasons, payment-method handling, refund timing and escalation channel. This sample does not promise a processing deadline or automatic wallet refund.'],
  ],
  TERMS: [
    ['Policy layout preview', 'This page demonstrates the Terms of Use layout only. It is not a contract and contains no approved legal terms.'],
    ['Booking information', 'Sample service description: select pickup and drop locations, review an eligible vehicle and estimated fare, and confirm in the Movezy app. Availability and vehicle distance limits apply.'],
    ['Client input still needed', 'Replace this preview with the client lawyer’s approved text, legal company identity, effective date and contact details through the existing Content & Policies admin screen.'],
  ],
} as const;
