# Question Bank — Senior SRE / DevOps

Hardcore technical questions by topic. Each question carries 【标准答案要点】 and a 【加分回答】 that only production-experienced candidates volunteer unprompted.

**Selection rule (from SKILL.md)**: pick 3 questions in the 20–30min window, weighted by the candidate's claimed experience. Don't ask questions on tools the resume doesn't mention — there's no signal in "I don't know X, I've never used it."

Tagging:
- `[核心]` — must-know for senior level
- `[进阶]` — real depth signal
- `[加分]` — senior bonus (lets top candidates shine)

---

## Kubernetes

### K8-1 `[核心]` Pod 从 `kubectl apply` 到 Running 的完整生命周期

讲 kube-apiserver → etcd → scheduler → kubelet → CRI → containerd → runc 这条链。

【标准答案要点】
- kubectl → apiserver (admission controllers 先跑：mutating → validating) → etcd 持久化
- scheduler watch 未绑定 pod，filter + score 选节点，写回 pod.spec.nodeName
- kubelet watch 到自己节点的 pod，通过 CRI 调用 containerd
- containerd 拉 image、创建 container，runc 真正起进程
- kubelet 按 readiness / liveness / startup probe 更新 status

【加分回答】
- 区分 pause container 的角色（network namespace shared anchor）
- 讲 admission webhook 的失败模式：failurePolicy: Fail 导致 apiserver 阻塞
- 讲 static pod（kubelet 不 watch apiserver 也能起 kube-system 组件）

### K8-2 `[进阶]` `livenessProbe` / `readinessProbe` / `startupProbe` 的实战差异

什么时候用哪个？配错会怎样？

【标准答案要点】
- readiness 失败：从 Service endpoints 里摘掉，不影响 Pod 生死
- liveness 失败：kubelet 杀容器重启
- startup：新加入，保护慢启动应用，startup 没通过之前 liveness 不检查
- 关键错误：用 liveness 检查下游依赖（DB），一挂全挂；或者 readiness 和 liveness 配同一个 URL，导致 cascading failure

【加分回答】
- 讲 probe 的 timeoutSeconds 默认只有 1s，慢启动 Java 服务容易误杀
- 讲 readiness 和 HPA metrics 的竞争（readiness false 时不在 endpoint 里，指标采集也可能失败）
- "健康检查不应该依赖下游" —— Google SRE book 核心原则

### K8-3 `[进阶]` HPA 的陷阱

"我用 HPA 基于 CPU 扩容，但高峰期还是顶不住" —— 候选人怎么分析？

【标准答案要点】
- metrics-server 15s 一采，HPA 默认 15s 决策 —— 扩容响应延迟 至少 30s，加上 pod 冷启动（Java 通常 30-60s）共 1-2min
- CPU 不是好指标 —— Java heap 打满时 CPU 可能不高；I/O-bound 服务更不合适
- 解决：基于 custom metrics（QPS / queue length）；pre-warm / overprovision；配合 Cluster Autoscaler / Karpenter 提前起节点

【加分回答】
- stabilizationWindowSeconds 在 scaleDown 默认 5min，scaleUp 默认 0，有意"扩快缩慢"
- HPA v2 的 behavior 可以定义 scale policies（per-X-seconds Y pods）
- VPA 和 HPA 不能同时基于 CPU 用 —— 冲突；要么 VPA 只改 request 不改 limit，要么 HPA 换 custom metric

### K8-4 `[加分]` Pod 被 evict 的所有可能原因

把 "Evicted" 状态展开。

【标准答案要点】
- 节点资源压力（memory pressure / disk pressure / pid pressure）→ kubelet eviction
- Node NotReady → controller-manager pod eviction（默认 5min tolerance）
- Preemption（高优先级 pod 抢占）
- 主动 drain（kubectl drain / Karpenter consolidation / Cluster Autoscaler scale-down）
- 超出 ephemeral-storage limit

