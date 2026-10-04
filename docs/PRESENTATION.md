# Five-minute interview demonstration

## Opening — 30 seconds

“TalentPlan is an independent financial planning proof of concept for a fictional recruitment marketplace. It connects revenue drivers, workforce and operating expenses. It is TM1-ready: a successful mapped IBM REST read activates live data; otherwise it transparently uses the same financial schema from Neon.”

Point out **TM1 disconnected**, **Demonstration mode** and **Neon connected**. Be explicit: no company actuals are used.

## Performance — 60 seconds

Show Revenue, EBITDA and margin. Explain: “EBITDA is modelled revenue less personnel, marketing, technology and general/admin costs. The actual period ends in September; future months are forecast.”

Filter Germany versus the UK. Revenue mix separates job advertising, employer subscriptions and talent solutions. The annual chart retains the wider outlook while the KPIs show the selected YTD period.

## Planning — 90 seconds

Open Variance. Show why revenue shortfalls and expense overruns both reduce EBITDA, even though their numeric variance signs differ.

Open Workforce. Explain monthly average FTE, engineering hires ahead of plan, employer on-costs and illustrative UK FX sensitivity.

Open Scenario lab. Increase revenue by 3%, increase salary by 2%, or add 10 average FTE. Save a named scenario. Explain that the server recomputes the saved result and keeps it separate from Actual, Budget and IBM cubes.

## Developer perspective — 60 seconds

Open TM1 explorer and trace a Revenue/Actual slice. Export an Excel workbook. The workbook carries source provenance, finance definitions and every raw fact in the chosen scope.

Open Connections. Explain the timeout, schema checks and failover. A credential check alone never turns the badge green.

Show the GitHub architecture diagram, MDX view template, driver cube rules and TI load design. State which parts are implemented and which require execution on IBM software.

## Copilot — 30 seconds

Ask “Why is EBITDA below budget?” The no-key path is calculated finance analysis, labelled clearly. OpenRouter GPT-6 Sol and Ollama Cloud are prepared for API keys. Cloud AI receives finance summaries and cannot execute TI or write to TM1.

## Close — 30 seconds

“The separation between the source adapter and finance logic lets controllers keep the same reporting workflow across a live environment and a demonstrable fallback. The emphasis is traceable finance logic, clear source status and a user interface suitable for planning conversations.”

## Questions to prepare for

| Question                                        | Answer boundary                                                                                                                                                               |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Did you execute this on TM1?                    | The REST adapter and contract are implemented and tested with fixtures. A licensed IBM runtime is still needed to validate the live cube, MDX and supplied rule/TI templates. |
| Does this show StepStone's actual architecture? | No. It aligns with public TM1 role themes and uses a fictional recruitment finance model.                                                                                     |
| Why Next.js instead of FastAPI?                 | One full-stack deployment keeps the interview POC simple. Direct TM1 REST avoids adding a separate Python hosting service.                                                    |
| Is FTE additive?                                | Across departments/entities in a period, yes; over months it is averaged.                                                                                                     |
| How does forecast work?                         | Actuals in closed months, Forecast in open months. It is not an LLM prediction.                                                                                               |
| Can AI change the budget?                       | No. Suggestions remain explanations. Scenarios are separate records.                                                                                                          |
| What needs production work?                     | SSO/RBAC, corporate cube mapping, TM1 auth validation, reconciliation against source systems, monitoring and environment isolation.                                           |
