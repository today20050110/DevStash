"use client";

import { useEffect, useRef, useState } from "react";

import { CHAOS_ICONS } from "@/components/homepage/homepage-content";
import { cn } from "@/lib/utils";

const BASE_SPEED = 0.6;
const MAX_SPEED = 4;
const REPEL_RADIUS = 110;
const REPEL_FORCE = 0.9;

interface Body {
  el: HTMLElement;
  size: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  spin: number;
  phase: number;
}

interface Bounds {
  width: number;
  height: number;
}

interface Pointer {
  x: number;
  y: number;
  active: boolean;
}

function createBody(el: HTMLElement, bounds: Bounds): Body {
  const size = el.offsetWidth;
  const angle = Math.random() * Math.PI * 2;
  return {
    el,
    size,
    x: Math.random() * Math.max(bounds.width - size, 1),
    y: Math.random() * Math.max(bounds.height - size, 1),
    vx: Math.cos(angle) * BASE_SPEED,
    vy: Math.sin(angle) * BASE_SPEED,
    rotation: Math.random() * 30 - 15,
    spin: (Math.random() - 0.5) * 0.4,
    phase: Math.random() * Math.PI * 2,
  };
}

function repel(body: Body, pointer: Pointer) {
  if (!pointer.active) return;
  const dx = body.x + body.size / 2 - pointer.x;
  const dy = body.y + body.size / 2 - pointer.y;
  const distance = Math.hypot(dx, dy) || 1;
  if (distance >= REPEL_RADIUS) return;
  const push = ((REPEL_RADIUS - distance) / REPEL_RADIUS) * REPEL_FORCE;
  body.vx += (dx / distance) * push;
  body.vy += (dy / distance) * push;
}

// 被游標推開後速度上限為 MAX_SPEED，並逐漸衰減回 BASE_SPEED 的漂移
function limitSpeed(body: Body) {
  const speed = Math.hypot(body.vx, body.vy);
  if (speed > MAX_SPEED) {
    body.vx = (body.vx / speed) * MAX_SPEED;
    body.vy = (body.vy / speed) * MAX_SPEED;
  } else if (speed > BASE_SPEED) {
    body.vx *= 0.97;
    body.vy *= 0.97;
  }
}

function move(body: Body, bounds: Bounds) {
  body.x += body.vx;
  body.y += body.vy;
  body.rotation += body.spin;

  const maxX = bounds.width - body.size;
  const maxY = bounds.height - body.size;
  if (body.x <= 0 || body.x >= maxX) {
    body.x = Math.min(Math.max(body.x, 0), maxX);
    body.vx *= -1;
    body.spin *= -1;
  }
  if (body.y <= 0 || body.y >= maxY) {
    body.y = Math.min(Math.max(body.y, 0), maxY);
    body.vy *= -1;
  }
}

function render(body: Body, time: number) {
  const scale = 1 + Math.sin(time / 900 + body.phase) * 0.08;
  body.el.style.transform = `translate(${body.x}px, ${body.y}px) rotate(${body.rotation}deg) scale(${scale})`;
}

function startAnimation(field: HTMLElement, onReady: () => void) {
  const bounds: Bounds = { width: field.clientWidth, height: field.clientHeight };
  const pointer: Pointer = { x: 0, y: 0, active: false };
  const icons = Array.from(field.querySelectorAll<HTMLElement>("[data-chaos-icon]"));
  const bodies = icons.map((el) => createBody(el, bounds));
  bodies.forEach((body) => render(body, 0));
  onReady();

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {};

  let frameId = 0;
  const tick = (time: number) => {
    bodies.forEach((body) => {
      repel(body, pointer);
      limitSpeed(body);
      move(body, bounds);
      render(body, time);
    });
    frameId = requestAnimationFrame(tick);
  };

  const onPointerMove = (event: PointerEvent) => {
    const rect = field.getBoundingClientRect();
    pointer.x = event.clientX - rect.left;
    pointer.y = event.clientY - rect.top;
    pointer.active = true;
  };
  const onPointerLeave = () => {
    pointer.active = false;
  };
  field.addEventListener("pointermove", onPointerMove);
  field.addEventListener("pointerleave", onPointerLeave);

  const resizeObserver = new ResizeObserver(() => {
    bounds.width = field.clientWidth;
    bounds.height = field.clientHeight;
  });
  resizeObserver.observe(field);

  // 離開畫面時暫停，避免在背景持續耗用 CPU
  const visibilityObserver = new IntersectionObserver(([entry]) => {
    cancelAnimationFrame(frameId);
    if (entry.isIntersecting) frameId = requestAnimationFrame(tick);
  });
  visibilityObserver.observe(field);

  return () => {
    cancelAnimationFrame(frameId);
    field.removeEventListener("pointermove", onPointerMove);
    field.removeEventListener("pointerleave", onPointerLeave);
    resizeObserver.disconnect();
    visibilityObserver.disconnect();
  };
}

export function ChaosField() {
  const fieldRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!fieldRef.current) return;
    return startAnimation(fieldRef.current, () => setReady(true));
  }, []);

  return (
    <div
      ref={fieldRef}
      className="relative flex-1 overflow-hidden rounded-lg bg-background bg-[radial-gradient(circle_at_20%_30%,--alpha(var(--color-home-image)/6%),transparent_50%),radial-gradient(circle_at_80%_70%,--alpha(var(--color-home-prompt)/6%),transparent_50%)]"
    >
      {CHAOS_ICONS.map(({ label, Icon, color }) => (
        <span
          key={label}
          data-chaos-icon
          title={label}
          className={cn(
            "absolute top-0 left-0 grid size-13 place-items-center rounded-xl border bg-muted will-change-transform transition-opacity duration-500",
            ready ? "opacity-100" : "opacity-0",
            color,
          )}
        >
          <Icon className="size-6.5" />
        </span>
      ))}
    </div>
  );
}
