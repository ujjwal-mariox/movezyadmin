import type { ReactNode } from "react";

/**
 * Bundled policy text, used only when the CMS endpoint is unreachable. The
 * live versions are edited in the admin panel (Content & Policies) and
 * served to the apps and this site from the same place.
 */
export const FALLBACK_POLICIES: Record<"PRIVACY" | "REFUND" | "TERMS", ReactNode> = {
  PRIVACY: (
    <>
      <p>
        Movezy ("we", "us") provides on-demand goods transport through the Movezy customer app, the Movezy Partner app and this
        website. This policy explains what personal data we collect, why, and the choices you have.
      </p>
      <h2>What we collect</h2>
      <ul>
        <li>Account details: name, mobile number, email, and for partners, identity and vehicle documents (licence, RC, insurance, PUC).</li>
        <li>Booking details: pickup and drop addresses, receiver name and mobile, goods description, photos you attach, payment method and invoices.</li>
        <li>Location: the customer's pickup location when booking; the partner's live location while online and during a trip, so the customer can track it.</li>
        <li>Communication: in-app chat messages, support tickets, and call logs for calls placed through the Movezy number (never the content of calls).</li>
        <li>Device and usage data: app version, device model, crash reports and notification tokens.</li>
      </ul>
      <h2>How we use it</h2>
      <ul>
        <li>To match bookings with nearby partners, price trips, process payments and issue GST invoices.</li>
        <li>To keep both parties safe: verifying partners, confirming handovers with OTPs and masking phone numbers.</li>
        <li>To support you, resolve disputes and meet legal and tax obligations.</li>
        <li>To improve the service, with analytics that are aggregated wherever possible.</li>
      </ul>
      <h2>Sharing</h2>
      <p>
        We share only what a trip needs: the partner sees the pickup and drop addresses and a masked contact; the customer sees the
        partner's name, photo, rating and vehicle. Payment processors, mapping, SMS and telephony providers process data on our behalf
        under contract. We disclose data to authorities only where the law requires.
      </p>
      <h2>Retention and security</h2>
      <p>
        Booking and invoice records are retained as required by Indian tax law. Location history is kept only as long as needed for
        tracking and dispute resolution. Data is encrypted in transit and access is restricted to staff who need it.
      </p>
      <h2>Your rights</h2>
      <p>
        You can view and correct your details in the app, request a copy or deletion of your account data, and withdraw consent for
        optional communications at any time by contacting us.
      </p>
    </>
  ),
  REFUND: (
    <>
      <p>Refunds depend on how far the booking had progressed when it was cancelled, and on who cancelled it.</p>
      <h2>Cancellation by the customer</h2>
      <ul>
        <li>Before a partner is assigned: full refund of any amount paid.</li>
        <li>After a partner is assigned or has arrived: a cancellation fee may apply, shown in the app before you confirm the cancellation; the remainder is refunded.</li>
        <li>After the goods are loaded: the trip is billed for the distance and time completed; any excess is refunded.</li>
      </ul>
      <h2>Cancellation by Movezy or the partner</h2>
      <p>If we or the partner cannot complete the booking, you receive a full refund of any amount paid, and any fee is waived.</p>
      <h2>How refunds are paid</h2>
      <p>
        Refunds go back to the original payment method within 5–7 working days, or to your Movezy wallet immediately where you choose
        that option. Cash bookings are refunded to the wallet. Approved refunds are visible in your booking history.
      </p>
      <h2>Disputes</h2>
      <p>
        Raise a ticket from Help &amp; Support in the app within 48 hours of the trip with the booking number and details; our team
        reviews the trip log, chat and delivery confirmation before deciding.
      </p>
    </>
  ),
  TERMS: (
    <>
      <p>By using the Movezy apps or website you agree to these terms. Please read them together with our Privacy Policy and Refund Policy.</p>
      <h2>The service</h2>
      <p>
        Movezy is a technology platform that connects customers who need goods transported with independent driver partners who own
        or operate vehicles. Movezy is not the carrier; the partner performs the transport. We verify partners, price trips, process
        payments and provide tracking, support and invoices.
      </p>
      <h2>Bookings and fares</h2>
      <ul>
        <li>The fare shown before booking covers the chosen vehicle, road distance and time, selected add-ons and applicable GST.</li>
        <li>Extra stops, waiting beyond the free minutes, tolls and parking are billed at the rates shown in the app.</li>
        <li>Scheduled bookings are dispatched close to the chosen slot and may be cancelled as per the Refund Policy.</li>
      </ul>
      <h2>Goods you may send</h2>
      <p>
        You must not book transport for prohibited items (hazardous, illegal or restricted goods, as listed in the app), and you are
        responsible for packing goods adequately and declaring their nature and weight accurately.
      </p>
      <h2>Handover and liability</h2>
      <p>
        Pickup and delivery are confirmed with OTPs. Claims for loss or damage must be raised within 48 hours through Help &amp; Support
        with photographs; liability is limited to the declared value and the terms of any insurance add-on chosen at booking.
      </p>
      <h2>Partners</h2>
      <p>
        Partners must keep their licence, RC, insurance and PUC valid; expired documents pause dispatch. Partners must carry only
        goods booked through the platform for that trip and follow safety and conduct guidelines in the Partner app.
      </p>
      <h2>Accounts and conduct</h2>
      <p>
        Keep your login secure and your details accurate. We may suspend accounts for fraud, abuse, unsafe behaviour or repeated
        cancellations. These terms are governed by the laws of India, with courts in Pune having jurisdiction.
      </p>
    </>
  ),
};
