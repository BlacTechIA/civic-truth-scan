import { createFileRoute } from "@tanstack/react-router";
import { Paperclip, X } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";


import { Button } from "../components/button";

type Assessment = "TRUE" | "FALSE" | "MISLEADING" | "UNVERIFIABLE";

type VerificationResult = {
  assessment: Assessment;
  summary: string;
  why: string;
  confidence_context: string;
  country_context?: string;
  assessed_at: string;
  sources: Array<{
    title: string;
    publisher: string;
    source_type: "Primary" | "Secondary";
    published_at: string | null;
    url: string | null;
    relevance: string;
    evidence_summary: string;
  }>;
  next_steps: string[];
  limitations: string;
};

const mockResult: VerificationResult = {
  assessment: "MISLEADING",
  summary: "The claim contains a true element but omits important context that changes how it should be understood. The federal government did announce changes to the fuel subsidy structure, but the effective date and scope described in the circulated claim do not match what official documents state.",
  why: "Official publications from the Nigerian Midstream and Downstream Petroleum Regulatory Authority and statements published on the Federal Ministry of Finance website describe a phased adjustment, not an immediate blanket removal. The date cited in the claim is not confirmed in any government release found in the evidence set.",
  confidence_context: "Medium",
  assessed_at: "2026-09-14T10:30:00Z",
  sources: [
    { title: "NMDPRA Statement on Petroleum Pricing Framework", publisher: "Nigerian Midstream and Downstream Petroleum Regulatory Authority", source_type: "Primary", published_at: "2026-09-10", url: null, relevance: "Official regulatory body responsible for downstream petroleum pricing", evidence_summary: "The statement describes a phased pricing adjustment framework with no single removal date specified" },
    { title: "Federal Budget Office: Fuel Subsidy Removal Timeline Update", publisher: "Federal Ministry of Finance", source_type: "Primary", published_at: "2026-09-08", url: null, relevance: "Primary government source for fiscal policy decisions on subsidies", evidence_summary: "The ministry communique does not confirm the October 2026 date or the specific scope described in the circulating claim" },
    { title: "Analysis: What the New Petroleum Pricing Changes Mean for Nigerians", publisher: "Punch Nigeria", source_type: "Secondary", published_at: "2026-09-11", url: "https://punchng.com", relevance: "Established Nigerian newspaper covering the policy story", evidence_summary: "Reporting confirms ongoing policy changes but notes the government has not committed to a single removal date" },
  ],
  next_steps: [
    "Visit the official Federal Ministry of Finance website at finance.gov.ng to read the most recent statements on fuel pricing policy.",
    "Check the NMDPRA official portal for the current regulatory framework before drawing conclusions from circulated claims.",
    "If you received this claim on WhatsApp or social media, hold off on sharing it until official confirmation is available.",
  ],
  limitations: "This assessment is based on publicly available evidence retrieved at the time of checking. Fuel subsidy policy in Nigeria is subject to change. Always verify with primary government sources before acting on this information.",
};

const verdictLabels: Record<Assessment, string> = {
  TRUE: "True",
  FALSE: "False",
  MISLEADING: "Misleading",
  UNVERIFIABLE: "Unverifiable",
};

const verdictClasses: Record<Assessment, string> = {
  TRUE: "border-verdict-true-foreground bg-verdict-true text-verdict-true-foreground",
  FALSE: "border-verdict-false-foreground bg-verdict-false text-verdict-false-foreground",
  MISLEADING: "border-verdict-misleading-foreground bg-verdict-misleading text-verdict-misleading-foreground",
  UNVERIFIABLE: "border-verdict-unverifiable-foreground bg-verdict-unverifiable text-verdict-unverifiable-foreground",
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CivicCheck NG | Verify civic claims" },
      { name: "description", content: "Check civic claims against evidence from trusted Nigerian sources." },
      { property: "og:title", content: "CivicCheck NG | Verify civic claims" },
      { property: "og:description", content: "Check civic claims against evidence from trusted Nigerian sources." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CivicCheck,
});

