# 基础硬核 Question Bank

Use this during the `[20–30m] 基础硬核` block. **Pick 3 questions**, covering at least two different categories. Prefer questions whose topic echoes the candidate's claimed expertise on the resume — that's how you catch tutorial knowledge.

Level tags:

- **E** — appropriate for Engineer (1–5 yrs). Focused on implementation, core API, clean code.
- **S** — appropriate for Senior (5+ yrs). Focused on trade-offs, tuning, failure-mode reasoning.
- **E/S** — usable at both levels; the listening bar differs (depth, trade-off naming, "加分回答").

## Legend for the answer keys

- 【标准答案要点】 — what a competent answer hits. Hitting 2/3 = pass; 3/3 = strong.
- **加分回答** — what only a production-experienced candidate surfaces spontaneously.
- **否决信号** — what makes this question a strong reject signal when missed.
- **追问** — how to distinguish a memorized answer from a real one.

---

## Category 1 — Java / JVM

### Q1.1 【E/S】 一次线上 Full GC 从 200ms 涨到 8s，你怎么排查？

**【标准答案要点】**
- 先看 GC 日志 (`-Xlog:gc*` / `-XX:+PrintGCDetails`)：哪类 GC？老年代占用？晋升速率？
- 看堆 dump：哪个对象占大头？常见嫌疑 — 缓存无上限、`String.intern` 误用、Large Object、Metaspace 爆。
- 看 `jstat -gcutil` / APM：Young GC 频率、老年代增长斜率、晋升年龄。
- 关联代码变更：最近哪次发布、哪个接口引入、是否流量突增。

**加分回答**
- 主动区分 CMS / G1 / ZGC 的症状差异：比如 G1 的 Humongous 分配跨代、ZGC 的并发标记失败。
- 提 safepoint 问题 —— GC pause 长不一定是回收慢，可能是线程进入 safepoint 慢（大循环无安全点）。
- 提 Metaspace / Code Cache 导致的伪 GC 问题。
- 讲一次真实案例（任何级别 senior 应有一次）。

**否决信号（Senior 层）**
- 第一反应是"加大堆"。没有先定位再动手的方法论。
- 只会念 GC 名词，不能把某个参数和某个症状关联起来。

**追问**
- "你举的这个案例里，GC 日志里你先看的是哪一行？为什么？"
- "如果 Young GC 不频繁但老年代涨得快，最可能是什么？"

---

### Q1.2 【E】 HashMap 在 JDK 8 之后做了哪些关键优化？为什么？

**【标准答案要点】**
- 链表在长度 ≥ 8 且 table 容量 ≥ 64 时转红黑树，解决极端 hash 冲突下的 O(n) 退化。
- resize 时不再重算 hash，而是用 `(e.hash & oldCap)` 判断节点留在原 index 还是挪到 `index + oldCap`，避免重 hash 碰撞扩大。
- 尾插法替代头插法（头插在并发下会死循环）。

**加分回答**
- 指出 HashMap 仍不是线程安全的，并发下仍可能丢数据；并发场景用 ConcurrentHashMap。
- 提到 `hash()` 扰动函数：`(h = key.hashCode()) ^ (h >>> 16)`，把高 16 位混入低 16 位，让低位 hash 分布更均匀。

**追问**
- "为什么是 8 这个阈值，不是 6 或 10？" （泊松分布概率极低，链表超过 8 的概率 <10⁻⁶）
- "退化时又是多少？" （≤ 6）

---

### Q1.3 【S】 你用过虚拟线程 (Virtual Threads) 吗？它适合和不适合什么场景？

**【标准答案要点】**
- 适合：高并发 I/O 阻塞型任务（HTTP 后端、RPC 聚合、DB 查询），每任务一个线程的模型终于不再昂贵。
- 不适合：
  - CPU 密集型（仍受物理核心数约束，虚拟线程调度反而多一层开销）。
  - `synchronized` 长期持有（会 pin 载体线程，抵消优势）。
  - 依赖 `ThreadLocal` 做资源池（大量虚拟线程 × ThreadLocal = 内存爆炸）。
- 迁移路径：把 `Executors.newFixedThreadPool` 换成 `Executors.newVirtualThreadPerTaskExecutor`，并检查 `synchronized` → `ReentrantLock` 的改造。

