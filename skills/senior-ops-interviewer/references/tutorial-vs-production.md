# Tutorial Knowledge vs Production Experience — SRE / DevOps Signal Catalog

The core axis of the `senior-ops-interviewer` skill. Use it when annotating the resume in Step 3 and when calibrating follow-ups during the interview.

## The underlying principle

Infra textbooks and certification courses teach a **uniform** vocabulary — SLO, GitOps, IaC, blue-green. Two candidates with the same AWS SAA can recite the same definitions. Production infrastructure work leaves **asymmetric** scars — two engineers who ran the same K8s cluster hit different failures, chose different trade-offs, and remember different numbers. Detect the asymmetry.

This skill is senior-only. At senior level, buzzword fluency without scar tissue is a harder red flag than at junior level.

## The three-bucket annotation

Tag every non-trivial bullet as:

- 🟢 **Production signal** — specific numbers, named trade-offs, post-mortems, "我们选 X 因为 Y，代价是 Z"
- 🟡 **Ambiguous** — needs a probe question to resolve
- 🔴 **Tutorial smell** — buzzword salad, certification-card definitions phrased as accomplishments, verbs without nouns

If <20% of bullets are 🟢 on a senior resume, that is itself a finding — bias the interview toward project deep-dive and post-mortem probes, away from theoretical questions (which a tutorial candidate will pass).

## Signal catalog

### Numbers that mean something

| 🟢 Production | 🔴 Tutorial |
|---|---|
| "生产 K8s 集群 2,300 个节点，85% Spot，月度成本降低 41% 从 $XXX 到 $YYY" | "使用 Karpenter 进行节点自动伸缩" |
| "SLO 99.95% availability, error budget 本季度烧完 70%，触发 feature freeze 一周" | "建立了 SLO 体系" |
| "P99 latency 从 420ms 降到 85ms，靠把 ArgoCD sync 分片到 3 个 controller" | "优化了 ArgoCD 性能" |
| "生产发布频率 从每周 2 次提升到每日 40+ 次，change failure rate 保持在 4%" | "提升了 CI/CD 效率" |
| "MTTR：P1 故障中位数 12 分钟，P2 45 分钟（2024 Q3 数据）" | "建立了事故响应流程" |

**Probe**：每当候选人报数字 —— "这个数你是怎么量的？dashboard 是哪个？做了几个月均值？"

### Trade-offs named, not assumed

| 🟢 Production | 🔴 Tutorial |
|---|---|
| "我们选 ArgoCD 而不是 Flux，因为 X 团队已有 ArgoCD UI 认知、多租户权限模型契合；代价是 ApplicationSet 的 drift 检测弱于 Flux 的 Kustomize 原生支持" | "使用 ArgoCD 实现 GitOps" |
| "选 Karpenter 而不是 Cluster Autoscaler，因为启动延迟 45s vs 2min、成本节约；代价是 consolidation 算法导致的 pod 中断频率上升，加 PDB 和 do-not-disrupt 注解" | "使用 Karpenter 管理节点" |
| "选 Terraform 而不是 Pulumi，因为团队熟悉 HCL、provider 生态更全；代价是循环依赖和 dynamic block 的复杂度" | "使用 IaC 管理基础设施" |
| "Jenkins 保留用于 legacy pipeline，新流水线迁移到 GitHub Actions + ArgoCD，因为 X" | "全面使用 Jenkins" |

**Probe**："当时还有哪些候选方案？为什么没选那些？现在回头看你会重选吗？"

### Failure stories — the strongest signal

