import { useMemo, useState } from "react";
import Head from "next/head";
import { categories, products } from "./data/products";
import { siteConfig } from "./data/siteConfig";

const researchNote = "Research Use Only. For research purposes only. No protocol guidance or medical advice is provided.";

function SectionHeader({ eyebrow, title, children }) {
  return (
    <div className="mx-auto mb-10 max-w-3xl text-center">
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.35em] text-cyan-200/80">{eyebrow}</p>
      <h2 className="text-3xl font-black tracking-tight text-white md:text-5xl">{title}</h2>
      {children && <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-300 md:text-lg">{children}</p>}
    </div>
  );
}

function GlowButton({ href, children, variant = "primary", className = "", ...props }) {
  const styles =
    variant === "primary"
      ? "bg-gradient-to-r from-cyan-300 via-violet-400 to-amber-200 text-slate-950 shadow-[0_0_36px_rgba(87,221,255,.35)]"
      : "border border-cyan-200/30 bg-white/5 text-white shadow-[inset_0_0_22px_rgba(255,255,255,.04)] hover:border-cyan-200/70";
  return (
    <a
      href={href}
      className={`inline-flex min-h-12 items-center justify-center rounded-full px-6 py-3 text-sm font-black uppercase tracking-[0.18em] transition duration-300 hover:-translate-y-0.5 hover:scale-[1.01] ${styles} ${className}`}
      {...props}
    >
      {children}
    </a>
  );
}

// Hero keeps the highest-value CTA and local contact routes above the fold.
function Hero() {
  return (
    <section id="top" className="relative overflow-hidden px-5 pb-16 pt-8 md:px-8 md:pb-24">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_10%,rgba(104,49,255,.35),transparent_32%),radial-gradient(circle_at_90%_20%,rgba(19,214,255,.22),transparent_30%),radial-gradient(circle_at_50%_95%,rgba(255,203,74,.14),transparent_34%)]" />
      <div className="mx-auto flex max-w-7xl flex-col items-center text-center">
        <div className="mb-8 rounded-[2rem] border border-white/10 bg-black/25 p-3 shadow-[0_0_70px_rgba(129,74,255,.28)] backdrop-blur-xl">
          <img src="/images/axiom-logo.svg" alt="AxioM logo" className="h-auto w-[min(82vw,560px)]" />
        </div>
        <div className="mb-5 inline-flex rounded-full border border-cyan-200/25 bg-cyan-200/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-cyan-100">
          Local-first premium research wellness
        </div>
        <h1 className="max-w-5xl text-4xl font-black leading-[1.02] tracking-tight text-white md:text-7xl">
          Elite Research. <span className="text-gradient">Local Access.</span> Premium Support.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200 md:text-2xl">
          Premium research products with clear information, local availability, and direct support.
        </p>
        <div className="mt-9 flex w-full flex-col justify-center gap-4 sm:w-auto sm:flex-row">
          <GlowButton href="#products">View Product List</GlowButton>
          <GlowButton href="#contact" variant="secondary">Contact Now</GlowButton>
        </div>
        <div className="mt-8 grid w-full max-w-3xl gap-3 rounded-[2rem] border border-white/10 bg-white/[0.06] p-4 text-left backdrop-blur-xl md:grid-cols-3">
          <a href={siteConfig.smsHref} className="contact-chip"><span>Text / Call</span><strong>{siteConfig.phoneDisplay}</strong></a>
          <a href={siteConfig.instagramUrl} className="contact-chip"><span>Instagram DM</span><strong>@yourhandle</strong></a>
          <a href={siteConfig.facebookUrl} className="contact-chip"><span>Facebook</span><strong>Message AxioM</strong></a>
        </div>
      </div>
    </section>
  );
}

