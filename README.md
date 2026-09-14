# Civic Truth Hub

Build a civic claim verification web app called CivicCheck NG. This is a serious civic tool for Nigerian citizens to verify information they encounter online and on WhatsApp. The design must feel like a trusted institution, not a tech startup. No emojis anywhere in the UI. No markdown formatting in any displayed text. No dashes as bullet points. No AI assistant feel.

DESIGN SYSTEM

Colors:

Primary surface: #0D1B2A (deep navy)

Content background: #FFFFFF

Page background: #F5F4F1 (warm off-white)

Accent: #1A7A4A (institutional green)

Accent light: #E8F5EE

Text primary: #0D1B2A

Text secondary: #4A5568

Text muted: #718096

Border: #E2E8F0

Verdict TRUE bg: #E8F5EE, text: #1A7A4A

Verdict FALSE bg: #FEF2F2, text: #991B1B

Verdict MISLEADING bg: #FFFBEB, text: #92400E

Verdict UNVERIFIABLE bg: #F1F5F9, text: #475569

Typography:

Headings: Playfair Display (import from Google Fonts)

Body and UI: Inter (import from Google Fonts)

No all caps anywhere

Sentence case throughout

LAYOUT AND PAGES

The app has one main page and one results state. No routing needed for MVP.

HEADER
Slim fixed header, navy background (#0D1B2A).
Left: "CivicCheck NG" in Playfair Display, white, 20px, normal weight.
Right: A small text tag in Inter, muted green (#6BAE8A), 13px reading "Transparency and Accountability"
No navigation links. No hamburger. No other elements.

HERO SECTION
Full width, page background (#F5F4F1).
Vertically centered content, minimum height 60vh.
Large heading in Playfair Display, #0D1B2A, 52px on desktop, 36px on mobile:
"What have you heard?"
Subheading in Inter, #4A5568, 18px, max-width 520px, centered:
"Paste a civic claim or upload a screenshot. We search the evidence so you can decide what to trust."
Below that, the input area (described in INPUT SECTION below).

INPUT SECTION (inside the hero)
A large clean input card, white background, 1px border #E2E8F0, border-radius 12px, generous padding.
Inside the card:

A textarea, no border, placeholder text in #9CA3AF: "Type or paste a civic claim here, for example: The federal government announced a new fuel subsidy removal effective October 2026"

Textarea is 4 rows tall, full width, Inter 16px, resize: none

Below the textarea: a horizontal line separator (#E2E8F0, 1px)

Below the separator: a row with two items:
Left: A subtle file upload button styled as text with a paperclip icon from lucide. Text reads "Attach a screenshot" in Inter 14px, color #718096. On hover color changes to #1A7A4A. This triggers a hidden file input accepting image files only.
Right: A button "Check this claim" in Inter 14px, background #0D1B2A, white text, border-radius 8px, padding 10px 20px. On hover: background #1A7A4A. On loading state: show a subtle spinner and text "Checking..."

If a file is attached, show the filename below the separator with a small remove (x) button. Keep it minimal.

RESULTS SECTION
Hidden by default. Appears below the hero when a result is returned. Smooth height transition (0.4s ease).
White background. Full width. Padding 48px on desktop, 24px on mobile.

Inside results, use max-width 720px centered layout:

VERDICT BLOCK (first thing in results)
A block with left border 4px solid matching the verdict color.
Background: the verdict background color.
Padding 20px 24px.
Border-radius 0px on left, 8px on right.
Two lines:
Line 1: The verdict word in Playfair Display 28px, verdict text color. Just the single word: TRUE, FALSE, MISLEADING, or UNVERIFIABLE.
Line 2: In Inter 14px, text secondary color: "Based on evidence retrieved from Nigerian sources"

SUMMARY BLOCK (below verdict)
No card. Just clean text on white.
Section heading in Playfair Display 22px #0D1B2A: "What the evidence shows"
Body text in Inter 16px #4A5568 line-height 1.7: the plain language explanation from the API.

WHY THIS VERDICT (below summary)
Section heading in Playfair Display 22px #0D1B2A: "Why this assessment"
Body text in Inter 16px #4A5568: the reasoning text from the API.

EVIDENCE TRAIL (below why)
Section heading in Playfair Display 22px #0D1B2A: "Sources examined"
For each source, show a clean row with:

A subtle left border 2px solid #E2E8F0

Padding left 16px

Publisher name in Inter 13px #718096

Source title in Inter 15px #0D1B2A, normal weight, if a URL exists make it a link that opens in a new tab

Published date if available, in Inter 12px #9CA3AF

Relevance note in Inter 14px #4A5568 italic

Source type badge: a small pill, Inter 12px. Primary = green tint, Secondary = grey tint

Spacing between sources: 20px

NEXT STEPS (below evidence)
Section heading in Playfair Display 22px #0D1B2A: "What you can do"
For each next step, show it as a plain paragraph in Inter 16px #4A5568. No bullet dashes. No numbers unless the content is genuinely sequential. Just clean lines with 12px gap between them.

LIMITATIONS NOTICE (at the bottom of results)
Small text block, Inter 13px #9CA3AF, centered, max-width 560px:
"This assessment is based on publicly available evidence at the time of checking. Civic information can change. Always consult primary sources before acting."
Add a thin top border #E2E8F0 above it with 24px padding.

NEW CHECK BUTTON
Below limitations: a centered button "Check another claim" in Inter 14px, border 1px solid #0D1B2A, background transparent, color #0D1B2A, border-radius 8px, padding 10px 24px. On click, clear the results, scroll back to top, focus the textarea.

LOADING STATE
While the API call is in progress, show the results section with a skeleton state:

The verdict block shows a placeholder rectangle, animated pulse

Three lines of skeleton text below it

No spinners anywhere else

ERROR STATE
If the API returns an error, show the results section with:

A plain message in Inter 16px #4A5568: "We could not retrieve evidence for this claim. Please try rephrasing or check your connection."

The "Check another claim" button

FUNCTIONAL LOGIC

State management: claimText (string), attachedFile (File or null), isLoading (boolean), result (object or null), error (string or null).

On "Check this claim" click:

Validate: if claimText is empty and no file attached, show inline message below the input "Please enter a claim or attach a screenshot to continue" in Inter 14px #991B1B. Do not submit.

Set isLoading to true, show results section in skeleton state, scroll smoothly to results.

Make a POST request to /api/verify with body: { claim: claimText, has_image: !!attachedFile }

On success: set result, set isLoading false, render results.

On error: set error message, set isLoading false, render error state.

API RESPONSE SHAPE:
{ assessment: "TRUE" | "FALSE" | "MISLEADING" | "UNVERIFIABLE", summary: string, why: string, confidence_context: string, assessed_at: string, sources: [{ title, publisher, source_type, published_at, url, relevance, evidence_summary }], next_steps: string[], limitations: string }

MOCK DATA FOR DEVELOPMENT
Since the backend is not connected yet, use this mock response with a 2.5 second artificial delay:

{ "assessment": "MISLEADING", "summary": "The claim contains a true element but omits important context that changes how it should be understood. The federal government did announce changes to the fuel subsidy structure, but the effective date and scope described in the circulated claim do not match what official documents state.", "why": "Official publications from the Nigerian Midstream and Downstream Petroleum Regulatory Authority and statements published on the Federal Ministry of Finance website describe a phased adjustment, not an immediate blanket removal. The date cited in the claim is not confirmed in any government release found in the evidence set.", "confidence_context": "Medium", "assessed_at": "2026-09-14T10:30:00Z", "sources": [{ "title": "NMDPRA Statement on Petroleum Pricing Framework", "publisher": "Nigerian Midstream and Downstream Petroleum Regulatory Authority", "source_type": "Primary", "published_at": "2026-09-10", "url": null, "relevance": "Official regulatory body responsible for downstream petroleum pricing", "evidence_summary": "The statement describes a phased pricing adjustment framework with no single removal date specified" }, { "title": "Federal Budget Office: Fuel Subsidy Removal Timeline Update", "publisher": "Federal Ministry of Finance", "source_type": "Primary", "published_at": "2026-09-08", "url": null, "relevance": "Primary government source for fiscal policy decisions on subsidies", "evidence_summary": "The ministry communique does not confirm the October 2026 date or the specific scope described in the circulating claim" }, { "title": "Analysis: What the New Petroleum Pricing Changes Mean for Nigerians", "publisher": "Punch Nigeria", "source_type": "Secondary", "published_at": "2026-09-11", "url": "https://punchng.com", "relevance": "Established Nigerian newspaper covering the policy story", "evidence_summary": "Reporting confirms ongoing policy changes but notes the government has not committed to a single removal date" }], "next_steps": ["Visit the official Federal Ministry of Finance website at finance.gov.ng to read the most recent statements on fuel pricing policy.", "Check the NMDPRA official portal for the current regulatory framework before drawing conclusions from circulated claims.", "If you received this claim on WhatsApp or social media, hold off on sharing it until official confirmation is available."], "limitations": "This assessment is based on publicly available evidence retrieved at the time of checking. Fuel subsidy policy in Nigeria is subject to change. Always verify with primary government sources before acting on this information." }

RESPONSIVE BEHAVIOR
Desktop: max-width 1100px centered, side padding 48px. Tablet: side padding 32px. Mobile: side padding 16px, hero heading 36px, single column throughout.

Do not add a footer. Do not add social links. Do not add a navigation menu. Do not add decorative illustrations or icons in the hero. Do not add gradient backgrounds. The design should feel quiet, authoritative and focused.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/3c2e038e-6a43-40e0-9914-33d27045efc2).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Backend

The verification API lives in the `backend` folder and runs separately from the frontend.

Install:

    cd backend
    pip install -r requirements.txt

Run:

    uvicorn main:app --reload --port 8000

Environment variables (copy `.env.example` to `.env`):

ANTHROPIC_API_KEY, required for claim normalisation and assessment.

SERPER_API_KEY, optional in development. When it is absent the retriever returns a small fallback list of typical Nigerian civic sources so the pipeline keeps working.

ALLOWED_ORIGINS, comma separated list of origins for CORS. Defaults to `*` in development.

Confirm the service is running by requesting GET /health, which returns {"status": "ok"}. The main endpoint is POST /api/verify.
