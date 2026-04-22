"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const PAST_TOPICS = [
  {
    topic: "Best Lunch Spot Near the Office",
    winner: "The Thai place on 3rd",
    contenders: ["Pizza joint", "Sandwich bar", "Sushi express", "The Thai place on 3rd"],
  },
  {
    topic: "Greatest 90s Movie",
    winner: "The Matrix",
    contenders: ["Titanic", "Home Alone", "Jurassic Park", "The Matrix"],
  },
  {
    topic: "Best WFH Perk",
    winner: "No commute",
    contenders: ["Flexible hours", "Comfy pants", "Pets on calls", "No commute"],
  },
  {
    topic: "Best Meeting-Free Day",
    winner: "Friday",
    contenders: ["Monday", "Wednesday", "Thursday", "Friday"],
  },
  {
    topic: "Office Snack Champion",
    winner: "Tim Tams",
    contenders: ["Shapes", "Fruit bowl", "Corn chips", "Tim Tams"],
  },
  {
    topic: "Best Team Lunch Format",
    winner: "BBQ at the park",
    contenders: ["Catered sandwiches", "Pizza party", "Sushi train", "BBQ at the park"],
  },
];

const STEPS = [
  {
    num: "01",
    title: "Topic Drops",
    desc: "The admin picks a random topic and seeds the contenders into a bracket.",
  },
  {
    num: "02",
    title: "Head-to-Head",
    desc: "Options are matched up in a round-robin single elimination format.",
  },
  {
    num: "03",
    title: "Office Votes",
    desc: "Everyone clicks the link and picks their favourite, no sign-up needed.",
  },
  {
    num: "04",
    title: "Champion Crowned",
    desc: "One survivor emerges. Glory is eternal. Rematches are inevitable.",
  },
];

