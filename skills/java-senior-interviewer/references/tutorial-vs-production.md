# Tutorial Knowledge vs Production Experience — Signal Catalog

The core axis of the `java-senior-interviewer` skill. Use this when annotating a resume in Step 2, and when calibrating follow-up questions during the interview.

## The underlying principle

Textbook knowledge is **cheap and uniform** — two candidates who read the same Java 并发编程 book will recite the same facts. Production experience is **expensive and asymmetric** — two engineers who ran the same system hit different failures, make different trade-offs, and remember different numbers. Your job is to detect the asymmetry.

## The three-bucket annotation

When reading the resume, tag every non-trivial bullet as one of:

- 🟢 **Production signal**
- 🟡 **Ambiguous** (needs a probe question to resolve)
- 🔴 **Tutorial smell**

If the resume has <20% 🟢, you have a problem to investigate in the interview — not necessarily a reject signal, but a bias toward project deep-dive over theoretical questions.

## Signal catalog

### Numbers

| 🟢 Production | 🔴 Tutorial |
|---|---|
| "下单 QPS 从 800 提升到 5,200，p99 从 420ms 降到 85ms" | "优化了下单接口的性能" |
| "订单表 2.3 亿条，分 64 库 32 表" | "对订单表做了分库分表" |
| "Kafka lag 平均 200ms，峰值 15s" | "使用 Kafka 处理异步消息" |
| "Redis 热 key 导致单机 CPU 100%，QPS 12 万" | "使用 Redis 提升性能" |

**Probe**: "具体提升了多少？从多少到多少？是在什么压测条件下测的？"

### Trade-offs

| 🟢 Production | 🔴 Tutorial |
|---|---|
| "我们选 Redis 分布式锁而不是 DB 乐观锁，因为 X；代价是锁续期和 RedLock 的运维复杂度" | "使用 Redis 实现分布式锁" |
| "选 TCC 而不是 Saga，因为业务需要强一致；代价是所有下游都要实现 Try/Confirm/Cancel" | "使用分布式事务保证一致性" |
| "RR 改 RC 后减少了间隙锁导致的死锁，但业务代码多了两处显式加锁来防止丢失更新" | "数据库使用 RR 隔离级别" |

**Probe**: "当时还有哪些方案？为什么没选那个？现在回头看会重新选吗？"

### Failure stories

| 🟢 Production | 🔴 Tutorial |
|---|---|
| "2024 双 11 高峰 Redis 雪崩 —— 因为所有缓存 TTL 都是 30 分钟，同时失效。定位用了 40 分钟，之后加了随机 TTL 抖动和本地缓存兜底" | (无) |
| "线上某次 GC 暂停 8 秒 —— 某个接口返回 5MB 对象导致 Humongous Allocation 跨代。改为流式返回后降到 200ms" | "使用 G1 GC 调优" |
| "Kafka 消费者拉到一条坏消息卡死 consumer group —— 补了异常兜底和死信队列" | "Kafka 消费端做了容错" |

故障是最强的生产信号 —— 没有人会在简历上写故障，除非亲历过。
**Probe**: "你印象最深的一次线上故障是什么？怎么定位、怎么修、后来怎么防的？"

### Verb patterns

| 🟢 Production | 🟡 Ambiguous | 🔴 Tutorial |
|---|---|---|
| 设计 + 实施 + 度量 / 主导 / 从 0 到 1 / 推动迁移 | 负责 / 参与 / 协助 / 优化 / 改进 | 掌握 / 熟练 / 精通 |

"熟练掌握 JVM 调优"—— 你熟练到什么程度？调过哪个参数？为什么调？
"精通 Spring 源码"—— 问 `@Transactional` 内部同一个类调用为什么失效，如果答不清就是纸面。

### Tech stack shopping lists

| 🔴 Tutorial tell | Why it's suspicious |
|---|---|
| "熟练使用 Redis / Kafka / ES / Zookeeper / Nacos / MySQL / MongoDB / RocketMQ / Flink / Spark ..." | 3 年工作经验不可能在每项都有深度；多半是"我在某个项目里配过一次" |
| "掌握 Spring / Spring Boot / Spring Cloud / Spring Cloud Alibaba 全家桶" | Spring 源码深度 vs. 会配 `@Bean` 是天壤之别 |
| "精通 JVM 原理、GC 算法、类加载机制、字节码" | 四个点全精通的人，简历上通常有具体调优案例支撑 |

