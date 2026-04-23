# System Design Bank — Senior SRE / DevOps

5 scenarios for the 30–40min window. Each scenario carries:

- **场景背景** — one-paragraph setup
- **关键考察维度** — what dimensions to grade on
- **及格线 / 优秀线 / 否决线** — three-tier rubric
- **角色倾向** — which angle (SRE or DevOps) this scenario lands harder on

Selection rule: pick **one** scenario whose setup echoes the candidate's resume. If the resume claims "落地 GitOps"，选 CI/CD 平台；如果讲过"支撑多区域业务"，选多区域灾备。强制 signal verification。

---

## 场景 1：多区域灾备 + 自动切换

### 场景背景

你公司目前只在 AWS us-east-1 部署，最大业务日活 500 万。需求：增加 us-west-2 作为 DR region，RTO ≤ 15 分钟，RPO ≤ 1 分钟。流量入口是 Cloudflare。应用跑在 EKS + RDS + S3 + Redis。

**约束**：成本不能翻倍（hot-hot 不可行）；不接受数据丢失（RDS 是 source of truth）。

### 角色倾向

**SRE 更重**（考 SLO / failover logic / data consistency / blast radius）。DevOps 可以从 IaC 多 region 管理角度切入。

### 关键考察维度

1. **流量层**：Cloudflare 如何感知 primary region 故障？DNS failover 还是 Load Balancer health check？
2. **应用层**：EKS 双集群 — active-passive 还是 active-active？ArgoCD 部署模式？
3. **数据层**：RDS 跨 region replica 的 lag；failover 的数据丢失窗口；S3 CRR 的 eventual consistency
4. **缓存层**：Redis 跨 region 怎么处理？全新起来还是 replicate？cache stampede 风险
5. **切换流程**：自动 vs 手动；决策者是谁；通信机制
6. **回切流程**：如何确认 primary 恢复？数据方向如何反向同步？
7. **成本 trade-off**：standby 规模是全量还是 10%？pre-warm 策略？

### 及格线

- 画出两个 region 的拓扑
- 提到 Cloudflare health check + DNS failover
- 提到 RDS read replica + promote
- 提到 RPO 由 replication lag 决定

### 优秀线

- 主动问 "RDS 是 MySQL / PostgreSQL / Aurora？"—— Aurora Global 的 failover 时间远好于 RDS cross-region replica
- 区分 **自动 failover**（DNS TTL + 健康检查）和 **人工决策 failover**（防止误切），并说出每个的适用场景
- 提到 **数据一致性**：failover 时 primary 尚未 replicate 的 transaction 会丢 → 业务必须接受这个窗口或用同步复制（代价是 RPO=0 但写延迟上升）
- **回切**是 failover 里最被低估的部分 —— 讲清楚 DR region 写入的数据如何反向同步
- 提到 **"失败并不是二元的"** —— 区分"单 AZ 故障"vs"整个 region 故障"，前者用 Multi-AZ 就够了，不必 cross-region
- **成本**：warm standby（10% 容量）vs pilot light（只数据，计算按需起），明确 recovery time 的影响
- 讨论 **"DR 演练"**：每季度做一次切换演练，否则 DR region 是"薛定谔的 DR"

### 否决线

- 说"两个 region 跑一样的东西就行"
- 忽略 data layer，只谈 compute layer
- 不能说出 RPO / RTO 的量化依据
- 认为"多活"等于"两个 region 都有流量"，没讲 data partition 或 conflict resolution

---

## 场景 2：零停机发布（金丝雀 + 回滚）

### 场景背景

一个核心订单服务，QPS 3000，P99 100ms，SLO 99.95%。要从每周一次发布改为每天多次。发布失败率当前 8%，希望降到 1% 以下。错误发布的 blast radius 越小越好。

### 角色倾向

**DevOps 更重**（考 pipeline 设计 / 渐进式发布 / 流量管理）。SRE 可以从 error budget 和 SLI-gated promotion 角度切入。

### 关键考察维度

1. **发布策略**：滚动 / 蓝绿 / 金丝雀 / feature flag，怎么选
2. **流量切分**：按百分比？按 header？按 user id hash？各自的代价
3. **promotion 决策**：人工 approve 还是自动？依据什么信号？时间窗口多长？
4. **回滚机制**：秒级还是分钟级？回滚是否等价于 "revert deployment"？
5. **观测**：哪些 SLI 用作 gate？error rate / latency / saturation？
6. **failure mode**：canary 本身挂了怎么办？canary 过了但全量挂了？
7. **数据库 schema 变更**：发布时 schema 和 code 不同步，怎么处理？

### 及格线

- 画出 canary → 50% → 100% 的阶梯
- 提到 Argo Rollouts / Flagger 或 Jenkins + 手工 promotion
- 提到 rollback = 回到上一个稳定版本

### 优秀线

