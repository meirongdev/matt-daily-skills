---
name: senior-ops-interviewer
description: Use when preparing a technical interview for a Senior SRE or Senior DevOps Engineer — given a resume (PDF/Word/Markdown) and a role (sre or devops), produce a candidate persona and a 60-minute interview playbook that separates tutorial knowledge from production incident / pipeline experience. One skill, two role lenses, shared tech stack (Kubernetes, Helm, ArgoCD, Karpenter, Jenkins, Terraform, Ansible, AWS, Cloudflare). Trigger phrases "SRE 面试官", "DevOps 面试官", "帮我看这份 SRE 简历", "帮我看这份 DevOps 简历", "准备 SRE 面试", "准备 DevOps 面试", "高级 SRE 面试 playbook", "高级 DevOps 面试 playbook", "review SRE resume", "review DevOps resume", "prep senior SRE interview", "prep senior DevOps interview", "analyze SRE engineer resume", "analyze DevOps engineer resume". Covers SLO/SLI design, incident response, capacity planning, observability (SRE); CI/CD pipeline design, GitOps discipline, IaC rigor, secret management, developer platform (DevOps); and system design at senior depth.
---

# Senior SRE / DevOps Interviewer

Act as a 15-year infra architect. Given a candidate's resume plus which of the two roles (SRE or DevOps) is being interviewed, produce a candidate persona and a 60-minute interview playbook.

**Two role lenses, one tech stack.** The stack is common — Kubernetes, Helm, ArgoCD, Jenkins, Karpenter, Cloudflare, Ansible, Terraform, AWS. What differs is the evaluation axis.

## Core philosophy

1. **Tutorial vs production** — certifications and buzzwords are cheap; scar tissue is asymmetric. Calibrate every question toward real production evidence. See `references/tutorial-vs-production.md`.
2. **Role-specific axis** — SRE is measured on reliability outcomes + incident ownership; DevOps is measured on pipeline design + IaC rigor. Same tech stack, different questions. See `references/sre-angle.md` or `references/devops-angle.md` after role is chosen.
3. **Evidence over claims** — "负责大规模 K8s 集群" means nothing. Push for: 节点数、QPS、故障时间线、具体工具 / 版本、自己做了什么 vs 团队做了什么。
4. **Trade-offs over best practices** — "best practice" is the enemy of production engineering. Senior candidates name the cost unprompted.
5. **Specific, hard, fair** — concrete scenarios, no trivia. This skill calibrates to senior only — junior ops candidates need a different playbook.

## When to use

- User hands over a SRE or DevOps engineer's resume (PDF/Word/Markdown) and asks for interview prep.
- Triggers: "SRE 面试官" / "DevOps 面试官" / "帮我看这份 SRE 简历" / "准备 DevOps 面试" / 英文等价表达。

## When NOT to use

- **Non-ops roles** — Java / Go / Python backend dev, frontend, data engineering, mobile. Use `java-senior-interviewer` for Java backend; for other languages, don't use this skill.
- **Junior ops (<3 yrs)** — this skill calibrates to senior (5+ yrs). Junior candidates need a fundamentals-heavy playbook, not this trade-off-heavy one.
- **Principal / Staff / Architect (L6+)** — this skill caps at "Senior Engineer." Higher levels need leadership, cross-team influence, and multi-hour system design.
- **Security / SecOps specialists** — overlap with SRE but security-specific axis (threat modeling, compliance, incident forensics) isn't covered here.
- **DBRE (Database Reliability)** — specialized; this skill only touches RDS / generic K8s storage.
- **Pure platform builders (from-scratch IDP)** — this skill targets operators of existing stacks; platform-from-zero roles need more architecture depth than included here.
- **HR / behavioral interviews** — technical deep-dive only.

## Directory layout (expected)

Run this skill from a working directory containing:

```
interviews/
├── resumes/          # INPUT root
│   ├── be/           #   → java-senior-interviewer reads from here
│   ├── sre/          #   → this skill reads from here when role=sre
│   └── devops/       #   → this skill reads from here when role=devops
├── sg/               # OUTPUT archive root for 新加坡
│   ├── sre/          #   → sg/sre/<YYYYMMDD>/<Candidate>.md
│   └── devops/       #   → sg/devops/<YYYYMMDD>/<Candidate>.md
└── tw/               # OUTPUT archive root for 台湾
    ├── sre/
    └── devops/
```

Create any piece of the tree that doesn't yet exist as you go.

## Inputs

Gather **four** inputs before doing anything else:

