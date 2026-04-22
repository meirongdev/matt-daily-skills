---
name: {{skill-name}}
description: (Replace this) A one-paragraph description of when this skill should trigger and what it does. Include trigger phrases in both Chinese and English where relevant. This is the PRIMARY triggering mechanism, so be specific. Example — "Use this skill whenever the user needs to ____. Trigger on phrases like ____, ____, or ____. Apply this even when the user ____. The skill produces ____."
---

# {{skill-name}}

(Replace with a one-sentence summary of what this skill does.)

## When to use

(One or two bullets. Describe the task shape that should trigger this skill — ideally matching phrases in the `description` frontmatter.)

- ...
- ...

## When NOT to use

(Explicit reverse triggers reduce false positives. Skip this section only if the skill has no common confusions.)

- Not for: (the adjacent task this is often confused with)
- Not for: (cases outside the skill's scope)

## Core philosophy

(Optional) What principles guide how this skill operates? Keep to 3-5 bullets.

- Principle 1
- Principle 2
- Principle 3

## Process

Follow these steps in order.

### Step 1: Understand the input

(What should Claude look at first?)

### Step 2: Do the work

(What should Claude actually do?)

### Step 3: Produce the output

Use this exact output structure:

```
# [Title]

## Section 1
...

## Section 2
...
```

## Reference material

(Optional) Point to any files under references/ that cover detailed sub-topics.

See `references/example.md` for (...).

## Edge cases

- If X happens: (...)
- If input is missing: (...)