// Trust cards are short by design for fast mobile scanning.
function TrustSection() {
  const items = [
    ["Local support", "Direct local communication for fast, clear answers."],
    ["Clear information", "Plain-English summaries and organized product details."],
    ["Research-use labeling", "Every listing keeps the research-purpose context visible."],
    ["Fast response", "Simple call, text, or DM options on every key section."],
    ["Simple inquiry process", "Ask about availability without a complicated checkout."],
    ["Professional presentation", "Clean catalog, premium visuals, and easy mobile reading."],
    ["Premium sourcing standards", "Built to communicate quality while avoiding overpromising."],
  ];
  return (
    <section className="px-5 py-16 md:px-8" id="trust">
      <div className="mx-auto max-w-7xl">
        <SectionHeader eyebrow="Why AxioM" title="Trusted, clear, and built for local service.">
          A refined research catalog designed to help local customers understand availability and start a direct inquiry fast.
        </SectionHeader>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {items.map(([title, copy]) => (
            <div key={title} className="glass-card group p-5">
              <div className="mb-4 h-2 w-16 rounded-full bg-gradient-to-r from-cyan-300 via-violet-400 to-amber-200 shadow-[0_0_22px_rgba(57,231,255,.55)]" />
              <h3 className="text-lg font-black text-white">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">{copy}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Product details stay in a modal so customers can learn without losing the catalog.
function ProductModal({ product, onClose }) {
  if (!product) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-3 backdrop-blur-md md:items-center" role="dialog" aria-modal="true">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-cyan-200/20 bg-[#090713] p-5 shadow-[0_0_80px_rgba(108,92,255,.35)] md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-200">{product.category}</p>
            <h3 className="mt-2 text-3xl font-black text-white md:text-5xl">{product.name} {product.amount}</h3>
          </div>
          <button onClick={onClose} className="rounded-full border border-white/15 px-4 py-2 text-white hover:bg-white/10">Close</button>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <span className="badge badge-stock">{product.status}</span>
          <span className="badge border-cyan-200/25 bg-cyan-200/10 text-cyan-100">{researchNote}</span>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-[1.2fr_.8fr]">
          <div className="glass-card p-5">
            <h4 className="text-xl font-black text-white">What researchers commonly study it for</h4>
            <ul className="mt-4 space-y-3 text-slate-300">
              {product.studiedFor.map((item) => <li key={item} className="flex gap-3"><span className="text-cyan-200">✦</span>{item}</li>)}
            </ul>
          </div>
          <div className="glass-card p-5">
            <h4 className="text-xl font-black text-white">Availability</h4>
            <p className="mt-3 text-slate-300">{product.status}</p>
            <p className="mt-5 text-sm uppercase tracking-[0.2em] text-slate-400">Price</p>
            <p className="text-3xl font-black text-amber-200">{product.price}</p>
          </div>
        </div>
        <div className="mt-5 glass-card p-5">
          <h4 className="text-xl font-black text-white">General storage note</h4>
          <p className="mt-3 text-slate-300">{product.storage}</p>
        </div>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <GlowButton href={`${siteConfig.smsHref}?&body=Hi%20AxioM%2C%20I%27d%20like%20to%20ask%20about%20${encodeURIComponent(product.name)}.`} className="flex-1">Ask About This</GlowButton>
          <GlowButton href="#contact" variant="secondary" className="flex-1" onClick={onClose}>Send Inquiry</GlowButton>
        </div>
      </div>
    </div>
  );
}

// Product data comes from data/products.js so inventory edits stay simple.
function ProductsSection() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory = activeCategory === "All" || product.category === activeCategory;
      const matchesSearch = !term || `${product.name} ${product.amount} ${product.category} ${product.summary}`.toLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, search]);

  return (
    <section id="products" className="px-5 py-16 md:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeader eyebrow="Product catalog" title="Easy-to-scan research products.">
          Filter by category, search by name, and tap any product for clear research-use information.
        </SectionHeader>
        <div className="mb-8 grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search products, categories, or research focus..."
            className="min-h-14 rounded-2xl border border-white/10 bg-white/[0.07] px-5 text-white outline-none ring-cyan-300/40 placeholder:text-slate-500 focus:ring-4"
          />
          <a href="#contact" className="rounded-2xl border border-amber-200/30 bg-amber-200/10 px-5 py-4 text-center text-sm font-black uppercase tracking-[0.18em] text-amber-100">Need help?</a>
        </div>
        <div className="mb-8 flex snap-x gap-3 overflow-x-auto pb-2">
          {["All", ...categories].map((category) => (
            <button key={category} onClick={() => setActiveCategory(category)} className={`shrink-0 rounded-full px-5 py-3 text-sm font-bold transition ${activeCategory === category ? "bg-cyan-200 text-slate-950" : "border border-white/10 bg-white/[0.05] text-slate-200 hover:border-cyan-200/50"}`}>
              {category}
            </button>
          ))}
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredProducts.map((product) => (
            <article key={product.id} className="glass-card flex min-h-[320px] flex-col p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <span className={`badge ${product.status === "Current Stock" ? "badge-stock" : "badge-request"}`}>{product.status}</span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-black text-amber-100">{product.price}</span>
              </div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-200/80">{product.category}</p>
              <h3 className="mt-2 text-2xl font-black text-white">{product.name} <span className="text-cyan-100">{product.amount}</span></h3>
              <p className="mt-4 flex-1 text-base leading-7 text-slate-300">{product.summary}</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <button onClick={() => setSelectedProduct(product)} className="rounded-full border border-cyan-200/30 px-4 py-3 text-sm font-black text-cyan-100 transition hover:bg-cyan-200/10">Learn More</button>
                <a href={`${siteConfig.smsHref}?&body=Hi%20AxioM%2C%20I%27d%20like%20to%20ask%20about%20${encodeURIComponent(product.name)}.`} className="rounded-full bg-gradient-to-r from-cyan-300 to-violet-400 px-4 py-3 text-center text-sm font-black text-slate-950">Ask About This</a>
              </div>
            </article>
          ))}
        </div>
      </div>
      <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
    </section>
  );
}

