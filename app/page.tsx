"use client";

import { useEffect, useRef, useState } from "react";

/* =====================================================================
   CONFIG — set these to REAL numbers before running ads.
   The scarcity meter must reflect actual sign-ups to stay honest
   (ideally: fetch the live count from your backend on page load).
   ===================================================================== */
const CONFIG = {
  spotsTotal: 1000,
  spotsClaimed: 0, // ← replace with your real waitlist count (or fetch it)
  // Google Apps Script web-app URL (set NEXT_PUBLIC_LAUNCH_SHEET_URL in .env).
  waitlistEndpoint: process.env.NEXT_PUBLIC_LAUNCH_SHEET_URL || "",
};

export default function Home() {
  const [cc, setCc] = useState("+230");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneErr, setPhoneErr] = useState(false);
  const [emailErr, setEmailErr] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [stickyVisible, setStickyVisible] = useState(false);
  const [meterWidth, setMeterWidth] = useState(0);
  const [claimed, setClaimed] = useState(
    Math.min(CONFIG.spotsClaimed, CONFIG.spotsTotal)
  );

  const phoneRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const claimRef = useRef<HTMLDivElement>(null);

  const left = CONFIG.spotsTotal - claimed;

  /* scarcity meter — animate the fill in after mount */
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setMeterWidth(Math.max(2, (claimed / CONFIG.spotsTotal) * 100));
    });
    return () => cancelAnimationFrame(raf);
  }, [claimed]);

  /* live count — read the real number of sign-ups (sheet rows) on load.
     Google Apps Script sends no CORS headers, so we use JSONP (a <script>
     tag) instead of fetch. The doGet handler must return
     `callback({ count: <rows> })` — see the Apps Script snippet in the repo. */
  useEffect(() => {
    if (!CONFIG.waitlistEndpoint) return;
    const cbName = `__waitlistCount_${Date.now()}`;
    const script = document.createElement("script");
    const cleanup = () => {
      delete (window as unknown as Record<string, unknown>)[cbName];
      script.remove();
    };
    (window as unknown as Record<string, unknown>)[cbName] = (data: {
      count?: number;
    }) => {
      if (data && typeof data.count === "number") {
        setClaimed(Math.min(data.count, CONFIG.spotsTotal));
      }
      cleanup();
    };
    const sep = CONFIG.waitlistEndpoint.includes("?") ? "&" : "?";
    script.src = `${CONFIG.waitlistEndpoint}${sep}action=count&callback=${cbName}`;
    script.onerror = cleanup;
    document.body.appendChild(script);
    return cleanup;
  }, []);

  /* sticky mobile CTA — appears once the hero form scrolls out of view */
  useEffect(() => {
    const el = claimRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([en]) => setStickyVisible(!en.isIntersecting),
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* scroll reveals */
  useEffect(() => {
    // Only now that JS is running do we opt into the hidden-then-reveal
    // behaviour; without this class the .rise sections stay visible.
    document.documentElement.classList.add("js-reveal");
    const rio = new IntersectionObserver(
      (ents) => {
        ents.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("in");
            rio.unobserve(en.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    document.querySelectorAll(".rise").forEach((el) => rio.observe(el));
    return () => rio.disconnect();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPhoneErr(false);
    setEmailErr(false);

    const digits = phone.replace(/\D/g, "");
    const phoneOk =
      cc === "+230"
        ? digits.length === 7 || digits.length === 8
        : digits.length >= 7 && digits.length <= 13;
    if (!phoneOk) {
      setPhoneErr(true);
      phoneRef.current?.focus();
      return;
    }

    const trimmedEmail = email.trim();
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailErr(true);
      emailRef.current?.focus();
      return;
    }

    const payload = {
      phone: (cc === "other" ? "" : cc) + digits,
      name: name.trim() || null,
      email: trimmedEmail || null,
      source: "waitlist-landing",
      ts: new Date().toISOString(),
    };

    if (CONFIG.waitlistEndpoint) {
      try {
        // Google Apps Script doesn't send CORS headers, so use a "simple"
        // request (no-cors + text/plain) to avoid a failing preflight. The
        // response is opaque; the script reads the JSON via e.postData.contents.
        await fetch(CONFIG.waitlistEndpoint, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        console.error("Waitlist submit failed:", err);
      }
    } else {
      console.log("Waitlist signup (no endpoint configured):", payload);
    }

    /* fire your ad pixel conversion event here, e.g.:
       fbq('track','Lead');  gtag('event','generate_lead');  ttq.track('SubmitForm'); */

    // Count this sign-up: bumps "passes claimed" and re-animates the meter.
    setClaimed((c) => Math.min(c + 1, CONFIG.spotsTotal));
    setSubmitted(true);
  }

  return (
    <>
      <div className="sky" aria-hidden="true"></div>

      <nav className="wrap">
        <div className="nav-in">
          <a className="wordmark" href="#top">
            Pass<em>Privé</em>
          </a>
          <span className="geo-pill">🇲🇺 Made for Mauritius</span>
        </div>
      </nav>

      <header className="hero wrap" id="top">
        <div className="hero-grid">
          <div>
            <span className="eyebrow">The lifestyle pass for Mauritius</span>
            <h1>
              The whole island.
              <br />
              One pass. <span className="pop">Yours free.</span>
            </h1>
            <p className="hero-sub">
              Book the best tables instantly, pay at your favourite stores, and
              unlock events across Mauritius —{" "}
              <strong>earning cashback on every single transaction.</strong>
            </p>
            <ul className="hero-points">
              <li>
                <span className="tick">✓</span> Direct restaurant booking — no
                phone calls, instant confirmation
              </li>
              <li>
                <span className="tick">✓</span> Cashback every time you pay
                across the PassPrivé network
              </li>
              <li>
                <span className="tick">✓</span> Members-only access to events,
                activities &amp; experiences
              </li>
            </ul>
          </div>

          <div className="claim" id="claim" ref={claimRef}>
            <span className="stamp">Waitlist exclusive</span>
            <div className="pass">
              <div className="pass-top">
                <div className="pass-kicker">
                  <span className="pass-brand">PassPrivé</span>
                  <span className="pass-badge">Founding member</span>
                </div>
                <div className="pass-name">Privé Starter</div>
                <div className="pass-value">
                  <s>999 MUR / year</s>
                  <b>FREE</b>
                </div>
              </div>
              <div className="perf" aria-hidden="true"></div>
              <div className="meter">
                <div className="meter-row">
                  <span>
                    <span className="claimed">{claimed.toLocaleString()}</span>{" "}
                    passes claimed
                  </span>
                  <span>
                    {left.toLocaleString()} of{" "}
                    {CONFIG.spotsTotal.toLocaleString()} left
                  </span>
                </div>
                <div className="meter-bar">
                  <div
                    className="meter-fill"
                    style={{ width: `${meterWidth}%` }}
                  ></div>
                </div>
                <p className="meter-note">
                  The first 1,000 Mauritian sign-ups get a full year of Privé
                  Starter free. When they&apos;re gone, they&apos;re gone.
                </p>
              </div>

              {!submitted && (
                <form onSubmit={handleSubmit} noValidate>
                  <div>
                    <label htmlFor="phone">Mobile number</label>
                    <div className="phone-row" style={{ marginTop: 6 }}>
                      <select
                        id="cc"
                        aria-label="Country code"
                        value={cc}
                        onChange={(e) => setCc(e.target.value)}
                      >
                        <option value="+230">🇲🇺 +230</option>
                        <option value="+33">🇫🇷 +33</option>
                        <option value="+44">🇬🇧 +44</option>
                        <option value="+262">🇷🇪 +262</option>
                        <option value="+27">🇿🇦 +27</option>
                        <option value="+91">🇮🇳 +91</option>
                        <option value="+971">🇦🇪 +971</option>
                        <option value="other">Other</option>
                      </select>
                      <input
                        id="phone"
                        ref={phoneRef}
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="5 123 4567"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                    <p className={`field-err${phoneErr ? " show" : ""}`}>
                      Please enter a valid mobile number so we can reserve your
                      spot.
                    </p>
                  </div>
                  <div className="duo">
                    <div>
                      <label htmlFor="name">
                        First name <span className="opt">· optional</span>
                      </label>
                      <input
                        id="name"
                        type="text"
                        autoComplete="given-name"
                        placeholder="Anaïs"
                        style={{ marginTop: 6 }}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label htmlFor="email">
                        Email <span className="opt">· optional</span>
                      </label>
                      <input
                        id="email"
                        ref={emailRef}
                        type="email"
                        autoComplete="email"
                        placeholder="you@email.com"
                        style={{ marginTop: 6 }}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                      <p className={`field-err${emailErr ? " show" : ""}`}>
                        That email doesn&apos;t look right — fix it or leave it
                        empty.
                      </p>
                    </div>
                  </div>
                  <button className="cta" type="submit">
                    Claim my free Privé Starter
                  </button>
                  <div className="trust">
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#0E6F63"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="11" width="18" height="10" rx="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <span>
                      No spam, ever. One SMS to confirm your spot and one when we
                      launch. Your number is never shared or sold, and you can
                      opt out anytime.
                    </span>
                  </div>
                </form>
              )}

              {submitted && (
                <div className="done show">
                  <div className="big">You&apos;re in. 🎉</div>
                  <p>
                    Your free Privé Starter is reserved. Watch your phone —
                    we&apos;ll text your confirmation shortly, and again the
                    moment we launch.
                  </p>
                  <span className="spot">Founding member spot reserved</span>
                  <p style={{ marginTop: 16 }}>
                    Spots are limited — tell a friend before the free passes run
                    out.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="proof wrap rise">
        <div className="proof-in">
          <span>Already joining from Port Louis</span>
          <span className="dot"></span>
          <span>Grand Baie</span>
          <span className="dot"></span>
          <span>Flic-en-Flac</span>
          <span className="dot"></span>
          <span>Tamarin</span>
          <span className="dot"></span>
          <span>Curepipe &amp; beyond</span>
        </div>
      </div>

      <section className="wrap rise">
        <span className="eyebrow">Book · Pay · Explore</span>
        <h2>Your island life, streamlined.</h2>
        <p className="sec-sub">
          One pass replaces the phone calls, the queues and the &ldquo;sorry,
          fully booked&rdquo; — and pays you back every time you use it.
        </p>
        <div className="props">
          <div className="prop">
            <div className="ico">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 11h18" />
                <path d="M5 11V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4" />
                <path d="M4 11v8h16v-8" />
                <path d="M12 15v4" />
              </svg>
            </div>
            <h3>Book restaurants directly</h3>
            <p>
              Real-time tables at the island&apos;s best restaurants and cafés.
              Pick a time, tap once, get instant confirmation — no calls, no
              waiting on hold.
            </p>
            <span className="cb">Instant confirmation</span>
          </div>
          <div className="prop">
            <div className="ico">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <path d="M2 10h20" />
              </svg>
            </div>
            <h3>Pay at stores &amp; retail</h3>
            <p>
              Pay with PassPrivé across the partner network — from your morning
              coffee to weekend shopping — and watch the cashback stack up.
            </p>
            <span className="cb">Cashback on every transaction</span>
          </div>
          <div className="prop">
            <div className="ico">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
            <h3>Book events &amp; activities</h3>
            <p>
              Catamaran days, beach clubs, concerts, hikes — discover and book
              what&apos;s happening across Mauritius, with member pricing and
              priority access.
            </p>
            <span className="cb">Members-only access</span>
          </div>
        </div>
      </section>

      <section className="wrap rise">
        <span className="eyebrow">How the free pass works</span>
        <h2>Three steps. Zero cost. No card needed.</h2>
        <div className="steps">
          <div className="step">
            <span className="n">Step 1</span>
            <h3>Join with your mobile number</h3>
            <p>
              That&apos;s all we need. Your number is your spot in the queue —
              name and email are entirely up to you.
            </p>
          </div>
          <div className="step">
            <span className="n">Step 2</span>
            <h3>Get your confirmation by SMS</h3>
            <p>
              One text confirming your founding-member spot is locked in. Then
              we leave you alone until launch.
            </p>
          </div>
          <div className="step">
            <span className="n">Step 3</span>
            <h3>Privé Starter unlocks at launch</h3>
            <p>
              Open the app on day one and your first year — a 999 MUR value — is
              already active. Nothing to pay, nothing to enter.
            </p>
          </div>
        </div>
      </section>

      <section className="wrap rise">
        <span className="eyebrow">Where it goes from here</span>
        <h2>Start free. Upgrade whenever you&apos;re ready.</h2>
        <p className="sec-sub">
          Your free Starter year is the full experience — the paid tiers just
          turn the cashback and perks up.
        </p>
        <div className="tiers">
          <div className="tier starter">
            <span className="t-name">
              Privé Starter <span className="t-free">Free for waitlist</span>
            </span>
            <span className="t-price">
              <b>0 MUR</b> <span className="was">999 MUR</span> / first year
            </span>
            <span className="t-line">
              Full booking access · 0.5% cashback across the network
            </span>
          </div>
          <div className="tier">
            <span className="t-name">Privé Plus</span>
            <span className="t-price">
              <b>4,000 MUR</b> / year
            </span>
            <span className="t-line">
              1.5% cashback · deeper discounts · priority access
            </span>
          </div>
          <div className="tier black">
            <span className="t-name">Privé Black</span>
            <span className="t-price">
              <b>7,000 MUR</b> / year
            </span>
            <span className="t-line">
              3% cashback · dedicated concierge · members-only events
            </span>
          </div>
        </div>
        <p className="tiers-note">
          Waitlist members get first pick of Plus and Black upgrades at launch —
          but there&apos;s no obligation, ever.
        </p>
      </section>

      <section className="wrap rise">
        <span className="eyebrow">Fair questions</span>
        <h2>Before you hand us your number.</h2>
        <div className="faq">
          <details>
            <summary>Why do you need my mobile number?</summary>
            <p>
              Your number is how your free pass is reserved — it&apos;s the
              unique key to your founding-member spot. You&apos;ll get exactly
              two texts from us: one confirming your spot, one when we launch. No
              marketing blasts, no sharing with third parties, opt out with a
              single reply.
            </p>
          </details>
          <details>
            <summary>Is Privé Starter really free?</summary>
            <p>
              Yes. The first 1,000 Mauritian sign-ups get their entire first
              year of Privé Starter — normally 999 MUR — completely free. No card
              details, no hidden charge, no auto-billing surprise. After year
              one, you choose whether to renew.
            </p>
          </details>
          <details>
            <summary>I&apos;m visiting Mauritius — can I join?</summary>
            <p>
              Absolutely. PassPrivé is built for locals and travellers alike.
              Pick your country code above and join — you&apos;ll be able to book
              restaurants, pay and explore the moment you land.
            </p>
          </details>
          <details>
            <summary>What happens after I sign up?</summary>
            <p>
              You get an SMS confirming your spot. At launch, you download the
              app, sign in with the same number, and your free Privé Starter year
              is already waiting inside.
            </p>
          </details>
        </div>
      </section>

      <section className="wrap rise">
        <div className="final">
          <h2>The free passes won&apos;t wait.</h2>
          <p>
            1,000 founding-member spots. One mobile number. The best of
            Mauritius, unlocked before everyone else.
          </p>
          <a className="cta" href="#claim">
            Claim my free Privé Starter
          </a>
        </div>
      </section>

      <footer className="wrap">
        <p>
          © 2026 PassPrivé · Made in Mauritius 🇲🇺
          <br />
          Free Privé Starter offer limited to the first 1,000 Mauritian sign-ups.
          One pass per mobile number. Your data is used only to reserve your spot
          and notify you at launch — see our privacy policy.
        </p>
      </footer>

      <div className={`sticky-cta${stickyVisible && !submitted ? " show" : ""}`}>
        <a href="#claim">Claim my free Privé Starter →</a>
      </div>
    </>
  );
}