【加分回答】
- 区分 "soft eviction"（有宽限期）和 "hard eviction"（立即 kill）
- 讲 pod QoS class（Guaranteed / Burstable / BestEffort）决定 eviction 顺序
- Karpenter 的 disruption controller 可以通过 `karpenter.sh/do-not-disrupt` 注解保护

---

## Helm

### HELM-1 `[核心]` Helm 3 相比 Helm 2 的关键变化

除了"去掉 tiller"还有什么？

【标准答案要点】
- 没有 tiller，client-side 渲染 + apply
- release metadata 存到 secret（同 namespace），不再集中式
- 强制 three-way merge for upgrade
- chart dependency 用 Chart.yaml 而不是 requirements.yaml
- 支持 library chart

【加分回答】
- three-way merge 的坑：用户手动 `kubectl edit` 过的字段，helm upgrade 会冲突
- helm 3 的 `--atomic` + `--cleanup-on-fail` 是实战必备参数
- `helm diff` 插件必装，否则 upgrade 几乎等于蒙眼 apply

### HELM-2 `[进阶]` chart 里 hook 的失败模式

pre-install / post-upgrade hook 失败时，release 会处于什么状态？

【标准答案要点】
- hook 失败：整个 release 失败
- 默认 hook 资源会被保留，需要手动清理（除非加 hook-delete-policy）
- release 会卡在 `pending-install` / `pending-upgrade`，后续 upgrade 会被阻塞
- 恢复：删除 release secret，或用 `helm rollback`（如果有前一个成功版本）

【加分回答】
- hook-delete-policy: hook-succeeded, before-hook-creation, hook-failed 的组合
- 生产环境应避免用 hook 做 schema migration —— 失败时没有 retry 安全网；用专门的 migration job + argocd sync wave 更好
- pending-upgrade 卡死时用 `helm history` + `kubectl delete secret sh.helm.release.v1.<name>.v<N>` 强制清理

### HELM-3 `[加分]` values 层级 + templating 陷阱

用户 override 一个 list 字段（例如 env vars），会发生什么？

【标准答案要点】
- Helm 的 values 合并是 map deep-merge，但 list 是 **整体替换** 不合并
- 结果：用户想加一个 env var，实际把模板里原有的 env 全部覆盖
- 解决：在 chart 里暴露合并点（extraEnv），或者用 `lookup` 函数，或者在 chart 里用 merge 函数（Helm 3.x 支持 `mustMerge` / `mergeOverwrite`）

【加分回答】
- 讲 `{{- }}` vs `{{ }}` 的空白处理（最容易出的 indentation 问题）
- 讲 library chart 模式：公司级 chart 库 + 业务 chart 继承
- `helm template --debug` 是调试一切的起点

---

## ArgoCD

### AC-1 `[核心]` ArgoCD Application 的 sync wave + sync hook

用过什么场景？

【标准答案要点】
- sync wave：资源按 `argocd.argoproj.io/sync-wave` 注解排序 apply（同 wave 并发，不同 wave 串行）
- sync hook：PreSync / Sync / PostSync / SyncFail / PostDelete，类似 Helm hook 但由 ArgoCD 触发
- 典型用法：wave -1 是 CRD，wave 0 是 namespace，wave 1 是 workload，wave 2 是 ingress / service

【加分回答】
- sync wave 只在同一 Application 内生效；跨 Application 的顺序要用 app-of-apps + waves
- ArgoCD 的 sync 是 declarative 而不是"apply 一次"—— controller 持续 reconcile，所以 hook 设计要幂等
- `Replace=true` 可以破 immutable field 错误，但代价是 recreate（有停机风险）

### AC-2 `[进阶]` 如何处理 GitOps 下的 drift

生产集群有人 `kubectl edit` 了一个 deployment，ArgoCD 应该怎么处理？

【标准答案要点】
- 默认 ArgoCD 会检测到 OutOfSync，但不自动 sync（除非配了 auto-sync）
- auto-sync 开启时，自动把状态推回 Git 定义
- 真实做法：auto-sync + selfHeal=true + prune 打开 → 完全不允许手工改；OR 关掉 auto-sync，用 alert 通知 drift（适用于对手工操作有容忍的团队）