// Publish-ready contact flow: direct call/text plus a no-backend mailto form.
function ContactSection() {
  return (
    <section id="contact" className="px-5 py-16 md:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[.9fr_1.1fr]">
        <div className="glass-card p-6 md:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-amber-200">Direct inquiry</p>
          <h2 className="mt-4 text-4xl font-black text-white md:text-6xl">Want help choosing what to research?</h2>
          <p className="mt-5 text-lg leading-8 text-slate-300">Text or call for current stock, local delivery/pickup options, and product availability. Local availability and delivery options may vary.</p>
          <div className="mt-7 flex flex-col gap-3">
            <GlowButton href={siteConfig.smsHref}>Text AxioM Now</GlowButton>
            <GlowButton href={siteConfig.phoneHref} variant="secondary">Call {siteConfig.phoneDisplay}</GlowButton>
          </div>
        </div>
        <form action={`mailto:${siteConfig.formEmail}`} method="post" encType="text/plain" className="glass-card grid gap-4 p-6 md:p-8">
          <label className="form-label">Name<input name="name" required className="form-input" placeholder="Your name" /></label>
          <label className="form-label">Phone<input name="phone" required className="form-input" placeholder="Best call/text number" /></label>
          <label className="form-label">Product interested in<input name="product" className="form-input" placeholder="Example: BPC-157 10MG" /></label>
          <label className="form-label">Message<textarea name="message" rows="5" className="form-input" placeholder="Tell us what you want to ask about." /></label>
          <button type="submit" className="rounded-full bg-gradient-to-r from-amber-200 via-cyan-200 to-violet-400 px-6 py-4 text-sm font-black uppercase tracking-[0.2em] text-slate-950">Request / Order Inquiry</button>
          <p className="text-sm leading-6 text-slate-400">This form opens your email app for a simple publish-ready inquiry flow. Replace it with Formspree or Netlify Forms later if preferred.</p>
        </form>
      </div>
    </section>
  );
}

