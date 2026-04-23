# Coding Problems (编码题库)

Use in the `[40–50m] Coding` block. **Pick one problem** whose topic echoes the candidate's real project work — an engineer who claimed 限流 but can't write a token bucket reveals something important.

## What to evaluate (not just correctness)

| 维度 | Engineer 及格 | Senior 优秀 |
|---|---|---|
| **动手前** | 能快速开始 | 先澄清需求 / 接口 / 输入输出范围 / 并发场景 |
| **实现** | 能 work | 边界清楚、命名清晰、代码结构可扩展 |
| **正确性** | happy path 正确 | 边界情况 (空、并发、溢出) 都想到 |
| **复杂度** | 能说出大概 | 精确给出时空复杂度 + 优化空间 |
| **讲解** | 能按代码顺序描述 | 能总结"核心思路是..."，再展开 |

**一个可用的启发式**：能写对 LRU 的工程师很多；能写对 **并发安全的 LRU** 的工程师很少；能一次性在白板上写对 **LRU + TTL + 并发安全** 的，大概率是 senior。

---

## 题 1 — LRU Cache (O(1) get/put)

### 题面

> 实现一个固定容量的 LRU（Least Recently Used）缓存，`get(key)` 和 `put(key, value)` 都要是 O(1)。

### 参考实现

```java
public class LRUCache<K, V> {
    private final int capacity;
    private final Map<K, Node<K, V>> map = new HashMap<>();
    private final Node<K, V> head = new Node<>(null, null); // 最新
    private final Node<K, V> tail = new Node<>(null, null); // 最旧

    public LRUCache(int capacity) {
        if (capacity <= 0) throw new IllegalArgumentException("capacity must be > 0");
        this.capacity = capacity;
        head.next = tail;
        tail.prev = head;
    }

    public V get(K key) {
        Node<K, V> node = map.get(key);
        if (node == null) return null;
        moveToHead(node);
        return node.value;
    }

    public void put(K key, V value) {
        Node<K, V> existing = map.get(key);
        if (existing != null) {
            existing.value = value;
            moveToHead(existing);
            return;
        }
        if (map.size() >= capacity) {
            Node<K, V> lru = tail.prev;
            remove(lru);
            map.remove(lru.key);
        }
        Node<K, V> node = new Node<>(key, value);
        addToHead(node);
        map.put(key, node);
    }

    private void moveToHead(Node<K, V> node) {
        remove(node);
        addToHead(node);
    }

    private void addToHead(Node<K, V> node) {
        node.next = head.next;
        node.prev = head;
        head.next.prev = node;
        head.next = node;
    }

    private void remove(Node<K, V> node) {
        node.prev.next = node.next;
        node.next.prev = node.prev;
    }

    private static class Node<K, V> {
        K key;      // 回删 map 时需要
        V value;
        Node<K, V> prev, next;
        Node(K k, V v) { key = k; value = v; }
    }
}
```

### 关键考察点

- 为什么是 HashMap + 双向链表？（HashMap 提供 O(1) 定位，双向链表提供 O(1) 移动/删除）
- 为什么用哨兵节点 head/tail？（避免边界判断，代码简洁）
- 链表节点为什么要存 key？（淘汰时需要从 map 里删）
- 如果让你改成线程安全呢？

### 加分追问

**"现在让它线程安全，最简单的做法是什么？代价是什么？"**
- 最简单：所有方法 `synchronized`。代价：没有并发度。
- 稍好：`ReadWriteLock`。但 LRU 的 get 也会修改链表，读锁并不真能并发。
- 工程级答案：直接用 **Caffeine**。它用分段 + W-TinyLFU 替代纯 LRU，命中率高，性能好 20 倍。

**"生产里为什么很少人手写 LRU？"**
- 并发性能差，除非做分段。
- 内存占用高（每个 entry 两个指针）。
- 无 TTL，无淘汰统计，无预热。
- 所以 → Caffeine / Guava Cache。

### 常见失分

