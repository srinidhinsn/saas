import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import ClientIdModal from './ClientIdModal';

const WRAP = 'mx-auto max-w-7xl px-5 sm:px-8';
const NAV = [['about', 'About'], ['products', 'Products'], ['why', 'Why TEKHAWK'], ['support', 'Support'], ['contact', 'Contact']];
const SECTIONS = ['home', 'about', 'products', 'why', 'demo', 'support', 'contact'];
const REDUCE = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const ICONS = {
  eye: 'M2.04 12.32a1 1 0 010-.64C3.42 7.51 7.36 4.5 12 4.5s8.57 3 9.96 7.18a1 1 0 010 .64C20.58 16.49 16.64 19.5 12 19.5s-8.57-3-9.96-7.18zM15 12a3 3 0 11-6 0 3 3 0 016 0z',
  bolt: 'M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z',
  check: 'M4.5 12.75l6 6 9-13.5',
  chart: 'M3 13.1c0-.6.5-1.1 1.1-1.1h2.3c.6 0 1.1.5 1.1 1.1v6.8c0 .6-.5 1.1-1.1 1.1H4.1A1.1 1.1 0 013 19.9v-6.8zM9.75 8.6c0-.6.5-1.1 1.1-1.1h2.3c.6 0 1.1.5 1.1 1.1v11.3c0 .6-.5 1.1-1.1 1.1h-2.3a1.1 1.1 0 01-1.1-1.1V8.6zM16.5 4.1c0-.6.5-1.1 1.1-1.1h2.3c.6 0 1.1.5 1.1 1.1v15.8c0 .6-.5 1.1-1.1 1.1h-2.3a1.1 1.1 0 01-1.1-1.1V4.1z',
};
const Icon = ({ name, className = 'h-5 w-5' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d={ICONS[name]} />
  </svg>
);

/* ───────── scroll helpers ───────── */
function useScroll() {
  const [s, setS] = useState({ y: 0, p: 0 });
  useEffect(() => {
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setS({ y: window.scrollY, p: max > 0 ? window.scrollY / max : 0 });
      });
    };
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => { window.removeEventListener('scroll', on); cancelAnimationFrame(raf); };
  }, []);
  return s;
}

