"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { AFTER_IMAGE_DISCLAIMER } from "@/lib/afterImage/prompt.ts";
import { CONCERN_OPTIONS, defaultConcerns, type Concern } from "@/lib/afterImage/concerns.ts";
import { computeMaskRegions } from "@/lib/afterImage/maskRegions.ts";
import { compositeLocked, renderApiMask } from "@/lib/afterImage/maskCanvas.ts";
import { detectFace } from "@/lib/facial-analysis/faceLandmarker.ts";
import type { Assessment } from "@/lib/assessment/types.ts";

type Size = { width: number; height: number; label: string };

/** Picks the supported output size closest to the photo's aspect ratio. */
function pickSize(width: number, height: number): Size {
  const aspect = width / height;
  if (aspect > 1.2) return { width: 1536, height: 1024, label: "1536x1024" };
  if (aspect < 0.83) return { width: 1024, height: 1536, label: "1024x1536" };
  return { width: 1024, height: 1024, label: "1024x1024" };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read the image."));
    img.src = src;
  });
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not prepare the photo."))), type, quality),
  );
}

/** Cover-crops the photo to exactly the target size so photo, mask, landmarks and output all share one pixel grid. */
async function preparePhoto(file: File): Promise<{ canvas: HTMLCanvasElement; size: Size }> {
  const bitmap = await createImageBitmap(file);
  const size = pickSize(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const scale = Math.max(size.width / bitmap.width, size.height / bitmap.height);
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  canvas.getContext("2d")?.drawImage(bitmap, (size.width - w) / 2, (size.height - h) / 2, w, h);
  bitmap.close();
  return { canvas, size };
}

interface AfterImagePreviewProps {
  assessment: Assessment;
  frontFile: File | undefined;
}

export function AfterImagePreview({ assessment, frontFile }: AfterImagePreviewProps) {
  const [consent, setConsent] = useState(false);
  const [concerns, setConcerns] = useState<Concern[]>(() => defaultConcerns(assessment));
  const [status, setStatus] = useState<string | null>(null);
  const [result, setResult] = useState<{ before: string; after: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isGenerating = status !== null;
  const canGenerate = !!frontFile && concerns.length > 0 && consent && !isGenerating;
  const toggleConcern = (c: Concern) =>
    setConcerns((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  const generate = async () => {
    if (!frontFile) return;
    setError(null);
    try {
      setStatus("Scanning your face…");
      const { canvas, size } = await preparePhoto(frontFile);
      const photoBlob = await toBlob(canvas, "image/jpeg", 0.92);
      const photoUrl = URL.createObjectURL(photoBlob);
      let faces;
      try {
        faces = (await detectFace(await loadImage(photoUrl))).faces;
      } finally {
        URL.revokeObjectURL(photoUrl);
      }
      if (faces.length !== 1) {
        throw new Error(
          faces.length === 0
            ? "No face detected. Use a clear, front-facing, well-lit photo."
            : "More than one face detected. Use a photo with only one person.",
        );
      }

      const regions = computeMaskRegions(faces[0], concerns);
      const mask = await renderApiMask(regions, size.width, size.height);

      setStatus("Generating your preview…");
      const form = new FormData();
      form.set("photo", photoBlob, "front.jpg");
      form.set("mask", mask, "mask.png");
      form.set("size", size.label);
      form.set("concerns", JSON.stringify(concerns));
      form.set("consent", "true");
      const res = await fetch("/api/after-image", { method: "POST", body: form });
      const data = (await res.json().catch(() => null)) as { image?: string; error?: string } | null;
      if (!res.ok || !data?.image) throw new Error(data?.error ?? "Could not generate the preview.");

      setStatus("Finishing…");
      const generated = await loadImage(data.image);
      const after = compositeLocked(canvas, generated, regions, size.width, size.height);
      setResult({ before: canvas.toDataURL("image/jpeg", 0.92), after });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate the preview.");
    } finally {
      setStatus(null);
    }
  };

  return (
    <div className="mt-8 rounded-2xl border border-border bg-surface p-6">
      <h3 className="text-sm font-medium uppercase tracking-wide text-muted">Treatment preview</h3>
      <p className="mt-2 text-sm text-muted">
        See an illustrative &ldquo;after&rdquo; image of how you could look after treatment at the clinic. Your eyes, nose and lips
        stay exactly as in your photo.
      </p>

      {!frontFile && <p className="mt-4 text-sm text-muted">Add a front photo to enable the preview.</p>}

      {frontFile && (
        <>
          <fieldset className="mt-4">
            <legend className="text-sm font-medium">What would you like to see treated?</legend>
            <div className="mt-3 space-y-2">
              {CONCERN_OPTIONS.map((c) => (
                <label key={c.value} className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={concerns.includes(c.value)}
                    onChange={() => toggleConcern(c.value)}
                  />
                  <span>
                    {c.label} <span className="text-muted">— {c.treatment}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="mt-3 flex items-start gap-3 text-sm">
            <input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>
              I agree to my front photo being sent securely to our image-generation provider to create this preview. It is
              not stored by this app.
            </span>
          </label>
          <div className="mt-4">
            <Button type="button" onClick={generate} disabled={!canGenerate}>
              {status ?? (result ? "Generate again" : "Generate preview")}
            </Button>
          </div>
        </>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-6">
          <div className="grid grid-cols-2 gap-4">
            <figure>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={result.before} alt="Before: your uploaded front photo" className="w-full rounded-xl" />
              <figcaption className="mt-2 text-center text-xs text-muted">Before</figcaption>
            </figure>
            <figure>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={result.after} alt="After: AI-generated treatment preview" className="w-full rounded-xl" />
              <figcaption className="mt-2 text-center text-xs text-muted">After (simulation)</figcaption>
            </figure>
          </div>
          <p className="mt-4 text-xs text-muted">{AFTER_IMAGE_DISCLAIMER}</p>
        </div>
      )}
    </div>
  );
}