- 使用 `LinkedHashMap(accessOrder=true)`（Java 语言层的 LRU，可接受但必须要讲清为什么它能做到）—— 优秀候选会解释其内部机制并承认这是"取巧"而非"理解"。
- 单向链表 → `remove(node)` 是 O(n)。
- 淘汰时忘了从 map 里删 key。

---

## 题 2 — LRU + TTL + 并发安全（Senior）

### 题面

> 在题 1 的基础上扩展：每个 entry 支持独立的 TTL（毫秒级），过期后 get 视为不存在；要求线程安全；GC 友好（不要持续增长）。

### 实现要点

```java
public class LRUCacheWithTTL<K, V> {
    private final int capacity;
    private final ConcurrentHashMap<K, Entry<V>> map;
    private final LinkedHashMap<K, Boolean> lruOrder;
    private final ReentrantLock lock = new ReentrantLock();

    public LRUCacheWithTTL(int capacity) {
        this.capacity = capacity;
        this.map = new ConcurrentHashMap<>(capacity);
        this.lruOrder = new LinkedHashMap<>(capacity, 0.75f, true);
    }

    public V get(K key) {
        Entry<V> e = map.get(key);
        if (e == null) return null;
        if (e.isExpired()) {
            // 懒清理：过期的在 get 的时候就删掉
            lock.lock();
            try {
                if (map.get(key) == e && e.isExpired()) {
                    map.remove(key);
                    lruOrder.remove(key);
                }
            } finally { lock.unlock(); }
            return null;
        }
        lock.lock();
        try { lruOrder.get(key); } finally { lock.unlock(); } // 触发访问顺序更新
        return e.value;
    }

    public void put(K key, V value, long ttlMillis) {
        long expireAt = System.currentTimeMillis() + ttlMillis;
        Entry<V> e = new Entry<>(value, expireAt);
        lock.lock();
        try {
            map.put(key, e);
            lruOrder.put(key, Boolean.TRUE);
            while (lruOrder.size() > capacity) {
                K eldest = lruOrder.keySet().iterator().next();
                lruOrder.remove(eldest);
                map.remove(eldest);
            }
        } finally { lock.unlock(); }
    }

    private static class Entry<V> {
        final V value;
        final long expireAt;
        Entry(V v, long expireAt) { this.value = v; this.expireAt = expireAt; }
        boolean isExpired() { return System.currentTimeMillis() > expireAt; }
    }
}
```

### 关键考察点

- **懒清理 vs. 定时清理**：懒清理成本均摊到读，但有冷 key 长期占内存的问题；定时清理（ScheduledExecutor 定期扫描）更彻底但占 CPU。
- **LRU 访问顺序 vs. TTL 过期**：这两个淘汰条件可能冲突。
- **锁粒度**：整体锁简单但并发度差；分段 / 分片能提升，但实现复杂。
- **过期时间读取用系统时钟**：服务器时钟回拨会导致 entry 立即过期或永不过期 → 生产级用 `System.nanoTime()` 基于单调时钟。

### 加分追问

**"如果 QPS 是 10 万，这个实现能扛住吗？"**
- 全局锁会是瓶颈。要分段：把 key hash 到 N 个 cache 实例。
- 或直接用 Caffeine（内部用 BufferedRead + BufferedWrite 机制，避免锁）。

**"怎么做到写入后立即可见？"**
- ConcurrentHashMap 的 put 是 volatile 可见。
- LRU 顺序更新不一定立即可见 —— 但 LRU 顺序本身是近似的，略微不精准不影响正确性。

### 常见失分

- 不问 TTL 精度要求（秒级 vs 毫秒级）。
- 不区分 map.get 和 lruOrder.get 的并发可见性。
- 过期检查用 `if (now >= expireAt)` 和 `if (now > expireAt)` 这种一字之差的 bug。

---

## 题 3 — 令牌桶限流（并发安全）

### 题面

> 实现一个令牌桶限流器：容量 N，每秒补充 R 个令牌；`tryAcquire(int permits)` 在有足够令牌时立即返回 true 并扣减，否则返回 false。要求并发安全，不用定时任务补令牌。