function Reveal({ children, delay = 0, className = '' }) {
  const ref = useRef(null);
  const [on, setOn] = useState(REDUCE);
  useEffect(() => {
    const el = ref.current;
    if (!el || REDUCE) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect(); } }, { threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out ${on ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'} ${className}`}>
      {children}
    </div>
  );
}

function CountUp({ to, prefix = '' }) {
  const ref = useRef(null);
  const [n, setN] = useState(REDUCE ? to : 0);
  useEffect(() => {
    const el = ref.current;
    if (!el || REDUCE) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const tick = (t) => {
        const p = Math.min((t - t0) / 1400, 1);
        setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, [to]);
  return <span ref={ref}>{prefix}{n.toLocaleString('en-IN')}</span>;
}

const Heading = ({ label, title, children, className = '' }) => (
  <div className={className}>
    <p className="text-sm font-bold text-bg-secondary">{label}</p>
    <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
    {children}
  </div>
);

/* ───────── page ───────── */
export default function Application() {
  const [showClientModal, setShowClientModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState('home');
  const { y, p } = useScroll();
  const k = REDUCE ? 0 : 1;

  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth';
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)), { rootMargin: '-45% 0px -50% 0px' });
    SECTIONS.forEach((id) => { const el = document.getElementById(id); if (el) io.observe(el); });
    return () => { io.disconnect(); document.documentElement.style.scrollBehavior = ''; };
  }, []);

  const onSubmit = (e) => {
    e.preventDefault();
    toast.success('Thanks! Your enquiry has been noted. Backend connection will be added later.');
    e.target.reset();
  };

  const field = 'mt-2 w-full rounded-input border border-border-default bg-bg-primary px-4 py-3 text-text-primary outline-none transition focus:border-bg-secondary focus:ring-2 focus:ring-bg-secondary/30';
  const scrolled = y > 20;
  const btnPrimary = 'rounded-button bg-bg-secondary font-bold text-text-primary shadow-button transition hover:brightness-95';
  const btnGhost = 'rounded-button border border-border-default bg-bg-primary font-medium text-text-primary transition hover:bg-bg-tertiary';

  return (
    <div className="min-h-screen overflow-x-clip bg-bg-primary font-sans text-text-primary">
      {/* scroll progress */}
      <div className="fixed inset-x-0 top-0 z-[60] h-[3px]">
        <div className="h-full bg-bg-secondary" style={{ width: `${p * 100}%` }} />
      </div>

      {/* header */}
      <header className={`fixed inset-x-0 top-0 z-50 border-b transition-all duration-300 ${scrolled || menuOpen ? 'border-border-default bg-bg-primary/90 backdrop-blur-xl' : 'border-transparent bg-transparent'}`}>
        <div className={`${WRAP} flex items-center justify-between transition-all duration-300 ${scrolled ? 'py-3' : 'py-5'}`}>
          <a href="#home" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-button bg-bg-secondary text-lg font-bold">T</span>
            <span>
              <span className="block text-lg font-bold leading-none tracking-[0.14em]">TEKHAWK</span>
              <span className="mt-1 block text-[10px] leading-none text-text-secondary">Software Solutions</span>
            </span>
          </a>

          <nav className="hidden items-center gap-7 text-sm md:flex">
            {NAV.map(([id, label]) => (
              <a key={id} href={`#${id}`} className={`relative py-1 font-medium transition ${active === id ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}>
                {label}
                <span className={`absolute inset-x-0 -bottom-1 h-0.5 origin-left rounded-full bg-bg-secondary transition-transform duration-300 ${active === id ? 'scale-x-100' : 'scale-x-0'}`} />
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setShowClientModal(true)} className={`${btnGhost} hidden px-4 py-2 text-sm sm:inline-flex`}>Login</button>
            <a href="#contact" className={`${btnPrimary} hidden px-4 py-2 text-sm sm:inline-flex`}>Request Demo</a>
            <button type="button" aria-label="Toggle menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)}
              className="flex h-10 w-10 items-center justify-center rounded-button border border-border-default md:hidden">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="animate-slideUp border-t border-border-default bg-bg-primary md:hidden">
            <div className={`${WRAP} flex flex-col gap-1 py-4`}>
              {NAV.map(([id, label]) => (
                <a key={id} href={`#${id}`} onClick={() => setMenuOpen(false)} className="rounded-button px-3 py-3 font-medium hover:bg-bg-tertiary">{label}</a>
              ))}
              <div className="mt-2 grid grid-cols-2 gap-3">
                <button type="button" onClick={() => { setMenuOpen(false); setShowClientModal(true); }} className={`${btnGhost} py-3`}>Login</button>
                <a href="#contact" onClick={() => setMenuOpen(false)} className={`${btnPrimary} py-3 text-center`}>Request Demo</a>
              </div>
            </div>
          </div>
        )}
      </header>

      <main>
        {/* hero */}
        <section id="home" className="scroll-mt-20 bg-gradient-to-b from-cardBackgrounds-bg1 to-bg-primary pt-28 sm:pt-36">
          <div className={`${WRAP} grid items-center gap-14 pb-20 lg:grid-cols-[1.05fr_.95fr] lg:pb-28`}>
            <div>
              <Reveal>
                <span className="inline-flex rounded-badge border border-border-default bg-bg-primary px-4 py-1.5 text-sm text-text-secondary">Practical SaaS for modern businesses</span>
              </Reveal>
              <Reveal delay={80}>
                <h1 className="mt-6 text-5xl font-bold leading-[1.08] tracking-tight sm:text-6xl">
                  Build smarter.<br />Operate faster.<br />Grow stronger.
                </h1>
              </Reveal>
              <Reveal delay={160}>
                <p className="mt-6 max-w-xl text-lg leading-8 text-text-secondary">
                  TEKHAWK builds powerful, easy-to-use SaaS applications that simplify everyday operations, improve visibility, and help businesses make faster decisions.
                </p>
              </Reveal>
              <Reveal delay={240} className="mt-9 flex flex-wrap gap-4">
                <a href="#products" className={`${btnPrimary} px-6 py-3.5`}>Explore Products</a>
                <a href="#contact" className={`${btnGhost} px-6 py-3.5`}>Book a Demo</a>
              </Reveal>
              <Reveal delay={320} className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-text-secondary">
                {['Restaurant POS', 'Retail SaaS', 'Cloud Ready', 'Built to Scale'].map((t) => (
                  <span key={t} className="flex items-center gap-2"><Icon name="check" className="h-4 w-4 text-bg-secondary" />{t}</span>
                ))}
              </Reveal>
            </div>

            {/* dashboard preview, drifts slightly on scroll */}
            <div className="relative" style={{ transform: `translateY(${-y * 0.05 * k}px)` }}>
              <div className="rounded-card-lg border border-border-default bg-bg-primary p-4 shadow-modal sm:p-5">
                <div className="rounded-card bg-bg-tertiary p-5 sm:p-6">
                  <div className="mb-6 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-medium text-text-secondary">TEKHAWK</div>
                      <div className="mt-1 text-xl font-bold">Business Overview</div>
                    </div>
                    <div className="flex items-center gap-2 rounded-badge bg-bg-primary px-3 py-1.5 text-xs font-medium">
                      <span className="h-2 w-2 rounded-full bg-action-success" />Live Operations
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-card border border-border-default bg-bg-primary p-4 sm:p-5">
                      <div className="text-xs text-text-secondary">Today’s Sales</div>
                      <div className="mt-2 text-xl font-bold sm:text-2xl"><CountUp to={84260} prefix="₹" /></div>
                      <div className="mt-2 text-xs font-medium text-action-success">↑ 12.4% today</div>
                    </div>
                    <div className="rounded-card border border-border-default bg-bg-primary p-4 sm:p-5">
                      <div className="text-xs text-text-secondary">Orders</div>
                      <div className="mt-2 text-xl font-bold sm:text-2xl"><CountUp to={326} /></div>
                      <div className="mt-2 text-xs text-text-secondary">Across active counters</div>
                    </div>
                    <div className="col-span-2 rounded-card border border-border-default bg-bg-primary p-5">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-xs text-text-secondary">Business Visibility</div>
                          <div className="mt-1 font-medium">Everything important. One clear view.</div>
                        </div>
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-card bg-cardBackgrounds-bg1 text-bg-secondary"><Icon name="chart" /></span>
                      </div>
                      <div className="mt-5 h-2 overflow-hidden rounded-badge bg-bg-tertiary">
                        <div className="h-full rounded-badge bg-bg-secondary transition-all duration-1000" style={{ width: y > -1 ? '78%' : '0%' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* about */}
        <section id="about" className="scroll-mt-16 border-y border-border-default bg-bg-primary">
          <div className={`${WRAP} grid gap-10 py-20 sm:py-24 lg:grid-cols-2 lg:gap-16`}>
            <Reveal><Heading label="About TEKHAWK" title="Software built around the way businesses actually work." /></Reveal>
            <Reveal delay={100} className="space-y-5 text-lg leading-8 text-text-secondary">
              <p>TEKHAWK Software Solutions develops modern SaaS applications for growing businesses. We focus on solutions that reduce effort, improve control, and make important business information easier to understand.</p>
              <p>Our approach combines practical business thinking with thoughtful product design, reliable technology, and continuous improvement.</p>
            </Reveal>
          </div>
        </section>

        {/* products */}
        <section id="products" className="scroll-mt-16 bg-bg-tertiary">
          <div className={`${WRAP} py-20 sm:py-24`}>
            <Reveal>
              <Heading label="Products" title="Focused products. Real operational value." className="max-w-3xl">
                <p className="mt-4 text-lg leading-8 text-text-secondary">Our first SaaS products are designed around two industries where speed, visibility, and operational control matter every day.</p>
              </Heading>
            </Reveal>
            <div className="mt-12 grid gap-6 lg:grid-cols-2">
              {[
                { badge: 'Restaurant SaaS', live: true, title: 'TEKHAWK Restaurant POS', text: 'A modern POS and restaurant operations platform for billing, orders, tables, menus, kitchen workflow, payments, reporting, and more.', tags: ['POS Billing', 'Order Management', 'Kitchen Workflow', 'Reports'], cta: 'Request Restaurant Demo', href: '#contact' },
                { badge: 'Coming Next', live: false, title: 'TEKHAWK Retail', text: 'A retail SaaS platform for billing, products, inventory, purchases, suppliers, customers, store controls, and business dashboards.', tags: ['Retail POS', 'Inventory', 'Suppliers', 'Multi-store'], cta: 'Join Early Access', href: '#contact' },
              ].map((c, i) => (
                <Reveal key={c.title} delay={i * 120}>
                  <article className="group flex h-full flex-col rounded-card-lg border border-border-default bg-bg-primary p-7 shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-card-hover sm:p-8">
                    <span className={`inline-flex w-fit items-center gap-2 rounded-badge px-3 py-1 text-xs font-bold ${c.live ? 'bg-cardBackgrounds-bg6' : 'bg-cardBackgrounds-bg5'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${c.live ? 'bg-action-success' : 'bg-bg-secondary'}`} />{c.badge}
                    </span>
                    <h3 className="mt-6 text-2xl font-bold sm:text-3xl">{c.title}</h3>
                    <p className="mt-3 leading-7 text-text-secondary">{c.text}</p>
                    <div className="mt-6 flex flex-wrap gap-2 text-sm">
                      {c.tags.map((t) => <span key={t} className="rounded-button bg-bg-tertiary px-3 py-1.5">{t}</span>)}
                    </div>
                    <a href={c.href} className="mt-auto inline-flex items-center gap-2 pt-8 font-bold transition group-hover:text-bg-secondary">
                      {c.cta}<span className="transition group-hover:translate-x-1">→</span>
                    </a>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* why */}
        <section id="why" className="scroll-mt-16 border-b border-border-default bg-bg-primary">
          <div className={`${WRAP} grid gap-12 py-20 sm:py-24 lg:grid-cols-[.85fr_1.15fr]`}>
            <div className="self-start lg:sticky lg:top-28">
              <Reveal>
                <Heading label="Why TEKHAWK" title="Sharp focus. Practical technology.">
                  <p className="mt-4 max-w-lg leading-7 text-text-secondary">Like a hawk, strong businesses need clarity, speed, awareness, and precision. Those qualities shape how we think about our software.</p>
                </Heading>
              </Reveal>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ['eye', 'Clear Visibility', 'Useful dashboards and reporting for better business awareness.'],
                ['bolt', 'Faster Operations', 'Reduce repetitive steps and streamline day-to-day workflows.'],
                ['check', 'Simple Experience', 'Clean interfaces designed for quick adoption by real teams.'],
                ['chart', 'Built to Scale', 'A SaaS foundation designed to grow with your business.'],
              ].map(([icon, t, d], i) => (
                <Reveal key={t} delay={(i % 2) * 100}>
                  <div className="h-full rounded-card border border-border-default bg-bg-tertiary p-6 transition duration-300 hover:border-bg-secondary hover:bg-bg-primary hover:shadow-card-hover">
                    <span className="flex h-10 w-10 items-center justify-center rounded-button bg-cardBackgrounds-bg1 text-bg-secondary"><Icon name={icon} /></span>
                    <h3 className="mt-4 text-lg font-bold">{t}</h3>
                    <p className="mt-2 text-sm leading-6 text-text-secondary">{d}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* vision & mission */}
        <section className={`${WRAP} py-20 sm:py-24`}>
          <div className="grid gap-6 md:grid-cols-2">
            {[
              ['Vision', 'To become a trusted SaaS technology partner by creating intelligent, reliable, and easy-to-use software that improves the way businesses operate and grow.'],
              ['Mission', 'To simplify operations, improve productivity, provide better visibility, and enable confident business decisions through practical SaaS products.'],
            ].map(([t, d], i) => (
              <Reveal key={t} delay={i * 120}>
                <div className="h-full rounded-card-lg border border-border-default border-t-4 border-t-bg-secondary bg-bg-primary p-8 shadow-card">
                  <h3 className="text-sm font-bold text-bg-secondary">{t}</h3>
                  <p className="mt-4 text-xl leading-relaxed sm:text-2xl">{d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* demo */}
        <section id="demo" className={`${WRAP} scroll-mt-16 pb-20 sm:pb-24`}>
          <Reveal>
            <div className="rounded-card-lg bg-text-primary px-7 py-12 sm:px-12 sm:py-14 lg:px-16">
              <div className="max-w-3xl">
                <p className="text-sm font-bold text-bg-secondary">See TEKHAWK in action</p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-text-white sm:text-4xl">Experience the software before you decide.</h2>
                <p className="mt-5 text-lg leading-8 text-border-default">Request a guided demo and see how TEKHAWK can simplify your daily operations. Demo booking and product trials can be connected here next.</p>
                <a href="#contact" className={`${btnPrimary} mt-8 inline-flex px-6 py-3.5`}>Request a Demo</a>
              </div>
            </div>
          </Reveal>
        </section>

        {/* support */}
        <section id="support" className="scroll-mt-16 border-y border-border-default bg-bg-tertiary">
          <div className={`${WRAP} grid gap-10 py-20 sm:py-24 lg:grid-cols-2 lg:gap-16`}>
            <Reveal>
              <Heading label="Support" title="We’re here when you need us.">
                <p className="mt-4 max-w-xl leading-7 text-text-secondary">From onboarding and setup to product guidance and technical support, our goal is to help customers get lasting value from TEKHAWK products.</p>
              </Heading>
            </Reveal>
            <div className="grid gap-3 sm:grid-cols-2">
              {['Product Onboarding', 'Setup Assistance', 'Knowledge Base', 'Technical Support'].map((t, i) => (
                <Reveal key={t} delay={i * 80}>
                  <div className="flex items-center gap-3 rounded-card border border-border-default bg-bg-primary p-5 font-medium shadow-button">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cardBackgrounds-bg1 text-bg-secondary"><Icon name="check" className="h-4 w-4" /></span>{t}
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* contact */}
        <section id="contact" className={`${WRAP} scroll-mt-16 py-20 sm:py-24`}>
          <div className="grid gap-12 lg:grid-cols-[.85fr_1.15fr]">
            <Reveal>
              <Heading label="Contact" title="Let’s build a smarter way to work.">
                <p className="mt-4 leading-7 text-text-secondary">Use this section for demo requests, product enquiries, partnerships, support, and general enquiries. We can connect the form to your backend or email workflow later.</p>
              </Heading>
            </Reveal>
            <Reveal delay={100}>
              <form onSubmit={onSubmit} className="rounded-card-lg border border-border-default bg-bg-primary p-6 shadow-card sm:p-8">
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="text-sm font-medium">Name<input required name="name" className={field} placeholder="Your name" /></label>
                  <label className="text-sm font-medium">Business<input name="business" className={field} placeholder="Company / Business" /></label>
                  <label className="text-sm font-medium">Email<input required type="email" name="email" className={field} placeholder="you@example.com" /></label>
                  <label className="text-sm font-medium">Enquiry
                    <select name="enquiry" className={field}>
                      {['Request a Demo', 'Restaurant POS', 'Retail SaaS', 'Partnership', 'Support', 'General Enquiry'].map((o) => <option key={o}>{o}</option>)}
                    </select>
                  </label>
                </div>
                <label className="mt-5 block text-sm font-medium">Message
                  <textarea name="message" rows="5" className={field} placeholder="Tell us what you are looking for..." />
                </label>
                <button className={`${btnPrimary} mt-6 w-full px-6 py-3 sm:w-auto`}>Send Enquiry</button>
              </form>
            </Reveal>
          </div>
        </section>
      </main>

      {/* footer */}
      <footer className="bg-text-primary text-text-white">
        <div className={`${WRAP} flex flex-col gap-8 py-10 lg:flex-row lg:items-center lg:justify-between`}>
          <div>
            <div className="text-xl font-bold tracking-[0.14em]">TEKHAWK</div>
            <div className="mt-2 text-sm text-border-default">Smarter Software. Sharper Business.</div>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-border-default">
            {[['products', 'Products'], ['about', 'About'], ['demo', 'Demo'], ['support', 'Support'], ['contact', 'Contact']].map(([id, l]) => (
              <a key={id} href={`#${id}`} className="transition hover:text-text-white">{l}</a>
            ))}
            <a href="#" className="transition hover:text-text-white">Privacy</a>
            <a href="#" className="transition hover:text-text-white">Terms</a>
          </div>
          <div className="text-sm text-border-default">© 2026 TEKHAWK Software Solutions.</div>
        </div>
      </footer>

      {/* back to top */}
      <a href="#home" aria-label="Back to top"
        className={`fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-bg-secondary font-bold shadow-card-hover transition duration-300 ${y > 600 ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'}`}>
        ↑
      </a>

      <ClientIdModal open={showClientModal} onClose={() => setShowClientModal(false)} />
    </div>
  );
}