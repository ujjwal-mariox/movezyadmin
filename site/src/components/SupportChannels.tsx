import { SITE } from '../config/site';

export default function SupportChannels() {
  return <div className="card">
    <h2 className="text-base font-semibold text-ink">Support & enquiries</h2>
    {SITE.demo && <p className="mt-2 text-sm text-amber-800">Sample contact details for review. These channels are not connected.</p>}
    {SITE.channels.map(channel => <div key={channel.label} className="mt-5 space-y-1 text-sm">
      <h3 className="font-semibold text-ink">{channel.label}</h3>
      {channel.email && <p className="break-all">{SITE.demo ? channel.email : <a className="text-brand underline" href={`mailto:${channel.email}`}>{channel.email}</a>}</p>}
      {channel.phone && <p>{SITE.demo ? channel.phone : <a className="text-brand underline" href={`tel:${channel.phone}`}>{channel.phone}</a>}</p>}
      {!channel.email && !channel.phone && <p className="text-muted">Use the relevant enquiry category in this form.</p>}
    </div>)}
    {SITE.demo ? <p className="mt-5 text-sm">WhatsApp: +91 XXXXX XXXXX (sample)</p> : SITE.whatsapp && <a className="btn-secondary mt-5" href={`https://wa.me/${SITE.whatsapp.slice(1)}`} target="_blank" rel="noopener noreferrer">Chat on WhatsApp</a>}
    <p className="mt-5 text-sm text-muted">{SITE.address}</p>
  </div>;
}