【加分回答】
- 讲**两条通路**问题：Git 和人手改同时存在时，ArgoCD 永远"赢"是最简单模型，但失去了紧急人工介入能力
- 紧急情况下怎么办？option A：改 Git 走 emergency PR；option B：临时关 auto-sync 然后改，事后补 PR
- 讲 ignoreDifferences 用法 —— 有些字段注定会漂（autoscaling 的 replicas），要显式豁免

### AC-3 `[加分]` ApplicationSet 的 4 种 generator 及选择

【标准答案要点】
- list：静态列表，简单但每次加 app 要改模板
- cluster：多集群同一 app，选 registered cluster 作为参数
- git (directory / files)：按 Git 目录/文件生成 app，最常用于"多租户"
- matrix：组合多个 generator（cluster × git），复杂但强大

【加分回答】
- ApplicationSet 的 pull-request generator 可以给每个 PR 起一个 preview 环境，自动回收
- 踩过的坑：matrix generator 下的 template field 不会自动继承，要显式重写
- 大规模集群下 ApplicationSet controller 是性能瓶颈，要 sharding

---

## Terraform

### TF-1 `[核心]` Terraform state lock 丢失 / state 冲突的恢复

两个人同时 apply 都成功了一部分，现在 state 乱了，怎么办？

【标准答案要点】
- 先**停止所有操作** —— 锁住 state（开 DynamoDB lock 或手动设 metadata）
- `terraform state pull > backup.json`
- 用 `terraform plan` 看当前状态和代码的差异
- 手动对账：`terraform state rm` 删 stale 资源记录，`terraform import` 导入漏记录
- 恢复后再做一次 `plan` 确认干净

【加分回答】
- DynamoDB state lock 应该是**强制**不是可选
- state 应该 encrypted at rest（S3 backend + KMS）
- 灾难恢复：state 丢了能靠代码 + import 重建，但 secret 字段（random_password 等）会变 —— 所以 state 本身是关键资产

### TF-2 `[进阶]` state 组织方式

单 state vs 多 state？你的团队怎么切？

【标准答案要点】
- 单 monolith state：简单、一致，但 plan 时间长、blast radius 大、并发冲突多
- 多 state 切分维度：per-env / per-layer (network, compute, data) / per-service
- 常见做法：per-env 作为顶层切分，每个 env 内按 layer 再切
- 跨 state 依赖：remote state data source，但形成依赖图，复杂度上升

【加分回答】
- 讲 Terragrunt 的 DRY 模式：一份代码，per-env 的 terragrunt.hcl 差异化
- 讲 cross-state 依赖反向形成"大泥球"的风险 —— 宁可复制配置
- OpenTofu 从 Terraform 分叉后的影响 —— license、兼容性策略

### TF-3 `[加分]` 为什么不用 `count`，优先用 `for_each`

【标准答案要点】
- `count` 用的是 index 定位：中间删一个会导致后面的资源全部 replace（destroy + recreate）
- `for_each` 用的是 map key 定位，删除某一项不影响其他 —— 生产下几乎一律用 for_each

【加分回答】
- `for_each` 的 key 必须是 static 或可预测的（不能是 module output），否则会在 plan 阶段失败
- 讲 dynamic block 的合理使用 vs 过度使用（debugging 噩梦）
- 讲 `moved` block 做安全 refactor 的技巧

---

## AWS

### AWS-1 `[核心]` IAM role / assume role / trust policy 的关系

一个 K8s pod 通过 IRSA 拿 AWS 权限，底层原理是什么？

【标准答案要点】
- IRSA：IAM Role for Service Accounts
- K8s service account 关联 IAM role (OIDC trust)
- Pod 启动时 EKS 注入 projected token (JWT)
- pod 用 AWS SDK 时，token → STS AssumeRoleWithWebIdentity → 临时 credential
- credential 15min-12h 有效，SDK 自动 refresh