### 关键思路：懒补发 (lazy refill)

不开定时器补令牌；每次 `tryAcquire` 时根据当前时间和上次补发时间，按速率 **计算** 出应该有多少令牌。

### 参考实现

```java
public class TokenBucket {
    private final long capacity;
    private final double ratePerNanos; // 每纳秒补多少个
    private double tokens;
    private long lastRefillNanos;

    public TokenBucket(long capacity, double permitsPerSecond) {
        this.capacity = capacity;
        this.ratePerNanos = permitsPerSecond / 1_000_000_000.0;
        this.tokens = capacity;
        this.lastRefillNanos = System.nanoTime();
    }

    public synchronized boolean tryAcquire(int permits) {
        if (permits <= 0) throw new IllegalArgumentException();
        refill();
        if (tokens >= permits) {
            tokens -= permits;
            return true;
        }
        return false;
    }

    private void refill() {
        long now = System.nanoTime();
        if (now <= lastRefillNanos) return; // 时钟回拨保护
        double added = (now - lastRefillNanos) * ratePerNanos;
        tokens = Math.min(capacity, tokens + added);
        lastRefillNanos = now;
    }
}
```

### 关键考察点

- **为什么用 nanoTime() 而不是 currentTimeMillis()？**（单调时钟，不受 NTP 回拨影响）
- **tokens 用 double 还是 long？**（double 有精度问题；long + 放大因子更严谨）
- **synchronized 的并发度**：单机限流瓶颈不在这里，但集群限流要考虑 Redis + Lua。
- **突发 (burst)**：令牌桶允许短时突发（桶满时），漏桶不允许。题目没说要不要支持 burst，要主动问。

### 加分追问

**"改成分布式限流（跨机器共享一个桶）怎么做？"**
- Redis + Lua 脚本：原子地 `get + compute + set`。
- 注意时钟问题：Redis 用 `TIME` 命令作为权威时间源。
- 注意 Lua 脚本的幂等和超时。

**"Guava RateLimiter 和这个的区别？"**
- Guava 的 `SmoothBursty` 和 `SmoothWarmingUp` 两种模式。
- SmoothWarmingUp 考虑了冷启动（刚启动时不允许满速，防击穿下游）—— 这个细节是 Guava 内部的宝藏。

### 常见失分

- 用定时任务补令牌（面试官明确说不用，还要再问清"为什么不用"）。
- 没有时钟回拨保护。
- 不讲溢出：令牌数超 capacity 要截断。

---

## 题 4 — 滑动窗口限流（Senior）

### 题面

> 实现一个滑动窗口限流器：过去 1 秒内请求数不超过 100。要求精度好（不是固定窗口那种边界突刺），内存可控。

### 两种实现

#### 方案 A: 滑动日志（精确但内存高）

维护一个双端队列，记录每次请求的时间戳。每次请求时：
1. 从队头删除超过 1 秒的时间戳。
2. 如果队列长度 < 100，加入当前时间戳并通过；否则拒绝。

```java
public class SlidingWindowLogLimiter {
    private final int limit;
    private final long windowNanos;
    private final Deque<Long> timestamps = new ArrayDeque<>();

    public SlidingWindowLogLimiter(int limit, long windowMs) {
        this.limit = limit;
        this.windowNanos = windowMs * 1_000_000L;
    }

    public synchronized boolean tryAcquire() {
        long now = System.nanoTime();
        long cutoff = now - windowNanos;
        while (!timestamps.isEmpty() && timestamps.peekFirst() < cutoff) {
            timestamps.pollFirst();
        }
        if (timestamps.size() >= limit) return false;
        timestamps.addLast(now);
        return true;
    }
}
```

内存：O(limit)。精确到毫秒级。

#### 方案 B: 滑动窗口计数 (circular buffer)

把 1 秒切成 N 段（比如 10 段，每段 100ms），环形数组存各段计数。请求时：当前时间落在哪段 → 段计数 +1 → 汇总 N 段总和 → 和 limit 比较。

优点：内存 O(N)。
代价：精度 = 1/N 秒。

