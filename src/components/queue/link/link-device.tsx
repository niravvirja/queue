import { AnimatePresence, motion } from "motion/react";
import {
  ArrowClockwise,
  Check,
  DeviceMobile,
  Desktop,
  Keyboard,
  QrCode,
  ShieldCheck,
  SpinnerGap,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Logo } from "../shared/primitives";

/* ---------------- shared helpers ---------------- */

// device_links is created by the manual SQL snippet, so it is not in the
// generated Supabase types yet — access it through a narrow local shape.
type DeviceLinksTable = {
  select: (columns: string) => {
    order: (
      column: string,
      options: { ascending: boolean },
    ) => PromiseLike<{ data: unknown; error: unknown }>;
  };
  insert: (row: Record<string, unknown>) => PromiseLike<{ error: unknown }>;
  delete: () => { eq: (column: string, value: string) => PromiseLike<{ error: unknown }> };
};
const deviceLinks = () =>
  (supabase as unknown as { from: (table: string) => DeviceLinksTable }).from("device_links");

const CHANNEL = (session: string) => `device-link:${session}`;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeSessionCode() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

function formatCode(code: string) {
  return code.replace(/(.{4})/g, "$1 ").trim();
}

function describeBrowser() {
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Safari\//.test(ua)
          ? "Safari"
          : /Firefox\//.test(ua)
            ? "Firefox"
            : "Browser";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Mac OS X/.test(ua)
      ? "macOS"
      : /Linux/.test(ua)
        ? "Linux"
        : /Android/.test(ua)
          ? "Android"
          : /iPhone|iPad/.test(ua)
            ? "iOS"
            : "Desktop";
  return `${browser} · ${os}`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "Active just now";
  if (minutes < 60) return `Active ${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Active ${hours}h ago`;
  return `Active ${Math.round(hours / 24)}d ago`;
}

/* ---------------- real QR rendering ---------------- */