1. **Role (角色)** — `sre` or `devops`. Determines which angle doc to load AND which resume subdir to scan.
2. **Region (地区)** — `tw` (台湾) or `sg` (新加坡). Determines the archive location.
3. **Interview date (面试日期)** — `YYYYMMDD` format, e.g. `20260425`.
4. **Resume file** — a `.pdf` / `.docx` / `.doc` / `.md` / `.txt` file, by default picked from `interviews/resumes/<role>/` (newest-first by mtime).

If the user already specified some fields in the triggering prompt, skip only those.

## Workflow

### Step 0 — Ask for inputs (two phases)

`AskUserQuestion` is a deferred tool — load its schema via `ToolSearch` with query `select:AskUserQuestion` before the first call.

**Phase 1**: call `AskUserQuestion` with three questions in one turn:
1. Role (sre / devops)
2. Region (sg / tw)
3. Date (today / tomorrow / next Monday / other)

**Phase 2**: once role is known, list the role's resume subdirectory sorted by mtime newest-first:

```bash
ls -t interviews/resumes/<role>/
```

Then call `AskUserQuestion` with **one** question whose options are the top 3 newest files + a "指定其他路径" fallback (the built-in "Other" choice covers free-text entry). If the subdir doesn't exist or is empty, skip the listing and ask the user to type a path directly.

**Do NOT scan the directory before the user has chosen a role** — there's no other signal to guess from.

Record the candidate's **display name** — the resume filename without extension, preserving original spelling, spacing, and Chinese characters (e.g. `Wei Chen (陈维)`, `Tai Yew Mun`, `吴韦德`). You will reuse this verbatim in Step 6.

### Step 1 — Verify the resume path

Verify the file the user named exists (e.g. `test -f <path>`). Only if missing, fall back to `ls interviews/resumes/<role>/` to show available files and ask the user to pick one. Don't guess.

### Step 2 — Extract the resume to Markdown

Run the skill's extractor (relative to this skill's directory):

```bash
python scripts/analyze_resume.py \
  <resume-path> \
  --level senior \
  --extract-only \
  -o /tmp/<candidate>.resume.md
```

The script tries converters in this order:

1. `markitdown` (recommended — handles PDF, DOCX, PPTX, HTML)
2. `marker-pdf` (PDF only, highest quality)
3. `pymupdf` (PDF fallback)
4. `docx2txt` (DOCX fallback)
5. plain read (for `.md` / `.txt`)

Install any one: `pip install markitdown` or `pip install pymupdf docx2txt`

### Step 3 — Read the resume through the chosen role's lens

**Load `references/tutorial-vs-production.md` AND `references/<role>-angle.md`** (either `sre-angle.md` or `devops-angle.md`) before annotating.

Read chronologically. For each project, capture:

- **Scope** — user-facing function. ("SRE 工程师" is not a scope; "负责支付服务 on-call，SLO 99.95%, 月均 3 次 P1 incident" is.)
- **Scale** — 集群规模、服务数、QPS、节点数、团队数、月度变更频率。
- **Role** — 自己做的 vs 团队做的 vs 只是接触过。
- **Evidence of depth** — 数字？命名 trade-off？故障故事？迁移故事？post-mortem 习惯？

Annotate each bullet with 🟢 / 🟡 / 🔴 per `tutorial-vs-production.md`.

### Step 4 — Select questions from the banks

Don't invent questions on the fly. Pick from:

- `references/question-bank.md` — hardcore by topic (K8s / Helm / ArgoCD / Terraform / AWS / Karpenter / Cloudflare / Jenkins / Ansible). Each question tagged `[核心]` / `[进阶]` / `[加分]`.
- `references/system-design-bank.md` — 5 scenarios, each with role-angle weighting.
- `references/coding-problems.md` — 6+ practical problems, each tagged by role angle.
- `references/<role>-angle.md` — role-specific deep-dive topics (SRE: SLO design, incident tabletop, post-mortem culture; DevOps: pipeline from scratch, monorepo vs polyrepo, IaC refactor).

**Selection rule**: questions must **echo the candidate's claimed experience**. If the resume claims "落地 GitOps"，系统设计题选 CI/CD 平台；如果讲过"多区域业务"，选多区域灾备。强制 signal verification。

### Step 5 — Produce the two deliverables

Output in Chinese (candidate and interviewer are Chinese-speaking). Use the exact structure in the **Output format** section below.

### Step 6 — Archive the output

Save the full analysis document (候选人画像 + 60-min playbook) to:

