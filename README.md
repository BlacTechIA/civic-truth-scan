# CivicCheck NG

A civic claim verification tool for Nigerian and Kenyan citizens. Paste a claim or upload a screenshot and the system searches live evidence from credible African sources, then returns a structured verdict with citations, reasoning, and next steps.

Live at [civictruth.lovable.app](https://civictruth.lovable.app)

Built by Anigbobi Churchill for the Andela x Open Society Foundations Hackathon 2026, Transparency and Accountability track.

---

## What it does

A user submits a civic claim they encountered on WhatsApp, social media, or any other channel. The system runs it through a three-stage pipeline and returns one of four verdicts: True, False, Misleading, or Unverifiable.

Each result includes a plain-language summary of what the evidence shows, the reasoning behind the assessment, a list of sources examined with relevance notes, actionable next steps for the user, and an honest statement of the assessment's limitations.

The system never forces a verdict when evidence is insufficient. Unverifiable is a legitimate and important outcome.

---

## How the pipeline works

Stage 1: Normalization. The raw claim is sent to Claude (claude-sonnet-4-6) which restates it as a precise, testable sentence, removes emotional language, and identifies the country context of the claim. Supports English, Pidgin, Hausa, Yoruba, Igbo, and Swahili.

Stage 2: Evidence retrieval. The normalized claim is sent to Serper, which searches Google filtered for Nigerian or Kenyan geographic context depending on the detected country. Up to eight results are returned. If Serper is unavailable, a curated fallback list of primary Nigerian and Kenyan civic sources is used so the pipeline does not break.

Stage 3: Assessment. The normalized claim and retrieved evidence are sent to Claude again with a strict instruction to assess only using the provided evidence and not outside knowledge. The response is a single structured JSON object containing the verdict, summary, reasoning, sources with relevance notes, next steps, and limitations.

---

## Real-world conditions addressed

Low bandwidth. A toggle in the header compresses the sources display to single-line summaries, reducing page weight for users on slow connections. The preference persists across sessions.

Multilingual. Claims can be submitted in English, Pidgin, Hausa, Yoruba, Igbo, or Swahili. The normalization stage handles informal and colloquial phrasing without any configuration change.

Privacy. No claims are stored or linked to user identity. Citizens can check sensitive political claims without fear of exposure.

Screenshot support. Users can upload WhatsApp screenshots or news images. The system uses Claude vision to extract the claim from the image and runs it through the same verification pipeline.

Pan-African coverage. The pipeline detects whether a claim relates to Nigeria or Kenya and routes the evidence search to the appropriate geographic context, with country-specific primary source fallbacks for both.

Accessibility. No app installation required. Works on any browser and any device. Text-first design optimised for low-end hardware.

---

## Verdict states

True. The available evidence consistently supports the claim.

False. The available evidence directly contradicts the claim.

Misleading. The claim contains a true element but omits important context that changes how it should be understood.

Unverifiable. The available evidence is insufficient to reach a confident conclusion. This does not mean the claim is false.

---

## Tech stack

Frontend: React with TanStack Router, Tailwind CSS, Playfair Display and Inter typefaces.

Backend: Server-side route handler in TanStack Router (src/routes/api/verify.ts), deployed as part of the same application with no separate service required.

AI: Anthropic Claude claude-sonnet-4-6 for claim normalization and assessment.

Search: Serper API for live evidence retrieval with Nigerian and Kenyan geographic filtering.

Deployment: Lovable, accessible at civictruth.lovable.app.

WhatsApp adapter: A Cloudflare Worker deployed at civiccheck-whatsapp.civiccheck-ng.workers.dev that acts as a Twilio webhook adapter, calling the verification API and formatting the response as plain text for WhatsApp delivery.

---

## Project structure

```
src/
  routes/
    api/
      verify.ts        Server-side verification pipeline
    index.tsx          Main page with input and results UI
  components/          UI components
  hooks/               React hooks
```

---

## Running locally

You need Node.js 18 or higher.

```
git clone https://github.com/BlacTechIA/civic-truth-scan
cd civic-truth-scan
npm install
npm run dev
```

The app runs at http://localhost:8080. The verification endpoint is available at http://localhost:8080/api/verify.

---

## Environment variables

ANTHROPIC_API_KEY is required. Used for claim normalization and assessment via Claude.

SERPER_API_KEY is optional. Used for live evidence retrieval. When absent or if the search fails, the pipeline uses a curated fallback list of Nigerian and Kenyan civic sources and continues working.

VITE_API_BASE_URL is optional. Leave empty to call the endpoint on the same origin. Set to a full URL only when running the frontend separately from the backend.

In production these are stored as project secrets and are never committed to the repository.

---

## API

POST /api/verify

Request body:
```json
{
  "claim": "string, the civic claim to verify",
  "image_base64": "string, optional base64 encoded image when a screenshot is uploaded"
}
```

Response:
```json
{
  "assessment": "TRUE | FALSE | MISLEADING | UNVERIFIABLE",
  "summary": "plain language explanation of what the evidence shows",
  "why": "reasoning behind the assessment",
  "confidence_context": "High | Medium | Low",
  "country_context": "Nigeria | Kenya | Africa",
  "assessed_at": "ISO 8601 UTC timestamp",
  "sources": [
    {
      "title": "string",
      "publisher": "string",
      "source_type": "Primary | Secondary",
      "published_at": "string or null",
      "url": "string or null",
      "relevance": "one sentence",
      "evidence_summary": "one sentence"
    }
  ],
  "next_steps": ["array of plain string sentences"],
  "limitations": "one sentence"
}
```

Error responses: HTTP 400 when no claim is provided. HTTP 503 when the verification service is temporarily unavailable. Raw errors and stack traces are never exposed to the client.

CORS is open. OPTIONS preflight requests are handled.

---

## Hackathon context

This project was submitted to the Andela x Open Society Foundations Hackathon 2026 under the Transparency and Accountability track.

The challenge was inspired by OSF's Transformative Peace in Africa: Shifting Power to Communities initiative and supported by Build Up, a social enterprise working at the intersection of peacebuilding and technology.

The problem: Nigeria and Kenya have over 100 million internet users combined, with WhatsApp as the primary news channel for most citizens. Civic misinformation spreads faster than corrections. Existing fact-checkers are under-resourced, slow, and built for journalists rather than citizens.

The solution: CivicCheck NG brings verification to the claim, not the other way around. A citizen submits what they heard in whatever language they heard it, and the system searches the evidence and returns a structured, honest assessment in seconds.