| 🟢 Production | 🔴 Tutorial |
|---|---|
| "2024 双 11 ArgoCD 集群雪崩 —— app-of-apps 同时 reconcile 3000+ Applications，controller OOM。改用 ApplicationSet + sharding 到 5 个 controller 实例解决" | (无故障经历) |
| "Karpenter consolidation 把关键 service 从最后一个 Spot 节点驱逐，PDB 配置漏掉了。改用 `karpenter.sh/do-not-disrupt` 注解 + PDB 覆盖" | "使用 Karpenter spot 节点" |
| "Terraform state 被两人同时 apply 污染 —— remote state 没开 DynamoDB lock。恢复靠 `terraform state pull` + 手工对账 + import" | "使用 Terraform 管理云资源" |
| "Cloudflare 证书自动续期失败（域名验证记录漂移），API 层全域 5 分钟 503。根因是 Terraform 和 Cloudflare UI 两条配置通路并存造成 drift" | "使用 Cloudflare 做 CDN" |
| "Helm upgrade 途中 hook 失败导致 release 卡在 pending-upgrade，无法回滚。手动修 secret + `helm history --max` + `helm rollback` 救回来，之后加了 --atomic + --cleanup-on-fail 标准参数" | "使用 Helm 部署" |

故障是最强的生产信号 —— 没有人会在简历上写故障，除非亲历过。
**Probe**："你印象最深的一次线上故障是什么？是怎么定位的？修好之后做了什么改动防止再发生？"

如果候选人答不出具体故障、或答的是"某次网络抖动"这类外部归因，就是 🔴。

### Verb patterns

| 🟢 Production | 🟡 Ambiguous | 🔴 Tutorial |
|---|---|---|
| 设计 + 落地 + 度量 / 从 0 到 1 构建 / 主导迁移 / 量化 toil 减少 X% | 负责 / 参与 / 协助 / 优化 | 熟练 / 精通 / 掌握 |

"精通 K8s 原理"—— 精通到哪一层？讲一个 kubelet 和 containerd 之间的 CRI 调用你调试过的问题。
"熟练使用 Terraform"—— 你最近一次写的模块是什么？state 冲突处理过吗？

### Tech-stack shopping lists

大量标签化罗列工具是 🔴 的最大来源。senior 候选人会按项目讲"我们当时用了 X 和 Y 是因为 Z"，而不是平铺一串：

| 🔴 Tutorial tell | Why suspicious |
|---|---|
| "精通 K8s / Helm / ArgoCD / Flux / Jenkins / GitLab CI / GitHub Actions / Terraform / Pulumi / Ansible / Chef / Puppet / Prometheus / Grafana / Loki / Tempo / Jaeger / OpenTelemetry" | 4 年经验不可能在这么多工具上都有深度；多半是"听过 / 试过 / 配过一次" |
| "AWS / GCP / Azure / Oracle Cloud 全平台经验" | 三云+一个小云，通常是 certification 驱动，不是业务驱动 |
| "精通 Linux 内核调优 / eBPF / DPDK / XDP / SRv6" | 内核网络栈深度很少以这种清单化方式真实存在 |

**Probe**："这个列表里你最自信的三项各讲一个具体使用场景，包括你踩过的坑。"

### Scale honesty

| 🟢 Production | 🔴 Tutorial |
|---|---|
| "集群规模 350 节点，7 个命名空间，主要服务 QPS 约 8 万" | "万级节点超大规模集群" |
| "管理 12 个 AWS account，~180 个 Terraform module，90+ repos" | "超大规模云基础设施" |
| "我负责的平台服务 ~40 个业务方接入，标准部署时间从 2 天降到 30 分钟" | "服务了整个公司的 DevOps" |

数字规模与公司整体规模不符时，几乎总是把团队或公司整体数据挪到个人贡献下。**Probe**："你直接维护 / 你个人写过 Terraform 的是其中多少？"

### Technology diffusion timing

候选人用的工具，是否对应其工作时期的合理引入时间？Ops 领域的工具时间线比 Java 生态更严格 —— 很多工具出现得较晚。

