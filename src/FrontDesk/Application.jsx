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
const demoVideos = [
  { src: '/Demo.webm', poster: '' },
  { src: '/placeorder.webm', poster: '' },
]

const contactTabs = [
  { id: 'enquiry', label: 'Enquiry' },
  { id: 'email', label: 'Email us' },
  { id: 'phone', label: 'Call us' },
]

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

          <nav className="hidden items-center gap-8 text-sm font-bold text-copy md:flex">
            <a className="lp-nav-link" href="#products">Products</a>
            <a className="lp-nav-link" href="#support">Support</a>
            <a className="lp-nav-link" href="#contact">Contact</a>
            <a className="lp-nav-link" href="#why">Why Us</a>
            <a className="lp-nav-link" href="#about">About Us</a>
          </nav>

          <div className="flex items-center gap-3">
            {/* Login opens the Client ID popup */}
            <button type="button" onClick={() => setShowClientModal(true)} className="lp-btn-secondary px-4 py-2 text-sm">
              Login
            </button>
            <div className="relative hidden sm:block">
              <a href="#demo" className="lp-btn-primary animate-press px-4 py-2 text-sm motion-reduce:animate-none">Request Demo</a>
              {/* click ripple */}
              <span aria-hidden="true" className="pointer-events-none absolute inset-0 animate-ripple rounded-btn border-2 border-brand-400 motion-reduce:hidden"></span>
              {/* animated cursor */}
              <svg aria-hidden="true" viewBox="0 0 24 24" className="pointer-events-none absolute left-1/2 top-1/2 z-10 h-6 w-6 animate-cursor drop-shadow motion-reduce:hidden">
                <path d="M5 3l14 7-6 2-2 6z" className="fill-ink stroke-surface" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>
        {/* scroll progress line */}
        <div aria-hidden="true" className="absolute bottom-0 left-0 h-0.5 bg-brand-600" style={{ width: `${progress}%` }}></div>
      </header>

      <main>
        {/* ---------- HERO ---------- */}
        <section id="home" className="relative overflow-hidden bg-gradient-to-b from-brand-50 to-page pt-32">
          {/* soft drifting glow */}
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 top-24 h-96 w-96 animate-drift rounded-full bg-brand-200/60 blur-3xl motion-reduce:animate-none"></div>

          <div className="relative mx-auto grid max-w-7xl gap-14 px-6 py-12 lg:grid-cols-[1.08fr_.92fr] lg:px-8 lg:py-8">
            <div className="flex flex-col justify-center">
              <h1 className="lp-reveal max-w-4xl text-5xl leading-[1.08] tracking-tight [--d:100ms] sm:text-6xl">
                Build smarter.<br />
                Operate faster.<br />
                <span className="italic text-brand-600">Grow stronger.</span>
              </h1>
              <p className="lp-reveal mt-7 max-w-2xl text-lg leading-8 [--d:200ms]">
                TEKHAWK builds powerful, easy-to-use SaaS applications that simplify everyday operations, improve visibility, and help businesses make faster decisions.
              </p>
              <div className="lp-reveal mt-9 flex flex-wrap gap-4 [--d:300ms]">
                <a href="#products" className="lp-btn-primary">Explore Products</a>
                <a href="#demo" className="lp-btn-secondary">Book a Demo</a>
              </div>
              <div className="lp-reveal mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-muted [--d:400ms]">
                <span>Restaurant POS</span><span>Retail SaaS</span><span>Cloud Ready</span><span>Built to Scale</span>
              </div>
            </div>

            {/* Two overlapping demo videos (edit the list at the top of this file) */}
            <div className="relative flex items-center justify-center">
              <div className="relative aspect-[7/5] w-full max-w-xl">
                {demoVideos.map((video, i) => (
                  <div
                    key={i}
                    className={`lp-reveal absolute w-[72%] ${i === 0 ? 'left-0 top-0 z-10 [--d:300ms]' : 'bottom-0 right-0 z-20 [--d:450ms]'}`}
                  >
                    <div className="group aspect-video overflow-hidden rounded-card-lg border-4 border-surface bg-brand-900 shadow-soft transition duration-300 hover:-translate-y-1">
                      {video.src ? (
                        <video
                          className="h-full w-full object-cover"
                          src={video.src}
                          poster={video.poster || undefined}
                          autoPlay
                          muted
                          loop
                          playsInline
                        />
                      ) : (
                        <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${i === 0 ? 'from-brand-900 via-brand-800 to-brand-600' : 'from-brand-700 via-brand-600 to-brand-400'}`}>
                          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface/90 text-brand-800 shadow-soft transition duration-300 group-hover:scale-110">
                            <svg aria-hidden="true" viewBox="0 0 24 24" className="ml-1 h-6 w-6 fill-current"><path d="M8 5v14l11-7z" /></svg>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ---------- PRODUCTS ---------- */}
        <section id="products" className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
          <div className="lp-reveal max-w-3xl">
            <p className="lp-eyebrow">Products</p>
            <h2 className="mt-4 text-4xl tracking-tight sm:text-5xl">Focused products. Real operational value.</h2>
            <p className="mt-5 text-lg">Our first SaaS products are designed around two industries where speed, visibility, and operational control matter every day.</p>
          </div>

          <div className="mt-14 grid gap-6 lg:grid-cols-2">
            <article className="lp-card lp-reveal group p-8 transition hover:-translate-y-1 hover:shadow-soft">
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-card-lg bg-brand-50 text-2xl transition duration-300 group-hover:-rotate-6 group-hover:scale-110">🍽️</div>
                <span className="lp-badge-success">Restaurant SaaS</span>
              </div>
              <h3 className="mt-8 text-3xl">TEKHAWK Restaurant POS</h3>
              <p className="mt-4 leading-7">A modern POS and restaurant operations platform for billing, orders, tables, menus, kitchen workflow, payments, reporting, and more.</p>
              <div className="mt-7 flex flex-wrap gap-2 text-sm">
                <span className="lp-chip">POS Billing</span><span className="lp-chip">Order Management</span><span className="lp-chip">Kitchen Workflow</span><span className="lp-chip">Reports</span>
              </div>
              <a href="#demo" className="mt-9 inline-flex font-medium text-brand-700 transition group-hover:text-brand-900">
                Request Restaurant Demo <span className="ml-1 inline-block transition-transform duration-300 group-hover:translate-x-1.5">→</span>
              </a>
            </article>

            <article className="lp-card lp-reveal group p-8 transition hover:-translate-y-1 hover:shadow-soft [--d:150ms]">
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-card-lg bg-brand-50 text-2xl transition duration-300 group-hover:-rotate-6 group-hover:scale-110">🛍️</div>
                <span className="lp-badge-warning">Coming Next</span>
              </div>
              <h3 className="mt-8 text-3xl">TEKHAWK Retail</h3>
              <p className="mt-4 leading-7">A retail SaaS platform for billing, products, inventory, purchases, suppliers, customers, store controls, and business dashboards.</p>
              <div className="mt-7 flex flex-wrap gap-2 text-sm">
                <span className="lp-chip">Retail POS</span><span className="lp-chip">Inventory</span><span className="lp-chip">Suppliers</span><span className="lp-chip">Multi-store</span>
              </div>
              <a href="#contact" className="mt-9 inline-flex font-medium text-brand-700 transition group-hover:text-brand-900">
                Join Early Access <span className="ml-1 inline-block transition-transform duration-300 group-hover:translate-x-1.5">→</span>
              </a>
            </article>
          </div>
        </section>

        {/* ---------- DEMO BANNER ---------- */}
        <section id="demo" className="mx-auto max-w-7xl px-6 pb-24 lg:px-8">
          <div className="lp-reveal relative overflow-hidden rounded-panel bg-brand-900 px-8 py-14 sm:px-12 lg:px-16">
            {/* soft drifting glow */}
            <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 h-80 w-80 animate-drift rounded-full bg-brand-500/30 blur-3xl motion-reduce:animate-none"></div>
            <div className="relative max-w-3xl">
              <p className="text-sm font-medium uppercase tracking-[.2em] text-brand-200">See TEKHAWK in action</p>
              <h2 className="mt-4 text-4xl tracking-tight text-white sm:text-5xl">Experience the software before you decide.</h2>
              <p className="mt-5 text-lg leading-8 text-brand-100">Request a guided demo and see how TEKHAWK can simplify your daily operations. Demo booking and product trials can be connected here next.</p>
              <a href="#contact" className="lp-btn-light mt-8">Request a Demo</a>
            </div>
          </div>
        </section>

        {/* ---------- SUPPORT ---------- */}
        <section id="support" className="lp-section-alt">
          <div className="mx-auto grid max-w-7xl gap-10 px-6 py-24 lg:grid-cols-2 lg:px-8">
            <div className="lp-reveal">
              <p className="lp-eyebrow">Support</p>
              <h2 className="mt-4 text-4xl tracking-tight">We’re here when you need us.</h2>
              <p className="mt-5 max-w-xl leading-7">From onboarding and setup to product guidance and technical support, our goal is to help customers get lasting value from TEKHAWK products.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="lp-card-soft lp-reveal p-5 text-ink">Product Onboarding</div>
              <div className="lp-card-soft lp-reveal p-5 text-ink [--d:100ms]">Setup Assistance</div>
              <div className="lp-card-soft lp-reveal p-5 text-ink [--d:200ms]">Knowledge Base</div>
              <div className="lp-card-soft lp-reveal p-5 text-ink [--d:300ms]">Technical Support</div>
            </div>
          </div>
        </section>

        {/* ---------- CONTACT ---------- */}
        <section id="contact" className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[.85fr_1.15fr]">
            <div className="lp-reveal">
              <p className="lp-eyebrow">Contact</p>
              <h2 className="mt-4 text-4xl tracking-tight sm:text-5xl">Let’s build a smarter way to work.</h2>
              <p className="mt-5 leading-7">Choose the way that suits you best: send us an enquiry, write to us by email, or call our customer care team.</p>
            </div>

            <div className="lp-reveal [--d:150ms]">
              {/* tabs */}
              <div role="tablist" className="mb-4 flex w-full gap-1 rounded-btn border border-line bg-surface p-1 sm:inline-flex sm:w-auto">
                {contactTabs.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={tab === t.id}
                    onClick={() => setTab(t.id)}
                    className={`lp-tab flex-1 sm:flex-none ${tab === t.id ? 'lp-tab-active' : ''}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div key={tab} className="lp-card animate-fade-up p-6 shadow-soft motion-reduce:animate-none sm:p-8">
                {/* 1. ENQUIRY */}
                {tab === 'enquiry' && (
                  <form onSubmit={handleEnquiry}>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div><label className="lp-label">Name</label><input name="name" className="lp-input" placeholder="Your name" /></div>
                      <div><label className="lp-label">Business</label><input name="business" className="lp-input" placeholder="Company / Business" /></div>
                      <div><label className="lp-label">Email</label><input name="email" type="email" className="lp-input" placeholder="you@example.com" /></div>
                      <div><label className="lp-label">Enquiry</label>
                        <select name="enquiry" className="lp-input">
                          <option>Request a Demo</option><option>Restaurant POS</option><option>Retail SaaS</option><option>Partnership</option><option>Support</option><option>General Enquiry</option>
                        </select>
                      </div>
                    </div>
                    <div className="mt-5"><label className="lp-label">Message</label><textarea name="message" rows="5" className="lp-input" placeholder="Tell us what you are looking for..."></textarea></div>
                    <button className="lp-btn-primary mt-5 !py-3">Send Enquiry</button>
                  </form>
                )}

                {/* 2. EMAIL */}
                {tab === 'email' && (
                  <form onSubmit={handleEmail}>
                    <p className="mb-5 text-sm">
                      Write to us at{' '}
                      <a className="font-medium text-brand-700 hover:text-brand-900" href={`mailto:${contactInfo.email}`}>{contactInfo.email}</a>
                      , or fill in the details below and your email app will open with the message ready to send.
                    </p>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div><label className="lp-label">Name</label><input name="name" required className="lp-input" placeholder="Your name" /></div>
                      <div><label className="lp-label">Your email</label><input name="email" type="email" required className="lp-input" placeholder="you@example.com" /></div>
                    </div>
                    <div className="mt-5"><label className="lp-label">Subject</label><input name="subject" className="lp-input" placeholder="How can we help?" /></div>
                    <div className="mt-5"><label className="lp-label">Message</label><textarea name="message" rows="4" required className="lp-input" placeholder="Write your message..."></textarea></div>
                    <button className="lp-btn-primary mt-5 !py-3">Send Email</button>
                  </form>
                )}

                {/* 3. PHONE */}
                {tab === 'phone' && (
                  <div>
                    <p className="lp-eyebrow">Customer care</p>
                    <a href={`tel:${contactInfo.phoneLink}`} className="mt-3 block font-serif text-4xl font-semibold text-ink transition hover:text-brand-700">
                      {contactInfo.phone}
                    </a>
                    <p className="mt-3">{contactInfo.hours}</p>
                    <p className="mt-6 text-sm">Speak to our team about demos, setup, or technical help. Tap the button on a phone to call directly.</p>
                    <a href={`tel:${contactInfo.phoneLink}`} className="lp-btn-primary mt-6">Call now</a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ---------- WHY US ---------- */}
        <section id="why" className="lp-section-alt">
          <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-[.85fr_1.15fr]">
              <div className="lp-reveal">
                <p className="lp-eyebrow">Why TEKHAWK</p>
                <h2 className="mt-4 text-4xl tracking-tight">Sharp focus.<br />Practical technology.</h2>
                <p className="mt-5 max-w-lg leading-7">Like a hawk, strong businesses need clarity, speed, awareness, and precision. Those qualities shape how we think about our software.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="lp-card-soft lp-reveal p-6"><h3 className="text-lg">Clear Visibility</h3><p className="mt-2 text-sm leading-6">Useful dashboards and reporting for better business awareness.</p></div>
                <div className="lp-card-soft lp-reveal p-6 [--d:100ms]"><h3 className="text-lg">Faster Operations</h3><p className="mt-2 text-sm leading-6">Reduce repetitive steps and streamline day-to-day workflows.</p></div>
                <div className="lp-card-soft lp-reveal p-6 [--d:200ms]"><h3 className="text-lg">Simple Experience</h3><p className="mt-2 text-sm leading-6">Clean interfaces designed for quick adoption by real teams.</p></div>
                <div className="lp-card-soft lp-reveal p-6 [--d:300ms]"><h3 className="text-lg">Built to Scale</h3><p className="mt-2 text-sm leading-6">A SaaS foundation designed to grow with your business.</p></div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- ABOUT US ---------- */}
        <section id="about" className="mx-auto grid max-w-7xl gap-12 px-6 pb-14 pt-24 lg:grid-cols-2 lg:px-8">
          <div className="lp-reveal">
            <p className="lp-eyebrow">About TEKHAWK</p>
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
            <div className="lp-card lp-reveal p-8">
              <div className="lp-eyebrow">Vision</div>
              <p className="mt-5 font-serif text-2xl leading-relaxed text-ink">To become a trusted SaaS technology partner by creating intelligent, reliable, and easy-to-use software that improves the way businesses operate and grow.</p>
            </div>
            <div className="lp-card lp-reveal p-8 [--d:150ms]">
              <div className="lp-eyebrow">Mission</div>
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
            <div className="mt-2 text-sm text-muted">Smarter Software. Sharper Business.</div>
          </div>
          <div className="flex flex-wrap gap-5 text-sm text-muted">
            <a className="hover:text-ink" href="#products">Products</a>
            <a className="hover:text-ink" href="#demo">Demo</a>
            <a className="hover:text-ink" href="#support">Support</a>
            <a className="hover:text-ink" href="#contact">Contact</a>
            <a className="hover:text-ink" href="#why">Why Us</a>
            <a className="hover:text-ink" href="#about">About Us</a>
            <a className="hover:text-ink" href="#">Privacy</a>
            <a className="hover:text-ink" href="#">Terms</a>
          </div>
          <div className="text-sm text-muted">© 2026 TEKHAWK Software Solutions.</div>
        </div>
      </footer>

      {/* ---------- CLIENT ID POPUP (Login) ---------- */}
      <ClientIdModal open={showClientModal} onClose={() => setShowClientModal(false)} />
    </div>
  )
}