**加分回答**
- 提 **structured concurrency** (JEP 453/462) 配合使用，让失败传播和取消更干净。
- 提 pinning 的监测手段：`-Djdk.tracePinnedThreads=full`。
- 指出虚拟线程不是"自动多快好省"—— 对一个已经用 Netty / Reactor 做好 reactive 的系统，引入虚拟线程收益很小，反而增加心智负担。

**否决信号（Senior）**
- 只说"比线程池快"这种一维描述。
- 不能命名任何一个不适合场景。

**追问**
- "你们线上有哪个服务真的从 Tomcat 线程池迁到虚拟线程了？性能前后数据是多少？"（测试真实 vs. 纸面）

---

### Q1.4 【S】 `synchronized` 的锁升级过程是什么？在什么场景下会退化回重量级？

**【标准答案要点】**
- 无锁 → 偏向锁 → 轻量级锁 (CAS 自旋) → 重量级锁 (OS mutex)。
- 偏向锁适合单线程反复进入同一块。
- 轻量级锁适合多线程交替但无竞争。
- 有真实竞争或 hash code 被调用（打破偏向条件）时升级为重量级。

**加分回答**
- JDK 15+ 偏向锁被默认关闭（JEP 374），在高并发现代 JVM 上实际收益有限且带来维护成本。简历声称"用偏向锁优化"的要小心。
- 自适应自旋（自旋次数根据上次成功率动态调整）。
- 指出 `synchronized` 在虚拟线程下会 pin 载体线程的问题。

**追问**
- "你们的服务用的 JDK 是哪个版本？偏向锁当前是开还是关？"
- "如果我写了一段代码对 1000 万对象做 `synchronized`，但从无竞争，有没有可能比无锁还慢？"（有 —— 偏向锁撤销成本）

---

## Category 2 — Concurrency

### Q2.1 【E】 ConcurrentHashMap 是怎么做到线程安全的？和 Hashtable 有什么本质区别？

**【标准答案要点】**
- JDK 8 之后：CAS + `synchronized` 锁住单个桶（链表头或红黑树根），不是全表锁。
- 读操作大部分无锁（volatile 语义的 Node 数组）。
- `size()` 基于分段 CounterCell 汇总，不是强一致。
- Hashtable 全表 `synchronized`，并发度 = 1。

**加分回答**
- 解释 `computeIfAbsent` 的原子性：同一个 key 并发下只会执行一次计算函数（但要小心计算函数自身引发的再入）。
- 指出 JDK 7 和 JDK 8 的 segment vs. CAS+synchronized 的实现差异。
- 提到弱一致迭代器 —— 迭代期间并发修改不会抛 `ConcurrentModificationException`，但可能看不到最新数据。

**追问**
- "为什么 JDK 8 之后 `size()` 不是强一致？" （强一致要求全表加锁，代价太大。业务用 size() 做精确控制本身是设计问题）

---

### Q2.2 【E/S】 说说你对 CAS 的理解，以及 ABA 问题怎么解决？

**【标准答案要点】**
- CAS = Compare-And-Swap，CPU 原语（x86 `cmpxchg`），非阻塞同步的基础。
- Java 里通过 `Unsafe` / `VarHandle` / `AtomicInteger` 暴露。
- ABA：值从 A 变到 B 再变回 A，CAS 看不出来。解决：加版本号（`AtomicStampedReference`）或标志位（`AtomicMarkableReference`）。

**加分回答**
- 指出 CAS 只是"无阻塞"不是"无代价"——高竞争下会大量空转，不一定比锁快（参见 `LongAdder` 的分段思路）。
- 讲一次 ABA 真实场景：无锁栈 / 无锁队列节点复用时，不加版本号会构造出看起来"成功"的错误状态。
- 提到 CPU cache 层面的 MESI / store buffer / memory barrier 让 CAS 在 NUMA 多 socket 下性能下降。

**否决信号（Senior）**
- 把 CAS 当成"万能无锁方案"，不能命名它的 downside。

**追问**
- "你项目里哪里用了 CAS？为什么选它而不是 ReentrantLock？"

---

### Q2.3 【S】 你用过 ThreadLocal，它和 InheritableThreadLocal、TransmittableThreadLocal 的关系是什么？

