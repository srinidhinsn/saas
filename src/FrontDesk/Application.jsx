import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import ClientIdModal from './ClientIdModal'

// Logo lives in the /public folder
const logo = '/logo.png'

/* =====================================================================
   EDIT THESE: your contact details and your demo videos
   ===================================================================== */
const contactInfo = {
  email: 'hello@tekhawk.com',          // placeholder: put your real email
  phone: '+91 00000 00000',            // placeholder: the number shown on the page
  phoneLink: '+910000000000',          // same number, digits only (used by the Call button)
  hours: 'Mon – Sat, 9:00 AM – 6:00 PM IST',
}

// Videos play automatically (muted, looping). To add a video:
//   1) put the file in the  public  folder (next to package.json, NOT inside src)
//   2) set src below, e.g.  src: '/placeorder.webm'
// The first video sits at the back (top-left), the second overlaps it in front (bottom-right).
const demoVideo =
  { src: '/Demo.webm', poster: '' }

const contactTabs = [
  { id: 'enquiry', label: 'Enquiry' },
  { id: 'email', label: 'Email us' },
  { id: 'phone', label: 'Call us' },
]

// Shared class strings (standardized theme: ui-* components + tokens from tailwind.config.js)
const EYEBROW = 'text-ui font-bold uppercase tracking-[.2em] text-brand'
const LABEL = 'block mb-1 text-micro font-bold uppercase tracking-wide text-ink-muted'
const INPUT = 'ui-input h-11 pl-3'
const TEXTAREA = 'ui-input h-auto py-2.5 pl-3'
const SOFT_CARD = 'rounded-panel border border-brand-line bg-brand-tint shadow-panel'
const BTN_LG = 'h-12 px-7 text-body-sm'