【加分回答】
- 区分 IRSA（EKS）和 Pod Identity（EKS 1.28+, 新方案，更简单）
- trust policy 里的 condition 要严格限定 SA 名字，否则同 namespace 的别的 pod 也能 assume
- debug：describe pod 看 env 里有没有 AWS_ROLE_ARN + AWS_WEB_IDENTITY_TOKEN_FILE

### AWS-2 `[进阶]` ALB vs NLB vs Ingress Controller

什么时候用哪个？

【标准答案要点】
- ALB (L7)：HTTP/HTTPS，支持 path/host routing，WAF 集成，适合 web 流量
- NLB (L4)：TCP/UDP，低延迟，支持 static IP，适合 TCP 服务 / gRPC / 保留源 IP
- EKS 下：AWS Load Balancer Controller 从 Ingress (ALB) / Service type=LoadBalancer (NLB) 创建
- NGINX Ingress Controller：跑在 pod 里，用 NLB 或 ALB 接流量，更灵活但多一跳

【加分回答】
- ALB 跨 AZ 的 billing cost（IP-target 模式避免跨 AZ 流量费）
- NLB preserve source IP 需要 target-type: ip + `externalTrafficPolicy: Local`
- 两者都可以通过 TargetGroupBinding CRD 直接对接 pod target group

### AWS-3 `[加分]` RDS failover 期间应用的行为

Primary 挂了 / Multi-AZ failover 发生时，你的应用会怎么样？

【标准答案要点】
- Multi-AZ failover：DNS 名字切到 standby，通常 60-120 秒
- 应用的连接池里旧连接全部失效 → 需要 connection retry + exponential backoff
- 可能出现的坑：DNS TTL 太长（JVM 默认 -1 永久缓存），需要 `networkaddress.cache.ttl=60`
- 即使 failover 完，数据库侧的事务可能被 rollback，应用要幂等 + retry

【加分回答】
- RDS Proxy 可以吸收 failover 的连接重建，但自身会引入 overhead
- Aurora 的 failover 比 RDS 快很多（30s vs 120s）
- 应用侧要做 connection pool 的 validation query（HikariCP 的 `connectionTestQuery`）

---

## Karpenter

### K-1 `[核心]` Karpenter vs Cluster Autoscaler 核心差异

为什么要换？

【标准答案要点】
- CA：基于 ASG / node group 预定义，扩容是改 ASG desired count，冷启动慢（2-3min 含 bootstrap）
- Karpenter：直接调云厂商 API 起 EC2，不走 ASG；冷启动 ~45s；根据 pending pod 动态选最便宜/合适的实例类型
- Karpenter 的 consolidation 可以主动把 pod 合并到更少节点省成本（CA 不做）
- Karpenter 原生支持 Spot + 多实例类型池，比 CA 的 multiple ASG 方案优雅

【加分回答】
- 迁移顺序：先装 Karpenter，建 NodePool / NodeClass，慢慢把 workload 从 CA-managed ASG 迁过来
- Karpenter v1 Alpha / Beta / Stable 的 API breaking changes 要看版本
- Karpenter 不能替换 system 节点组（kube-system, Karpenter 自己），那些仍需 ASG

### K-2 `[进阶]` Karpenter consolidation + PDB 的 interplay

consolidation 把服务搞挂过吗？

【标准答案要点】
- consolidation 发现更便宜的实例组合时会 drain 老节点 → 触发 pod 重新调度
- 如果 PDB 配了 minAvailable / maxUnavailable，Karpenter 会遵守 → 驱逐被阻塞
- 没配 PDB 的 workload 可能被同时驱逐多个副本 → 服务短时间不可用
- 解决：对关键 workload 强制 PDB + `karpenter.sh/do-not-disrupt` 注解豁免

【加分回答】
- disruption budget (NodePool 级) 和 PDB (workload 级) 是两层
- `karpenter.sh/do-not-disrupt` 用完要记得摘 —— 常见长期遗留问题
- 讲 TTL 字段：expireAfter / consolidateAfter 的含义

### K-3 `[加分]` Spot 中断的应对

