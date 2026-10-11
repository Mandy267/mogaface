"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { AFTER_IMAGE_DISCLAIMER, buildAfterImagePrompt } from "@/lib/afterImage/prompt.ts";
import type { Assessment } from "@/lib/assessment/types.ts";

const MAX_SIDE_PX = 1536;

/** Downscales the photo before upload so the request stays small and fast. */
async function prepareUpload(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE_PX / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
  if (!blob) throw new Error("Could not prepare the photo.");
  return blob;
}

interface AfterImagePreviewProps {
  assessment: Assessment;
  frontFile: File | undefined;
  frontPreviewUrl: string | undefined;
}

export function AfterImagePreview({ assessment, frontFile, frontPreviewUrl }: AfterImagePreviewProps) {
  const [consent, setConsent] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [afterImage, setAfterImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasGoal = buildAfterImagePrompt(assessment) !== null;
  const canGenerate = !!frontFile && hasGoal && consent && !isGenerating;

  const generate = async () => {
    if (!frontFile) return;
    setIsGenerating(true);
    setError(null);
    try {
      const upload = await prepareUpload(frontFile);
      const form = new FormData();
      form.set("photo", upload, "front.jpg");
      form.set("assessment", JSON.stringify(assessment));
      form.set("consent", "true");
      const res = await fetch("/api/after-image", { method: "POST", body: form });
      const data = (await res.json().catch(() => null)) as { image?: string; error?: string } | null;
      if (!res.ok || !data?.image) throw new Error(data?.error ?? "Could not generate the preview.");
      setAfterImage(data.image);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate the preview.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="mt-8 rounded-2xl border border-border bg-surface p-6">
      <h3 className="text-sm font-medium uppercase tracking-wide text-muted">Treatment preview</h3>
      <p className="mt-2 text-sm text-muted">
        See an illustrative &ldquo;after&rdquo; image based on your goals and your front photo.
      </p>

      {!frontFile && <p className="mt-4 text-sm text-muted">Add a front photo to enable the preview.</p>}
      {frontFile && !hasGoal && (
        <p className="mt-4 text-sm text-muted">Choose a goal such as skin, hair, facial hair, jawline or face to enable the preview.</p>
      )}

      {frontFile && hasGoal && (
        <>
          <label className="mt-4 flex items-start gap-3 text-sm">
            <input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>
              I agree to my front photo being sent securely to our image-generation provider to create this preview. It is
              not stored by this app.
            </span>
          </label>
          <div className="mt-4">
            <Button type="button" onClick={generate} disabled={!canGenerate}>
              {isGenerating ? "Generating preview…" : afterImage ? "Generate again" : "Generate preview"}
            </Button>
          </div>
        </>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {afterImage && frontPreviewUrl && (
        <div className="mt-6">
          <div className="grid grid-cols-2 gap-4">
            <figure>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={frontPreviewUrl} alt="Before: your uploaded front photo" className="w-full rounded-xl" />
              <figcaption className="mt-2 text-center text-xs text-muted">Before</figcaption>
            </figure>
            <figure>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={afterImage} alt="After: AI-generated treatment preview" className="w-full rounded-xl" />
              <figcaption className="mt-2 text-center text-xs text-muted">After (simulation)</figcaption>
            </figure>
          </div>
          <p className="mt-4 text-xs text-muted">{AFTER_IMAGE_DISCLAIMER}</p>
        </div>
      )}
    </div>
  );
}