function CivicCheck() {
  const [claimText, setClaimText] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState("");
  const [lowBandwidth, setLowBandwidth] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resultsRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setLowBandwidth(window.localStorage.getItem("civiccheck-low-bandwidth") === "true");
  }, []);

  const toggleLowBandwidth = () => {
    setLowBandwidth((previous) => {
      const next = !previous;
      window.localStorage.setItem("civiccheck-low-bandwidth", String(next));
      return next;
    });
  };

  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => {
    setAttachedFile(event.target.files?.[0] ?? null);
    setValidationError("");
  };

  const readFileAsBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const value = typeof reader.result === "string" ? reader.result : "";
        resolve(value.includes(",") ? value.slice(value.indexOf(",") + 1) : value);
      };
      reader.onerror = () => reject(new Error("file_read_failed"));
      reader.readAsDataURL(file);
    });

  const checkClaim = async () => {
    if (!claimText.trim() && !attachedFile) {
      setValidationError("Please enter a claim or attach a screenshot to continue");
      return;
    }

    setValidationError("");
    setError(null);
    setResult(null);
    setIsLoading(true);

    const apiBaseUrl = (import.meta.env["VITE_API_BASE_URL"] as string | undefined) ?? "";

    try {
      const imageBase64 = attachedFile ? await readFileAsBase64(attachedFile) : null;
      const response = await fetch(`${apiBaseUrl}/api/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claim: claimText,
          has_image: !!attachedFile,
          ...(imageBase64 ? { image_base64: imageBase64 } : {}),
        }),
      });
      if (!response.ok) {
        throw new Error(`Verification request failed with status ${response.status}`);
      }
      setResult((await response.json()) as VerificationResult);
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {
      if (import.meta.env.DEV) {
        await new Promise((resolve) => window.setTimeout(resolve, 2500));
        setResult(mockResult);
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        setError("We could not retrieve evidence for this claim. Please try rephrasing or check your connection.");
      }
    } finally {
      setIsLoading(false);
    }
  };



  const reset = () => {
    setClaimText("");
    setAttachedFile(null);
    setResult(null);
    setError(null);
    setValidationError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
    window.setTimeout(() => textareaRef.current?.focus(), 400);
  };

  const showResults = isLoading || result !== null || error !== null;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="fixed inset-x-0 top-0 z-20 bg-primary">
        <div className="mx-auto flex h-14 max-w-[1100px] items-center justify-between gap-4 px-4 sm:px-8 lg:px-12">
          <span className="font-display text-xl font-normal text-primary-foreground">CivicCheck NG</span>
          <div className="flex items-center gap-4">
            <span className="text-right text-[13px] text-header-tag">Transparency and Accountability</span>
            <button
              type="button"
              onClick={toggleLowBandwidth}
              aria-pressed={lowBandwidth}
              className="inline-flex items-center gap-2 text-[13px] text-header-tag"
            >
              <span
                aria-hidden="true"
                className={`inline-flex h-4 w-8 shrink-0 items-center rounded-full border border-header-tag/60 px-0.5 transition-colors ${lowBandwidth ? "bg-header-tag/40" : "bg-transparent"}`}
              >
                <span className={`size-3 rounded-full bg-header-tag transition-transform ${lowBandwidth ? "translate-x-3.5" : "translate-x-0"}`} />
              </span>
              <span>Low bandwidth</span>
            </button>
          </div>

        </div>
      </header>

      <section className="flex min-h-[60vh] scroll-mt-14 items-center px-4 pb-16 pt-28 sm:px-8 lg:px-12" aria-labelledby="page-heading">
        <div className="mx-auto w-full max-w-[820px] text-center">
          <h1 id="page-heading" className="font-display text-4xl font-normal leading-tight sm:text-[52px]">What have you heard?</h1>
          <p className="mx-auto mt-5 max-w-[520px] text-lg leading-7 text-secondary-foreground/80">Paste a civic claim or upload a screenshot. We search the evidence so you can decide what to trust.</p>
          <p className="mx-auto mt-3 max-w-[520px] text-sm leading-6 text-muted-foreground">You can submit claims in English, Pidgin, Hausa, Yoruba, Igbo, or Swahili.</p>
          <p className="mx-auto mt-2 max-w-[520px] text-xs leading-5 text-muted-foreground/70">Claims are not stored or linked to your identity. Available for Nigeria and Kenya.</p>


          <div className="mt-9 rounded-xl border border-border bg-card p-5 text-left shadow-[0_4px_18px_oklch(0.21_0.041_250.5/0.05)] sm:p-7">
            <label htmlFor="claim" className="sr-only">Civic claim</label>
            <textarea
              ref={textareaRef}
              id="claim"
              rows={4}
              value={claimText}
              onChange={(event) => { setClaimText(event.target.value); setValidationError(""); }}
              placeholder="Type or paste a civic claim here, for example: The federal government announced a new fuel subsidy removal effective October 2026"
              className="w-full resize-none border-0 bg-transparent text-base leading-7 text-card-foreground outline-none placeholder:text-muted-foreground/65"
            />
            <div className="mt-4 border-t border-border pt-4">
              {attachedFile ? (
                <div className="mb-4">
                  <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                    <span className="min-w-0 truncate">{attachedFile.name}</span>
                    <button type="button" onClick={() => setAttachedFile(null)} aria-label="Remove attached screenshot" className="shrink-0 rounded p-1 hover:text-accent focus-visible:outline-2 focus-visible:outline-ring">
                      <X className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">We will extract the text from your image and check the claim inside it.</p>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-4">
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-accent">
                  <Paperclip className="size-4" aria-hidden="true" />
                  <span>Attach a screenshot</span>
                  <input type="file" accept="image/*" onChange={chooseFile} className="sr-only" />
                </label>
                <Button type="button" loading={isLoading} onClick={checkClaim}>Check this claim</Button>
              </div>
            </div>
            {validationError ? <p role="alert" className="mt-4 text-sm text-destructive">{validationError}</p> : null}
          </div>
        </div>
      </section>

      <section ref={resultsRef} aria-live="polite" className={`scroll-mt-14 overflow-hidden bg-card transition-[max-height,opacity,padding] duration-400 ease-in-out ${showResults ? "max-h-[4000px] px-4 py-12 opacity-100 sm:px-8 lg:px-12" : "max-h-0 px-4 py-0 opacity-0"}`}>
        <div className="mx-auto max-w-[720px]">
          {isLoading ? <LoadingResults /> : null}
          {error ? <ErrorResults message={error} onReset={reset} /> : null}
          {result ? <Results result={result} onReset={reset} compact={lowBandwidth} /> : null}
        </div>
      </section>

      <footer className="border-t border-border bg-card px-4 pb-8 pt-8">
        <div className="mx-auto max-w-[720px]">
          <p className="text-sm leading-6 text-[#4A5568]">Built by Anigbobi Churchill for the Andela x OSF Hackathon 2026. Transparency and Accountability track.</p>
          <p className="mt-3 text-[13px] leading-5 text-[#9CA3AF]">civictruth.lovable.app</p>
        </div>
      </footer>
    </main>
  );
}

function LoadingResults() {
  return (
    <div aria-label="Checking claim" className="animate-pulse">
      <div className="border-l-4 border-muted-foreground bg-muted px-6 py-5">
        <div className="h-8 w-40 rounded bg-border" />
        <div className="mt-3 h-4 w-72 max-w-full rounded bg-border" />
      </div>
      <div className="mt-10 space-y-4">
        <div className="h-5 w-full rounded bg-muted" />
        <div className="h-5 w-11/12 rounded bg-muted" />
        <div className="h-5 w-4/5 rounded bg-muted" />
      </div>
    </div>
  );
}

function ErrorResults({ message, onReset }: { message: string; onReset: () => void }) {
  return (
    <div className="py-8 text-center">
      <p className="text-base leading-7 text-[#4A5568]">{message}</p>
      <Button type="button" variant="outline" onClick={onReset} className="mt-8">Check another claim</Button>
    </div>
  );
}

function Results({ result, onReset, compact }: { result: VerificationResult; onReset: () => void; compact: boolean }) {
  return (
    <div>
      <div className={`border-l-4 px-6 py-5 ${verdictClasses[result.assessment]}`}>
        <p className="font-display text-[28px] leading-tight">{verdictLabels[result.assessment]}</p>
        <p className="mt-2 text-sm text-secondary-foreground/80">Based on evidence retrieved from Nigerian sources</p>
      </div>

      {result.assessment === "UNVERIFIABLE" ? (
        <p className="mt-6 text-[15px] leading-[1.7] text-[#475569]">
          We could not find enough reliable evidence to assess this claim. This does not mean the claim is false. It means the available sources do not allow a confident conclusion.
        </p>
      ) : null}


      <ResultSection title="What the evidence shows"><p>{result.summary}</p></ResultSection>
      <ResultSection title="Why this assessment"><p>{result.why}</p></ResultSection>

      <ResultSection title="Sources examined">
        {compact ? (
          <div className="space-y-2">
            {result.sources.map((source) => (
              <p key={`${source.publisher}-${source.title}`} className="text-sm leading-6 text-[#4A5568]">
                {source.publisher}. {source.evidence_summary}
              </p>
            ))}
          </div>
        ) : (
        <div className="space-y-5">
          {result.sources.map((source) => (

            <article key={`${source.publisher}-${source.title}`} className="border-l-2 border-border pl-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[13px] text-muted-foreground">{source.publisher}</p>
                <span className={`rounded-full px-2 py-0.5 text-xs ${source.source_type === "Primary" ? "bg-accent-light text-accent" : "bg-muted text-muted-foreground"}`}>{source.source_type}</span>
              </div>
              {source.url ? (
                <a href={source.url} target="_blank" rel="noreferrer" className="mt-1 block text-[15px] text-foreground underline decoration-border underline-offset-4 hover:text-accent">{source.title}</a>
              ) : <p className="mt-1 text-[15px] text-foreground">{source.title}</p>}
              {source.published_at ? <p className="mt-1 text-xs text-muted-foreground/70">Published {source.published_at}</p> : null}
              <p className="mt-2 text-sm italic leading-6 text-[#4A5568]">{source.relevance}</p>
              <p className="mt-1 text-sm leading-6 text-[#4A5568]">{source.evidence_summary}</p>
            </article>
          ))}
        </div>
        )}
      </ResultSection>


      <ResultSection title="What you can do">
        <div className="space-y-3">{result.next_steps.map((step) => <p key={step}>{step}</p>)}</div>
      </ResultSection>

      <div className="mt-10 border-t border-border pt-6 text-center">
        <p className="mx-auto max-w-[560px] text-[13px] leading-6 text-muted-foreground">{result.limitations}</p>
        <Button type="button" variant="outline" onClick={onReset} className="mt-7">Check another claim</Button>
      </div>
    </div>
  );
}

function ResultSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-[22px] font-normal text-foreground">{title}</h2>
      <div className="mt-3 text-base leading-[1.7] text-[#4A5568] [&_p]:text-[#4A5568]">{children}</div>

    </section>
  );
}