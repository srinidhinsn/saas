import { useState } from 'react'
import ClientIdModal from './ClientIdModal'

export default function LandingPage() {
  const [showClientModal, setShowClientModal] = useState(false)

  return (
    <div>
      {/* ---------- HEADER ---------- */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-stone-200 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <a href="#home" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-hawk-800 font-serif text-lg font-semibold text-white">T</div>
            <div>
              <div className="text-lg font-semibold tracking-[0.16em] text-stone-900">TEKHAWK</div>
              <div className="text-[10px] uppercase tracking-[0.28em] text-stone-500">Software Solutions</div>
            </div>
          </a>

          <nav className="hidden items-center gap-8 text-sm text-stone-600 md:flex">
            <a className="transition hover:text-stone-900" href="#about">About</a>
            <a className="transition hover:text-stone-900" href="#products">Products</a>
            <a className="transition hover:text-stone-900" href="#why">Why TEKHAWK</a>
            <a className="transition hover:text-stone-900" href="#support">Support</a>
            <a className="transition hover:text-stone-900" href="#contact">Contact</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowClientModal(true)}
              className="hidden rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100 sm:inline-flex"
            >
              Login
            </button>
            <a href="#demo" className="rounded-lg bg-hawk-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-hawk-700">Request Demo</a>
          </div>
        </div>
      </header>

      <main>
        {/* ---------- HERO ---------- */}
        <section id="home" className="bg-gradient-to-b from-hawk-50 to-stone-50 pt-32">
          <div className="mx-auto grid max-w-7xl gap-14 px-6 py-24 lg:grid-cols-[1.08fr_.92fr] lg:px-8 lg:py-28">
            <div className="flex flex-col justify-center">
              <div className="mb-6 inline-flex w-fit items-center rounded-full border border-hawk-200 bg-white px-4 py-1.5 text-xs font-medium uppercase tracking-[.18em] text-hawk-700">
                Practical SaaS for modern businesses
              </div>
              <h1 className="max-w-4xl text-5xl leading-[1.08] tracking-tight sm:text-6xl">
                Build smarter.<br />
                Operate faster.<br />
                <span className="italic text-hawk-600">Grow stronger.</span>
              </h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-stone-600">
                TEKHAWK builds powerful, easy-to-use SaaS applications that simplify everyday operations, improve visibility, and help businesses make faster decisions.
              </p>
              <div className="mt-9 flex flex-wrap gap-4">
                <a href="#products" className="rounded-lg bg-hawk-800 px-6 py-3.5 font-medium text-white transition hover:bg-hawk-700">Explore Products</a>
                <a href="#demo" className="rounded-lg border border-stone-300 bg-white px-6 py-3.5 font-medium text-stone-800 transition hover:bg-stone-100">Book a Demo</a>
              </div>
              <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-stone-500">
                <span>Restaurant POS</span><span>Retail SaaS</span><span>Cloud Ready</span><span>Built to Scale</span>
              </div>
            </div>

            <div className="relative flex items-center justify-center">
              <div className="w-full max-w-xl rounded-3xl border border-stone-200 bg-white p-5 shadow-soft">
                <div className="rounded-2xl bg-stone-50 p-6">
                  <div className="mb-7 flex items-center justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-[.2em] text-stone-500">TEKHAWK</div>
                      <div className="mt-1 font-serif text-xl font-semibold text-stone-900">Business Overview</div>
                    </div>
                    <div className="rounded-full bg-hawk-100 px-3 py-1.5 text-xs font-medium text-hawk-700">Live Operations</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-xl border border-stone-200 bg-white p-5">
                      <div className="text-xs text-stone-500">Today’s Sales</div>
                      <div className="mt-2 text-2xl font-semibold text-stone-900">₹84,260</div>
                      <div className="mt-2 text-xs text-emerald-600">↑ 12.4% today</div>
                    </div>
                    <div className="rounded-xl border border-stone-200 bg-white p-5">
                      <div className="text-xs text-stone-500">Orders</div>
                      <div className="mt-2 text-2xl font-semibold text-stone-900">326</div>
                      <div className="mt-2 text-xs text-stone-500">Across active counters</div>
                    </div>
                    <div className="col-span-2 rounded-xl border border-stone-200 bg-white p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs text-stone-500">Business Visibility</div>
                          <div className="mt-1 font-medium text-stone-900">Everything important. One clear view.</div>
                        </div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-hawk-50 text-2xl text-hawk-600">⌁</div>
                      </div>
                      <div className="mt-5 h-2 overflow-hidden rounded-full bg-stone-200">
                        <div className="h-full w-[78%] rounded-full bg-hawk-600"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- ABOUT ---------- */}
        <section id="about" className="border-y border-stone-200 bg-white">
          <div className="mx-auto grid max-w-7xl gap-12 px-6 py-24 lg:grid-cols-2 lg:px-8">
            <div>
              <p className="text-sm font-medium uppercase tracking-[.2em] text-hawk-600">About TEKHAWK</p>
              <h2 className="mt-4 text-4xl tracking-tight sm:text-5xl">Software built around the way businesses actually work.</h2>
            </div>
            <div className="space-y-6 text-lg leading-8 text-stone-600">
              <p>TEKHAWK Software Solutions develops modern SaaS applications for growing businesses. We focus on solutions that reduce effort, improve control, and make important business information easier to understand.</p>
              <p>Our approach combines practical business thinking with thoughtful product design, reliable technology, and continuous improvement.</p>
            </div>
          </div>
        </section>

        {/* ---------- PRODUCTS ---------- */}
        <section id="products" className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-medium uppercase tracking-[.2em] text-hawk-600">Products</p>
            <h2 className="mt-4 text-4xl tracking-tight sm:text-5xl">Focused products. Real operational value.</h2>
            <p className="mt-5 text-lg text-stone-600">Our first SaaS products are designed around two industries where speed, visibility, and operational control matter every day.</p>
          </div>

          <div className="mt-14 grid gap-6 lg:grid-cols-2">
            <article className="group rounded-2xl border border-stone-200 bg-white p-8 transition hover:-translate-y-1 hover:shadow-soft">
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-hawk-50 text-2xl">🍽️</div>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">Restaurant SaaS</span>
              </div>
              <h3 className="mt-8 text-3xl">TEKHAWK Restaurant POS</h3>
              <p className="mt-4 leading-7 text-stone-600">A modern POS and restaurant operations platform for billing, orders, tables, menus, kitchen workflow, payments, reporting, and more.</p>
              <div className="mt-7 flex flex-wrap gap-2 text-sm text-stone-700">
                <span className="rounded-md bg-stone-100 px-3 py-2">POS Billing</span><span className="rounded-md bg-stone-100 px-3 py-2">Order Management</span><span className="rounded-md bg-stone-100 px-3 py-2">Kitchen Workflow</span><span className="rounded-md bg-stone-100 px-3 py-2">Reports</span>
              </div>
              <a href="#demo" className="mt-9 inline-flex font-medium text-hawk-700 transition group-hover:text-hawk-900">Request Restaurant Demo →</a>
            </article>

            <article className="group rounded-2xl border border-stone-200 bg-white p-8 transition hover:-translate-y-1 hover:shadow-soft">
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-hawk-50 text-2xl">🛍️</div>
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">Coming Next</span>
              </div>
              <h3 className="mt-8 text-3xl">TEKHAWK Retail</h3>
              <p className="mt-4 leading-7 text-stone-600">A retail SaaS platform for billing, products, inventory, purchases, suppliers, customers, store controls, and business dashboards.</p>
              <div className="mt-7 flex flex-wrap gap-2 text-sm text-stone-700">
                <span className="rounded-md bg-stone-100 px-3 py-2">Retail POS</span><span className="rounded-md bg-stone-100 px-3 py-2">Inventory</span><span className="rounded-md bg-stone-100 px-3 py-2">Suppliers</span><span className="rounded-md bg-stone-100 px-3 py-2">Multi-store</span>
              </div>
              <a href="#contact" className="mt-9 inline-flex font-medium text-hawk-700 transition group-hover:text-hawk-900">Join Early Access →</a>
            </article>
          </div>
        </section>

        {/* ---------- WHY TEKHAWK ---------- */}
        <section id="why" className="border-y border-stone-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-[.85fr_1.15fr]">
              <div>
                <p className="text-sm font-medium uppercase tracking-[.2em] text-hawk-600">Why TEKHAWK</p>
                <h2 className="mt-4 text-4xl tracking-tight">Sharp focus.<br />Practical technology.</h2>
                <p className="mt-5 max-w-lg leading-7 text-stone-600">Like a hawk, strong businesses need clarity, speed, awareness, and precision. Those qualities shape how we think about our software.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-stone-200 bg-stone-50 p-6"><h3 className="text-lg">Clear Visibility</h3><p className="mt-2 text-sm leading-6 text-stone-600">Useful dashboards and reporting for better business awareness.</p></div>
                <div className="rounded-xl border border-stone-200 bg-stone-50 p-6"><h3 className="text-lg">Faster Operations</h3><p className="mt-2 text-sm leading-6 text-stone-600">Reduce repetitive steps and streamline day-to-day workflows.</p></div>
                <div className="rounded-xl border border-stone-200 bg-stone-50 p-6"><h3 className="text-lg">Simple Experience</h3><p className="mt-2 text-sm leading-6 text-stone-600">Clean interfaces designed for quick adoption by real teams.</p></div>
                <div className="rounded-xl border border-stone-200 bg-stone-50 p-6"><h3 className="text-lg">Built to Scale</h3><p className="mt-2 text-sm leading-6 text-stone-600">A SaaS foundation designed to grow with your business.</p></div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- VISION & MISSION ---------- */}
        <section className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-stone-200 bg-white p-8">
              <div className="text-sm font-medium uppercase tracking-[.2em] text-hawk-600">Vision</div>
              <p className="mt-5 font-serif text-2xl leading-relaxed text-stone-800">To become a trusted SaaS technology partner by creating intelligent, reliable, and easy-to-use software that improves the way businesses operate and grow.</p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white p-8">
              <div className="text-sm font-medium uppercase tracking-[.2em] text-hawk-600">Mission</div>
              <p className="mt-5 font-serif text-2xl leading-relaxed text-stone-800">To simplify operations, improve productivity, provide better visibility, and enable confident business decisions through practical SaaS products.</p>
            </div>
          </div>
        </section>

        {/* ---------- DEMO ---------- */}
        <section id="demo" className="mx-auto max-w-7xl px-6 pb-24 lg:px-8">
          <div className="rounded-3xl bg-hawk-900 px-8 py-14 sm:px-12 lg:px-16">
            <div className="max-w-3xl">
              <p className="text-sm font-medium uppercase tracking-[.2em] text-hawk-200">See TEKHAWK in action</p>
              <h2 className="mt-4 text-4xl tracking-tight text-white sm:text-5xl">Experience the software before you decide.</h2>
              <p className="mt-5 text-lg leading-8 text-hawk-100">Request a guided demo and see how TEKHAWK can simplify your daily operations. Demo booking and product trials can be connected here next.</p>
              <a href="#contact" className="mt-8 inline-flex rounded-lg bg-white px-6 py-3.5 font-medium text-hawk-900 transition hover:bg-hawk-50">Request a Demo</a>
            </div>
          </div>
        </section>

        {/* ---------- SUPPORT ---------- */}
        <section id="support" className="border-y border-stone-200 bg-white">
          <div className="mx-auto grid max-w-7xl gap-10 px-6 py-24 lg:grid-cols-2 lg:px-8">
            <div>
              <p className="text-sm font-medium uppercase tracking-[.2em] text-hawk-600">Support</p>
              <h2 className="mt-4 text-4xl tracking-tight">We’re here when you need us.</h2>
              <p className="mt-5 max-w-xl leading-7 text-stone-600">From onboarding and setup to product guidance and technical support, our goal is to help customers get lasting value from TEKHAWK products.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-5 text-stone-800">Product Onboarding</div>
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-5 text-stone-800">Setup Assistance</div>
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-5 text-stone-800">Knowledge Base</div>
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-5 text-stone-800">Technical Support</div>
            </div>
          </div>
        </section>

        {/* ---------- CONTACT ---------- */}
        <section id="contact" className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[.85fr_1.15fr]">
            <div>
              <p className="text-sm font-medium uppercase tracking-[.2em] text-hawk-600">Contact</p>
              <h2 className="mt-4 text-4xl tracking-tight sm:text-5xl">Let’s build a smarter way to work.</h2>
              <p className="mt-5 leading-7 text-stone-600">Use this section for demo requests, product enquiries, partnerships, support, and general enquiries. We can connect the form to your backend or email workflow later.</p>
            </div>
            <form
              className="rounded-2xl border border-stone-200 bg-white p-6 shadow-soft sm:p-8"
              onSubmit={(e) => {
                e.preventDefault()
                alert('Form UI ready. Backend connection will be added later.')
              }}
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <div><label className="text-sm font-medium text-stone-700">Name</label><input className="mt-2 w-full rounded-lg border border-stone-300 bg-white px-4 py-3 outline-none focus:border-hawk-600 focus:ring-1 focus:ring-hawk-600" placeholder="Your name" /></div>
                <div><label className="text-sm font-medium text-stone-700">Business</label><input className="mt-2 w-full rounded-lg border border-stone-300 bg-white px-4 py-3 outline-none focus:border-hawk-600 focus:ring-1 focus:ring-hawk-600" placeholder="Company / Business" /></div>
                <div><label className="text-sm font-medium text-stone-700">Email</label><input type="email" className="mt-2 w-full rounded-lg border border-stone-300 bg-white px-4 py-3 outline-none focus:border-hawk-600 focus:ring-1 focus:ring-hawk-600" placeholder="you@example.com" /></div>
                <div><label className="text-sm font-medium text-stone-700">Enquiry</label>
                  <select className="mt-2 w-full rounded-lg border border-stone-300 bg-white px-4 py-3 outline-none focus:border-hawk-600 focus:ring-1 focus:ring-hawk-600">
                    <option>Request a Demo</option><option>Restaurant POS</option><option>Retail SaaS</option><option>Partnership</option><option>Support</option><option>General Enquiry</option>
                  </select>
                </div>
              </div>
              <div className="mt-5"><label className="text-sm font-medium text-stone-700">Message</label><textarea rows="5" className="mt-2 w-full rounded-lg border border-stone-300 bg-white px-4 py-3 outline-none focus:border-hawk-600 focus:ring-1 focus:ring-hawk-600" placeholder="Tell us what you are looking for..."></textarea></div>
              <button className="mt-5 rounded-lg bg-hawk-800 px-6 py-3 font-medium text-white transition hover:bg-hawk-700">Send Enquiry</button>
            </form>
          </div>
        </section>
      </main>

      {/* ---------- FOOTER ---------- */}
      <footer className="border-t border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <div className="text-xl font-semibold tracking-[.16em] text-stone-900">TEKHAWK</div>
            <div className="mt-2 text-sm text-stone-500">Smarter Software. Sharper Business.</div>
          </div>
          <div className="flex flex-wrap gap-5 text-sm text-stone-500">
            <a className="hover:text-stone-900" href="#products">Products</a>
            <a className="hover:text-stone-900" href="#about">About</a>
            <a className="hover:text-stone-900" href="#demo">Demo</a>
            <a className="hover:text-stone-900" href="#support">Support</a>
            <a className="hover:text-stone-900" href="#contact">Contact</a>
            <a className="hover:text-stone-900" href="#">Privacy</a>
            <a className="hover:text-stone-900" href="#">Terms</a>
          </div>
          <div className="text-sm text-stone-500">© 2026 TEKHAWK Software Solutions.</div>
        </div>
      </footer>

      {/* ---------- CLIENT ID POPUP ---------- */}
      <ClientIdModal open={showClientModal} onClose={() => setShowClientModal(false)} />
    </div>
  )
}