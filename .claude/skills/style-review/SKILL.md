---
name: style-review
description: Use when reviewing code for style guide compliance, when a developer asks to check code style, or enforce team conventions
---

# Style Guide Enforcer

Review code against the project's style guide and coding conventions.

## When to Use
- Developer asks to check style compliance
- Reviewing code from a new contributor
- Enforcing team conventions on a PR

## Steps

1. **Detect the project's style guide** by checking for config files:
   - `.eslintrc.*` / `eslint.config.*` -> ESLint rules (check for Airbnb, Standard, Google presets)
   - `.prettierrc.*` -> Prettier formatting rules
   - `pyproject.toml` -> Python (Black, Ruff, isort config)
   - `.editorconfig` -> General formatting
   - `CONTRIBUTING.md` -> Team conventions
   - `.golangci.yml` -> Go linting rules

2. **Read the style config** to understand the enforced rules.

3. **Get changed files and review:**
```bash
git diff --name-only HEAD~1
git diff HEAD~1
```

4. **Apply language-specific style checks:**

   **TypeScript/JavaScript:**
   - `const` over `let`, never `var`
   - Arrow functions for callbacks
   - Template literals over string concatenation
   - Destructuring where appropriate
   - Named exports vs default exports (per project config)

   **Python:**
   - PEP 8 naming (snake_case for functions/variables)
   - Type hints for function signatures
   - Docstrings for public functions
   - List comprehensions where appropriate

   **Go:**
   - Handle all errors (no `_` for error)
   - Short variable names in small scopes
   - Effective Go naming conventions

5. **Output format:**

   **Style Compliance Score:** X/10

   **Violations:**
   - `file:line` -- What's wrong -> What it should be

   **Positive Notes:** What follows the style guide well.

## Rules
- Only enforce rules that are actually configured in the project.
- If no style config is found, use the language's standard conventions.
- Don't flag style issues on code that wasn't changed in this diff.
- Distinguish between auto-fixable issues (formatting) and manual-fix issues (naming, patterns).