### 关键考察点

- **时间复杂度**：方案 A 平均 O(1) amortized；方案 B 每次请求 O(N) 汇总，但 N 小可忽略。
- **精度 vs. 内存的 trade-off**。
- **清理老段 vs. 惰性覆盖**：环形数组可以惰性覆盖（新请求到达时先判段是否新一轮，是则清零）。

### 加分追问

**"如果一秒限流 10 万，方案 A 内存够用吗？"**
- 每请求一个 Long (8 字节) + 节点开销 ≈ 48 字节 → 10 万 ≈ 5MB。单实例能接受，但 1000 个限流器就爆了。
- 所以高频场景用方案 B。

**"生产里你会选哪个？"**
- 大多数 API 限流用方案 B 即可，精度够。
- 关键路径 / 金融需要精确的选方案 A。

---

## 题 5 — 简易线程池（Senior）

### 题面

> 从零实现一个简单的线程池：构造参数（corePoolSize, queueCapacity），`submit(Runnable)` 提交任务，`shutdown()` 优雅关闭。不允许使用 `ThreadPoolExecutor` / `Executors.*`。

### 参考实现

```java
public class SimpleThreadPool {
    private final BlockingQueue<Runnable> queue;
    private final List<Worker> workers = new ArrayList<>();
    private volatile boolean running = true;

    public SimpleThreadPool(int coreSize, int queueCap) {
        if (coreSize <= 0 || queueCap <= 0) throw new IllegalArgumentException();
        this.queue = new ArrayBlockingQueue<>(queueCap);
        for (int i = 0; i < coreSize; i++) {
            Worker w = new Worker(i);
            workers.add(w);
            w.start();
        }
    }

    public void submit(Runnable task) throws InterruptedException {
        if (!running) throw new IllegalStateException("pool shutdown");
        queue.put(task); // 队列满时阻塞提交者（反压）
    }

    public void shutdown() {
        running = false;
        workers.forEach(Thread::interrupt);
    }

    private class Worker extends Thread {
        Worker(int i) { super("simple-pool-" + i); }

        @Override public void run() {
            while (running || !queue.isEmpty()) {
                try {
                    Runnable task = queue.poll(1, TimeUnit.SECONDS);
                    if (task != null) {
                        try { task.run(); }
                        catch (Throwable t) { /* 记日志：别让 worker 死掉 */ }
                    }
                } catch (InterruptedException e) {
                    if (!running) break; // 关闭期间中断就退出
                }
            }
        }
    }
}
```

### 关键考察点

- **阻塞队列的选择**：`ArrayBlockingQueue` (有界有锁) vs. `LinkedBlockingQueue` (有/无界, 双锁)。
- **task.run() 外的 try-catch**：否则一个业务异常会让 worker 线程死掉，池慢慢缩小到 0。
- **关闭语义**：`shutdown` 是优雅关闭（让队列里的任务跑完），`shutdownNow` 是立即中断并返回未执行的任务（本题可做扩展）。
- **命名线程**：默认 Thread.name 是 `Thread-N`，生产环境线程池必须命名。

### 加分追问

**"如何实现 maximumPoolSize（队列满时临时加线程）？"**
- 提交时如果队列满且 workers.size < max，新起一个 worker。
- 临时 worker 在 `keepAliveTime` 内没任务就退出。

**"如何支持 Future / Callable？"**
- 包装一个 `FutureTask`，submit 时返回 Future。

**"如果 shutdown 后 queue 里还有任务，要跑完吗？"**
- 这是 **shutdown vs. shutdownNow** 的区别，引用 JDK `ExecutorService` 设计。

### 常见失分

- 忘了 try-catch，worker 线程异常退出。
- 队列不是阻塞队列（用 `LinkedList` 自己 wait/notify）—— 能写对说明基本功扎实，但更推荐直接用 `BlockingQueue`。
- 不处理 `InterruptedException`。

---

## 题 6 — 一致性哈希（Senior，选做）

### 题面

