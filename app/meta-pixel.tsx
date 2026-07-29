import Script from "next/script";

import { META_PIXEL_ID } from "./meta-events";

/* Meta Pixel base code, rendered from the root layout so it is present on
   every page. Meta's own instructions say "paste into <head>", which assumes a
   static HTML site; the Next equivalent is next/script with the
   `afterInteractive` strategy — the documented choice for tag managers and
   analytics. The tag loads early but never blocks first paint, and PageView
   fires as soon as fbevents.js is ready.

   `id` is required: Next uses it to track and de-duplicate inline scripts. */
export function MetaPixel() {
  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${META_PIXEL_ID}');
fbq('track', 'PageView');`}
      </Script>

      {/* Tracking fallback for browsers with JavaScript disabled. next/image
          is deliberately not used here: this is a 1x1 beacon, not an image. */}
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          alt=""
          src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  );
}