| 技术 | 合理生产引入起点 |
|---|---|
| Kubernetes 作为生产平台 | 2018–2019 |
| ArgoCD 生产使用 | 2020+（v1.0 是 2020 年） |
| Karpenter 生产使用 | 2022+（GA 2022 年 11 月） |
| Istio / Linkerd 生产 | 2020+ |
| OpenTelemetry collector 生产 | 2022+ |
| eBPF 生产 (Cilium / Falco) | 2021+ |
| Helm 3 生产 | 2020+（v3.0 GA 2019 年末） |
| Terraform 0.12 语法 | 2019+ |

🔴 "2018 年用 ArgoCD 做大规模 GitOps" —— 时间线可疑，需追问当时是不是在用 argocd v0.x 还是其实用的是 Flux。
🔴 "2020 年用 Karpenter" —— Karpenter 2020 还没有 beta，追问是不是把 Cluster Autoscaler 记错了。
🟢 "2022 年从 CA 迁到 Karpenter，当时 Karpenter 还在 beta，踩过 X 坑" —— 时间线 + 迁移故事，可信。

### 现代 Ops 实践

候选人是否跟进了最近 2–3 年的 ops 方法论？

| 🟢 跟进 | 🟡 保守 | 🔴 停滞 |
|---|---|---|
| GitOps 作为默认 / eBPF 观测 / OTel 统一 pipeline / FinOps + Karpenter + Spot / policy-as-code (OPA/Kyverno) 生产使用 | Prometheus + Grafana 经典栈用得好 / Terraform 模块化规范 / 手写 Helm chart | 仍以 "SSH 上去 kubectl apply" 为主 / 没有 GitOps / 没有 IaC 或 IaC 仅用来创建 VPC |

停滞 ≠ 不合格 —— 有的团队规模小 / 技术债重 / 合规严格，保守是合理的。但对 senior 候选人要问："你们在什么规模下会引入 GitOps？目前的瓶颈是什么？"

### 责任信号

Ops 岗位的核心软素质 —— 凌晨被叫起来时你做什么？

| 🟢 Production | 🔴 Tutorial |
|---|---|
| "我是这条服务的 on-call primary，去年一共被页 14 次，其中 3 次是我直接修复" | "参与了 on-call 轮值" |
| "那次故障我在第 4 分钟发现、第 11 分钟找到根因、第 18 分钟回滚，post-mortem 由我主写" | "参与了事故处理" |
| "我给团队定了 runbook 模板 + alert 收敛规则，页面告警量从每周 200 降到 30" | "维护了 runbook" |

**Probe**："你最近一次被页是什么时候？你当时做了什么？写 post-mortem 了吗？"

不愿讲具体故障 / 总把责任归因给外部（网络抖动、云厂商问题、别的团队）/ 从没写过 post-mortem —— 都是 🔴。

## Rapid-fire probes

When in doubt mid-interview, these probes cheaply sort tutorial from production:

1. **"这个数你是怎么量的？哪个 dashboard？"** —— 任何数字。
2. **"当时还有哪些候选方案？为什么没选？"** —— 强迫命名 trade-off。
3. **"现在重做一遍会改什么？"** —— 反思 + 知识更新。
4. **"你上次被 page 是什么时候？事后做了什么改动？"** —— 责任 + 行动力。
5. **"如果给你 3 个月和 1 个人预算，你在这套系统上会改什么？"** —— 优先级判断 + 工程品味。
6. **"团队里除你之外谁最懂这块？他会怎么描述你在其中的贡献？"** —— 压缩吹水空间。

## 反向信号：tutorial smell 也可以是可接受的

不是所有 tutorial-smelling 简历都该 reject：

- **前东家本身规模小** —— 候选人没机会接触真正的大规模故障。看的是思维底子和基础扎实度，不是简历规模。
- **从内部平台到外部产品迁移** —— 描述可能平淡，但如果能在项目深挖时讲出具体演进故事，可以加分。
- **跨领域迁移（如从后端到 SRE）** —— 短期可能 tutorial smell 重，但学习速度 + 后端底子能支撑追赶。

**只有当简历声称 senior 且全篇 tutorial smell、没有故障故事、没有数字、工具清单过长时，才是确定的 red flag。**
