# Security Policy

Thanks for taking the time to help keep Deneb and its users safe.

## Supported Versions

Deneb is distributed as a single, certified Power BI custom visual via Microsoft AppSource. Security fixes are applied to the next AppSource release; older releases are not patched separately. Users are encouraged to keep Deneb up to date in their reports (this will happen automatically if using the AppSource version).

## Reporting a Vulnerability

**Please do not report security issues through public GitHub issues, discussions, pull requests, or social channels.**

To report a vulnerability privately:

1. Go to the [Security tab](https://github.com/deneb-viz/deneb/security) of this repository.
2. Click **Report a vulnerability**.
3. Fill in the advisory form with as much detail as you can - affected version(s), reproduction steps, observed impact, and any suggested mitigation or patch.

A minimal, self-contained reproduction (a Vega/Vega-Lite spec plus the data shape needed to trigger the issue) is the single most helpful thing you can include. The ideal way is to produce a minimal, shareable Power BI report (`.pbix`) and rename it with a `.zip` extension so GitHub will accept the upload.

## What to Expect

Deneb is maintained by a small team alongside other commitments, so response times will not be instant. As a rough guide:

- **Acknowledgement:** within 7 days of the advisory being filed.
- **Triage and severity assessment:** within 14 days.
- **Fix and disclosure timeline:** depends on severity, complexity, and the AppSource release cadence. We'll keep you updated in the advisory thread.

We follow coordinated disclosure and will credit reporters in the published advisory unless you'd prefer to remain anonymous.

## Scope

Deneb embeds Vega and Vega-Lite inside a Power BI custom visual. It runs within Power BI's custom visual sandbox (a sandboxed iframe with no direct DOM or network access to the host report), which meaningfully limits the blast radius of most issues. Within that envelope, the following are in scope:

- **Cross-filter and selection-state integrity** - expression injection, spoofed datum identity, or any other path by which the visual reports selections that don't match the user's intent.
- **Information disclosure** across visual or report boundaries.
- **Denial of service** against the visual or its host - hangs, unbounded recursion, memory exhaustion.
- **Bypass of Deneb's own security controls** - for example the URL allow-list applied to remote data or image references.
- **Any path that could escape the Power BI custom visual sandbox.**
- **Vulnerabilities in Deneb's own dependencies** that are exploitable through Deneb as actually shipped.

Out of scope:

- Issues in upstream Vega, Vega-Lite, Power BI, or other dependencies that are not exploitable through Deneb as shipped — please report those upstream. We're happy to coordinate if a Deneb-side fix or mitigation is appropriate.
- Theoretical issues without a working proof of concept.
- Issues that require a privileged starting position outside Deneb's threat model - for example, the ability to publish a malicious `.pbiviz` to a victim, or to modify a report file on disk.
- Behaviour that is documented and intended. For example, a Vega spec author has full control over the visual's expression evaluation within the sandbox; this is by design and is the basis of Deneb's threat model.

## Questions

If you're unsure whether something qualifies as a security issue or a regular bug, err on the side of using the private advisory flow — we'd rather triage and downgrade something than have a real issue land in the public tracker.