**【标准答案要点】**
- `ThreadLocal`：线程私有变量，线程池复用线程时要清理（try/finally + `remove()`）否则内存泄漏（Entry 的 key 是弱引用但 value 是强引用）。
- `InheritableThreadLocal`：子线程 `new Thread(...)` 时从父线程复制一份。
- `TransmittableThreadLocal` (TTL, 阿里开源)：解决线程池场景 — submit 时捕获，execute 时回放。`Inheritable` 在线程池里失效（线程是复用的，只有首次创建时继承父）。

**加分回答**
- 讲线程池 + ThreadLocal 内存泄漏的真实案例：用 `Executors.newFixedThreadPool` 持有对象，如果 value 是个大对象且忘了 remove，泄漏到下次 FullGC 都看不出。
- 讲 MDC / TraceId 透传需要 TTL 的场景 —— log 里 traceId 丢失的 bug。
- 指出 TTL 通过修饰 Runnable/Callable 和修饰线程池两种接入方式，后者更不侵入。

**追问**
- "你在代码里 remove 吗？哪里 remove？"（如果答不出，说明只是"用过"没踩过坑）

---

### Q2.4 【S】 线程池的 7 个核心参数中，你觉得哪个最容易被用错？

**【标准答案要点】**
候选答案（任一能讲透都算 pass）：
- **workQueue**：用无界 `LinkedBlockingQueue` 会让 maxPoolSize 永远达不到，任务积压到 OOM。`Executors.newFixedThreadPool` 就是这个坑。
- **maximumPoolSize**：线程突然上来时才创建新线程；队列先满才扩线程（反直觉）。
- **RejectedExecutionHandler**：默认 `AbortPolicy` 抛异常，大多数人不处理，请求静默失败。生产一般要 `CallerRunsPolicy`（反压）或自定义落盘重试。
- **keepAliveTime**：IO 密集型服务忽略它导致线程数无法回收，资源浪费；或反向调太短导致频繁创建销毁。
- **threadFactory**：默认线程名是 `pool-X-thread-Y`，线上 dump 不知道是谁家的线程池。**必须自定义线程名**。

**加分回答**
- 讲一次"线程池配错导致雪崩"的真实事故。
- 提 `Executors.newXxx` 的坑（无界队列 / Integer.MAX_VALUE 线程数），以及为什么阿里开发手册禁用。
- 讲动态线程池的思路（DynamicTp / Hippo4j）：线上可调，配合监控。

**追问**
- "你们线上用的是什么线程池？核心参数值是多少？是拍脑袋还是算过的？"

---

## Category 3 — MySQL

### Q3.1 【E/S】 一个查询很慢，你如何排查？

**【标准答案要点】**
- `EXPLAIN`：看 type（`ALL` / `index` / `range` / `ref` / `const`）、key（用了哪个索引）、rows、Extra（`Using filesort` / `Using temporary` / `Using where` / `Using index condition`）。
- 慢查询日志 + `pt-query-digest` 聚合。
- 索引命中：是否符合最左前缀？是否有隐式类型转换（字符串列传 int 导致全表扫描）？
- 执行计划里 rows 估算与实际是否偏差大（统计信息过期 → `ANALYZE TABLE`）。
- 是否锁等待 / 等行锁（`information_schema.innodb_locks` / `performance_schema`）。

**加分回答**
- 命中索引但仍慢：回表太多 —— 考虑覆盖索引。
- 索引选择错了：用 `FORCE INDEX` 或调整索引顺序；分析 MySQL 优化器 cost 估算。
- 大事务 / 长事务：undo log 堆积导致 MVCC 回溯慢。
- 主从延迟下的读请求慢：从库 SQL 线程回放单线程瓶颈（MySQL 5.7+ 并行复制）。
- Buffer Pool 命中率低、磁盘 IO 瓶颈。

**否决信号（Senior）**
- 只说"加索引"没有方法论。
- 不会读 EXPLAIN 的 Extra 列。

**追问**
- "你最近一次实际调优过的慢查询，EXPLAIN 前后长什么样？优化了多少？"

---

### Q3.2 【E】 MySQL 四种隔离级别，默认是哪个？RR 和 RC 怎么选？

**【标准答案要点】**
- RU / RC / RR / Serializable。InnoDB 默认 RR。
- RR 通过 MVCC + 间隙锁避免幻读；RC 只加行锁，幻读仍然可见，但锁范围小并发高。
- 选型常见观点：
  - 阿里等大厂倾向 RC —— 间隙锁死锁多，RR 并发差，业务用乐观锁 / 应用层幂等补齐一致性。
  - 部分银行 / 传统业务仍用 RR —— 保守、一致性强。

