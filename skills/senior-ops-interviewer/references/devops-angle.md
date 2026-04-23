# DevOps Angle — Senior DevOps Evaluation Axis

Load this doc when `role=devops` is chosen in Step 0. It sets the DevOps-specific evaluation lens on top of the shared `tutorial-vs-production.md` and `question-bank.md`.

## Role charter — what "DevOps" actually means

"DevOps" in 2026 has two common interpretations:

1. **Classical DevOps** — bridge between dev and ops, focus on automation, CI/CD, environment provisioning, config management. This is the most common usage and what this skill targets.
2. **Platform Engineering** — building an internal developer platform (IDP) with self-service paved paths.

The two overlap; senior DevOps candidates increasingly drift toward (2). Don't over-correct — a strong classical DevOps candidate is often a great first hire for a platform team.

Concretely, the DevOps role is evaluated on:

1. **Pipeline design** — can they design CI/CD from requirements up?
2. **GitOps discipline** — do they actually practice it, or just name-drop it?
3. **IaC rigor** — Terraform modules, state discipline, drift management, PR review habits.
4. **Secret / credential management** — one of the most failed areas at interviews.
5. **Developer platform mindset** — do they think about DX, self-service, paved paths, blast-radius of standardization?
6. **Cost awareness** — increasingly part of the role (FinOps overlap).

Not evaluated on: SLO definition, incident command structure, capacity forecasting (those are SRE concerns; basic fluency expected but not depth).

## Evaluation rubrics — what to listen for

### CI/CD pipeline design

**及格线** — 能从需求出发画出 pipeline 阶段（build → test → scan → publish → deploy → verify）。知道 declarative vs scripted Jenkins pipeline。用过 shared libraries。

**优秀线** — 主动讲 **pipeline as code** + 评审机制；parallelize 与依赖的取舍；cache 策略（npm / maven / docker layer）；artifact 传递（hash-addressed 或 immutable tag，绝不 `latest`）；rollback 路径是一级功能不是备用。区分 CI（build + unit + scan）和 CD（deploy + smoke + promote）的责任边界。

**Tutorial smell** — 拿 Jenkinsfile 模板照搬；没见过 pipeline 失败恢复；promotion 等同于"再跑一次流水线"。

**Probe**："如果你进来发现所有服务都跑一个 500 行的 Jenkinsfile，你会怎么收敛？"

### GitOps discipline

**及格线** — 知道 GitOps 定义（declarative, versioned, pulled, continuously reconciled）。知道 ArgoCD / Flux 大致架构。

**优秀线** — 讲**两条通路的问题**：生产状态同时来源于 Git 和人手改（`kubectl apply`）—— drift detection、reconcile 策略、如何强制单通路。讲 **secret in GitOps** 的真实方案（sealed-secrets / external-secrets / SOPS），各有代价。讲 **environment promotion**（dev → staging → prod）用 overlay 还是独立 repo，为什么。讲 ApplicationSet 的 generator（list / cluster / matrix / git）及踩过的坑。

**Tutorial smell** — "把 YAML 放 Git 里就是 GitOps"。把 ArgoCD 当作另一种 `kubectl apply` 工具。

**Probe**："生产集群里有人直接 `kubectl edit deploy`，你怎么发现？怎么阻止？"

### IaC rigor

**及格线** — 写过 Terraform module。知道 remote state + state locking。能讲 `terraform plan` → review → apply 的流程。

**优秀线** — state 切分策略（per-env / per-layer / per-service）及 trade-off；循环依赖 / module abstraction 的陷阱（过早抽象 vs 重复）；drift 检测方案（CI 定时 plan + report）；import 现有资源的真实经历；sensitive 值处理（绝不提交到 Git，也绝不 plaintext 进 state）；discipline for **who** can apply（人类 apply vs CI apply）；明白 `terraform destroy` 在生产的危险，可能禁用它。

**Tutorial smell** — 单巨型 monolith state；所有人本地 apply；从没处理过 state 冲突；不懂 taint / untaint。

**Probe**："你们的 Terraform state 是怎么组织的？谁有 apply 权限？上次 state 冲突怎么解决的？"

### Secret / credential management

**及格线** — 知道不能把密钥提交到 Git。知道 AWS Secrets Manager / Parameter Store / HashiCorp Vault 大致作用。

**优秀线** — 讲 **rotation** 机制：自动 rotate 还是手动？下游服务怎么感知？讲 **blast radius**：一个 service account 被盗能拿到什么？讲 **K8s workload identity**（IRSA / Workload Identity / Pod Identity），为什么这比 secret 更好。用过 external-secrets-operator 或 sealed-secrets，能讲两者的 trust model 差异。Jenkins credentials 的安全处理（masked / scoped / audit log）。

**Tutorial smell** — "使用 Vault 管理 secret" 但讲不出 rotation、讲不出 access policy 结构。`values.yaml` 里出现过 plaintext secret 是 red flag。

**Probe**："你们 Kubernetes pod 怎么拿到 AWS credential？为什么不用 long-lived access key？"

### Developer platform mindset

**及格线** — 听过 IDP / paved path / golden path 这些词。关心开发者体验（首次部署时间、错误消息可读性）。

