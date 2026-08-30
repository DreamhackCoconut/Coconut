import { ArrowRight, Github } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export function SiteFooter({ onJoin }: { onJoin?: () => void }) {
  return (
    <footer className="site-footer">
      <div className="site-footer-cta">
        <div>
          <span className="site-footer-eyebrow">For island makers + curious buyers</span>
          <h2>Make something that travels.</h2>
          <p>Save a cart for later, or bring your own piece to the collection. Coconut keeps the shared journey visible from pickup to port.</p>
        </div>
        {onJoin ? <button className="site-footer-cta-button pressable" type="button" onClick={onJoin}>Create a free account <ArrowRight size={15} /></button> : <Link className="site-footer-cta-button pressable" href="/seller">Open the seller workspace <ArrowRight size={15} /></Link>}
      </div>
      <div className="site-footer-main">
        <Link className="site-footer-brand" href="/" aria-label="Coconut home"><span className="brand-mark" aria-hidden="true"><Image className="brand-logo-image" src="/coconut-logo.jpg" alt="" width={32} height={32} unoptimized /></span><span><span className="brand-name">Coconut</span><span className="brand-note">island-made logistics</span></span></Link>
        <p>Independent makers stay independent. The expensive movement gets shared.</p>
        <nav className="site-footer-links" aria-label="Footer navigation">
          <Link href="/seller">Artisan workspace</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <a href="https://github.com/DreamhackCoconut/Coconut" target="_blank" rel="noreferrer"><Github size={15} aria-hidden="true" /> GitHub <span aria-hidden="true">↗</span></a>
        </nav>
      </div>
      <div className="site-footer-meta"><span>© 2026 Coconut</span><span>Demo build · no real orders</span><span>Rarotonga → Auckland → everywhere</span></div>
    </footer>
  );
}
