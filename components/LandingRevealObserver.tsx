"use client";

import { useLayoutEffect } from "react";

type RevealDirection = "up" | "left" | "right" | "scale";

type RevealTarget = {
  element: HTMLElement;
  direction: RevealDirection;
  delay: number;
};

const BASE_DELAY = 72;
const COLLECTION_DELAY = 82;
const MAX_DELAY = 410;

function addTarget(
  targets: Map<HTMLElement, RevealTarget>,
  element: Element | null,
  direction: RevealDirection,
  delay = 0,
) {
  if (!(element instanceof HTMLElement) || targets.has(element)) return;

  targets.set(element, {
    element,
    direction,
    delay: Math.min(delay, MAX_DELAY),
  });
}

function addSequence(
  targets: Map<HTMLElement, RevealTarget>,
  elements: NodeListOf<Element> | Element[],
  direction: RevealDirection,
  step = BASE_DELAY,
) {
  Array.from(elements).forEach((element, index) => {
    addTarget(targets, element, direction, index * step);
  });
}

export default function LandingRevealObserver() {
  useLayoutEffect(() => {
    const root = document.querySelector<HTMLElement>("[data-landing-reveal-root]");
    if (!root) return;

    const targets = new Map<HTMLElement, RevealTarget>();

    root.querySelectorAll(`
      .stats-card,
      .quick-grid,
      .step-grid,
      .reminder-grid,
      .info-grid
    `).forEach((group) => {
      addSequence(targets, group.querySelectorAll(":scope > *"), "up");
    });

    const collectionGrid = root.querySelector(".book-grid");
    if (collectionGrid) {
      Array.from(collectionGrid.children).forEach((element, index) => {
        addTarget(
          targets,
          element,
          index % 2 === 0 ? "left" : "right",
          index * COLLECTION_DELAY,
        );
      });
    }

    addSequence(targets, root.querySelectorAll(".section-head"), "up", 0);
    addSequence(targets, root.querySelectorAll(".subject-list > a"), "left", 64);
    addSequence(targets, root.querySelectorAll(".donation-list > div"), "left", 64);

    const subjectGrid = root.querySelector(".subject-grid");
    if (subjectGrid) {
      addTarget(targets, subjectGrid.children.item(0), "left");
      addTarget(targets, subjectGrid.children.item(1), "right", 88);
    }

    root.querySelectorAll(".feature-row").forEach((element, index) => {
      addTarget(targets, element, index % 2 === 0 ? "left" : "right", index * 92);
    });

    const ebookGrid = root.querySelector(".ebook-grid");
    if (ebookGrid) {
      addTarget(targets, ebookGrid.children.item(0), "left");
      addTarget(targets, ebookGrid.children.item(1), "right", 96);
    }

    const donationGrid = root.querySelector(".donation-grid");
    if (donationGrid) {
      addTarget(targets, donationGrid.children.item(0), "left");
      addTarget(targets, donationGrid.children.item(1), "right", 96);
    }

    const memberGrid = root.querySelector(".member-grid");
    addTarget(targets, memberGrid, "scale");

    addSequence(targets, root.querySelectorAll(".section-action-center"), "up", 0);
    addSequence(targets, root.querySelectorAll(".contact-center"), "up", 0);

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    targets.forEach(({ element, direction, delay }) => {
      element.classList.add("landing-reveal-item");
      element.dataset.revealDirection = direction;
      element.style.setProperty("--reveal-delay", `${delay}ms`);
    });

    if (reducedMotion || !("IntersectionObserver" in window)) {
      targets.forEach(({ element }) => {
        element.classList.add("landing-reveal-visible");
      });
      return;
    }

    root.dataset.revealReady = "true";

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const element = entry.target as HTMLElement;
          element.classList.add("landing-reveal-visible");
          observer.unobserve(element);
        });
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -6% 0px",
      },
    );

    targets.forEach(({ element }) => observer.observe(element));

    return () => {
      observer.disconnect();
      delete root.dataset.revealReady;
      targets.forEach(({ element }) => {
        element.classList.remove("landing-reveal-item", "landing-reveal-visible");
        element.removeAttribute("data-reveal-direction");
        element.style.removeProperty("--reveal-delay");
      });
    };
  }, []);

  return null;
}