**优秀线** — 量化 DX 指标：onboarding time、first-deploy time、mean time to new service。在 标准化（paved path）和 灵活性 之间有观点 —— 讲过"当有人跳出 paved path 时该怎么处理"。讲过 self-service 工具（portal / CLI / Backstage）。讲 **inner-source** 文化：平台团队开 PR，业务团队贡献 module。

**Tutorial smell** — "我们搭了 Backstage" 但讲不出业务团队实际用它做什么。

**Probe**："业务开发想新起一个 service，从申请资源到第一次部署，你们的标准流程是什么？最慢的环节在哪？"

### Cost / FinOps awareness

**及格线** — 知道 Spot / Reserved / On-Demand 的基本经济学。能读 AWS Cost Explorer。

**优秀线** — 能讲某次具体的成本优化项目：降了多少、怎么量的、trade-off 是什么。理解 Karpenter consolidation 对成本和中断率的双刃效应。做过 **right-sizing**（基于 VPA 推荐或真实使用率）。区分 "便宜" 和 "可靠的便宜"——不会为省 20% 成本把可用性拉下一个九。

**Tutorial smell** — "大量使用 Spot 节约成本" 但讲不出中断处理、不讲 PDB。

**Probe**："你 Spot 节点占比是多少？中断处理链路是什么？如果一个关键 pod 只跑在 Spot 上，怎么办？"

## DevOps-specific deep-dive topics

These are the topics to emphasize in the 30-min tech deep-dive window, beyond the shared question bank:

### 1. Pipeline 设计 from scratch

给一个服务（"Java Spring Boot 后端"），让候选人现场设计 CI/CD：

- 阶段划分？每阶段的输入/输出？
- 失败后从哪重跑？
- docker image tag 策略？
- 多环境 promotion 如何触发？
- rollback 怎么实现？

**优秀信号**：主动讲 secret scanning / SBOM / image signing（cosign）等 supply-chain 卫生；主动问"有哪些合规要求"。

### 2. Monorepo vs Polyrepo 取舍

问："如果让你设计 50 个微服务的 repo 结构，你会选 monorepo 还是 polyrepo？" 没有标准答案，考的是权衡意识。

**优秀信号**：讲 build 工具约束（monorepo 需要 Bazel / Nx / Turborepo）；讲 CI 爆炸（monorepo 一个 commit 触发全部 build 的问题）；讲 ownership 边界。

### 3. 发布策略

问："你经历过的最典型的发布策略是什么？蓝绿、金丝雀、滚动，有没有哪种坑？"

**优秀信号**：讲过金丝雀的真实问题 —— 流量倾斜做不准（有状态 / sticky session）、observability 不够精细（没法对比 canary vs baseline 的 SLI）；讲 progressive delivery 工具（Flagger / Argo Rollouts）。

### 4. IaC refactor

问："你进来发现一个 3000 行的 `main.tf`，上面 10 个人动过，state 是 monolith。怎么拆？"

**优秀信号**：先冻结 / 审计 —— 别上来就 move；用 `terraform state mv` / `import` 工具分批；先切 state 再切 module；保留 rollback 路径。

### 5. Secrets 从 0 到有

问："如果进来发现 CI 和 K8s 里都是 long-lived AWS key，你怎么迁到 workload identity？"

**优秀信号**：分阶段（先并存、再切换、再移除 key），有 rollback 路径；做 audit log 确认没有人再用老 key；删除顺序（先禁用、观察、再删除）。

## 项目深挖选题建议（10–20min）

优先挖以下类型项目：

1. **从 0 搭建 CI/CD 平台 / GitOps 迁移** — 问实施路径、业务方抗拒、第一个落地 service、现在成熟度怎样。
2. **Terraform 改造 / state 切分** — 具体数字（多少 module、多少 state、多少 provider），以及踩过的具体坑。
3. **开发者自助平台 / Backstage 落地** — 业务接入率、DX 指标、最常见抱怨是什么。
4. **成本优化项目** — 具体数字、方法、trade-off。
5. **重大 release 流程改造** — 从人工审批到自动化，蓝绿/金丝雀落地。

**避免**：挖纯 SRE 方向项目（SLO / 事故响应），除非候选人强调了交付效率角度。

## 系统设计题选题建议

从 `system-design-bank.md` 里优先选：

- **CI/CD 平台 for 100+ services** — 直接考 DevOps 核心能力
- **零停机发布** — 考 pipeline + 流量管理
- **多区域部署** — 考 IaC + promotion + drift

避免纯 reliability 题（那是 SRE 角度）。

## 编码 / Coding 题选题建议

从 `coding-problems.md` 里优先选：

- Terraform reusable VPC module — 考 IaC 设计品味
- Helm chart debugging — 考 templating 深度
- ArgoCD Application YAML 修复 — 考 GitOps 实操
- Docker image 多阶段 build 优化 — 考 supply chain

## 否决信号

senior DevOps 的硬否决：

- 讲不出任何具体 pipeline 设计细节，只会"用 Jenkinsfile 模板"
- Terraform state 从没遇到过问题 / 从没做过 refactor
- 密钥管理方案只有"放 Vault"
- 没做过任何 cost 量化
- 不能区分 CI 和 CD
- GitOps 讲成"Git 里放 YAML"
