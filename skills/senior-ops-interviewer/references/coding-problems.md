# Coding / Practical Problems — Senior SRE / DevOps

Practical problems for the 40–50min coding window. Unlike algorithm LeetCode, these test **ops code taste**: can the candidate write something that works, is safe to run in production, and isn't over-engineered?

Each problem carries:
- **题目** — the ask
- **期望要点** — what to evaluate
- **观察重点** — behavioral signals during the coding
- **角色倾向** — which angle (SRE or DevOps) this lands harder on

**Selection rule (from SKILL.md)**: pick **one** problem whose shape echoes the candidate's experience.

---

## CP-1：Crash-loop 检测脚本（shell / Python）

**角色倾向**：SRE

### 题目

写一个脚本，给定 namespace，找出所有处于 CrashLoopBackOff 状态 超过 N 分钟 的 pod，输出 `pod_name, container_name, restart_count, last_exit_code, last_log_50_lines`。

要求：
- 可以在 on-call 手机上（限 CLI 的 Kubernetes 环境）跑
- 输出 Markdown，方便直接贴进 incident channel
- 对 TB 级大集群也不能超过 10 秒

### 期望要点

- 用 `kubectl get pods -n NS -o json` + jq 过滤，而不是多次 kubectl 调用
- 过滤条件：`.status.containerStatuses[].state.waiting.reason == "CrashLoopBackOff"` + 时间阈值判断
- 日志用 `kubectl logs --previous`（上一次 exit 的日志才是关键）
- 时间阈值：从 lastTerminationState 的 startedAt / finishedAt 推导
- 错误处理：某个 pod 查 log 失败不影响其他

### 观察重点

- **动手前是否澄清需求？** "N 是参数吗？限定 init container 还是 sidecar 都算？"
- **是否先跑一次 `kubectl get pods -o json | jq '.'` 看真实结构？** vs. 凭记忆瞎猜字段路径
- **错误处理**：某个 pod 查 log 失败时 continue 还是 abort？
- **可读性**：命名清晰，不是 `x1 / tmp1 / result`
- **真实性**：如果用 Python，是否知道 `subprocess.run` 比 `os.system` 安全？输出是否带足够 context（namespace + timestamp）？

### 否决信号

- `grep` 解析 `kubectl get pods` 的纯文本（早就该用 -o json 了）
- 不处理 `kubectl logs` 失败的情况
- 用 `while true; do kubectl ...; done` 式轮询而非一次性查

---

## CP-2：K8s Events 日志解析（Python）

**角色倾向**：SRE

### 题目

给一份 K8s events 日志（JSON lines 格式，每行一个 event），输出：
- 每个 namespace × 每个 reason（比如 FailedScheduling / BackOff / Killing）的 event 计数
- 每个 namespace 最频繁出现的 top 5 reason
- 总 event 数
- 时间范围（第一个 event 到最后一个 event）

输入可能很大（1GB+），内存不够一次加载。

### 期望要点

- **Stream 处理** —— 用 `for line in file:` 而非 `file.readlines()`
- defaultdict / Counter 做聚合
- 用 `heapq.nlargest` 或 `Counter.most_common(5)` 做 top-N
- 处理损坏 JSON 行（skip + count）
- 输出格式：Markdown table 或简单 aligned text

### 观察重点

- **流式意识**：一开始就假设文件小用 pandas 的是新手；立刻说 "文件可能很大我要流式处理" 的是 senior
- **错误容忍**：遇到 malformed JSON 是 raise 还是 skip？senior 一般 skip + 统计错误行数
- **时间处理**：是否知道 `datetime.fromisoformat` / `dateutil.parser`？时区处理 (UTC) ？
- **性能直觉**：1GB 文件流式读取，Python 单核大概 1-2 分钟；如果候选人估不出这个量级就是没经验

### 加分

- 主动问："这个脚本是一次性排查还是持续运行？"如果是持续的，建议用 K8s event exporter + Prometheus 而不是日志文件

---

## CP-3：Terraform 可复用 VPC module

**角色倾向**：DevOps

### 题目

写一个 Terraform module `vpc/`，满足：
- 可以创建一个 VPC，3 个 AZ，每个 AZ 有 public / private / db 三个 subnet
- 支持可选的 NAT Gateway（per-AZ 或单一共享）
- 支持 VPC flow logs（可选，发到 S3 或 CloudWatch）
- 输出：vpc_id / public_subnet_ids (list) / private_subnet_ids / db_subnet_ids / nat_gateway_ips

使用方式：
```hcl
module "vpc" {
  source = "../modules/vpc"
  name   = "prod"
  cidr   = "10.0.0.0/16"
  azs    = ["us-east-1a", "us-east-1b", "us-east-1c"]
  enable_nat_gateway   = true
  single_nat_gateway   = false  # per-AZ
  enable_flow_logs     = true
  flow_logs_destination = "s3"
}
```

