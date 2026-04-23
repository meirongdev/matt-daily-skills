# SRE Angle — Senior SRE Evaluation Axis

Load this doc when `role=sre` is chosen in Step 0. It sets the SRE-specific evaluation lens on top of the shared `tutorial-vs-production.md` and `question-bank.md`.

## Role charter — what "SRE" actually means

SRE ≠ "DevOps with better branding". The Google-origin definition is sharp:

> **SRE is what happens when a software engineer is asked to run production systems.**

The job is to make production **reliable** (by SLO) and **boring** (by automating toil). Everything else — pipelines, infra, tooling — serves that single purpose. A senior SRE who can't articulate this distinction to a DevOps peer is already a yellow flag.

Concretely, the SRE role is evaluated on:

1. **Reliability outcomes** — did their SLOs hold? Did they burn error budget unevenly?
2. **Incident ownership** — do they own a service on-call, not just "participate in rotation"?
3. **Toil elimination** — can they put a number on toil reduction?
4. **Capacity foresight** — did they predict / provision for growth or get paged into it?
5. **Blast-radius instinct** — when discussing change, do they reason about what breaks?

Not evaluated on: pipeline UX, developer self-service, cost optimization (those are DevOps / platform concerns, though overlap exists).

## Evaluation rubrics — what to listen for

### SLO / SLI / error-budget literacy

**及格线** — can distinguish SLI (measurement), SLO (target), SLA (contract with penalty). Can name 2–3 SLIs they used (availability, latency, quality). Can describe error budget as "the amount of unreliability we're allowed to spend."

**优秀线** — describes **concrete** SLOs with numerators/denominators: "请求成功率 = (2xx+3xx 且延迟 <300ms 的请求) / 总请求，目标 99.9%，窗口 28 天"。Names **error-budget policies**: "烧完 70% 触发 X 行动，烧完 100% 触发 feature freeze". Distinguishes **user journey SLOs** (跨服务) from **service SLOs** (单服务). Knows why availability SLO > 99.99% is usually a **bad** target (retry / cache layer masks true availability, and you're paying for reliability the user can't perceive).

**Tutorial smell** — recites the "three nines, four nines" pyramid; can't describe the SLI denominator; no error-budget policy; conflates SLO with SLA.

**Probe**："你最近做过最细致的一个 SLO 定义是什么？SLI 分子分母各是什么？当时怎么选的窗口（7d/28d/90d）？"

### Incident ownership

**及格线** — can walk through one real incident with: 发现方式、初步判断、mitigation 动作、root cause。有 post-mortem 习惯。

**优秀线** — 分得清 mitigation 和 root-cause fix（"先回滚、再查"）。主动讲 detection gap（"告警晚了 6 分钟，我们把指标从 5min 窗口改到 1min"）。承认自己这次没做好的部分。有 blameless culture 意识 —— 讲故障时不点名指责。

**Tutorial smell** — 讲不出具体故障；故障归因总是外部（"当时网络抖动"、"云厂商故障"、"别人提交的代码"）；"我们团队的故障" 但说不清自己做了什么；post-mortem 只写了结果没写时间线。

**Probe**："最近一次凌晨被 page 是什么时候？从你手机响到 mitigation 完成，你做了什么？后来这个问题又发生过吗？"

### Toil quantification

**及格线** — 听过 toil 定义（manual, repetitive, automatable, tactical, no enduring value, scales linearly）。能讲一个自动化脚本 / runbook 生成工具。

**优秀线** — 给出 toil 的量化数据："团队每周 toil 占比从 60% 降到 20%"。讲 toil 减少的**方法**不是纯写代码 —— 可能是改 alert 规则（减少虚警）、改架构（去掉需要人工干预的环节）、定义 runbook 模板。谈过团队 toil budget。

**Tutorial smell** — 把"自动化"等同于 toil 减少；讲不出量化；把 feature 开发也当 toil。

**Probe**："你上个 quarter 做过最值得的一次 toil 减少是什么？减了多少时间？"

### On-call discipline

**及格线** — 真做过 on-call primary / secondary（不是备用）。知道 on-call handoff、runbook、escalation path 这些概念。

**优秀线** — 讲 on-call 健康度指标：alert 频率、alert-to-page 比率、非工作时间 page 数、on-call fatigue 体感。主动做 alert triage：noisy alerts 压缩、误报率降低。讲过 on-call rotation 公平性（时区、假期、轮班长度）。

**Tutorial smell** — "我们有 on-call 轮值" 但说不出自己接过几次 page、什么场景、几点钟。

**Probe**："你团队每周 page 量大概多少？其中多少是夜间？你做过 alert 清理吗？清掉了哪些？"

### Capacity & scaling foresight

**及格线** — 做过容量估算：CPU / memory / network / storage。知道 HPA、VPA、Cluster Autoscaler、Karpenter 基本差异。

**优秀线** — 做过**预测性**容量规划（基于业务增长曲线预留头寸）。讲过 headroom 策略（保留 X% 用于流量尖峰 + 节点故障）。结合 Karpenter + Spot 做成本优化时能讲中断率和 PDB 的联动。知道 HPA 基于 custom metrics 的陷阱（cold start、metric lag）。

