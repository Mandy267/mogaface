import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { FaceMeshIllustration } from "@/components/layout/FaceMeshIllustration";

const STEPS = [
  { number: "01", title: "Upload", body: "Provide one clear, front-facing photo. It never leaves your device." },
  { number: "02", title: "Analyze", body: "Computer vision detects your face and maps its geometry." },
  { number: "03", title: "Understand", body: "Review structured, measurable results — no scores, no verdicts." },
];

const CATEGORIES = [
  { title: "Facial proportions", body: "Width-to-height and other ratios of the face." },
  { title: "Geometric symmetry", body: "How closely the left and right sides mirror each other." },
  { title: "Eye measurements", body: "Spacing, width and tilt of the eyes." },
  { title: "Nose measurements", body: "Width and length relative to the rest of the face." },
  { title: "Mouth measurements", body: "Width and lip proportions." },
  { title: "Jaw measurements", body: "Jawline width and angle." },
  { title: "Facial thirds", body: "Vertical balance between forehead, midface and lower face." },
];

const PRIVACY_POINTS = [
  { title: "On-device", body: "Analysis runs in your browser." },
  { title: "No upload", body: "Your photo is never sent to a server." },
  { title: "No verdicts", body: "Measurements only — no scores or rankings." },
];

export default function Home() {
  return (
    <>
      <Header />
      <main id="main" className="flex-1">
        <section className="mx-auto grid max-w-5xl items-center gap-12 px-6 py-16 sm:py-16 sm:py-24 md:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-sm font-medium tracking-wide text-muted uppercase">Computer-vision facial analysis</p>
            <h1 className="mt-4 max-w-2xl font-serif text-4xl leading-tight tracking-tight sm:text-6xl">
              Understand Your Face.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-muted">
              Explore measurable facial proportions, symmetry and features using computer vision.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <ButtonLink href="/analyze">Start Your Analysis</ButtonLink>
              <ButtonLink href="#how-it-works" variant="secondary">
                How It Works
              </ButtonLink>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
              <li>✓ Runs in your browser</li>
              <li>✓ Photo never uploaded</li>
              <li>✓ Takes under a minute</li>
            </ul>
          </div>
          <div className="mx-auto w-full max-w-xs md:max-w-none">
            <FaceMeshIllustration />
          </div>
        </section>

        <section id="how-it-works" className="border-t border-border bg-surface">
          <div className="mx-auto max-w-5xl px-6 py-16 sm:py-24">
            <h2 className="font-serif text-3xl tracking-tight">How it works</h2>
            <div className="mt-12 grid gap-10 sm:grid-cols-3">
              {STEPS.map((step) => (
                <div key={step.number}>
                  <span className="font-serif text-4xl text-muted">{step.number}</span>
                  <h3 className="mt-4 text-lg font-medium">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto max-w-5xl px-6 py-16 sm:py-24">
            <h2 className="font-serif text-3xl tracking-tight">What we analyze</h2>
            <ul className="mt-10 grid gap-3 sm:grid-cols-2">
              {CATEGORIES.map((category) => (
                <li key={category.title} className="rounded-xl border border-border bg-surface px-5 py-4">
                  <p className="text-sm font-medium text-foreground">{category.title}</p>
                  <p className="mt-1 text-sm text-muted">{category.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="privacy" className="border-t border-border bg-surface">
          <div className="mx-auto max-w-5xl px-6 py-16 sm:py-24">
            <h2 className="font-serif text-3xl tracking-tight">Privacy, by design</h2>
            <p className="mt-6 max-w-2xl text-base leading-7 text-muted">
              Your facial analysis is designed to process your image securely. During the initial prototype,
              analysis runs locally in your browser — your photo is never uploaded to a server.
            </p>
            <dl className="mt-10 grid gap-6 sm:grid-cols-3">
              {PRIVACY_POINTS.map((point) => (
                <div key={point.title} className="border-l-2 border-accent pl-4">
                  <dt className="text-sm font-medium">{point.title}</dt>
                  <dd className="mt-1 text-sm text-muted">{point.body}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto max-w-5xl px-6 py-16 sm:py-24 text-center">
            <h2 className="font-serif text-3xl tracking-tight">Ready to explore your facial geometry?</h2>
            <div className="mt-8 flex justify-center">
              <ButtonLink href="/analyze">Start Your Analysis</ButtonLink>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