**Probe**: "这个列表里哪三项你最自信？各讲一个具体使用场景。"

### Scale honesty

| 🟢 Production | 🔴 Tutorial |
|---|---|
| "日均 50 万单（非大厂口径，属于腰部电商）" | "日均千万级订单"（公司整体规模不符） |
| "我负责的模块 QPS 约 3000，整个系统峰值 QPS 约 15 万" | "千万级并发系统"（"级"是通胀词） |

当数字与公司规模不匹配时，几乎总是把团队 / 公司整体数据挪到个人贡献下。**Probe**: "你具体负责的那部分的 QPS / 规模是多少？"

### Technology diffusion timing

候选人使用的技术，是否对应其工作时期的合理引入时间？

| 技术 | 合理流行起点 |
|---|---|
| Spring Boot 2.x | 2018 |
| Kubernetes 作为生产平台 | 2019 |
| Virtual Threads (JDK 21) | 2023 末 / 2024 |
| Service Mesh (Istio 生产) | 2020+ |
| Kafka 事务 / exactly-once | 2017+ |
| Spring Boot 3 / JDK 17 基线 | 2023 |

🔴 "2016 年使用 K8s 进行生产部署" —— 可疑，需追问集群规模和运维方式。
🟢 "2021 年从 VM 迁移到 K8s，过程中踩过 XXX 坑" —— 符合时间线且有迁移故事。

### 领域建模信号

| 🟢 Production | 🔴 Tutorial |
|---|---|
| "订单有 7 个状态，状态机在 OrderStateMachine.java 集中维护，所有跃迁都走一个方法" | "使用了 DDD 领域驱动设计" |
| "库存扣减、订单创建是两个 aggregate，通过领域事件解耦" | "划分了 aggregate 和 value object" |
| "我们最初把优惠券放在订单域，后来发现营销规则变化频繁把它拆出来独立上线" | "使用了限界上下文" |

DDD 术语本身是最大的 tutorial smell 之一 —— 落地过的人会讲具体的划分案例和演进故事，背过的人只会列术语。

### Modern Java usage

候选人是否跟进了 JDK 现代特性？

| 🟢 跟进 | 🟡 保守 | 🔴 停滞 |
|---|---|---|
| records / sealed / pattern matching / virtual threads / structured concurrency / ZGC 生产使用 | var / Stream / Optional 用得好 | 仍以 JDK 8 为主，没有迁移计划；Stream API 使用僵硬 |

停滞 ≠ 不合格 —— 大厂稳定性优先的团队停在 JDK 11/17 很常见。但对 senior 候选人，应问："你们什么时候会考虑升级？卡在哪里？"

## Rapid-fire probes to surface the distinction

When in doubt mid-interview, these probes cheaply sort tutorial from production:

1. **"这个数字你是怎么量的？"** —— 每当候选人报一个数字。
2. **"当时还有哪些备选方案？为什么没选那些？"** —— 强迫命名 trade-off。
3. **"现在回头看，你会重新选吗？"** —— 反思能力 + 知识更新。
4. **"这部分上线之后遇到过什么问题？"** —— 真做过的系统一定踩过坑。
5. **"你们团队里除你之外谁最懂这块？他会怎么描述你的贡献？"** —— 压缩吹水空间。
6. **"如果把流量翻 10 倍，最先顶不住的是什么？"** —— 从知识转到容量直觉。

## 反向信号：tutorial knowledge 也可以是好事

不是所有 tutorial-smelling resume 都该 reject。两种场景需要区别对待：

- **应届 / 1–2 年经验** —— 简历上大多是课本内容是正常的。重点考察 fundamentals 扎实度和学习速度，而不是 production depth。
- **从非一线到一线的候选人** —— 简历可能看起来"虚"，但思维底子可能很好。用项目深挖和 system design 去判断，而不是用简历措辞。

**只有当层级声称是 senior + 简历全篇 tutorial smell 时，red flag 才真正亮起。**
