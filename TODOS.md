# TODOs

## 1. Validate Teams Cookie Behavior Before Release
- **What:** Verify that one-vote-per-browser works correctly when the public bracket link is opened from the department Teams chat, both in any embedded webview flow and in the normal browser handoff flow.
- **Why:** The core trust model depends on a stable browser cookie token. If Teams suppresses or resets cookies, duplicate-vote protection and repeat-visit behavior will break in the exact environment the product is meant to live in.
- **Pros:** Protects the launch, validates the most important non-obvious assumption, and prevents a fake-success local build from failing in the real workplace flow.
- **Cons:** Requires a working end-to-end prototype and a real Teams test path before release.
- **Context:** The engineering review flagged this as the only critical gap. The app can look correct locally while failing in Teams-opened contexts because browser cookie behavior changes across embedded surfaces and browser handoff paths.
- **Depends on / blocked by:** Blocked by a functioning public bracket flow and a real Teams sharing test.

## 2. Add Admin Override Tools For Suspicious Vote Counts Or Finals Recovery
- **What:** Give the admin a small recovery surface to handle suspicious total vote counts, resolve weird edge cases, or intervene if a finals revote gets stuck.
- **Why:** The product intentionally trades strict identity for low friction. That is the right call for V1, but it means the organizer needs an escape hatch when the vote count exceeds team size or the last round needs help.
- **Pros:** Preserves trust, avoids database-only recovery, and keeps one weird bracket from feeling like total product failure.
- **Cons:** Adds more admin controls and more state transitions to think through.
- **Context:** The plan currently lets admins notice that something is off by comparing vote totals with team size, but there is no recovery tool yet. This is valuable after the core flow works, not before.
- **Depends on / blocked by:** Depends on the admin manage flow and finals revote flow existing first.

## 3. Consider Round Reminder Notifications If Real Users Miss Mid-Week Voting
- **What:** Add optional reminder notifications for live rounds if actual users report that they miss the link or forget to vote before a round closes.
- **Why:** Could help later if the bracket expands beyond a tiny team or if participation falls after the novelty wears off.
- **Pros:** Potential engagement lift and better completion rates for longer-running brackets.
- **Cons:** Adds delivery-channel complexity and solves a problem that has not yet been observed in the current small-team use case.
- **Context:** This is not current pain. The present wedge is setup speed and bracket feel, not participation collapse. Keep it clearly deferred unless the first user asks for it.
- **Depends on / blocked by:** Depends on scheduled rounds existing and a chosen delivery path such as Teams integration or email.