export default function Application() {
  const [scrolled, setScrolled] = useState(false)
  const [progress, setProgress] = useState(0)
  const [tab, setTab] = useState('enquiry')
  const [showClientModal, setShowClientModal] = useState(false)

  // Smooth anchor scrolling (only while this page is mounted, and only if motion is allowed)
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!reduce) document.documentElement.style.scrollBehavior = 'smooth'
    return () => { document.documentElement.style.scrollBehavior = '' }
  }, [])

  // Header shadow + thin scroll-progress line
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      const max = document.documentElement.scrollHeight - window.innerHeight
      setScrolled(y > 10)
      setProgress(max > 0 ? (y / max) * 100 : 0)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Scroll reveal: any element with class "lp-reveal" fades up when it enters the screen
  useEffect(() => {
    const items = document.querySelectorAll('.lp-reveal')
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.15 }
    )
    items.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  // Enquiry form (connect to your backend later)
  const handleEnquiry = (e) => {
    e.preventDefault()
    toast.success('Thanks! Your enquiry has been noted. Backend connection will be added later.')
    e.target.reset()
  }

  // Email form: opens the visitor's email app with everything filled in
  const handleEmail = (e) => {
    e.preventDefault()
    const data = new FormData(e.target)
    const subject = encodeURIComponent(data.get('subject') || 'Enquiry from website')
    const body = encodeURIComponent(
      `Name: ${data.get('name')}\nEmail: ${data.get('email')}\n\n${data.get('message')}`
    )
    window.location.href = `mailto:${contactInfo.email}?subject=${subject}&body=${body}`
  }

  return (
    <div className="lp-root">
      {/* ---------- HEADER ---------- */}
      <header className={`fixed inset-x-0 top-0 z-50 border-b border-line bg-surface/80 backdrop-blur-xl transition-shadow duration-300 ${scrolled ? 'shadow-soft' : ''}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-2 lg:px-8">
          <a href="#home" className="flex items-center p-1">
            <img src={logo} alt="TEKHAWK Software Solutions" width="900" height="450" className="lp-logo animate-pop motion-reduce:animate-none" />
          </a>

          <nav className="hidden items-center gap-1 md:flex">
            <a className="ui-tab" href="#products">Products</a>
            <a className="ui-tab" href="#support">Support</a>
            <a className="ui-tab" href="#contact">Contact</a>
            <a className="ui-tab" href="#why">Why Us</a>
            <a className="ui-tab" href="#about">About Us</a>
          </nav>

          <div className="flex items-center gap-3">
            {/* Login opens the Client ID popup */}
            <button type="button" onClick={() => setShowClientModal(true)} className="ui-btn px-4">
              Login
            </button>
            <div className="relative hidden sm:block">
              <a href="#demo" className="ui-btn ui-btn-add animate-press px-4 motion-reduce:animate-none">Request Demo</a>
              {/* click ripple */}
              <span aria-hidden="true" className="pointer-events-none absolute inset-0 animate-ripple rounded-button-sm border-2 border-brand-ring motion-reduce:hidden"></span>
              {/* animated cursor */}
              <svg aria-hidden="true" viewBox="0 0 24 24" className="pointer-events-none absolute left-1/2 top-1/2 z-10 h-6 w-6 animate-cursor drop-shadow motion-reduce:hidden">
                <path d="M5 3l14 7-6 2-2 6z" className="fill-ink stroke-surface" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>
        {/* scroll progress line */}
        <div aria-hidden="true" className="absolute bottom-0 left-0 h-0.5 bg-brand" style={{ width: `${progress}%` }}></div>
      </header>

      <main>
        {/* ---------- HERO ---------- */}
        <section id="home" className="relative overflow-hidden bg-gradient-to-b from-brand-light to-canvas pt-32">
          {/* soft drifting glow */}
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 top-24 h-96 w-96 animate-drift rounded-full bg-brand-200/60 blur-3xl motion-reduce:animate-none"></div>

          <div className="relative mx-auto grid max-w-7xl gap-14 px-6 py-12 lg:grid-cols-[1.08fr_.92fr] lg:px-8 lg:py-8">
            <div className="flex flex-col justify-center">
              <h1 className="lp-reveal max-w-4xl text-5xl leading-[1.08] tracking-tight [--d:100ms] sm:text-6xl">
                Build smarter.<br />
                Operate faster.<br />
                <span className="italic text-brand">Grow stronger.</span>
              </h1>
              <p className="lp-reveal mt-7 max-w-2xl text-lg leading-8 [--d:200ms]">
                TEKHAWK builds powerful, easy-to-use SaaS applications that simplify everyday operations, improve visibility, and help businesses make faster decisions.
              </p>
              <div className="lp-reveal mt-9 flex flex-wrap gap-4 [--d:300ms]">
                <a href="#products" className={`ui-btn ui-btn-add ${BTN_LG}`}>Explore Products</a>
                <a href="#demo" className={`ui-btn ${BTN_LG}`}>Book a Demo</a>
              </div>
              <div className="lp-reveal mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-ink-muted [--d:400ms]">
                <span>Restaurant POS</span><span>Retail SaaS</span><span>Cloud Ready</span><span>Built to Scale</span>
              </div>
            </div>

            {/* Monitor showing the demo video (edit the video at the top of this file) */}
            <div className="lp-reveal relative isolate flex items-center justify-center [--d:300ms]">
              {/* soft glow behind the monitor */}
              <div aria-hidden="true" className="absolute inset-x-6 top-4 -z-10 h-3/4 rounded-full bg-brand-300/40 blur-3xl"></div>

              <div className="w-full">
                {/* screen + bezel */}
                <div className="relative rounded-card bg-ink px-3 pb-6 pt-3 shadow-soft sm:px-4 sm:pt-4">
                  <div className="relative aspect-video overflow-hidden rounded-button-sm bg-brand-900">
                    {demoVideo.src ? (
                      <video
                        className="h-full w-full object-cover"
                        src={demoVideo.src}
                        poster={demoVideo.poster || undefined}
                        autoPlay
                        muted
                        loop
                        playsInline
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-900 via-brand-800 to-brand-600">
                        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface/90 text-brand-800 shadow-soft">
                          <svg aria-hidden="true" viewBox="0 0 24 24" className="ml-1 h-6 w-6 fill-current"><path d="M8 5v14l11-7z" /></svg>
                        </span>
                      </div>
                    )}
                    {/* glass reflection */}
                    <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-surface/10 via-transparent to-transparent"></div>
                  </div>
                  {/* power light */}
                  <span aria-hidden="true" className="absolute bottom-2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-brand-400"></span>
                </div>

                {/* stand: neck, base and floor shadow */}
                <div aria-hidden="true" className="mx-auto h-10 w-24 bg-gradient-to-b from-line-strong to-line [clip-path:polygon(14%_0,86%_0,100%_100%,0_100%)]"></div>
                <div aria-hidden="true" className="mx-auto h-2.5 w-48 rounded-full bg-gradient-to-b from-line-strong to-ink-muted/50 sm:w-60"></div>
                <div aria-hidden="true" className="mx-auto mt-1 h-3 w-52 rounded-full bg-ink/10 blur-md sm:w-64"></div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- PRODUCTS ---------- */}
        <section id="products" className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
          <div className="lp-reveal max-w-3xl">
            <p className={EYEBROW}>Products</p>
            <h2 className="mt-4 text-4xl tracking-tight sm:text-5xl">Focused products. Real operational value.</h2>
            <p className="mt-5 text-lg">Our first SaaS products are designed around two industries where speed, visibility, and operational control matter every day.</p>
          </div>

          <div className="mt-14 grid gap-6 lg:grid-cols-2">
            <article className="ui-card lp-reveal group p-8 transition hover:-translate-y-1">
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-panel bg-brand-light text-2xl transition duration-300 group-hover:-rotate-6 group-hover:scale-110">🍽️</div>
                <span className="ui-chip bg-state-vacant-bg text-state-vacant">Restaurant SaaS</span>
              </div>
              <h3 className="mt-8 text-3xl">TEKHAWK Restaurant POS</h3>
              <p className="mt-4 leading-7">A modern POS and restaurant operations platform for billing, orders, tables, menus, kitchen workflow, payments, reporting, and more.</p>
              <div className="mt-7 flex flex-wrap gap-2 text-sm">
                <span className="ui-pill border border-brand-line">POS Billing</span><span className="ui-pill border border-brand-line">Order Management</span><span className="ui-pill border border-brand-line">Kitchen Workflow</span><span className="ui-pill border border-brand-line">Reports</span>
              </div>
              <a href="#demo" className="mt-9 inline-flex font-semibold text-brand-dark transition group-hover:text-brand-darker">
                Request Restaurant Demo <span className="ml-1 inline-block transition-transform duration-300 group-hover:translate-x-1.5">→</span>
              </a>
            </article>

            <article className="ui-card lp-reveal group p-8 transition hover:-translate-y-1 [--d:150ms]">
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-panel bg-brand-light text-2xl transition duration-300 group-hover:-rotate-6 group-hover:scale-110">🛍️</div>
                <span className="ui-chip bg-state-reserved-bg text-state-reserved">Coming Next</span>
              </div>
              <h3 className="mt-8 text-3xl">TEKHAWK Retail</h3>
              <p className="mt-4 leading-7">A retail SaaS platform for billing, products, inventory, purchases, suppliers, customers, store controls, and business dashboards.</p>
              <div className="mt-7 flex flex-wrap gap-2 text-sm">
                <span className="ui-pill border border-brand-line">Retail POS</span><span className="ui-pill border border-brand-line">Inventory</span><span className="ui-pill border border-brand-line">Suppliers</span><span className="ui-pill border border-brand-line">Multi-store</span>
              </div>
              <a href="#contact" className="mt-9 inline-flex font-semibold text-brand-dark transition group-hover:text-brand-darker">
                Join Early Access <span className="ml-1 inline-block transition-transform duration-300 group-hover:translate-x-1.5">→</span>
              </a>
            </article>
          </div>
        </section>

        {/* ---------- DEMO BANNER ---------- */}
        <section id="demo" className="mx-auto max-w-7xl px-6 pb-24 lg:px-8">
          <div className="lp-reveal relative overflow-hidden rounded-modal-lg bg-brand-900 px-8 py-14 sm:px-12 lg:px-16">
            {/* soft drifting glow */}
            <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 h-80 w-80 animate-drift rounded-full bg-brand-500/30 blur-3xl motion-reduce:animate-none"></div>
            <div className="relative max-w-3xl">
              <p className="text-sm font-medium uppercase tracking-[.2em] text-brand-200">See TEKHAWK in action</p>
              <h2 className="mt-4 text-4xl tracking-tight text-white sm:text-5xl">Experience the software before you decide.</h2>
              <p className="mt-5 text-lg leading-8 text-brand-100">Request a guided demo and see how TEKHAWK can simplify your daily operations. Demo booking and product trials can be connected here next.</p>
              <a href="#contact" className={`ui-btn ${BTN_LG} mt-8`}>Request a Demo</a>
            </div>
          </div>
        </section>

        {/* ---------- SUPPORT ---------- */}
        <section id="support" className="border-y border-line bg-surface">
          <div className="mx-auto grid max-w-7xl gap-10 px-6 py-24 lg:grid-cols-2 lg:px-8">
            <div className="lp-reveal">
              <p className={EYEBROW}>Support</p>
              <h2 className="mt-4 text-4xl tracking-tight">We’re here when you need us.</h2>
              <p className="mt-5 max-w-xl leading-7">From onboarding and setup to product guidance and technical support, our goal is to help customers get lasting value from TEKHAWK products.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className={`${SOFT_CARD} lp-reveal p-5 font-semibold text-ink`}>Product Onboarding</div>
              <div className={`${SOFT_CARD} lp-reveal p-5 font-semibold text-ink [--d:100ms]`}>Setup Assistance</div>
              <div className={`${SOFT_CARD} lp-reveal p-5 font-semibold text-ink [--d:200ms]`}>Knowledge Base</div>
              <div className={`${SOFT_CARD} lp-reveal p-5 font-semibold text-ink [--d:300ms]`}>Technical Support</div>
            </div>
          </div>
        </section>

        {/* ---------- CONTACT ---------- */}
        <section id="contact" className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[.85fr_1.15fr]">
            <div className="lp-reveal">
              <p className={EYEBROW}>Contact</p>
              <h2 className="mt-4 text-4xl tracking-tight sm:text-5xl">Let’s build a smarter way to work.</h2>
              <p className="mt-5 leading-7">Choose the way that suits you best: send us an enquiry, write to us by email, or call our customer care team.</p>
            </div>

            <div className="lp-reveal [--d:150ms]">
              {/* tabs */}
              <div role="tablist" className="ui-tabs mb-4 min-h-0 w-full rounded-panel border border-line p-1 sm:inline-flex sm:w-auto">
                {contactTabs.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={tab === t.id}
                    onClick={() => setTab(t.id)}
                    className={`ui-tab flex-1 justify-center sm:flex-none ${tab === t.id ? 'ui-tab-active' : ''}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div key={tab} className="ui-card animate-fade-up p-6 motion-reduce:animate-none sm:p-8">
                {/* 1. ENQUIRY */}
                {tab === 'enquiry' && (
                  <form onSubmit={handleEnquiry}>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div><label className={LABEL}>Name</label><input name="name" className={INPUT} placeholder="Your name" /></div>
                      <div><label className={LABEL}>Business</label><input name="business" className={INPUT} placeholder="Company / Business" /></div>
                      <div><label className={LABEL}>Email</label><input name="email" type="email" className={INPUT} placeholder="you@example.com" /></div>
                      <div><label className={LABEL}>Enquiry</label>
                        <select name="enquiry" className={INPUT}>
                          <option>Request a Demo</option><option>Restaurant POS</option><option>Retail SaaS</option><option>Partnership</option><option>Support</option><option>General Enquiry</option>
                        </select>
                      </div>
                    </div>
                    <div className="mt-5"><label className={LABEL}>Message</label><textarea name="message" rows="5" className={TEXTAREA} placeholder="Tell us what you are looking for..."></textarea></div>
                    <button className="ui-btn ui-btn-add mt-5 h-11 px-6">Send Enquiry</button>
                  </form>
                )}

                {/* 2. EMAIL */}
                {tab === 'email' && (
                  <form onSubmit={handleEmail}>
                    <p className="mb-5 text-sm">
                      Write to us at{' '}
                      <a className="font-semibold text-brand-dark hover:text-brand-darker" href={`mailto:${contactInfo.email}`}>{contactInfo.email}</a>
                      , or fill in the details below and your email app will open with the message ready to send.
                    </p>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div><label className={LABEL}>Name</label><input name="name" required className={INPUT} placeholder="Your name" /></div>
                      <div><label className={LABEL}>Your email</label><input name="email" type="email" required className={INPUT} placeholder="you@example.com" /></div>
                    </div>
                    <div className="mt-5"><label className={LABEL}>Subject</label><input name="subject" className={INPUT} placeholder="How can we help?" /></div>
                    <div className="mt-5"><label className={LABEL}>Message</label><textarea name="message" rows="4" required className={TEXTAREA} placeholder="Write your message..."></textarea></div>
                    <button className="ui-btn ui-btn-add mt-5 h-11 px-6">Send Email</button>
                  </form>
                )}

                {/* 3. PHONE */}
                {tab === 'phone' && (
                  <div>
                    <p className={EYEBROW}>Customer care</p>
                    <a href={`tel:${contactInfo.phoneLink}`} className="mt-3 block font-serif text-4xl font-semibold text-ink transition hover:text-brand-dark">
                      {contactInfo.phone}
                    </a>
                    <p className="mt-3">{contactInfo.hours}</p>
                    <p className="mt-6 text-sm">Speak to our team about demos, setup, or technical help. Tap the button on a phone to call directly.</p>
                    <a href={`tel:${contactInfo.phoneLink}`} className={`ui-btn ui-btn-add ${BTN_LG} mt-6`}>Call now</a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ---------- WHY US ---------- */}
        <section id="why" className="border-y border-line bg-surface">
          <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-[.85fr_1.15fr]">
              <div className="lp-reveal">
                <p className={EYEBROW}>Why TEKHAWK</p>
                <h2 className="mt-4 text-4xl tracking-tight">Sharp focus.<br />Practical technology.</h2>
                <p className="mt-5 max-w-lg leading-7">Like a hawk, strong businesses need clarity, speed, awareness, and precision. Those qualities shape how we think about our software.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className={`${SOFT_CARD} lp-reveal p-6`}><h3 className="text-lg">Clear Visibility</h3><p className="mt-2 text-sm leading-6">Useful dashboards and reporting for better business awareness.</p></div>
                <div className={`${SOFT_CARD} lp-reveal p-6 [--d:100ms]`}><h3 className="text-lg">Faster Operations</h3><p className="mt-2 text-sm leading-6">Reduce repetitive steps and streamline day-to-day workflows.</p></div>
                <div className={`${SOFT_CARD} lp-reveal p-6 [--d:200ms]`}><h3 className="text-lg">Simple Experience</h3><p className="mt-2 text-sm leading-6">Clean interfaces designed for quick adoption by real teams.</p></div>
                <div className={`${SOFT_CARD} lp-reveal p-6 [--d:300ms]`}><h3 className="text-lg">Built to Scale</h3><p className="mt-2 text-sm leading-6">A SaaS foundation designed to grow with your business.</p></div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- ABOUT US ---------- */}
        <section id="about" className="mx-auto grid max-w-7xl gap-12 px-6 pb-14 pt-24 lg:grid-cols-2 lg:px-8">
          <div className="lp-reveal">
            <p className={EYEBROW}>About TEKHAWK</p>
            <h2 className="mt-4 text-4xl tracking-tight sm:text-5xl">Software built around the way businesses actually work.</h2>
          </div>
          <div className="lp-reveal space-y-6 text-lg leading-8 [--d:150ms]">
            <p>TEKHAWK Software Solutions develops modern SaaS applications for growing businesses. We focus on solutions that reduce effort, improve control, and make important business information easier to understand.</p>
            <p>Our approach combines practical business thinking with thoughtful product design, reliable technology, and continuous improvement.</p>
          </div>
        </section>

        {/* ---------- VISION & MISSION (part of About Us) ---------- */}
        <section className="mx-auto max-w-7xl px-6 pb-24 lg:px-8">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="ui-card lp-reveal p-8">
              <div className={EYEBROW}>Vision</div>
              <p className="mt-5 font-serif text-2xl leading-relaxed text-ink">To become a trusted SaaS technology partner by creating intelligent, reliable, and easy-to-use software that improves the way businesses operate and grow.</p>
            </div>
            <div className="ui-card lp-reveal p-8 [--d:150ms]">
              <div className={EYEBROW}>Mission</div>
              <p className="mt-5 font-serif text-2xl leading-relaxed text-ink">To simplify operations, improve productivity, provide better visibility, and enable confident business decisions through practical SaaS products.</p>
            </div>
          </div>
        </section>
      </main>

      {/* ---------- FOOTER ---------- */}
      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <img src={logo} alt="TEKHAWK Software Solutions" width="900" height="450" className="lp-logo" />
            <div className="mt-2 text-sm text-ink-muted">Smarter Software. Sharper Business.</div>
          </div>
          <div className="flex flex-wrap gap-5 text-sm text-ink-muted">
            <a className="hover:text-ink" href="#products">Products</a>
            <a className="hover:text-ink" href="#demo">Demo</a>
            <a className="hover:text-ink" href="#support">Support</a>
            <a className="hover:text-ink" href="#contact">Contact</a>
            <a className="hover:text-ink" href="#why">Why Us</a>
            <a className="hover:text-ink" href="#about">About Us</a>
            <a className="hover:text-ink" href="#">Privacy</a>
            <a className="hover:text-ink" href="#">Terms</a>
          </div>
          <div className="text-sm text-ink-muted">© 2026 TEKHAWK Software Solutions.</div>
        </div>
      </footer>

      {/* ---------- CLIENT ID POPUP (Login) ---------- */}
      <ClientIdModal open={showClientModal} onClose={() => setShowClientModal(false)} />
    </div>
  )
}