**加分回答**
- 讲 RR 下间隙锁导致的死锁真实案例（如两个事务按不同顺序插入相邻 key）。
- 讲快照读 vs. 当前读的区别：`select ... for update` 是当前读，看到最新数据 + 加锁。
- Binlog `ROW` 模式下主从一致性不再依赖间隙锁，部分 RR → RC 迁移的底气在这里。

**追问**
- "你们团队用的是 RR 还是 RC？当初是怎么决定的？"

---

### Q3.3 【S】 你做过分库分表吗？分了几个库几个表？怎么选的分片键？迁移过程中怎么保证数据一致？

**【标准答案要点】**
- 具体数字：订单 2 亿 → 分 16 库 32 表，片键用 user_id（订单查询场景 90% 按用户）。
- 分片键选择准则：业务最常用的查询维度；分布均匀；单条记录生命周期内不变。
- 非片键查询：二级索引表 / ES 异构 / 基因法（把 user_id 的后 N 位编进 order_id）。
- 迁移方案：双写 → 全量同步 → 对账 → 切流 → 清理。DTS / Canal / Otter / DataX 等工具。
- 一致性：全量 + 增量 + 对账脚本（最终一致）；或业务接受短暂双写不一致，用 redo log 补偿。

**加分回答**
- 讲跨分片事务的坑：从 2PC 到 Seata TCC 的演进。
- 讲非片键查询的权衡：ES 异构索引带来一致性延迟、ES 运维成本。
- 讲扩容的痛：一致性哈希降低数据迁移量 vs. 取模扩容的大规模 rehash。
- 讲路由层：自研中间件 vs. ShardingSphere vs. MyCAT 的选型 trade-off。

**否决信号（Senior）**
- 讲不出一个具体片键选择的理由。
- 不知道非片键查询怎么办。

**追问**
- "如果要把 16 库扩到 32 库，你们方案是什么？会停服吗？"

---

### Q3.4 【S】 InnoDB 的 MVCC 是怎么实现的？哪些操作会撑大 undo log？

**【标准答案要点】**
- 每行隐藏两个字段：`DB_TRX_ID`（最近修改事务）、`DB_ROLL_PTR`（指向 undo log 旧版本）。
- 事务启动时生成 Read View（活跃事务 id 列表、min、max、creator）。
- 查询时沿 `DB_ROLL_PTR` 链回溯到 Read View 可见的版本。
- 长事务不提交 → undo log 无法 purge → 表空间膨胀；同时旧版本链变长，查询变慢。

**加分回答**
- 讲 purge 线程的工作机制、`innodb_undo_log_truncate`、`innodb_max_purge_lag`。
- 讲长事务带来的连锁影响：slave 延迟、备份失败、空间告警。
- 提 GC 类似物：Oracle 的 undo tablespace、PG 的 VACUUM。

**追问**
- "你线上有长事务监控吗？阈值是多少？触发过吗？"

---

## Category 4 — Redis

### Q4.1 【E/S】 Redis 做分布式锁，怎么做才是对的？

**【标准答案要点】**
- 基本形：`SET key value NX PX 30000`，value 是 UUID 或机器+线程标识。
- 释放锁时必须 Lua 脚本 `GET + DEL`，保证原子性，防止释放别人的锁。
- 要处理 **过期时间 < 业务执行时间** 的情况 → 续期（watchdog）。
- Redisson 封装了上述所有细节，生产推荐用它而不是自己写。

**加分回答**
- RedLock 的争议：Martin Kleppmann 的批评 vs. antirez 的回应。讲清楚在什么场景下 RedLock 不够（GC pause、网络分区导致的过期时间漂移）。
- 讲清楚"分布式锁做业务正确性兜底 vs. 做性能优化"的区别 —— 如果业务要求强一致，Redis 锁不够，要 Zookeeper / etcd / DB 事务。
- 讲可重入 / 公平锁 / 读写锁的需求场景和 Redisson 实现。

**否决信号（Senior）**
- 回答 `SETNX + EXPIRE` 两条命令（不原子，crash 后死锁）。
- 不知道释放时需要校验 value。
- 把 RedLock 当银弹。

