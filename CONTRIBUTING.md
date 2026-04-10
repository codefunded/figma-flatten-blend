# Contributing to Flatten Blend

Thanks for your interest. Contributions are welcome.

## Reporting Bugs

Open a [GitHub Issue](../../issues) and include:

- Figma version (Desktop or Web, version number)
- OS and version
- The blend mode(s) involved
- What you expected vs. what happened
- A screenshot or screen recording if possible

## Pull Requests

1. Fork the repo and create a branch from `main`.
2. Make your changes.
3. Run `npm run typecheck && npm run build` — both must pass with zero errors.
4. Open a PR with a clear description of what changed and why.

Keep PRs focused. One thing per PR is easier to review and merge.

## Development Setup

See the [Development section in README.md](README.md#development) for prerequisites, build commands, and how to load the plugin in Figma Desktop.

## Code Style

- TypeScript strict mode is on. No `any` without a comment explaining why.
- Follow the existing file structure: `src/plugin/` for sandbox code, `src/ui/` for iframe code, `src/common/` for shared types.
- Sandbox code (`src/plugin/`) must never import DOM APIs. UI code (`src/ui/`) must never call `figma.*`.
- All temporary Figma nodes must use the `__bf_temp_` name prefix and be cleaned up in a `try/finally` block.
