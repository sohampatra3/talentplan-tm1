# TalentPlan user guide

Open [TalentPlan](https://talentplan-tm1.vercel.app/). The default is **light mode** with the **Sage** theme, regardless of your device's appearance. Choose **EN** or **DE** in the top bar and use the moon/sun control to change light/dark mode. The workspace remembers your explicit choices.

## Personalize the appearance

Select the **palette icon** in the top bar, or open **Connections → Appearance settings**. Choose **Sage** for soft green and golden accents or **Glass** for translucent, frosted surfaces in blue and lilac. Light/dark mode works with either theme. Changes apply immediately and are saved in this browser. Choose **Restore defaults** to return to light Sage.

## Choose your reporting scope

Set the reporting year, start month, end month, entity, department and comparison. The default shows January–September 2026 against Budget. Choose Forecast for the latest planned comparison, or select a quarter using the month range. Filters apply to KPIs, variance, workforce, explorer, copilot evidence and selected exports. The annual trend provides full-year context for the chosen entity and department.

Check the source banner. **TM1 disconnected** means synthetic data is active. An unavailable live read also falls back to explicitly labelled synthetic figures. **Neon unavailable** means a temporary fixture is being used and saves are unavailable. Coverage warnings refer to partial Actual data or missing outlook coordinates in the returned scope.

## Explore the dashboard

- **Overview:** choose Revenue, EBITDA or average FTE and switch area, line or bar charts. Inspect the product donut or another chart type. Select a market to filter the workspace. Select a KPI to open detailed visual analysis.
- **Variance analysis:** compare Actual with Budget or Forecast. Select an account in the chart/table. Revenue above comparison and expenses below comparison make favourable contributions to EBITDA.
- **Workforce:** switch personnel expense and average FTE. Select a department in the chart or table to narrow the reporting scope. FTE is averaged across months.
- **Scenario lab:** adjust revenue, salary and additional average FTE. The preview updates immediately. Give the alternative a name and save it in Neon. Saved alternatives belong to the current browser session. Apply assumptions to reuse the saved drivers in the current scope.
- **TM1 explorer:** select version/account, inspect leaf coordinates and page through the records.

## Ask and visualise

In **Finance copilot**, choose OpenRouter, Ollama Cloud or calculated analysis. No access code is needed. Ask a question about the current financial scope. Cloud answers are labelled with the provider; calculated fallback is labelled separately.

Choose **Answer + visualization** to open an interactive chart workspace after a response, or use **Open visual analysis** on an existing answer. Change reporting scope, metric, grouping, version and chart type. Rolling outlook uses the full reporting year, with Actual at each available coordinate and Forecast elsewhere; month controls are disabled for that annual view. Inspect the exact figures in its table and download chart data as CSV. Signed variances use bars instead of a donut. Product analysis shows revenue because shared costs need an agreed allocation model.

Cloud providers receive the selected summary and recent conversation. Verify financial conclusions against the displayed data and coverage. Daily cloud limits apply; calculated analysis remains available.

## Export data

Use **Export data** to select Excel or CSV. **Selected scope** follows the reporting filters. **All data** includes all available source years, entities and versions. Excel includes facts, the selected dashboard summary and source/coverage notes. Canonical cube coordinates remain stable for reconciliation.

## Connect your TM1 environment

Open **Connections**. Enter the REST endpoint, authentication and mapped MDX query; use **Test REST data** to verify actual finance facts. The sample MDX checks one leaf. Expand it to the full reporting scope before selecting TM1 REST and saving.

Enter the IBM MCP Streamable HTTP endpoint and credential; choose **Connect & discover tools**. This verifies protocol initialisation and lists available tools and schemas. It does not execute IBM tools. REST supplies the dashboard's financial figures.

Connection settings are encrypted in Neon and private to this signed browser session. Saved credentials are masked; leave the credential field blank to preserve an existing secret for the same endpoint/authentication. To remove a connection, clear its endpoint and credential and save with Neon selected.

**Where the connections live** shows the app REST and read-only MCP endpoints. IBM's current documentation uses the unified `/ibm-pa-tools/mcp` path; use the full URL and authentication issued for your deployment. See the [model contract](TM1_MODEL.md) for mapping and [README](../README.md) for architecture and setup.

## Finance vocabulary

| Term                    | Meaning                                                                  |
| ----------------------- | ------------------------------------------------------------------------ |
| EBITDA                  | Revenue less personnel, marketing, technology and general/admin expenses |
| EBITDA margin           | EBITDA as a percentage of revenue                                        |
| Opex                    | Operating expenses, stored as positive amounts                           |
| FTE                     | Full-time-equivalent capacity; averaged over months                      |
| Favourable contribution | A change that improves EBITDA against the selected comparison            |
| Rolling outlook         | Actual where available for a leaf coordinate; otherwise Forecast         |
| Employer on-costs       | Employer expenses above base salary, such as social contributions        |

The initial facts describe a fictional recruitment marketplace. Integrate your approved TM1 view to use real financial figures with the same analysis workflow.