**追问**
- "假如你的业务加锁后执行了 40 秒，但锁 TTL 是 30 秒，会发生什么？怎么防？"

---

### Q4.2 【E】 缓存穿透 / 击穿 / 雪崩的区别和应对？

**【标准答案要点】**
- **穿透**：查询一个不存在的 key，每次都打到 DB。应对：空值缓存（带短 TTL）、布隆过滤器前置。
- **击穿**：一个热 key 过期瞬间，大量请求同时打 DB。应对：互斥锁重建、热 key 不过期（后台刷新）、逻辑过期。
- **雪崩**：大量 key 同时过期 / Redis 整体挂掉。应对：TTL 加随机抖动、多级缓存（本地 + Redis）、限流降级、Redis 高可用。

**加分回答**
- 讲一次真实踩坑：比如双 11 预热时统一 TTL 的雪崩、营销活动下空值攻击的穿透。
- 讲布隆过滤器的误判和扩容问题，以及 Counting Bloom / Cuckoo Filter 的改进。
- 讲 `singleflight` 思想（Go 的 singleflight，Java 里 Guava `CacheLoader` / Caffeine 的 `AsyncCacheLoader`）。

**追问**
- "如果布隆过滤器满了要扩容怎么办？"（不能简单扩，需要重建；或者用可扩展的 Cuckoo）

---

### Q4.3 【S】 缓存和 DB 一致性，你们怎么做的？

**【标准答案要点】**
- 经典四选一：
  - **Cache Aside**：更新 DB 后删缓存（业界默认）。
  - **Read/Write Through**：缓存层统一代理读写。
  - **Write Behind**：先写缓存，异步回写 DB（强性能、弱一致，慎用）。
  - 双写：容易不一致，一般不推荐。
- 先删缓存还是先更 DB：**先更 DB，再删缓存**（更安全，但仍有 race 窗口）。
- 消除 race 窗口：延迟双删、监听 binlog 异步删（Canal）。

**加分回答**
- 命名具体的 race 场景：A 读旧值、B 更新 DB + 删缓存、A 把旧值写回缓存。
- 讲清楚"强一致不可能"——分布式系统下缓存和 DB 本质是两个节点，只能做最终一致。业务如果真要强一致，那就不该用缓存。
- 提 Canal 订阅 binlog 方案的实际工程挑战：消息丢失、重放、顺序性。

**否决信号（Senior）**
- "先删缓存，再更 DB" 的典型错误答案（更新过程中读请求会把旧值灌回缓存）。
- 只说"双写"不谈 race。

**追问**
- "你们的缓存一致性是用代码层还是 Canal 做的？延迟是多少？"

---

### Q4.4 【S】 Redis 的大 key / 热 key 分别是什么问题？怎么发现和处理？

**【标准答案要点】**
- **大 key**：一个 key 存的 value 很大（几 MB 的 String / 几万元素的 Hash）。症状：单次操作慢、阻塞 Redis 单线程、rehash 抖动、跨网卡放大。
  - 发现：`redis-cli --bigkeys`、MEMORY USAGE、scan + 定时任务。
  - 处理：拆分（Hash 拆成多个小 Hash / 按业务分桶）、用合适的数据结构（Set → Bitmap）、分批读写。
- **热 key**：一个 key QPS 特别高，导致单个 Redis 实例 CPU 100%。
  - 发现：`redis-cli --hotkeys`（依赖 LFU）、proxy 层采样、客户端侧埋点。
  - 处理：本地缓存二级化、多副本（key 后缀 _1 ~ _N 随机读）、读写分离、热点隔离部署。

**加分回答**
- 讲 scan 扫描大 key 时的 COUNT 参数权衡（不是返回数量，是每轮扫描 bucket 数）。
- 讲 Cluster 模式下热 key 没法靠 slot 散开，要业务层加随机后缀。
- 讲一次真实案例：某 Hash 键超 10 万元素导致 `HGETALL` 把 Redis 卡住。

**追问**
- "你们线上有大 key / 热 key 的监控报警吗？阈值是多少？"

---

## Category 5 — Kafka

### Q5.1 【E/S】 Kafka 怎么保证消息不丢？