- 主动讲**金丝雀的困难**：流量偏置（sticky session 用户集中在 baseline 或 canary）、observability 不对等（canary 量太小，指标噪音大）
- 提出 **SLI-gated promotion**：用 error-budget burn rate 判断，不是简单的 error count 阈值
- 讲 **schema 变更双写模式**（expand-migrate-contract）：先 expand schema 兼容新旧，部署新 code，数据迁移，再 contract 旧 schema
- **feature flag vs 金丝雀**的关系：feature flag 控制**功能**暴露面，金丝雀控制**代码**暴露面，两者可以叠加
- 提出 **真实的 blast-radius 估算**：10% canary 10 分钟 = 用户影响约 X；如果 canary 阶段 error rate 比 baseline 高 5% 就自动回滚
- 讲 **deploy markers**：每个 release 在 Grafana 打标，方便事故回查
- 主动提 **rollback 也会失败** —— 如果 rollback 依赖的工具链有问题，准备 manual override

### 否决线

- "直接 kubectl set image，K8s 会滚动"（完全没有 canary 意识）
- rollback 等于"再发一次老版本"而不是"回到老版本"
- 不讲 schema migration 的风险
- 金丝雀是"跑两个 pod"而不是真实的流量切分

---

## 场景 3：K8s 集群自动伸缩（Karpenter + Spot）

### 场景背景

一个 EKS 集群当前 200 个节点（全 on-demand），月成本 $80K。目标降到 $40K，同时不降低 availability（99.9% SLO）。业务有明显 diurnal pattern（白天峰值是夜间 3 倍）。一些 workload 是 stateful（Redis、ElasticSearch），一些是 stateless（API、worker）。

### 角色倾向

**SRE + DevOps 平衡**（SRE 看 availability + disruption budget；DevOps 看成本 + 标准化）。

### 关键考察维度

1. **workload 分类**：什么能上 Spot？什么必须 on-demand / RI？
2. **Karpenter NodePool 设计**：几个 pool？怎么区分？
3. **PDB / do-not-disrupt**：哪些工作负载需要？
4. **Spot 中断应对**：aws-node-termination-handler / Karpenter 自带？graceful shutdown 够不够？
5. **consolidation**：多激进？会不会和发布互相打架？
6. **容量 headroom**：预留多少 buffer 防流量尖峰 + 节点故障？
7. **冷启动**：应用启动 60s，HPA 扩容决策再加上 Karpenter 起节点，总延迟会不会错过峰值？

### 及格线

- 把 stateless / stateful workload 分开
- stateless 上 Spot；stateful 保持 on-demand
- 提到 Karpenter 替代 Cluster Autoscaler
- 提到 PDB 保护

### 优秀线

- 设计 **多 NodePool**：spot-general / on-demand-critical / gpu-pool，用 taint + nodeAffinity 区隔
- 讲 **Spot 多样化**：多实例类型（m5 / m6i / c5 / c6i 混合）+ 多 AZ，降低集中中断风险
- 讲 **PDB 分级**：核心 service minAvailable=50%，次要 service maxUnavailable=1
- **consolidation policy**：`WhenUnderutilized` + `consolidateAfter: 30s`；但给关键 workload 加 `karpenter.sh/do-not-disrupt`
- **冷启动优化**：pod startup probe 延长、pre-pull image（NodeClass 配 AMI 已缓存）、HPA scaleUp 策略激进（每分钟加多少）
- **capacity reservation / savings plan**：baseline 60% 用 RI / Savings Plan，20% on-demand 做缓冲，20% Spot
- 提出**量化**："成本降 X%，availability 下降 Y%（可接受范围内）"
- 讲 **observability**：spot 中断次数、consolidation 事件、pending pod 时长作为 dashboard

### 否决线

- "全部上 Spot"（没有 workload 分层）
- 认为 Karpenter 自动处理一切不需要 PDB
- 讲不出 cost 和 availability 的 trade-off 曲线

---

## 场景 4：CI/CD 平台 for 100+ services

### 场景背景

公司从 20 个服务扩张到 100+，每个服务原本各自有 Jenkinsfile，风格差异巨大。你作为平台负责人，要在 3 个月内交付一个标准化 CI/CD 平台，让新服务 1 天内接入，同时老服务 6 个月内迁移完。已有基础设施：Jenkins（legacy）、ArgoCD、Terraform、AWS EKS。

### 角色倾向

**DevOps 主导**。SRE 角度考 release safety + observability。

### 关键考察维度

1. **技术选型**：保留 Jenkins 还是换？GitHub Actions / GitLab CI / Buildkite / Tekton？
2. **标准化 vs 灵活性**：paved path 怎么设计？jump-out 机制？
3. **shared library / template**：怎么做升级？如何让业务仍感到"我是控制 pipeline 的"？
4. **onboarding 流程**：新 service 第一次接入的步骤几步？
5. **迁移策略**：老服务 6 个月迁移的 gate / milestone？
6. **回滚**：pipeline 升级挂了怎么办？
7. **安全**：secret 管理、image signing、SBOM 等 supply-chain 卫生