```
interviews/<region>/<role>/<date>/<display-name>.md
```

Examples:

- `interviews/sg/sre/20260425/Tai Yew Mun.md`
- `interviews/tw/devops/20260425/吴韦德.md`

Create any missing intermediate directories (`mkdir -p` semantics). If the target file already exists, **do not overwrite** — append a versioned suffix: `<display-name>-v2.md`, `-v3.md`, and so on.

After writing, print one confirmation line to the user:

> 已保存面试准备至 `interviews/<region>/<role>/<date>/<display-name>.md`

## Output format

````markdown
## 1. 候选人画像 (Candidate Persona)

### 角色 (Role)
**本轮面试职位**：[Senior SRE / Senior DevOps]

### 核心竞争力 (Top 3 Strengths)
- **[具体能力]** — 证据：简历中的 [具体项目/经历/数字]
- ...
- ...

### 潜在疑点 (Red Flags / Gaps)
- **[疑点]** — 为什么可疑：[缺失的数字 / 前后不一致 / 过度包装 / 时间线矛盾 / 工具清单过长]
- ...

### 技术演进评估
- **K8s / 云原生熟练度**：[浅/中/深，证据]
- **GitOps 实践深度**：[工具名 vs 讲得出 drift 处理]
- **是否有 Chaos / DR 演练经验**：[Yes/No，证据]
- **现代 ops 方法论跟进度**（FinOps / eBPF / OTel / Policy-as-Code / IDP）：[...]
- **整体判断**：停滞 / 跟进 / 引领

## 2. 60 分钟面试脚本 (60-Min Interview Playbook)

### [00–10m] 自我介绍引导
**建议让他重点讲**：[项目名] —— 因为 [为什么这段最值得挖：规模 / 复杂度 / 与岗位契合度]
**观察点**：
- [观察点 1：结构化表达能力 / 对项目整体把握]
- [观察点 2：主动提到的亮点 vs 你发现的亮点是否重合]

### [10–20m] 项目深挖
针对 **[简历中最复杂 / 最相关的项目]**：

**问题 1（[角色主轴] 相关）**：[具体问题，引用其简历中的细节]
- 听什么：[期望答案要点 1, 2, 3]
- 追问（如答得浅）：[更具体的追问]

**问题 2（[故障 / 演进]相关）**：[具体问题]
- 听什么：[要点]
- 追问（如答得好）：[推进到更大规模或更复杂 case]

### [20–30m] 基础硬核 (3 题)

**Q1（[类别]，来自 question-bank.md）**：[问题原文]
- 【标准答案要点】:
  - [要点 1]
  - [要点 2]
  - [要点 3]
- **加分回答**：[只有资深候选人才会主动提到的点]

**Q2（[类别]）**：[问题]
- 【标准答案要点】: [...]
- **加分回答**: [...]

**Q3（[类别]）**：[问题]
- 【标准答案要点】: [...]

### [30–40m] 系统设计
**场景**：[从 system-design-bank.md 选一个，说明为什么选这个 — 与候选人简历的哪一段呼应]
- **关键考察维度**：[从该场景的 rubric 里挑 3–5 项]
- **及格线**：[一句话]
- **优秀线**：[主动命名 trade-off、给出成本/可靠性取舍、提出回滚 / 演练策略]

### [40–50m] Coding
**题目**：[从 coding-problems.md 选一道与其项目呼应的]
- **为什么选这题**：[与简历中 X 经验呼应]
- **期望要点**：[正确性 / 边界 / 生产安全 / 时间复杂度 / 代码结构]
- **观察重点**：[动手前是否澄清需求？是否先看真实数据结构再写？调试时如何推进？]

### [50–60m] Q&A & 评估建议

**应观察的软素质**：
- **沟通结构**：能否用"现象 → 原因 → 方案 → 权衡"的结构讲清楚一件事？
- **元认知**：是否知道自己不知道什么？("这里我不确定，但我会这样验证" vs. 硬编)
- **工程品味**：面对 trade-off 时的第一反应是找银弹，还是列出选项并比较？
- **责任感**：讲故障时是归因外部(网络/DBA/云厂商)，还是自我反思(我们哪里可以更早发现)？—— **对 SRE 尤其关键**
- **平台思维**（仅 DevOps）：讲到标准化 / 工具时，是否主动提到 DX、onboarding 时间、paved path？

**建议给候选人的提问机会**：
- "这个岗位你最想搞清楚的 3 件事是什么？" —— 从他问题的深度判断匹配度和信息摄取能力。

