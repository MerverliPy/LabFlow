document.documentElement.classList.remove('no-js');

const commands = {
  status: {
    label: 'pnpm exec labflow status --json',
    output: `{
  "workspace": "ready",
  "schema": "healthy",
  "proof": "visible",
  "flow": "stable"
}`
  },
  init: {
    label: 'pnpm exec labflow init',
    output: `[labflow] bootstrapping workspace...
[ok] created .labflow/
[ok] repaired missing state files
[ok] workspace initialized`
  },
  task: {
    label: 'pnpm exec labflow task add "Ship release hardening"',
    output: `[task] created
id: task-0042
title: Ship release hardening
state: open
priority: normal`
  },
  session: {
    label: 'pnpm exec labflow session start',
    output: `[session] active session started
name: release-hardening
started_at: now
history_tracking: enabled`
  },
  memory: {
    label: 'pnpm exec labflow memory append "Need cleaner release checklist"',
    output: `[memory] note stored
tags: release, checklist
scope: local
visibility: workspace`
  },
  doctor: {
    label: 'pnpm exec labflow doctor --json',
    output: `{
  "identity": "labflow",
  "environment": "ok",
  "legacy_drift": "none",
  "recommended_action": "proceed"
}`
  }
};

const commandLabel = document.getElementById('command-label');
const commandOutput = document.getElementById('command-output');
const tabs = [...document.querySelectorAll('.command-tab')];
const navToggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('.nav');

function setCommand(key) {
  const selected = commands[key];
  if (!selected) return;

  commandLabel.textContent = selected.label;
  commandOutput.textContent = selected.output;

  tabs.forEach((tab) => {
    const active = tab.dataset.command === key;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', String(active));
  });
}

tabs.forEach((tab) => {
  tab.addEventListener('click', () => setCommand(tab.dataset.command));
  tab.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setCommand(tab.dataset.command);
    }
  });
});

if (navToggle && nav) {
  navToggle.addEventListener('click', () => {
    const expanded = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!expanded));
    nav.classList.toggle('is-open', !expanded);
  });

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      nav.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

const revealTargets = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  revealTargets.forEach((el) => revealObserver.observe(el));
} else {
  revealTargets.forEach((el) => el.classList.add('is-visible'));
}


// CONVERSION UPGRADE PACK
(function () {
  const copyButtons = document.querySelectorAll("[data-copy]");
  if (!copyButtons.length) return;

  copyButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      const text = button.getAttribute("data-copy") || "";
      const original = button.textContent || "Copy";
      try {
        await navigator.clipboard.writeText(text);
        button.textContent = "Copied";
        button.classList.add("is-copied");
      } catch (err) {
        button.textContent = "Failed";
      }
      window.setTimeout(() => {
        button.textContent = original;
        button.classList.remove("is-copied");
      }, 1400);
    });
  });
})();

// LABFLOW MEASUREMENT PACK
(function () {
  async function sendEvent(name, props) {
    try {
      if (window.zaraz && typeof window.zaraz.track === "function") {
        await window.zaraz.track(name, props || {});
      }
    } catch (err) {
      // no-op
    }
  }

  function getLocation(el) {
    if (!el) return "unknown";
    if (el.closest(".hero")) return "hero";
    if (el.closest(".topbar") || el.closest("header") || el.closest(".nav")) return "header";
    if (el.closest("#start")) return "start_section";
    if (el.closest("#commands")) return "commands_section";
    return "body";
  }

  document.addEventListener("click", async function (event) {
    const el = event.target.closest("a, button");
    if (!el) return;

    const text = (el.textContent || "").trim().slice(0, 80);

    if (el.matches('a[href="#start"], button[data-track="get-started"]')) {
      await sendEvent("get_started_click", {
        location: getLocation(el),
        text
      });
      return;
    }

    if (el.matches('a[href="https://github.com/MerverliPy/LabFlow"], a[href^="https://github.com/MerverliPy/LabFlow?"]')) {
      event.preventDefault();
      const href = el.getAttribute("href");
      const target = el.getAttribute("target");
      await sendEvent("open_github_repo_click", {
        location: getLocation(el),
        text
      });
      if (target === "_blank") {
        window.open(href, "_blank", "noopener,noreferrer");
      } else if (href) {
        window.location.href = href;
      }
      return;
    }

    if (el.matches('a[href="https://github.com/MerverliPy/LabFlow/releases"], a[href^="https://github.com/MerverliPy/LabFlow/releases?"]')) {
      event.preventDefault();
      const href = el.getAttribute("href");
      const target = el.getAttribute("target");
      await sendEvent("view_releases_click", {
        location: getLocation(el),
        text
      });
      if (target === "_blank") {
        window.open(href, "_blank", "noopener,noreferrer");
      } else if (href) {
        window.location.href = href;
      }
      return;
    }

    if (el.matches("[data-copy]")) {
      const raw = el.getAttribute("data-copy") || "";
      await sendEvent("copy_command_click", {
        location: getLocation(el),
        command: raw.replace(/\s+/g, " ").trim().slice(0, 120),
        text
      });
    }
  });
})();
