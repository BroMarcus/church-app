# AxioM Landing Website

A publish-ready Next.js + Tailwind CSS landing website for **AxioM**, a local premium research peptide / wellness brand. The site is mobile-first, dark luxury styled, optimized for direct local inquiry, and designed so product and contact details are easy to edit.

## Tech Stack

- Next.js 13
- React 18
- Tailwind CSS 3
- Static frontend only — no backend required
- Mailto-based inquiry form for the simplest deployable contact flow

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

## Build for Production

```bash
npm run build
npm run start
```

## How to Edit Products

All product content lives in:

```text
data/products.js
```

Edit the `products` array to change:

- Product name
- MG amount
- Price
- Category
- Current stock / request status
- Short product summary
- Research detail bullets
- Storage notes

Categories are in the `categories` array in the same file. Keep category names consistent with product category values so filters work correctly.

## How to Change Contact Info

Contact placeholders live in:

```text
data/siteConfig.js
```

Update:

- `phoneDisplay`
- `phoneHref`
- `smsHref`
- `email`
- `formEmail`
- Social links
- Local service area label

For phone and SMS links, use this format:

```js
phoneHref: "tel:+15551234567",
smsHref: "sms:+15551234567",
```

## Inquiry Form

The form currently uses a simple `mailto:` action so it can be published without any backend setup. To use Formspree or Netlify Forms later, replace the form `action` in `Dashboard.jsx` with your provider endpoint and follow that provider's field instructions.

## Images and Branding

Brand assets are stored in:

```text
public/images/
```

Current placeholders:

- `axiom-logo.svg` — main logo
- `favicon.svg` — browser favicon
- `og-image.svg` — social sharing preview image

Replace those files with your uploaded logo and brand images using the same filenames to avoid changing code. If you add new assets, reference them with paths like:

```text
/images/your-file-name.png
```

## Deploy to Vercel

1. Push this repository to GitHub.
2. Go to [Vercel](https://vercel.com/).
3. Click **Add New Project**.
4. Import the repository.
5. Keep the default Next.js settings.
6. Click **Deploy**.

Vercel will run `npm run build` automatically.

## Compliance / Copy Notes

- The site uses “Research Use Only” and “For research purposes only.”
- It avoids usage directions and regulated medical-result claims.
- Product text is written as educational research context, not medical guidance.

Always review final wording with qualified legal/compliance support before publishing.