Spot 节点 2min 中断通知来了，谁响应？

【标准答案要点】
- AWS Spot Interruption Handler（aws-node-termination-handler DaemonSet 或 Karpenter 自带）监听 EC2 metadata
- 收到通知 → cordon 节点 → taint → drain（遵守 PDB）→ Karpenter 选新节点调度
- Pod 侧要有合理的 graceful shutdown（`terminationGracePeriodSeconds` 足够）

【加分回答】
- 讲"Spot 集中度"风险：同实例类型 + 同 AZ 可能同时被回收；要 diversify
- 讲 Spot Placement Score 工具（AWS 提供）用来预判风险
- 讲 Capacity Reservation + Spot 混合策略，关键 baseline 用 RI / Savings Plan

---

## Cloudflare

### CF-1 `[核心]` Cloudflare 的 orange cloud / grey cloud 差异

什么时候用哪个？

【标准答案要点】
- orange cloud (proxied)：流量过 Cloudflare 边缘（CDN + WAF + DDoS 缓解）
- grey cloud (DNS only)：只做 DNS 解析，不代理流量
- 对 API endpoint / ingress：通常 proxied 以享受 DDoS 保护
- 对邮件服务器（MX）、VPN 端点 / SSH：grey cloud，否则协议不匹配

【加分回答】
- 讲 "Authenticated Origin Pulls"：边缘到源站的双向 TLS
- 讲 Zero Trust / Cloudflare Access 替代 VPN 的场景
- Cloudflare 的 reverse proxy 会换源 IP，源站要从 `CF-Connecting-IP` header 读

### CF-2 `[进阶]` Cloudflare Workers 的应用场景

什么时候该放 Workers，什么时候不该？

【标准答案要点】
- 适合：轻量 request transformation / auth header 注入 / A/B 路由 / 边缘缓存控制
- 不适合：需要强一致性存储（Workers KV 是 eventual consistency，DO 更适合有状态）、超过 CPU / 内存限制（默认 10-50ms CPU）
- pitfall：Workers 运行时是 V8 isolate，不是完整 Node.js，很多 npm 包不能用

【加分回答】
- Workers + D1 / R2 / KV / DO 的组合适合建轻量 edge-first 应用
- Workers + WAF custom rules 可以做接近实时的流量治理
- 讲 smart placement（自动把 Workers 跑在离源站近的位置，降低 back-end round-trip）

---

## Jenkins

### J-1 `[核心]` declarative vs scripted pipeline

什么时候用哪个？为什么现在推荐 declarative？

【标准答案要点】
- declarative：结构化，有 `pipeline {}` / `stages {}` / `steps {}` 等固定块
- scripted：纯 Groovy，所有控制流自由写
- declarative 优势：语法受限 → 可静态校验、可视化好、新手友好
- scripted 优势：灵活，能做 declarative 做不到的逻辑（如运行时动态生成 stages）
- 生产推荐：declarative 主体 + `script {}` 块嵌入必要的 Groovy

【加分回答】
- declarative 的 `when {}` + `post {}` 比 scripted 的 if/else 更清晰
- shared library 可以同时服务两种 pipeline，但 API 要小心设计
- 避免在 pipeline 中直接写大量 Groovy 业务逻辑 —— 没法单元测试

### J-2 `[进阶]` shared library 设计

多个项目用一个 Jenkinsfile 模板，怎么做？

【标准答案要点】
- Shared Library 声明在 Jenkins 全局配置或 `@Library` 注解
- 目录结构：`vars/<name>.groovy`（全局函数）/ `src/com/company/...`（类）/ `resources/`（模板文件）
- `vars/` 下的函数可以用 `name()` 直接调用
- 业务 Jenkinsfile 调用 library，library 里封装构建 / 部署 / 通知

【加分回答】
- library 要支持多版本（分支 / tag），业务在 `@Library('xxx@v1.2.3')` 固定版本，避免 library 改动影响全业务
- library 要有单元测试（Spock / JenkinsPipelineUnit）
- 过度抽象的 library 是反模式：调用方需要看 library 源码才能理解 —— 宁可重复也要清晰