export function QueueQr({ value, className }: { value: string; className?: string }) {
  const [svg, setSvg] = useState<string>("");

  useEffect(() => {
    let alive = true;
    void QRCode.toString(value, {
      type: "svg",
      errorCorrectionLevel: "M",
      margin: 0,
      color: { dark: "#98B958", light: "#00000000" },
    }).then((markup) => {
      if (alive) setSvg(markup);
    });
    return () => {
      alive = false;
    };
  }, [value]);

  return (
    <div
      role="img"
      aria-label="Device linking QR code"
      className={cn("[&>svg]:size-full", className)}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

/* ---------------- desktop linking screen ---------------- */

type LinkPhase = "idle" | "waiting" | "linked";

export type LinkPayload = {
  device?: string;
  access_token?: string;
  refresh_token?: string;
  identity?: string;
};

export function DesktopLink() {
  const [session, setSession] = useState<string>("");
  const [phase, setPhase] = useState<LinkPhase>("idle");
  const [linkedFrom, setLinkedFrom] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const adopt = useCallback(async (payload: LinkPayload) => {
    setLinkedFrom(payload.device ?? "your phone");
    setPhase("linked");
    if (!payload.access_token || !payload.refresh_token) return;
    try {
      const { data } = await supabase.auth.setSession({
        access_token: payload.access_token,
        refresh_token: payload.refresh_token,
      });
      const userId = data.user?.id ?? data.session?.user?.id;
      if (userId && payload.identity) {
        window.sessionStorage.setItem(`queue.identity.${userId}`, payload.identity);
      }
      window.setTimeout(() => window.location.reload(), 1400);
    } catch {
      /* stay on the confirmation screen */
    }
  }, []);

  useEffect(() => {
    if (phase !== "waiting" || !session) return;
    const channel = supabase
      .channel(CHANNEL(session), { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "linked" }, (message) => {
        void adopt((message["payload"] ?? {}) as LinkPayload);
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [session, phase, adopt]);

  const generate = () => {
    setSession(makeSessionCode());
    setLinkedFrom("");
    setPhase("waiting");
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(session);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  const steps = [
    "Open Queue on your phone",
    "Tap Devices in the bottom bar",
    "Scan this code, or type it in",
  ];

  return (
    <section className="hidden h-full w-full items-center justify-center overflow-y-auto px-6 py-10 md:flex">
      <div className="w-full max-w-sm text-center">
        <Logo className="mx-auto" />

        <div className="mx-auto mt-10 grid aspect-square w-60 place-items-center rounded-3xl bg-ink/[0.04]">
          <AnimatePresence mode="wait" initial={false}>
            {phase === "linked" ? (
              <motion.div
                key="linked"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 320, damping: 26 }}
                className="grid size-16 place-items-center rounded-full bg-accent text-ink"
              >
                <Check className="size-8" weight="bold" aria-hidden="true" />
              </motion.div>
            ) : phase === "waiting" ? (
              <motion.div
                key="qr"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 320, damping: 28 }}
                className="size-48"
              >
                <QueueQr value={`queue-link:${session}`} className="size-full" />
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 320, damping: 28 }}
              >
                <Button
                  onClick={generate}
                  className="h-12 rounded-full bg-accent px-7 text-ink hover:bg-accent/90"
                >
                  <QrCode weight="fill" aria-hidden="true" />
                  Generate QR
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {phase === "linked" ? (
          <>
            <p className="mt-8 font-display text-lg font-semibold">
              Linking signal received successfully
            </p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Confirmed from {linkedFrom}. Opening Queue on this computer…
            </p>
          </>
        ) : (
          <>
            <ol className="mx-auto mt-8 w-fit space-y-3 text-left">
              {steps.map((step, index) => (
                <li key={step} className="flex items-center gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-[11px] font-semibold text-ink">
                    {index + 1}
                  </span>
                  <span className="text-sm text-foreground/80">{step}</span>
                </li>
              ))}
            </ol>

            {phase === "waiting" && (
              <>
                <p className="mt-8 font-display text-base font-semibold tracking-code">
                  {formatCode(session)}
                </p>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={generate}
                    className="h-12 rounded-full border-accent bg-transparent text-accent hover:bg-accent/10 hover:text-accent"
                  >
                    <ArrowClockwise weight="bold" aria-hidden="true" />
                    New code
                  </Button>
                  <Button
                    onClick={copy}
                    className="h-12 rounded-full bg-accent text-ink hover:bg-accent/90"
                  >
                    {copied ? <Check weight="bold" aria-hidden="true" /> : null}
                    {copied ? "Copied" : "Copy code"}
                  </Button>
                </div>
              </>
            )}

            <p className="mt-8 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
              <ShieldCheck className="size-4 text-accent" weight="duotone" aria-hidden="true" />
              End-to-end encrypted · your password is never shared
            </p>
          </>
        )}
      </div>
    </section>
  );
}

/* ---------------- mobile: devices screen ---------------- */

type DeviceRow = {
  id: string;
  device_name: string;
  device_type: string;
  last_active_at: string;
};

type ScanState = "idle" | "camera" | "manual" | "linking";

export function DevicesScreen() {
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<ScanState>("idle");
  const [manual, setManual] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [justLinked, setJustLinked] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const load = useCallback(async () => {
    const { data, error: loadError } = await deviceLinks()
      .select("id, device_name, device_type, last_active_at")
      .order("created_at", { ascending: false });
    if (loadError) setError("Could not load your devices yet.");
    setDevices((data as DeviceRow[] | null) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const link = useCallback(
    async (rawCode: string) => {
      const code = rawCode.replace(/^queue-link:/i, "").replace(/\s+/g, "").toUpperCase();
      if (code.length < 8) {
        setError("That code doesn't look right.");
        return;
      }
      setState("linking");
      setError(null);
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) {
        setError("Please sign in again.");
        setState("idle");
        return;
      }
      const deviceName = describeBrowser();
      const { error: insertError } = await deviceLinks().insert({
        user_id: userId,
        session_id: code,
        device_name: deviceName,
        device_type: "desktop",
      });
      if (insertError) {
        setError("That code has already been used or has expired.");
        setState("manual");
        return;
      }
      const channel = supabase.channel(CHANNEL(code));
      await new Promise<void>((resolve) => {
        channel.subscribe((status) => {
          if (status === "SUBSCRIBED") resolve();
        });
        window.setTimeout(resolve, 2500);
      });
      const { data: sessionData } = await supabase.auth.getSession();
      const identity = window.sessionStorage.getItem(`queue.identity.${userId}`);
      await channel.send({
        type: "broadcast",
        event: "linked",
        payload: {
          device: "your phone",
          access_token: sessionData.session?.access_token,
          refresh_token: sessionData.session?.refresh_token,
          identity,
        },
      });
      await supabase.removeChannel(channel);
      setManual("");
      setJustLinked(true);
      window.setTimeout(() => setJustLinked(false), 3000);
      setState("idle");
      await load();
    },
    [load],
  );

  // Camera scanning where the browser supports barcode detection.
  const cameraSupported = useMemo(
    () => typeof window !== "undefined" && "BarcodeDetector" in window,
    [],
  );

  useEffect(() => {
    if (state !== "camera") return;
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;

    const run = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (stopped) return;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        const Detector = (window as unknown as { BarcodeDetector: new (o: object) => { detect: (s: CanvasImageSource) => Promise<{ rawValue: string }[]> } }).BarcodeDetector;
        const detector = new Detector({ formats: ["qr_code"] });
        const tick = async () => {
          if (stopped || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            const first = codes[0]?.rawValue;
            if (first) {
              stopped = true;
              await link(first);
              return;
            }
          } catch {
            /* keep scanning */
          }
          raf = window.requestAnimationFrame(() => void tick());
        };
        void tick();
      } catch {
        setError("Camera unavailable — enter the code instead.");
        setState("manual");
      }
    };
    void run();

    return () => {
      stopped = true;
      window.cancelAnimationFrame(raf);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [state, link]);

  const unlink = async (id: string) => {
    setDevices((list) => list.filter((item) => item.id !== id));
    await deviceLinks().delete().eq("id", id);
  };

  return (
    <div className="px-5 pb-32 pt-2">
      <h1 className="font-display text-2xl font-semibold">Devices</h1>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        Open Queue on your computer and scan the code shown there.
      </p>

      <AnimatePresence initial={false} mode="wait">
        {state === "camera" && (
          <motion.div
            key="camera"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="mt-6"
          >
            <div className="relative mx-auto aspect-square w-56 overflow-hidden rounded-3xl bg-ink">
              <video
                ref={videoRef}
                playsInline
                muted
                className="size-full object-cover opacity-90"
              />
              <div className="pointer-events-none absolute inset-6 rounded-2xl border-2 border-accent/80" />
              <motion.span
                className="pointer-events-none absolute inset-x-6 h-0.5 rounded-full bg-accent"
                animate={{ top: ["14%", "82%", "14%"] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
          </motion.div>
        )}

        {state === "manual" && (
          <motion.div
            key="manual"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="mt-6"
          >
            <input
              value={manual}
              onChange={(event) => setManual(event.target.value.toUpperCase())}
              placeholder="Linking code"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              className="h-12 w-full rounded-full bg-ink px-5 text-sm tracking-code text-accent outline-none placeholder:text-accent/50"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {state === "linking" && (
        <p className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <SpinnerGap className="size-4 animate-spin text-accent" weight="bold" aria-hidden="true" />
          Linking your computer…
        </p>
      )}

      {justLinked && (
        <p className="mt-6 flex items-center justify-center gap-2 text-xs font-semibold text-accent">
          <Check className="size-4" weight="bold" aria-hidden="true" />
          Computer linked
        </p>
      )}

      {error && <p className="mt-4 text-center text-xs text-destructive">{error}</p>}

      <div className="mt-6 grid grid-cols-2 gap-3">
        {state === "idle" || state === "linking" ? (
          <>
            <Button
              variant="outline"
              onClick={() => {
                setError(null);
                setState("manual");
              }}
              className="h-12 rounded-full border-accent bg-transparent text-accent hover:bg-accent/10 hover:text-accent"
            >
              <Keyboard weight="bold" aria-hidden="true" />
              Enter code
            </Button>
            <Button
              disabled={state === "linking"}
              onClick={() => {
                setError(null);
                setState(cameraSupported ? "camera" : "manual");
              }}
              className="h-12 rounded-full bg-accent text-ink hover:bg-accent/90"
            >
              <QrCode weight="fill" aria-hidden="true" />
              Scan code
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="outline"
              onClick={() => {
                setError(null);
                setState("idle");
              }}
              className="h-12 rounded-full border-accent bg-transparent text-accent hover:bg-accent/10 hover:text-accent"
            >
              Cancel
            </Button>
            <Button
              disabled={state === "camera" || manual.trim().length < 8}
              onClick={() => void link(manual)}
              className="h-12 rounded-full bg-accent text-ink hover:bg-accent/90"
            >
              {state === "camera" ? "Scanning…" : "Link"}
            </Button>
          </>
        )}
      </div>

      <section className="mt-10">
        <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Your devices
        </p>
        <div className="mt-2">
          <div className="flex items-center gap-3 border-b border-ink/8 py-4">
            <DeviceMobile className="size-5 text-accent" weight="duotone" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">This phone</p>
              <p className="text-[11px] text-muted-foreground">Active now</p>
            </div>
            <span className="text-[11px] font-semibold text-accent">Current</span>
          </div>

          {loading ? (
            <p className="py-5 text-center text-xs text-muted-foreground">Loading…</p>
          ) : devices.length === 0 ? (
            <p className="py-5 text-center text-xs text-muted-foreground">
              No computers linked yet.
            </p>
          ) : (
            devices.map((device) => (
              <div key={device.id} className="flex items-center gap-3 border-b border-ink/8 py-4">
                <Desktop className="size-5 text-accent" weight="duotone" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{device.device_name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {timeAgo(device.last_active_at)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void unlink(device.id)}
                  className="h-8 rounded-full px-3 text-[11px] text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  Unlink
                </Button>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
