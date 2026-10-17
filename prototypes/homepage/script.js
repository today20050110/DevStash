(() => {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  initNavbar();
  initReveal();
  initChaos();
  initPricingToggle();
  document.getElementById("year").textContent = String(new Date().getFullYear());

  function initNavbar() {
    const nav = document.getElementById("nav");
    const update = () => nav.classList.toggle("scrolled", window.scrollY > 16);
    update();
    window.addEventListener("scroll", update, { passive: true });
  }

  function initReveal() {
    const targets = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      targets.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );
    targets.forEach((el) => observer.observe(el));
  }

  function initChaos() {
    const field = document.getElementById("chaos-field");
    const icons = Array.from(field.querySelectorAll(".chaos-icon"));
    const BASE_SPEED = 0.6;
    const MAX_SPEED = 4;
    const REPEL_RADIUS = 110;
    const REPEL_FORCE = 0.9;

    let width = field.clientWidth;
    let height = field.clientHeight;
    const pointer = { x: 0, y: 0, active: false };

    const bodies = icons.map((el) => {
      const size = el.offsetWidth;
      const angle = Math.random() * Math.PI * 2;
      return {
        el,
        size,
        x: Math.random() * Math.max(width - size, 1),
        y: Math.random() * Math.max(height - size, 1),
        vx: Math.cos(angle) * BASE_SPEED,
        vy: Math.sin(angle) * BASE_SPEED,
        rotation: Math.random() * 30 - 15,
        spin: (Math.random() - 0.5) * 0.4,
        phase: Math.random() * Math.PI * 2,
      };
    });

    const render = (body, time) => {
      const scale = 1 + Math.sin(time / 900 + body.phase) * 0.08;
      body.el.style.transform =
        `translate(${body.x}px, ${body.y}px) rotate(${body.rotation}deg) scale(${scale})`;
    };

    bodies.forEach((body) => render(body, 0));
    if (prefersReducedMotion) return;

    field.addEventListener("pointermove", (event) => {
      const rect = field.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.active = true;
    });
    field.addEventListener("pointerleave", () => {
      pointer.active = false;
    });

    new ResizeObserver(() => {
      width = field.clientWidth;
      height = field.clientHeight;
    }).observe(field);

    let running = false;
    let frameId = 0;

    const step = (body) => {
      if (pointer.active) {
        const dx = body.x + body.size / 2 - pointer.x;
        const dy = body.y + body.size / 2 - pointer.y;
        const distance = Math.hypot(dx, dy) || 1;
        if (distance < REPEL_RADIUS) {
          const push = ((REPEL_RADIUS - distance) / REPEL_RADIUS) * REPEL_FORCE;
          body.vx += (dx / distance) * push;
          body.vy += (dy / distance) * push;
        }
      }

      const speed = Math.hypot(body.vx, body.vy);
      if (speed > MAX_SPEED) {
        body.vx = (body.vx / speed) * MAX_SPEED;
        body.vy = (body.vy / speed) * MAX_SPEED;
      } else if (speed > BASE_SPEED) {
        body.vx *= 0.97;
        body.vy *= 0.97;
      }

      body.x += body.vx;
      body.y += body.vy;
      body.rotation += body.spin;

      const maxX = width - body.size;
      const maxY = height - body.size;
      if (body.x <= 0 || body.x >= maxX) {
        body.x = Math.min(Math.max(body.x, 0), maxX);
        body.vx *= -1;
        body.spin *= -1;
      }
      if (body.y <= 0 || body.y >= maxY) {
        body.y = Math.min(Math.max(body.y, 0), maxY);
        body.vy *= -1;
      }
    };

    const tick = (time) => {
      bodies.forEach((body) => {
        step(body);
        render(body, time);
      });
      frameId = requestAnimationFrame(tick);
    };

    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !running) {
        running = true;
        frameId = requestAnimationFrame(tick);
      } else if (!entry.isIntersecting && running) {
        running = false;
        cancelAnimationFrame(frameId);
      }
    }).observe(field);
  }

  function initPricingToggle() {
    const options = document.querySelectorAll(".toggle-option");
    const amount = document.getElementById("pro-amount");
    const per = document.getElementById("pro-per");
    const note = document.getElementById("pro-note");
    const plans = {
      monthly: { amount: "$8", per: "/month", note: "Billed monthly. Cancel anytime." },
      yearly: { amount: "$72", per: "/year", note: "Just $6/month, billed yearly." },
    };

    options.forEach((option) => {
      option.addEventListener("click", () => {
        const plan = plans[option.dataset.period];
        options.forEach((other) => {
          const selected = other === option;
          other.classList.toggle("active", selected);
          other.setAttribute("aria-pressed", String(selected));
        });
        amount.textContent = plan.amount;
        per.textContent = plan.per;
        note.textContent = plan.note;
      });
    });
  }
})();