export default function HomePage() {
  const [isLive, setIsLive] = useState<boolean | null>(null);

  useEffect(() => {
    async function check() {
      try {
        const response = await fetch("/api/status", { cache: "no-store" });
        const data = (await response.json()) as { live?: boolean };
        setIsLive(Boolean(data.live));
      } catch {
        setIsLive(false);
      }
    }

    void check();
    const intervalId = window.setInterval(() => {
      void check();
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>(".reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  const liveKnown = isLive !== null;

  return (
    <main>
      {liveKnown ? (
        <div className={`live-strip ${isLive ? "live-strip--on" : "live-strip--off"}`}>
          <span className="live-strip__dot" />
          {isLive ? (
            <>
              Tournament is live right now,{" "}
              <Link href="/current" className="live-strip__link">
                join the vote →
              </Link>
            </>
          ) : (
            "No tournament running right now, check back soon"
          )}
        </div>
      ) : null}

      <section className="lp-hero shell">
        <div className="lp-hero__copy">
          <span className="eyebrow">WorkQuiz · Office Tournament</span>
          <h1 className="lp-hero__h1">
            Bored
            <br />
            <span className="lp-hero__accent">@Work.</span>
          </h1>
          <p className="lp-hero__sub">
            A random topic. Your whole team. One winner. The bracket game that turns office
            debates into something you actually look forward to.
          </p>
          <div className="lp-hero__cta">
            <Link
              href="/current"
              className={`primary-button lp-cta-main ${isLive ? "" : "lp-cta-dim"}`}
            >
              {isLive ? "Cast Your Vote →" : "View Current Tournament →"}
            </Link>
            <a href="#how" className="pill">
              How it works ↓
            </a>
          </div>
        </div>

        <div className="panel lp-bracket-card">
          <span className="eyebrow">Live example</span>
          <p className="lp-bracket-card__topic">Best 90s Movie</p>
          <div className="lp-bracket">
            <div className="lp-bracket__col">
              <p className="lp-bracket__label">Semis</p>
              <div className="lp-bracket__match">
                <div className="lp-bracket__opt lp-bracket__opt--win">The Matrix</div>
                <div className="lp-bracket__opt lp-bracket__opt--lose">Home Alone</div>
              </div>
              <div className="lp-bracket__match" style={{ marginTop: 10 }}>
                <div className="lp-bracket__opt lp-bracket__opt--lose">Titanic</div>
                <div className="lp-bracket__opt lp-bracket__opt--win">Jurassic Park</div>
              </div>
            </div>
            <div className="lp-bracket__arrow">›</div>
            <div className="lp-bracket__col">
              <p className="lp-bracket__label">Final</p>
              <div className="lp-bracket__match" style={{ marginTop: 28 }}>
                <div className="lp-bracket__opt lp-bracket__opt--win">The Matrix</div>
                <div className="lp-bracket__opt lp-bracket__opt--lose">Jurassic Park</div>
              </div>
            </div>
            <div className="lp-bracket__arrow">›</div>
            <div className="lp-bracket__col">
              <p className="lp-bracket__label">Champion</p>
              <div className="lp-bracket__match" style={{ marginTop: 28 }}>
                <div className="lp-bracket__opt lp-bracket__opt--champ">The Matrix</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="lp-ticker" aria-hidden>
        <div className="lp-ticker__track">
          {[
            "Round Robin",
            "Single Elimination",
            "Random Topics",
            "Office-wide Voting",
            "One Champion",
            "No Spreadsheets",
            "Round Robin",
            "Single Elimination",
            "Random Topics",
            "Office-wide Voting",
            "One Champion",
            "No Spreadsheets",
          ].map((item, index) => (
            <span key={`${item}-${index}`} className="lp-ticker__item">
              <span className="lp-ticker__dot" />
              {item}
            </span>
          ))}
        </div>
      </div>

      <section id="how" className="lp-how shell">
        <div className="reveal">
          <span className="eyebrow">How It Works</span>
          <h2 className="lp-section-h2">
            Four steps to crowning
            <br />
            an office legend.
          </h2>
        </div>
        <div className="lp-steps">
          {STEPS.map((step, index) => (
            <div
              key={step.num}
              className="panel lp-step reveal"
              style={{ transitionDelay: `${index * 0.1}s` }}
            >
              <span className="lp-step__num">{step.num}</span>
              <h3 className="lp-step__title">{step.title}</h3>
              <p className="muted">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-past shell">
        <div className="reveal">
          <span className="eyebrow">Past Tournaments</span>
          <h2 className="lp-section-h2">
            The debates that
            <br />
            shook the office.
          </h2>
        </div>
        <div className="lp-past-grid">
          {PAST_TOPICS.map((topic, index) => (
            <div
              key={`${topic.topic}-${index}`}
              className="panel lp-topic-card reveal"
              style={{ transitionDelay: `${index * 0.08}s` }}
            >
              <span className="eyebrow lp-topic-card__eyebrow">
                Tournament #{PAST_TOPICS.length - index}
              </span>
              <p className="lp-topic-card__topic">{topic.topic}</p>
              <p className="eyebrow lp-topic-card__champion-label">Champion</p>
              <p className="lp-topic-card__winner">{topic.winner}</p>
              <div className="lp-topic-card__tags">
                {topic.contenders.map((contender) => (
                  <span
                    key={contender}
                    className={`lp-topic-card__tag ${
                      contender === topic.winner ? "lp-topic-card__tag--win" : ""
                    }`}
                  >
                    {contender}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-cta-section shell reveal">
        <div className="panel lp-cta-panel">
          <span className="eyebrow">Ready?</span>
          <h2 className="lp-cta-panel__h2">Your vote awaits.</h2>
          <p className="muted lp-cta-panel__sub">Takes 10 seconds. Arguments last all week.</p>
          <div className="lp-cta-panel__actions">
            <Link href="/current" className="primary-button">
              {isLive ? "Cast Your Vote →" : "View Tournament →"}
            </Link>
            <Link href="/setup" className="pill">
              Admin Setup →
            </Link>
          </div>
          <p className="muted lp-cta-panel__link">quiz.hamiltons.cloud/current</p>
        </div>
      </section>

      <footer className="lp-footer shell">
        <span className="muted">© {new Date().getFullYear()} Bored@Work</span>
        <div className="lp-footer__links">
          <Link href="/current" className="muted lp-footer__link">
            Player link
          </Link>
          <Link href="/setup" className="muted lp-footer__link">
            Admin
          </Link>
        </div>
      </footer>
    </main>
  );
}