**【标准答案要点】**
- Producer 侧：`acks=all` + `retries=Integer.MAX_VALUE` + 合理的 `delivery.timeout.ms` + 幂等 producer（`enable.idempotence=true`）。
- Broker 侧：`min.insync.replicas >= 2`、`unclean.leader.election.enable=false`、合理的副本数。
- Consumer 侧：手动提交 offset，业务处理完再提交（at-least-once）；幂等处理保证重复消费安全。

**加分回答**
- 提 **exactly-once**：transactional producer + `isolation.level=read_committed` + consumer 把 offset 作为业务事务的一部分（或用 Kafka 事务 API 写到同一 topic）。
- 讲 KIP-101 / KIP-320 解决的问题（leader epoch 避免数据截断、offset for leader epoch）。
- 真实案例：`min.insync.replicas=1` + `acks=all` 实际退化为单副本写入的坑。

**否决信号（Senior）**
- 只说 `acks=all` 就万事大吉。
- 不知道 consumer 侧要幂等。

**追问**
- "你们线上有没有因为 Kafka 丢过消息？怎么发现的？怎么补？"

---

### Q5.2 【S】 Kafka 消费者 rebalance 为什么让人头疼？怎么缓解？

**【标准答案要点】**
- Rebalance 期间整个 consumer group 停止消费（Stop-The-World），延迟飙升。
- 触发原因：
  - consumer 加入 / 离开（扩缩容、crash、GC 长停顿、心跳超时）。
  - topic 分区数变化。
  - session.timeout 或 max.poll.interval 超时。
- 缓解：
  - 调大 `max.poll.interval.ms`（业务处理慢时给更长时间）。
  - 减少单次 `max.poll.records`（让处理更快回到 poll）。
  - 用 **Cooperative Rebalance** 策略（KIP-429），不 SRW 整个组，只迁移必要分区。
  - 用 **static membership**（KIP-345），给 consumer 分配固定 ID，短暂离线不触发 rebalance。

**加分回答**
- 讲 Eager vs. Cooperative 策略的选择时机和兼容性（升级期混用需要注意）。
- 讲一次因业务代码吞异常卡住 poll 导致反复 rebalance 的案例。
- 提 KRaft 模式下消费者协议的演进。

**追问**
- "你们消费者的 max.poll.interval 是多少？为什么？"

---

### Q5.3 【S】 Kafka 消息顺序在什么条件下能保证？

**【标准答案要点】**
- **单分区内顺序**是 Kafka 的唯一顺序保证。
- 要保证业务顺序，必须让相同业务键走同一分区（`key` → `hash(key) % partitions`）。
- 跨分区无序：topic 级别无顺序保证。
- Producer 侧 `max.in.flight.requests.per.connection > 1 && retries > 0` 可能导致单分区乱序；开启 idempotence 后 Kafka 会重新排序（保证单分区有序到 5 个 in-flight）。

**加分回答**
- 讲扩容分区会打破原有 key 的哈希路由（原来打到 P0 的 key 可能新打到 P3，破坏顺序）→ 业务对此要有方案（停写扩容 / 消息版本号 / 双写灰度）。
- 讲消费者侧保证顺序：单分区单线程消费；若要单分区并发消费，需要业务自己做 key 内串行、key 间并行（e.g. 按 key hash 分 worker）。
- 提事务消息的顺序保证范围。

**追问**
- "你们业务哪里依赖顺序？一旦顺序错了会怎样？"

---

## Category 6 — Distributed Systems

### Q6.1 【E/S】 幂等设计你一般怎么做？

**【标准答案要点】**
- **业务唯一键 + 数据库唯一索引**：最简单最可靠。下单用 request_id / 外部订单号做唯一索引。
- **Token 机制**：客户端先领 token，提交时带 token，服务端校验后作废（防重复提交）。
- **状态机**：只有在特定状态下才允许操作（CREATED → PAID → SHIPPED，重复 pay 请求在 PAID 状态下直接返回成功）。
- **乐观锁**：版本号 / CAS。

**加分回答**
- 区分"同步幂等（同一请求重复到达）"和"异步幂等（消息重投）"——前者靠唯一键 + 幂等存储，后者靠消费端落库去重表。
- 讲一次踩坑：支付回调没幂等，重复回调导致订单多扣余额。
- 讲幂等存储本身的清理策略（去重表需要定期归档）。

**否决信号（Senior）**
- 只会说"加 redis 锁"。没有对业务唯一键的思考。

**追问**
- "如果幂等表写成功但业务主表没写成功（分布式事务），你怎么办？"