### J-3 `[加分]` Kubernetes agent

Jenkins master 下发 build 到 K8s pod agent，整条链是怎么工作的？

【标准答案要点】
- kubernetes plugin 在 master 上，根据 podTemplate 定义起 pod
- Pod 起来后，inbound agent 通过 JNLP protocol 连回 master
- Build 在 pod 内跑，结束后 pod 删除
- pod 可以有多个 container（`container('maven') {}` / `container('kaniko') {}` 切换）

【加分回答】
- Master 和 agent 的网络：agent → master 是主动连接，master 不需要能连 agent
- privileged container 的必要性（Docker-in-Docker 或 kaniko 做镜像构建）
- 工作区缓存：volume mount + retentionDelay，否则每次 pull npm / maven 很慢

---

## Ansible

### ANS-1 `[核心]` Ansible 幂等性的含义 + 常见破坏方式

【标准答案要点】
- 幂等 = 运行 N 次效果和运行 1 次一样
- Ansible 大部分 module 内建幂等（file / yum / service 等）
- 破坏幂等的典型操作：`shell` / `command` module（除非加 `creates:` / `removes:` / `changed_when:`）
- 处理器（handlers）只在 task `changed` 时触发，是状态机风格

【加分回答】
- `check mode` (`--check`)：不改真实状态预演；并非所有 module 都支持
- 讲 `diff` mode 配合 check：相当于"干跑"
- 生产要求：shell module 必须显式 `changed_when: false` 或提供 idempotency 判断

### ANS-2 `[进阶]` Ansible Vault vs HashiCorp Vault

同名、完全不同，分别是什么？

【标准答案要点】
- Ansible Vault：Ansible 内置加密，把 secrets 加密后放 Git，运行时 `--ask-vault-pass` 或 `--vault-password-file` 解密
- HashiCorp Vault：独立服务，集中管理 secret，支持动态 secret、rotation、audit log
- Ansible Vault 适合少量静态 secret、团队小；HashiCorp Vault 适合企业规模、大量动态 secret

【加分回答】
- Ansible Vault 的 weakness：解密密码本身要分发 + rotation 困难
- Ansible 调用 HashiCorp Vault 的模式：`hashi_vault` lookup 插件
- 现代方案：K8s 环境用 external-secrets-operator，Ansible 脚本也可走这条路

---

## Quick-fire 题（散弹枪题）

快速过脑子，一句话一个答案，用于填空白 / 最后 5 分钟：

1. `kubectl get pod -o wide` 里你最常看哪列？—— NODE / IP，定位问题用
2. Deployment 改了 image，rollout 卡住，最可能 3 个原因？—— image pull / probe failing / resource insufficient
3. ArgoCD Application 一直 Progressing 不收敛？—— 看 events + 资源 status；常见 PVC 或 CRD 状态
4. Terraform `apply` 卡在某个资源 10min？—— 看 provider log（TF_LOG=DEBUG）；常见 AWS API rate limit 或 IAM 慢传播
5. Helm chart 里 `imagePullSecrets` 不生效？—— secret 在正确 namespace 吗？SA 引用了吗？
6. K8s service 有 endpoint 但流量进不去？—— selector label 匹配吗？readiness 过了吗？NetworkPolicy 挡了吗？
7. Pod 经常 OOMKilled？—— memory request 和 limit 比例？应用是不是依赖 swap（K8s 默认关）？是不是 Java heap + off-heap 总和超过 limit？
8. Karpenter 起新节点很慢？—— instance type 有没有配过窄？是不是 spot 容量紧张？image cache 命中了吗？
9. Terraform plan 每次都有 drift？—— 看是哪个字段；可能云厂商自动改了（default tags / RDS auto minor upgrade）；加 lifecycle ignore_changes
10. Jenkins build 偶尔 hang？—— pod agent 是不是被 evict 了？master 和 agent 之间的 JNLP 连接是不是网络抖动？
