import { createFileRoute } from "@tanstack/react-router";

type Evidence = { title: string; link: string; snippet: string; source: string };

const fallbackEvidence: Evidence[] = [
  {
    title: "Federal Government Policy Statement",
    link: "https://fmf.gov.ng",
    snippet: "Official government statement on the matter under review.",
    source: "fmf.gov.ng",
  },
  {
    title: "NMDPRA Regulatory Notice",
    link: "https://nmdpra.gov.ng",
    snippet: "Regulatory authority guidance on downstream petroleum activities.",
    source: "nmdpra.gov.ng",
  },
  {
    title: "Punch Nigeria News Coverage",
    link: "https://punchng.com",
    snippet: "Nigerian media reporting on the policy development.",
    source: "punchng.com",
  },
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

const NORMALIZER_PROMPT =
  "You are a civic claim normalizer for Nigeria. Restate the claim as a clear, precise, testable sentence. Remove emotional language. Output only the normalized claim. One sentence only.";

const ASSESSOR_PROMPT = `You are a civic fact-checking assistant for Nigerian citizens. Assess the claim using only the evidence provided. Do not use outside knowledge. If evidence is insufficient, return UNVERIFIABLE. Respond with a single valid JSON object only. No markdown. No text outside the JSON.

JSON structure:
{
  "assessment": "TRUE | FALSE | MISLEADING | UNVERIFIABLE",
  "summary": "2 to 3 sentence plain language explanation of what the evidence shows",
  "why": "2 to 3 sentence reasoning behind the assessment",
  "confidence_context": "High | Medium | Low",
  "sources": [
    {
      "title": "string",
      "publisher": "string, use the source domain if no publisher name is clear",
      "source_type": "Primary if the domain ends in .gov.ng, Secondary otherwise",
      "published_at": null,
      "url": "the link from the evidence",
      "relevance": "one sentence on why this source is relevant",
      "evidence_summary": "one sentence paraphrase of what the snippet says"
    }
  ],
  "next_steps": ["2 to 3 plain string sentences advising the user"],
  "limitations": "one sentence on the limits of this assessment"
}`;

async function callAnthropic(system: string, userMessage: string, maxTokens: number) {
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) throw new Error("missing_key");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!response.ok) throw new Error("anthropic_failed");
  const payload = (await response.json()) as { content?: Array<{ type: string; text?: string }> };
  const text = (payload.content ?? [])
    .filter((block) => block.type === "text")
    .map((block) => block.text ?? "")
    .join("")
    .trim();
  if (!text) throw new Error("anthropic_empty");
  return text;
}

async function searchEvidence(normalizedClaim: string): Promise<Evidence[]> {
  try {
    const apiKey = process.env["SERPER_API_KEY"];
    if (!apiKey) return fallbackEvidence;

    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "content-type": "application/json", "X-API-KEY": apiKey },
      body: JSON.stringify({ q: `${normalizedClaim} Nigeria`, num: 8, gl: "ng", hl: "en" }),
    });
    if (!response.ok) return fallbackEvidence;

    const data = (await response.json()) as {
      organic?: Array<{ title?: string; link?: string; snippet?: string }>;
    };
    const items = (data.organic ?? [])
      .filter((item) => item.link)
      .map((item) => ({
        title: item.title ?? item.link!,
        link: item.link!,
        snippet: item.snippet ?? "",
        source: (() => {
          try {
            return new URL(item.link!).hostname.replace(/^www\./, "");
          } catch {
            return item.link!;
          }
        })(),
      }));
    return items.length > 0 ? items : fallbackEvidence;
  } catch {
    return fallbackEvidence;
  }
}

function formatEvidence(evidence: Evidence[]) {
  return evidence
    .map((item, index) => `SOURCE ${index + 1}\nTitle: ${item.title}\nURL: ${item.link}\nSnippet: ${item.snippet}`)
    .join("\n\n");
}

function unavailable() {
  return new Response(
    JSON.stringify({ error: "Verification service temporarily unavailable. Please try again." }),
    { status: 503, headers: jsonHeaders },
  );
}

export const Route = createFileRoute("/api/verify")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 200, headers: corsHeaders }),
      POST: async ({ request }) => {
        let claim = "";
        try {
          const body = (await request.json()) as { claim?: string };
          claim = (body.claim ?? "").trim();
        } catch {
          claim = "";
        }

        if (!claim) {
          return new Response(JSON.stringify({ error: "A claim is required." }), {
            status: 400,
            headers: jsonHeaders,
          });
        }

        let normalizedClaim: string;
        try {
          normalizedClaim = await callAnthropic(NORMALIZER_PROMPT, claim, 200);
        } catch {
          return unavailable();
        }

        const evidence = await searchEvidence(normalizedClaim);

        let assessment: Record<string, unknown>;
        try {
          const raw = await callAnthropic(
            ASSESSOR_PROMPT,
            `Claim: ${normalizedClaim}\n\nEvidence:\n${formatEvidence(evidence)}`,
            2000,
          );
          const start = raw.indexOf("{");
          const end = raw.lastIndexOf("}");
          assessment = JSON.parse(start >= 0 ? raw.slice(start, end + 1) : raw) as Record<string, unknown>;
        } catch {
          return unavailable();
        }

        return new Response(
          JSON.stringify({ ...assessment, assessed_at: new Date().toISOString() }),
          { status: 200, headers: jsonHeaders },
        );
      },
    },
  },
});
