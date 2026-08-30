import { ArrowLeft, Waves } from 'lucide-react';
import Link from 'next/link';
import { SiteFooter } from '@/components/site-footer';

export function LegalPage({ kind }: { kind: 'privacy' | 'terms' }) {
  const privacy = kind === 'privacy';
  return (
    <div className="legal-shell">
      <header className="legal-topbar">
        <Link className="brand" href="/" aria-label="Coconut home"><span className="brand-mark" aria-hidden="true"><Waves size={17} /></span><span><span className="brand-name">Coconut</span><span className="brand-note">island-made logistics</span></span></Link>
        <Link className="legal-back" href="/"><ArrowLeft size={14} /> Back to marketplace</Link>
      </header>
      <main className="legal-content">
        <span className="eyebrow">Coconut · {privacy ? 'Privacy' : 'Terms'}</span>
        <h1 className="display">{privacy ? <>A little clarity<br /><em>before you wander.</em></> : <>A small prototype<br /><em>with honest limits.</em></>}</h1>
        <p className="legal-intro">{privacy ? 'This is the plain-language privacy note for the Coconut hackathon demo. It describes what the prototype can remember and what it does not do.' : 'These are the plain-language terms for the Coconut hackathon demo. They keep the prototype useful without pretending it is a live store or carrier network.'}</p>
        <div className="legal-grid">
          {privacy ? <>
            <section className="legal-card"><span className="tiny-label">01 · What we use</span><h2>Demo data first.</h2><p>The marketplace, sellers, orders, routes, weather, and shipping signals are fictional seeded data made for judging. They are not a directory of real businesses.</p></section>
            <section className="legal-card"><span className="tiny-label">02 · What you can save</span><h2>Only what the flow needs.</h2><p>Guest carts stay in this browser. If you create an optional account, Coconut can save your name, email, cart, seller location, and listings in the configured Appwrite project. Without Appwrite credentials, the demo keeps that data in this browser instead.</p></section>
            <section className="legal-card"><span className="tiny-label">03 · What we do not do</span><h2>No payment. No hidden sale.</h2><p>No payment is captured, no real shipment is booked, and the prototype does not need location access, contacts, or uploads. Analytics events are best-effort demo signals for the shared journey.</p></section>
            <section className="legal-card"><span className="tiny-label">04 · Your control</span><h2>Reset or leave anytime.</h2><p>You can reset the canonical demo state from the app, clear local browser storage, or ask the project owner to remove a configured Appwrite account. This page is a hackathon placeholder, not legal advice.</p></section>
          </> : <>
            <section className="legal-card"><span className="tiny-label">01 · The collection</span><h2>Illustrative, not for sale.</h2><p>Product names, maker profiles, prices, inventory, shipping quotes, schedules, weather, and route results are illustrative. A demo order confirmation does not create a real order or payment obligation.</p></section>
            <section className="legal-card"><span className="tiny-label">02 · Accounts</span><h2>Optional by design.</h2><p>You can browse, build a cart, and explore the core flow without an account. An account is only for saving a cart and using the seller workspace. Keep credentials you use for a real service out of this prototype.</p></section>
            <section className="legal-card"><span className="tiny-label">03 · Shared journeys</span><h2>Recommendations are guidance.</h2><p>Coconut demonstrates packing, pooled shipping, batching, route optimization, and market signals. It does not guarantee a carrier, departure, cost, delivery time, demand level, or safe marine passage.</p></section>
            <section className="legal-card"><span className="tiny-label">04 · Third parties</span><h2>Links lead outward.</h2><p>The GitHub link opens the project repository. External providers shown in the architecture are optional integrations and may be unavailable. Their own terms and privacy policies would apply in a real deployment.</p></section>
          </>}
        </div>
        <div className="legal-note"><strong>Last updated for the hackathon demo</strong><span>30 August 2026 · Coconut is island-made logistics in prototype form.</span></div>
      </main>
      <SiteFooter />
    </div>
  );
}
