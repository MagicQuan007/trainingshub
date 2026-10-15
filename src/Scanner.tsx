import { useEffect, useRef, useState } from "react";

type Props = { onResult: (code: string) => void; onClose: () => void };

/** Kamera-Barcode-Scanner (EAN/UPC). Die Bibliothek wird erst beim Öffnen geladen. */
export default function Scanner({ onResult, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const cb = useRef(onResult);
  cb.current = onResult;

  useEffect(() => {
    let stop: (() => void) | null = null;
    let done = false;
    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const { BarcodeFormat, DecodeHintType } = await import("@zxing/library");
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E,
        ]);
        const reader = new BrowserMultiFormatReader(hints);
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } }, audio: false },
          videoRef.current!,
          (result) => {
            if (result && !done) {
              done = true;
              controls.stop();
              if (navigator.vibrate) navigator.vibrate(60);
              cb.current(result.getText());
            }
          },
        );
        stop = () => controls.stop();
      } catch (e) {
        setError(e instanceof Error && e.name === "NotAllowedError"
          ? "Kamerazugriff wurde nicht erlaubt. Du kannst den Barcode unten eintippen."
          : "Kamera nicht verfügbar. Du kannst den Barcode unten eintippen.");
      }
    })();
    return () => {
      done = true;
      stop?.();
    };
  }, []);

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal narrow" role="dialog" aria-modal="true" aria-label="Barcode scannen">
        <div className="modal-head">
          <h2>Barcode scannen</h2>
          <button className="ghost icon" onClick={onClose} aria-label="Schließen">✕</button>
        </div>
        <div className="modal-body">
          {!error ? (
            <div className="scanner">
              <video ref={videoRef} muted playsInline />
              <div className="scan-frame" />
            </div>
          ) : (
            <p className="muted">{error}</p>
          )}
          <form
            className="manual-code"
            onSubmit={(e) => {
              e.preventDefault();
              if (manual.trim()) onResult(manual.trim());
            }}
          >
            <input inputMode="numeric" placeholder="Barcode eintippen" value={manual} onChange={(e) => setManual(e.target.value.replace(/\D/g, ""))} />
            <button type="submit" disabled={!manual}>Suchen</button>
          </form>
        </div>
      </div>
    </div>
  );
}