### 期望要点

- **变量设计**：哪些必填，哪些有 default，输入合法性 validation block
- **subnet CIDR 切分**：用 `cidrsubnet()` 函数从 VPC CIDR 自动计算
- **for_each over azs**：而不是 count（hard-learned lesson）
- **conditional resources**：NAT / flow logs 用 `count = var.enable_xxx ? 1 : 0` 或 `dynamic` block
- **输出**：list 保持有序（subnets 按 az 顺序）
- **tagging**：合并 default_tags + 用户自定义

### 观察重点

- **先读 README 习惯**：senior 会主动说 "我先看一下 AWS provider 的 vpc / subnet resource schema"
- **硬编码的地方**：AZ list 是否硬编码？CIDR 是否允许用户传？
- **tagging 一致性**：是否把 Name tag + Environment tag 作为 convention？
- **错误处理**：AZ 数量和 subnet 数量不一致时会静默出错还是 validation 阻断？

### 加分

- 用 `moved` block 提示 refactor-safety
- 主动问 "这个 module 要不要支持 IPv6？"
- 提出 "真实生产环境不会让人随便改 CIDR，module 应该支持 lifecycle.prevent_destroy"

---

## CP-4：Helm chart debugging

**角色倾向**：DevOps

### 题目

给一个故障的 Helm chart：`helm install` 报 `error converting YAML to JSON: yaml: line 23: mapping values are not allowed in this context`。

Chart 内容（故意设计三个错误）：
```yaml
# templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Values.name }}
  labels:
    app: {{ .Values.name }}
    env: {{ .Values.env | quote }}
spec:
  replicas: {{ .Values.replicas }}
  selector:
    matchLabels:
      app: {{ .Values.name }}
  template:
    metadata:
      labels:
        app: {{ .Values.name }}
    spec:
      containers:
      - name: {{ .Values.name }}
        image: {{ .Values.image.repository }}:{{ .Values.image.tag }}
        env:
        {{- range .Values.envVars }}
        - name: {{ .name }}
          value: {{ .value }}     # 错误 1：某些 value 是纯数字，没 quote，YAML 把它解释成 int
        {{- end }}
        resources:
          limits:
            memory: {{ .Values.resources.limits.memory }}
            cpu: {{ .Values.resources.limits.cpu }}    # 错误 2：如果 cpu 是 "500m"（字符串含 m），没 quote 会报错
        ports:
        - containerPort: {{ .Values.port }}
        livenessProbe:
          httpGet:
            path: /health
            port: {{ .Values.port }}
        - name: http-readiness   # 错误 3：这行在 livenessProbe 里，缩进错位，这才是第 23 行报错的真正原因
          readinessProbe:
            httpGet:
              path: /ready
              port: {{ .Values.port }}
```

找出所有错误，修复 chart，并提出防止再犯的做法。

### 期望要点

- 能读懂错误消息定位到第 23 行的 YAML 结构问题
- `helm template --debug` 是第一反应，看渲染后结果
- 三个错误：
  1. `value` 不 quote（数字变 int 导致 K8s validation 失败）
  2. cpu / memory 不 quote（`m` / `Mi` 后缀要是 string）
  3. `readinessProbe` 缩进错位（不应在 `livenessProbe` 内）
- 修复方案：所有 value 统一 `| quote`；调整缩进
- **防止再犯**：在 CI 里跑 `helm lint` + `helm template | kubectl apply --dry-run=server` + chart-testing (ct) 工具

### 观察重点

- **错误消息解读速度**：senior 一眼看到 "line 23" 就去找第 23 行缩进
- **工具使用**：有没有想到 `helm template` 先看渲染结果
- **系统化修复**：是改一个错误测一次还是一次性修所有 obvious 问题
- **提升建议**：CI gate 是必答题；chart schema validation（values.schema.json）是加分

---

## CP-5：ArgoCD Application YAML 修复

**角色倾向**：DevOps

### 题目

同事提交了这个 Application 定义，ArgoCD 不 sync，status 一直 OutOfSync。排查原因。

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: order-service
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/company/gitops.git
    targetRevision: main
    path: apps/order-service
    helm:
      values: |
        image:
          tag: v1.2.3
  destination:
    server: https://kubernetes.default.svc
    namespace: prod-order
  syncPolicy:
    automated:
      prune: false
      selfHeal: false