function DeliveryAndFAQ() {
  const faqs = [
    ["Are these products for research use?", "Yes. AxioM presents these listings for research purposes only and keeps research-use context visible throughout the catalog."],
    ["How do I ask about availability?", "Use the text, call, DM, or inquiry buttons. Include the product name and any questions about local availability."],
    ["Do you deliver locally?", "AxioM is built as a local-first service. Delivery or pickup options can be arranged after availability is confirmed."],
    ["Can I request a product not listed?", "Yes. Send a message with the product name and desired details, and AxioM can confirm whether it may be available by request."],
    ["How do I store research products?", "Follow the label or supplier documentation. In general, keep products sealed, clearly labeled, and protected from unnecessary heat, light, and moisture."],
    ["How fast do you respond?", "Response times vary, but direct text or DM is intended to be the fastest contact path."],
  ];
  return (
    <>
      <section className="px-5 py-16 md:px-8" id="delivery">
        <div className="mx-auto max-w-7xl rounded-[2.5rem] border border-amber-200/20 bg-gradient-to-br from-amber-200/10 via-white/[0.055] to-cyan-200/10 p-6 md:p-10">
          <SectionHeader eyebrow="Local delivery" title="Local-first service with flexible arrangements.">
            Contact AxioM to confirm current availability. Delivery and pickup options can be arranged locally, with shipping coming later or by request when available.
          </SectionHeader>
          <div className="grid gap-4 md:grid-cols-3">
            {["Confirm availability", "Arrange delivery/pickup", "Ask about future shipping"].map((item) => <div key={item} className="glass-card p-5 text-center text-xl font-black text-white">{item}</div>)}
          </div>
        </div>
      </section>
      <section className="px-5 py-16 md:px-8" id="faq">
        <div className="mx-auto max-w-5xl">
          <SectionHeader eyebrow="FAQ" title="Clear answers before you inquire." />
          <div className="space-y-4">
            {faqs.map(([question, answer]) => (
              <details key={question} className="glass-card group p-5">
                <summary className="cursor-pointer list-none text-lg font-black text-white">{question}</summary>
                <p className="mt-3 leading-7 text-slate-300">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/10 px-5 py-10 md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <img src="/images/axiom-logo.svg" alt="AxioM logo" className="w-52" />
        <div className="max-w-2xl text-sm leading-6 text-slate-400">
          <p className="font-bold text-slate-200">Research Use Only. For research purposes only.</p>
          <p>Contact: {siteConfig.phoneDisplay} · {siteConfig.email} · Social placeholders: Instagram / Facebook / TikTok</p>
          <p>© {new Date().getFullYear()} AxioM. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

export default function Dashboard() {
  return (
    <>
      <Head>
        <title>AxioM | Premium Research Wellness</title>
        <meta name="description" content="AxioM offers premium research products with local availability, clear information, and direct support." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:title" content="AxioM | Elite Research. Local Access. Premium Support." />
        <meta property="og:description" content="Premium research products with clear information, local availability, and direct support." />
        <meta property="og:image" content="/images/og-image.svg" />
        <meta name="theme-color" content="#05040A" />
        <link rel="icon" href="/images/favicon.svg" />
      </Head>
      <main className="min-h-screen overflow-hidden bg-[#04030A] pb-24 text-white md:pb-0">
        <Hero />
        <TrustSection />
        <ProductsSection />
        <ContactSection />
        <DeliveryAndFAQ />
        <Footer />
        <a href={siteConfig.smsHref} className="fixed bottom-4 left-4 right-4 z-40 rounded-full bg-gradient-to-r from-cyan-300 via-violet-400 to-amber-200 px-5 py-4 text-center text-sm font-black uppercase tracking-[0.18em] text-slate-950 shadow-[0_0_38px_rgba(67,224,255,.45)] md:left-auto md:right-6 md:w-auto">Text / Call AxioM</a>
      </main>
    </>
  );
}