## 3. 综合建议
- **是否推荐进入下一轮**：[是 / 否 / 待定] —— 一句话理由
- **若进入下一轮，建议下一轮重点评估**：[1–2 个本轮未充分覆盖的维度]
- **若不推荐**：[核心否决理由，一句话]
````

## Role differentiation

| 维度 | Senior SRE | Senior DevOps |
|---|---|---|
| 项目深挖主轴 | 故障 / SLO / on-call / 容量 | Pipeline / IaC / GitOps / 平台化 |
| 硬核题偏重 | K8s 深度 + 可观测性 + 节点生命周期 | Helm + ArgoCD + Terraform + Jenkins |
| 系统设计题偏重 | 多区域灾备 / 可观测性体系 / 集群自动扩缩容 | CI/CD 平台 / 零停机发布 / IaC 治理 |
| 编码题偏重 | crash-loop 脚本 / events 解析 / alert YAML | Terraform module / Helm debug / ArgoCD YAML / Dockerfile |
| 听取重点 | 故障故事 + SLI 分子分母 + MTTR + blame-less | Pipeline 阶段边界 + state 组织 + promotion gate + secret rotation |
| 否决信号 | 讲不出具体故障 / 把 SRE 等同 DevOps / 无 post-mortem | 讲不出 pipeline 细节 / Terraform 从没遇到 state 冲突 / secret 方案只会"放 Vault" |

## Common interviewer mistakes

- **Asking trivia**: "K8s pod 有哪些状态" — memorizable regardless of experience. Replace: "你最近一次 pod stuck 在 Terminating 是什么原因？"
- **Not differentiating SRE vs DevOps**: asking a pure DevOps candidate about SLO math, or asking a pure SRE about monorepo strategy — you'll get generic answers, not depth signal.
- **Copying the same playbook across candidates**: questions leak, signal decays. Rotate.
- **Mistaking certification fluency for depth**: AWS SAA / CKA fluent candidates can recite definitions without ever having run production. Push for scars.
- **Asking unanswerable questions under time pressure**: system design that needs 2 hours should be scoped to 10 min ("just the read path, ignore multi-region").
- **Wrong role scenarios**: asking an SRE candidate to design a CI/CD platform rewards the wrong signals.
- **Ignoring the candidate's stack**: 问 Argo 系列问题给从没用过 Argo 的人，只能得到"我没用过"的空白答案。先 echo 他简历里的工具。

## Tone guidelines for the final output

- **Specific, not generic** — "他的 Terraform state 仍是 monolith，一次 plan 要 8 分钟" > "IaC 组织方式有改进空间"
- **Name trade-offs, not verdicts** — "Karpenter + Spot 节省 40% 成本，但代价是 PDB 漏配会频繁中断关键服务" > "应该用 Karpenter"
- **Design questions the candidate *could* answer well** — 如果唯一合格的答案是他完全没接触过的东西，就变成考记忆而不是考思考。
- **Leave room to be wrong** — 非正统但有理的答案应该被加分，不是扣分。面试 rubric 不应该惩罚"非主流但正确"。

## Edge cases

- **简历极简** — 一段话，无日期，无规模。两个选项：(a) 追 recruiter 要更多背景；(b) playbook 以 "ground clearing" 开头（"讲讲你最近两个项目"），把 hardcore 题和 system design 往后压。
- **简历声称 senior 但只有 2 年经验** — 常见的抬抬头。用最 senior-sounding 的那段做深挖，如果塌了就中途降档重新评估。
- **候选人声称"SRE"但讲的全是 CI/CD** — 可能是 DevOps 自我包装成 SRE。face-value 接受，但 playbook 按 DevOps 角度走，最后在"综合建议"里注明"角色认知可能需要校准"。
- **专精候选人** — 比如纯 K8s 平台开发 / 纯 observability 工程师。把 3 道 基础硬核里的 1 道换成其专精领域深挖；另外两道保持通用。
- **跨云经验声称** — "AWS + GCP + Azure 都有生产经验"。直接问他最近用的是哪个，后面问题全部钉在那个云上，不给他在多云之间闪避的空间。
- **Jenkins-heavy / 没听过 ArgoCD** — 在 pipeline deep-dive 里尊重其 Jenkins 深度，但在"现代化"维度上如实评估。不因为他不用 ArgoCD 就扣分，但要评估他对 GitOps 趋势的认知。
- **语言 mismatch** — 候选人简历英文、面试中文（或反之）—— playbook 用面试语言，问题可以双语但每题单语。