```

同事反映：
- `kubectl get app order-service -n argocd` 显示 status OutOfSync / Healthy，但点 sync 什么也没发生
- 目标 namespace `prod-order` 不存在

找出至少 2 个问题，修复。

### 期望要点

- 问题 1：automated.prune / selfHeal 都是 false — 虽然 automated 块打开了，但 ArgoCD 认为 "不自动 prune 孤儿资源 + 不自动修复 drift"，仍需要手动 sync；并且默认 `prune: false` 适用于谨慎环境
- 问题 2：目标 namespace `prod-order` 不存在 —— 需要 `syncPolicy.syncOptions: ["CreateNamespace=true"]`
- 问题 3（进阶）：没有 `syncPolicy.retry` 配置，transient 错误不会重试
- 修复：`CreateNamespace=true` + 根据需要开 `prune: true`（对重要 prod 环境保持 false，用 app-of-apps 分级）

### 观察重点

- 是否**先看 ArgoCD events / conditions**（在 UI 或 `kubectl describe app`）而不是凭感觉猜
- 是否知道 argocd 的 `Application.status.conditions` 字段会告诉你"为什么 OutOfSync"
- sync 按钮点了"什么都不发生"的典型原因：应用层面只 detect 了 drift 但没被 trigger sync，或者 namespace 缺失

### 加分

- 主动提 "prune: false 在 prod 是合理的谨慎策略，新增资源靠 sync 补，删除走人工"
- 提到 `ignoreDifferences` 对某些字段（HPA replicas）的合理使用
- 提到 health check for custom resources 的注册方法

---

## CP-6：Dockerfile 多阶段优化

**角色倾向**：DevOps

### 题目

这个 Dockerfile 镜像大小 1.8GB，build 时间 12 分钟，有安全扫描告警。让候选人现场优化：

```dockerfile
FROM node:18

WORKDIR /app

COPY . .

RUN npm install
RUN npm run build
RUN apt-get update && apt-get install -y curl jq

EXPOSE 3000
CMD ["npm", "start"]
```

### 期望要点

- **base image 太大**：`node:18` 是 debian-based ~900MB → 改 `node:18-alpine` ~180MB 或 `node:18-slim`
- **build context**：`COPY . .` 会把 node_modules / .git / logs / secrets 全拷进去，加 `.dockerignore`
- **layer 顺序**：先 COPY package*.json + npm install，再 COPY 源码 → npm install 层可以缓存
- **multi-stage build**：build 阶段用 `node:18` 跑 `npm run build`，runtime 阶段用 `node:18-alpine` + `npm ci --production` 或 distroless
- **不必要的 apt-get**：curl / jq 是 build-time 还是 runtime 需要？runtime 层能去掉就去掉
- **non-root user**：生产 image 应加 `USER node`
- **HEALTHCHECK**：不必须，但加分
- **image scan**：CI 里跑 Trivy / Grype，高危漏洞 block publish

### 观察重点

- **顺序意识**：先谈 base image 还是先谈 layer cache？一般 base image 收益最大（900MB → 180MB），先它
- **数字预估**：能否估出优化后大概多少（~250-300MB）
- **多阶段理解**：是否理解 COPY --from 的语义

### 加分

- 提到 distroless image（`gcr.io/distroless/nodejs18-debian12`）—— 最安全
- 提到 `npm ci` 替代 `npm install`（lock-file enforcement）
- 提到 docker buildx + registry cache mount
- 提到 SBOM 生成（`docker sbom`）+ image signing (cosign)

---

## CP-7（可选）：Alert 规则 YAML 修复

**角色倾向**：SRE

### 题目

给一个 Prometheus 告警规则，让候选人判断哪里有问题：

```yaml
groups:
- name: api-alerts
  rules:
  - alert: HighCPU
    expr: cpu_usage > 80
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "CPU high"
  - alert: ErrorRate
    expr: errors > 10
    for: 30s
    labels:
      severity: page
    annotations:
      summary: "Errors"
```

### 期望要点

- `cpu_usage > 80` 是 **cause** 指标不是 **symptom** 指标 —— 用户可能根本没受影响
- CPU 80% 在多核系统可能正常；要么用 `cpu_usage_percent`，要么用 ratio (used/limit)
- `errors > 10` 没有 rate / 窗口；瞬间的 10 个错误 vs 持续的 10 req/s，信号强度完全不同
- 都没有 runbook link
- 都没有基于 SLO error budget burn rate
- severity 混用 critical / page，没有 on-call 分级标准
- 改进：用 rate + ratio（`rate(http_requests_total{status="5xx"}[5m]) / rate(http_requests_total[5m]) > 0.01`），按 multi-window burn-rate 分档（2%/1h 或 5%/6h → page），加 runbook URL

### 观察重点

- **user impact 导向**：是不是第一反应就是"这些都是 cause-based alert，用户真的受影响了吗？"
- **量化直觉**：`errors > 10` 的人味 —— 没考虑量级
- **SLO 意识**：是否主动说 "alert 应该从 SLO 推导"

---

## 时间压缩版（紧急时用）

如果只有 20 分钟 coding：
- SRE 路线：CP-1（crash-loop 脚本）或 CP-7（alert 修复）
- DevOps 路线：CP-4（Helm 修复）或 CP-5（ArgoCD 修复）

这几题动手量小、决策密度高，能在 20 分钟内看出深度。