**Tutorial smell** — "使用 HPA 实现自动扩缩容" 但讲不出 maxReplicas 怎么定的、扩容响应延迟多少、冷启动如何处理。

**Probe**："你当前系统的 headroom 是多少？如果今晚流量翻 3 倍，哪里最先顶不住？"

### Observability depth

**及格线** — 知道 three pillars（metrics / logs / traces）。用过 Prometheus + Grafana。

**优秀线** — 讲过 cardinality 爆炸事故（某个 label 是高基数字段，Prometheus OOM）。区分 high-cardinality events（logs）和 low-cardinality aggregates（metrics）。讲过 sampling 策略（head-based vs tail-based sampling in traces）。用过 exemplars / OpenTelemetry。能讲 alert 设计 —— symptom-based vs cause-based，基于 SLI burn rate 而非原始指标。

**Tutorial smell** — 只讲工具（"我们用 Prometheus"），没有 cardinality 意识；alerts 是基于资源指标（CPU > 80%）而不是用户影响（延迟或错误率）。

**Probe**："你的告警最多的 top 3 来源是什么？其中有多少真的对应用户影响？"

## SRE-specific deep-dive topics

These are the topics to emphasize in the 30-min tech deep-dive window, beyond the shared question bank:

### 1. SLO design for a specific service

给候选人一个业务（比如"订单创建接口"），让他现场设计 SLO / SLI：

- SLI 怎么定义？分子是什么？延迟阈值怎么选？
- 窗口？rolling 还是 calendar-based？
- 多 SLO（availability + latency + freshness）如何组合？
- error budget policy：burn rate alert 怎么配？

**优秀信号**：主动提到 "该服务是否有上游依赖？" —— 因为上游故障会消耗下游的 error budget，需要 dependency SLO。

### 2. Incident tabletop

给一个场景（例如："凌晨 2 点，API p99 延迟从 80ms 跳到 800ms，错误率没变"），让他现场讲怎么处理：

- 首先看什么 dashboard？
- 如何区分是 app 问题还是基础设施问题？
- 什么时候选择回滚？什么时候选择继续 debug？
- communication：谁通知？通知什么内容？

**优秀信号**：mitigation before root cause；主动问"最近有没有部署？"；知道把客户影响（用户能不能下单）放在第一位。

### 3. Post-mortem 文化

问："你们团队最近一次写的 post-mortem 是什么样的？包含哪些段落？"

**优秀信号**：timeline 精确到分钟；分离 contributing factors 和 root cause；action items 有 owner 和 due date；不点名指责；公开分享（不是只给领导看）。

**Tutorial smell**：post-mortem 等同于"写个总结"；没有 action items 或 action items 无人跟进。

### 4. 混沌工程 / 主动可靠性

问："你们做过 chaos testing / game day / failure injection 吗？"

**优秀信号**：在 staging 和 prod 都做过；从小爆炸半径开始（单 pod kill → 节点 drain → AZ 失效）；在做之前先约定 abort 条件；事后有发现并修复的真实 issue。

**Tutorial smell**：只听过 chaos monkey 的名字。

## 项目深挖选题建议（10–20min）

优先挖以下类型项目：

1. **重大故障 post-mortem** — 让候选人从简历里挑一次印象最深的 prod incident 详细讲。如果简历没写，主动问 "你经历过的最大一次故障是？"
2. **SLO rollout 项目** — "你们怎么把 SLO 从 0 推到全公司"，问 resistance、怎么说服业务、第一个 SLO 选谁、烧预算时谁来拍板。
3. **容量迁移 / 节点重构** —— 从 EC2 到 EKS，从 CA 到 Karpenter，从 on-demand 到 Spot。具体数字 + 坑 + 回滚策略。
4. **监控 / 告警整治** — 如果简历里提到"降低告警噪音"或"提升 MTTR"，深挖具体做法和量化结果。

**避免**：挖纯 DevOps 方向项目（CI/CD pipeline 搭建），除非候选人强调了可靠性角度。

## 系统设计题选题建议

从 `system-design-bank.md` 里优先选：

- **多区域灾备** — 考 SLO 设计 + failover 逻辑 + data consistency trade-off
- **可观测性体系** — 直接考 SRE 核心能力
- **K8s 集群自动扩缩容** — 考 capacity planning + Karpenter 深度

避免纯 pipeline 设计题（那是 DevOps 角度）。

## 编码 / Coding 题选题建议

从 `coding-problems.md` 里优先选：

- Crash-loop detection shell script — 考 on-call 工具思维
- K8s events 日志解析 - 考 observability 实操
- Alert 规则 YAML 修复 — 考 alerting 品味（symptom vs cause）

## 否决信号

senior SRE 的硬否决：

- 讲不出任何具体 prod incident
- SLO 说得出名字但定义不清 SLI 分子分母
- 把 "SRE" 等同于 "更好的 DevOps"（说明没真正接触过 SRE 职责）
- 从来没写过 post-mortem
- 答 capacity 问题只会 "加机器"
- alerts 全是 CPU / memory 等资源指标、没有 user-facing 指标