> 实现一个一致性哈希路由：可以 `addNode(String name)` / `removeNode(String name)` / `routeKey(String key)`。添加/删除节点时，受影响的 key 尽可能少。

### 参考实现要点

```java
public class ConsistentHashRouter {
    private final int virtualNodesPerPhysical;
    private final TreeMap<Long, String> ring = new TreeMap<>(); // hash → nodeName

    public ConsistentHashRouter(int virtualNodesPerPhysical) {
        this.virtualNodesPerPhysical = virtualNodesPerPhysical;
    }

    public synchronized void addNode(String name) {
        for (int i = 0; i < virtualNodesPerPhysical; i++) {
            long h = hash(name + "#" + i);
            ring.put(h, name);
        }
    }

    public synchronized void removeNode(String name) {
        for (int i = 0; i < virtualNodesPerPhysical; i++) {
            ring.remove(hash(name + "#" + i));
        }
    }

    public String routeKey(String key) {
        if (ring.isEmpty()) return null;
        long h = hash(key);
        Map.Entry<Long, String> e = ring.ceilingEntry(h);
        if (e == null) e = ring.firstEntry(); // 环绕
        return e.getValue();
    }

    private long hash(String s) {
        // 生产建议 MurmurHash / xxHash；演示用可以直接 MD5 取低 64 位
        byte[] bytes = MessageDigest.getInstance("MD5").digest(s.getBytes(StandardCharsets.UTF_8));
        return ByteBuffer.wrap(bytes).getLong();
    }
}
```

### 关键考察点

- **为什么要虚拟节点？** 物理节点少时（< 10），直接把节点放到环上会分布不均，导致负载倾斜。每个物理节点放 100~500 个虚拟节点，分布更均匀。
- **hash 函数选择**：MD5 够用；MurmurHash / xxHash 更快；Java `hashCode()` **绝对不够均匀**。
- **时间复杂度**：routeKey 是 O(log(N × V))，N 物理节点、V 虚拟节点数。
- **环绕语义**：比 key hash 大的第一个节点；如果没有（落在最大 hash 之后），取环上最小的。

### 加分追问

**"生产里 Redis Cluster / Cassandra 是怎么做的？"**
- Redis Cluster：哈希槽（16384 个槽）—— 固定大小的"虚拟节点"，节点迁移是槽级别的移动，运维心智负担低。
- Cassandra：vnode + Murmur3 哈希。

**"如何实现加权？"**
- 权重高的节点放更多虚拟节点。e.g. 大机器 200 个 vnode，小机器 100 个。

### 常见失分

- 不用虚拟节点，分布倾斜严重。
- 环绕逻辑写错（没有 `ceilingEntry` 的边界处理）。
- 拿 Java 默认 `hashCode()` 当 hash，分布极差。

---

## 选题策略

| 候选人背景 | 首推题 | 备选 |
|---|---|---|
| 主推"高并发" / "秒杀" / "抢购" | 题 3（令牌桶）或题 4（滑动窗口） | 题 5（线程池） |
| 主推 "分布式" / "服务拆分" | 题 6（一致性哈希） | 题 5（线程池） |
| 主推"缓存优化" / "系统性能" | 题 2（LRU+TTL） | 题 1（基础 LRU） |
| 主推"中间件" / "框架" | 题 5（简易线程池） | 题 6 |
| 普通 backend，3 年左右经验 | 题 1（LRU） | 题 3（令牌桶） |

**不要从 LeetCode 题库直接搬题**。面试官看到的最好是候选人项目里真写过的代码的 Ghost —— 他如果项目里真用过限流，写不出令牌桶就是信号；如果他根本没接触过限流，让他现场推演也是信号（但你要接受他慢慢想）。

## 通用判断标准

**白板代码允许的不完美**：
- 小语法错误（分号、导入）。
- 忘写 equals/hashCode 的琐碎细节。
- 变量命名稍弱。

**白板代码不能原谅的**：
- 核心算法错误 / 边界问题（off-by-one、空集合）。
- 并发安全宣称了但实际不安全。
- 时空复杂度分析错误。
- 面对追问僵住不能讨论权衡。