### 及格线

- 画出"模板化 Jenkinsfile → 标准阶段"架构
- 提到 shared library
- 提到 ArgoCD + GitOps 把 deploy 从 Jenkins 里剥离
- 分 3 个月做阶段规划（调研 → 试点 → 推广）

### 优秀线

- **清晰定位 CI / CD 边界**：CI（build + test + scan + publish image）留给 Jenkins 或 Actions，CD（deploy）完全交给 ArgoCD，pipeline 就是 "push image + commit new version to gitops repo"
- **paved path + off-ramp**：标准模板覆盖 80% 场景；剩下 20% 允许 override，但必须有 justification + review
- **template versioning**：版本 pinning（`@Library('platform-ci@v2.1.0')`），业务主动升级，平台团队废弃老版本有 deprecation policy
- **onboarding**：目标 "新 service 1 小时内 CI 跑通，1 天内产线部署"。提供 CLI / Backstage template / 一键 bootstrap
- **观测 & feedback**：平台自己有 SLO（build success rate、build duration P95、onboarding time），并公开给业务
- **supply chain**：image signing (cosign)、SBOM 生成、image scan (Trivy)、MFA 保护 publish credential
- **老服务迁移 gate**：每月迁移 X 个 → 里程碑化，老 Jenkins 到 EOL 时间明确（例如 6 个月后 read-only，9 个月后下线）
- **人性化细节**：pipeline 失败消息要直指问题（不是一大坨 stacktrace）；本地能复现 CI 环境（docker-compose 或 act）

### 否决线

- 所有人一个 Jenkinsfile 模板（没有扩展点）
- 没有迁移路径，指望新老并存到天荒地老
- 不讲 secret / supply-chain
- 认为"用 Backstage 就是 IDP"（工具 ≠ 平台）

---

## 场景 5：可观测性体系（metrics + logs + traces）

### 场景背景

公司当前 observability 混乱：每个服务各自选 Prometheus 实例、Elasticsearch cluster 各种规模、traces 几乎没有。CFO 关心 observability 成本上涨；工程团队抱怨事故定位慢。你来做 re-architecture。EKS + AWS + 100+ services。

### 角色倾向

**SRE 主导**（SLO / alerting / incident detection）。DevOps 角度考 standardization 和平台化。

### 关键考察维度

1. **metrics**：中心化 Prometheus vs VictoriaMetrics vs Grafana Mimir vs Managed (AMP)？cardinality 治理？
2. **logs**：ELK vs Loki vs OpenSearch？成本和查询体验的权衡？
3. **traces**：Jaeger vs Tempo vs Managed？sampling 策略？
4. **统一采集**：OpenTelemetry Collector 的应用？
5. **SLO / alerting**：burn-rate 告警 vs threshold 告警
6. **成本治理**：谁为可观测性付费？如何激励业务节省？
7. **事故响应**：dashboard 标准化 + runbook

### 及格线

- 提到 three pillars
- 提到 OpenTelemetry Collector 统一
- 提到 Prometheus federation 或 remote_write
- 提到 sampling

### 优秀线

- **cardinality 治理**：label 审查（绝不允许 user_id / request_id 作为 label）、metric naming convention、每个服务 metric budget
- **log 分级 + TTL 分层**：hot（1 天）/ warm（7 天）/ cold（90 天 S3 archive）；核心服务保留长，非核心 save cost
- **trace sampling**：head-based 100% 保留关键路径，tail-based 留异常 trace；sampling rate 反映预算
- **SLO-driven alerting**：multi-window burn-rate（2% error budget in 1h + 5% in 6h → page；slower burn → ticket）
- **单一来源**：所有 alert 从 SLO + burn rate 出发，不允许工程师随便加原始阈值 alert → 控制 alert 数量
- **成本归因**：按 namespace / team 打 label，可看到各团队 observability 成本，倒逼自治
- **平台层面**：Grafana 提供统一 dashboard template，service mesh 注入追踪 header，OTel collector 作为 sidecar / DaemonSet
- **人性化**：从 metric 一键跳 trace（exemplar）、trace 一键跳 log（trace_id 注入）、log 一键跳 metric
- 提到 **"事故时用哪条"**：先看 metric 发现异常 → 看 trace 定位是哪个 service → 看 log 查具体原因，三层各自的用途明确
- **成本数据**：粗估现状 + 治理后预估，有 SLO 敏感度分析（降了 20% 成本，告警噪音增加吗？）

### 否决线

- 只讲工具（"装个 Prometheus"）不讲治理
- 不讲 cardinality
- 觉得 alert 越多越好
- 没有明确的 alert threshold 来源（靠感觉定）
