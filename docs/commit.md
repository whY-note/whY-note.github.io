# Requirements for commit

Start every commit message with one of the following prefixes:

- `Content:` — Add, revise, or remove site content, such as blog posts, project descriptions, biographies, or data entries.
- `Arch:` — Change code architecture, project structure, configuration, build tooling, or reusable components.
- `Docs:` — Update documentation, including README files, guides, and contributor notes.
- `Style:` — Adjust visual design tokens or styling details, such as colors, fonts, font sizes, borders, or CSS effects.
- `Layout:` — Change the arrangement, spacing, hierarchy, or responsive placement of content on a page.

Examples:

```text
Content: add a post on KL divergence
Arch: move research experience data into YAML
Docs: clarify local development instructions
Style: refine the primary color palette
Layout: improve mobile spacing in the research section
```

Additional guidelines:

- Write the subject in the imperative mood and keep it concise.
- Use sentence case after the prefix; do not add a period at the end.
- Keep each commit focused on one logical change. If a change spans categories, use the prefix that best describes its primary purpose.
- Optionally add a scope for larger areas of the site, for example: `Layout(home): improve mobile spacing`.