---

### Q6.2 【S】 分布式事务方案，你用过哪些？怎么选？

**【标准答案要点】**
- 方案谱系：
  - **2PC / XA**：强一致，性能差，长时间持锁。用于跨库同机房强一致。
  - **TCC**：业务侵入大（每个操作要实现 Try/Confirm/Cancel），但性能好。用于金融 / 高价值业务。
  - **Saga**：长事务，每步有补偿操作。适合跨服务的业务流程。
  - **本地消息表 / 事务消息（RocketMQ）**：最终一致，工程上最常用。
  - **Outbox pattern + CDC**：业务写主表 + outbox 同库事务，CDC 投递 → 下游最终一致。
- 选型维度：一致性强度、性能、业务侵入、失败恢复复杂度。

**加分回答**
- 讲 Seata 的 AT 模式原理（自动生成 undo / redo，但对外有脏读窗口）。
- 讲具体场景：支付系统用 TCC、订单-库存-物流用 Saga、积分通知用本地消息表。
- 讲失败恢复和对账的重要性 —— 再强的分布式事务协议都需要离线对账兜底。

**否决信号（Senior）**
- 只会说"用 Seata"或"用 MQ 最终一致"，不能说清对应场景。

**追问**
- "你们业务里最复杂的一个分布式事务是什么？Saga 补偿的时候遇到过什么问题？"

---

### Q6.3 【S】 你们是怎么做限流的？

**【标准答案要点】**
- 算法：
  - **计数器**：粗粒度，窗口切换处有突刺。
  - **滑动窗口**：平滑，内存略高。
  - **令牌桶**：允许短时突发，长期限速。
  - **漏桶**：强平滑，不允许突发。
- 层级：
  - 接入层（Nginx / 网关）—— 大流量兜底。
  - 服务层（Sentinel / Resilience4j / Hystrix 遗老）—— 细粒度规则。
  - DB / Redis 层 —— 保最后一道。
- 维度：QPS、并发、线程池隔离、信号量、热点参数。

**加分回答**
- 讲集群限流的实现：Redis + Lua 原子计数 vs. 客户端按分片预分配。
- 讲自适应限流（BBR / Sentinel 自适应）—— 根据 RT 和系统负载动态调阈值。
- 讲熔断 / 降级 / 限流的关系和职责划分。
- 讲一次真实降级案例：某次大促前把非核心接口限流到 0，保核心链路。

**追问**
- "你们核心接口的限流阈值怎么来的？是压测得出的还是拍脑袋？"

---

### Q6.4 【S】 你理解的 CAP 和 PACELC 是什么？举一个实际系统落在哪个象限？

**【标准答案要点】**
- **CAP**：分区发生时（P），一致性（C）和可用性（A）只能选一。注意 CAP 是关于分区时的选择，不是"三选二"这种误解。
- **PACELC**：无分区时也有 latency vs. consistency 权衡。MongoDB 默认 PA/EL（分区时保可用，正常时降延迟宁可弱一致）；Spanner 是 PC/EC。
- 举例：
  - ZooKeeper：CP（分区时宁可不可用）。
  - Cassandra：AP（分区时宁可数据冲突）。
  - Redis Sentinel 主从：AP（异步复制，切主可能丢少量数据）。
  - etcd / Raft 集群：CP。

**加分回答**
- 讲"可用性"的精确定义（每个非故障节点都能在有限时间内返回，不代表看到最新值）。
- 讲"不可能定理"在工程上的软化：延迟 SLA + 最终一致，是把严格的 CAP 三元对抗变成了工程折中。
- 讲业务选型的反例：有人把 Redis 当强一致数据库用，事故必然。

**追问**
- "你们核心业务依赖哪些 AP 系统？你们怎么处理它带来的不一致？"

---

## 使用建议

- **不要 3 题全问同一类别**。哪怕候选人简历偏 DB，也用 1 题 DB + 1 题分布式 + 1 题 Java/JVM。
- **至少 1 题和候选人简历中项目关键字直接呼应**。如果 resume 提了秒杀，Q4.2 / Q6.3 就是天然的选择。
- **答错不等于否决**。观察他的思维过程 —— 不知道的时候是编，是承认，还是开始推导。
- **每题不超过 3 分钟**。超时就是信号（掌握不扎实），温和打断到下一题。
