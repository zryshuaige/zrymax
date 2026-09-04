<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { ATTENTION_MECHS, ATTENTION_TOKENS, type AttentionMech } from '../../data/attentionData'
import PlaybackBar from './PlaybackBar.vue'

const activeId = ref('gqa')
const active = computed<AttentionMech>(() => ATTENTION_MECHS.find((m) => m.id === activeId.value)!)

// 机制一句话看点：切换 tab 时同步替换，把「为什么演进」讲成一句人话
const MECH_INSIGHTS: Record<string, string> = {
  mha: '8 个头各看各的：模式最丰富，KV cache 也最贵——后面三代都在给它「瘦身」。',
  mqa: '8 个 Q 头共用 1 对 K/V：cache 直接砍到 1/8，代价是所有头的注意力模式被迫趋同。',
  gqa: '折中方案：Q 头分组共享 K/V，质量几乎不掉，cache 仍省 75%——主流开源模型的默认选择。',
  mla: '换个思路：不存完整 K/V，压缩进一条低秩潜向量，用时再展开——比 MQA 更小，质量反而接近 MHA。',
}
const mechInsight = computed(() => MECH_INSIGHTS[active.value.id] ?? '')

// 图例 hover 联动：高亮结构图中对应的一列（Q 头 / KV 头）
const hovKind = ref<'q' | 'kv' | null>(null)

// ===== 头结构图几何 =====
const VB_W = 420
const VB_H = 280
const Q_X = 72
const KV_X = 348
const HEAD_R = 10

const qY = (i: number, n: number) => 36 + (i * (VB_H - 72)) / (n - 1)

interface HeadLink {
  q: number
  kv: number
  x1: number
  y1: number
  x2: number
  y2: number
}

const links = computed<HeadLink[]>(() => {
  const m = active.value
  return Array.from({ length: m.qHeads }, (_, i) => {
    const kv = Math.min(Math.floor((i * m.kvHeads) / m.qHeads), m.kvHeads - 1)
    return {
      q: i,
      kv,
      x1: Q_X + HEAD_R,
      y1: qY(i, m.qHeads),
      x2: KV_X - (m.latent ? 26 : HEAD_R),
      y2: qY(kv, m.kvHeads),
    }
  })
})

// hover 某个头时，只高亮与它相连的线
const hovQ = ref<number | null>(null)
const hovKV = ref<number | null>(null)
const linkActive = (l: HeadLink) => {
  if (hovQ.value !== null) return l.q === hovQ.value
  if (hovKV.value !== null) return l.kv === hovKV.value
  return true
}

// ===== 迷你热力图 =====
const hovCell = ref<{ r: number; c: number } | null>(null)

// 行归一化（展示安全网：手工矩阵行和可能有微小误差）
const normPattern = computed(() =>
  active.value.pattern.map((row) => {
    const sum = row.reduce((a, b) => a + b, 0) || 1
    return row.map((v) => v / sum)
  }),
)

const cellWeight = (r: number, c: number) => normPattern.value[r][c]

// ===== 注意力流弧线：逐 token 播放当前机制的注意力分布 =====
const FLOW_TOTAL = ATTENTION_TOKENS.length
const flowStep = ref(0) // 当前查询词下标
const playing = ref(false)
const speed = ref(1)
let flowTimer: ReturnType<typeof setTimeout> | null = null

const clearFlowTimer = () => {
  if (flowTimer !== null) {
    clearTimeout(flowTimer)
    flowTimer = null
  }
}

const scheduleFlow = () => {
  clearFlowTimer()
  if (!playing.value) return
  flowTimer = setTimeout(() => {
    flowStep.value = (flowStep.value + 1) % FLOW_TOTAL
    scheduleFlow()
  }, 1100 / speed.value)
}

const togglePlay = () => {
  playing.value = !playing.value
  scheduleFlow()
}

const stepOnce = () => {
  playing.value = false
  flowStep.value = (flowStep.value + 1) % FLOW_TOTAL
}

const resetFlow = () => {
  playing.value = false
  flowStep.value = 0
}

const cycleSpeed = () => {
  speed.value = speed.value === 1 ? 2 : speed.value === 2 ? 0.5 : 1
  scheduleFlow()
}

onBeforeUnmount(clearFlowTimer)

const flowRow = computed(() => normPattern.value[flowStep.value])
const topTargets = computed(() =>
  flowRow.value
    .map((w, c) => ({ c, w }))
    .sort((a, b) => b.w - a.w)
    .slice(0, 3),
)

// 逐 token 解说：当前查询词最关注谁
const flowCaption = computed(() => {
  const q = ATTENTION_TOKENS[flowStep.value]
  const top = topTargets.value[0]
  const pct = (top.w * 100).toFixed(0)
  if (top.c === flowStep.value) {
    return `「${q}」主要看着自己（${pct}%）——局部短语内的稳定锚点。`
  }
  return `「${q}」把最多的目光（${pct}%）分给了「${ATTENTION_TOKENS[top.c]}」。`
})

// 弧线几何：token 一排横排，弧线向上拱起，跨距越大拱越高
const FLOW_W = 760
const FLOW_H = 230
const FLOW_Y = 178 // token 基线
const tokenX = (i: number) => 56 + (i * (FLOW_W - 112)) / (FLOW_TOTAL - 1)
const arcPath = (c: number) => {
  const x1 = tokenX(flowStep.value)
  const x2 = tokenX(c)
  const h = Math.abs(x2 - x1) * 0.22 + 20
  return `M ${x1} ${FLOW_Y} C ${x1} ${FLOW_Y - h}, ${x2} ${FLOW_Y - h}, ${x2} ${FLOW_Y}`
}
</script>

<template>
  <div class="att-wrap">
    <!-- 机制时间线 tabs -->
    <div class="att-timeline" role="tablist">
      <button
        v-for="m in ATTENTION_MECHS"
        :key="m.id"
        type="button"
        role="tab"
        :aria-selected="activeId === m.id"
        :class="['att-tab', { active: activeId === m.id }]"
        @click="activeId = m.id"
      >
        <span class="att-tab-year mono">{{ m.year }}</span>
        <span class="att-tab-name">{{ m.name }}</span>
      </button>
    </div>

    <!-- 机制一句话看点 -->
    <Transition name="att-fade" mode="out-in">
      <p :key="active.id" class="att-insight">
        <span class="att-insight-tag mono">{{ active.name }} · {{ active.year }}</span>
        {{ mechInsight }}
      </p>
    </Transition>

    <div class="att-grid">
      <!-- 左：头结构图 -->
      <div class="att-diagram">
        <Transition name="att-fade" mode="out-in">
          <svg :key="active.id" :viewBox="`0 0 ${VB_W} ${VB_H}`" :class="['att-svg', { 'hl-q': hovKind === 'q', 'hl-kv': hovKind === 'kv' }]">
            <!-- 连线 -->
            <line
              v-for="l in links"
              :key="l.q"
              :x1="l.x1" :y1="l.y1" :x2="l.x2" :y2="l.y2"
              class="att-link"
              :class="{ dim: !linkActive(l) }"
            />
            <!-- Q 头 -->
            <g v-for="i in active.qHeads" :key="'q' + i">
              <circle
                :cx="Q_X" :cy="qY(i - 1, active.qHeads)" :r="HEAD_R"
                class="att-head att-head-q"
                @mouseenter="hovQ = i - 1"
                @mouseleave="hovQ = null"
              />
            </g>
            <!-- KV 头 / 潜向量瓶颈 -->
            <template v-if="!active.latent">
              <circle
                v-for="i in active.kvHeads"
                :key="'kv' + i"
                :cx="KV_X" :cy="qY(i - 1, active.kvHeads)" :r="HEAD_R"
                class="att-head att-head-kv"
                @mouseenter="hovKV = i - 1"
                @mouseleave="hovKV = null"
              />
            </template>
            <g v-else>
              <rect
                :x="KV_X - 26" :y="VB_H / 2 - 46" width="52" height="92"
                class="att-latent"
                @mouseenter="hovKV = 0"
                @mouseleave="hovKV = null"
              />
              <text :x="KV_X" :y="VB_H / 2 - 2" class="att-latent-label" text-anchor="middle">cKV</text>
              <text :x="KV_X" :y="VB_H / 2 + 14" class="att-latent-label" text-anchor="middle">潜向量</text>
              <text :x="KV_X" :y="VB_H / 2 + 66" class="att-note" text-anchor="middle">使用时展开为 K/V</text>
            </g>
            <!-- 标注 -->
            <text :x="Q_X" :y="VB_H - 8" class="att-note" text-anchor="middle">Q 头 ×{{ active.qHeads }}</text>
            <text :x="KV_X" :y="VB_H - 8" class="att-note" text-anchor="middle">
              {{ active.latent ? '联合压缩' : `KV 头 ×${active.kvHeads}` }}
            </text>
          </svg>
        </Transition>
        <div class="att-diagram-legend">
          <span class="att-legend-item" @mouseenter="hovKind = 'q'" @mouseleave="hovKind = null">
            <i class="att-legend-swatch swatch-q"></i>Q 头 ×{{ active.qHeads }}
          </span>
          <span class="att-legend-item" @mouseenter="hovKind = 'kv'" @mouseleave="hovKind = null">
            <i class="att-legend-swatch swatch-kv"></i>{{ active.latent ? '潜向量 cKV' : `KV 头 ×${active.kvHeads}` }}
          </span>
          <span class="att-legend-item att-legend-static">
            <i class="att-legend-line"></i>共享连接
          </span>
        </div>
        <p class="att-diagram-caption">hover 圆点看连接：{{ active.latent ? '所有 Q 头读写同一条潜向量通道' : '哪些 Q 头共享同一个 KV 头' }}</p>
      </div>

      <!-- 右：信息 + KV cache + 热力图 -->
      <div class="att-side">
        <div class="att-block">
          <h3>{{ active.fullName }} <span class="att-model-tag">{{ active.model }}</span></h3>
          <p class="att-blurb">{{ active.blurb }}</p>
          <div class="att-stats mono">
            <span>Q 头 ×{{ active.qHeads }}</span>
            <span>{{ active.latent ? '潜向量 ×1' : `KV 头 ×${active.kvHeads}` }}</span>
            <span>KV cache ≈ {{ active.kvCachePct }}%</span>
          </div>
        </div>

        <div class="att-block">
          <h3>相对 KV cache 体积</h3>
          <div class="att-bars">
            <div v-for="m in ATTENTION_MECHS" :key="m.id" :class="['att-bar-row', { active: m.id === activeId }]">
              <span class="att-bar-name mono">{{ m.name }}</span>
              <span class="att-bar-track">
                <span class="att-bar-fill" :style="{ width: m.kvCachePct + '%' }"></span>
              </span>
              <span class="att-bar-val mono">{{ m.kvCachePct }}%</span>
            </div>
          </div>
          <p class="att-tip-text">同等头数与头维下的估算：GQA 省 75%，MLA 比 MQA 还省——这是长上下文能落地的关键之一。</p>
        </div>

        <div class="att-block">
          <h3>注意力模式（示例）</h3>
          <div class="att-heat" :style="{ gridTemplateColumns: `auto repeat(${ATTENTION_TOKENS.length}, 1fr)` }">
            <span></span>
            <span v-for="(t, c) in ATTENTION_TOKENS" :key="'col' + c" class="att-heat-label" :class="{ hot: hovCell?.c === c }">{{ t }}</span>
            <template v-for="(row, r) in normPattern" :key="'row' + r">
              <span class="att-heat-label" :class="{ hot: hovCell?.r === r || flowStep === r }">{{ ATTENTION_TOKENS[r] }}</span>
              <span
                v-for="(_, c) in row"
                :key="'cell' + r + '-' + c"
                class="att-heat-cell"
                :class="{ 'row-cur': flowStep === r }"
                :style="{ background: `color-mix(in srgb, var(--accent) ${Math.round(cellWeight(r, c) * 100)}%, transparent)` }"
                @mouseenter="hovCell = { r, c }"
                @mouseleave="hovCell = null"
              ></span>
            </template>
          </div>
          <p class="att-tip-text mono">
            {{ hovCell ? `${ATTENTION_TOKENS[hovCell.r]} → ${ATTENTION_TOKENS[hovCell.c]}：${(cellWeight(hovCell.r, hovCell.c) * 100).toFixed(0)}%` : 'hover 格子看权重：行 token 分多少注意力给列 token' }}
          </p>
        </div>
      </div>
    </div>

    <!-- 注意力流弧线：逐 token 播放当前机制的注意力分布 -->
    <div class="att-flow">
      <div class="att-flow-head">
        <h3>注意力流：每个 token 轮流当查询词</h3>
        <PlaybackBar
          :playing="playing"
          :step="flowStep + 1"
          :total="FLOW_TOTAL"
          :speed="speed"
          @toggle="togglePlay"
          @step-forward="stepOnce"
          @reset="resetFlow"
          @cycle-speed="cycleSpeed"
        />
      </div>
      <svg :viewBox="`0 0 ${FLOW_W} ${FLOW_H}`" class="att-flow-svg" role="img" aria-label="注意力流向图">
        <!-- 换机制/换查询词时整组重挂载，弧线重新生长 -->
        <g :key="activeId + '-' + flowStep">
          <template v-for="(w, c) in flowRow" :key="c">
            <path
              v-if="c !== flowStep && w > 0.005"
              :d="arcPath(c)"
              pathLength="1"
              class="att-arc"
              :style="{ strokeWidth: 1 + w * 9, opacity: 0.15 + w * 0.85, animationDelay: c * 35 + 'ms' }"
            />
            <circle
              v-else-if="c === flowStep"
              :cx="tokenX(c)"
              :cy="FLOW_Y - 24"
              :r="3 + w * 9"
              class="att-arc-self"
            />
          </template>
        </g>
        <g v-for="(t, i) in ATTENTION_TOKENS" :key="'tok' + i">
          <text
            :x="tokenX(i)"
            :y="FLOW_Y + 26"
            class="att-flow-token"
            :class="{ query: i === flowStep }"
            text-anchor="middle"
          >{{ t }}</text>
          <line
            v-if="i === flowStep"
            :x1="tokenX(i)"
            :y1="FLOW_Y + 6"
            :x2="tokenX(i)"
            :y2="FLOW_Y + 13"
            class="att-flow-tick"
          />
        </g>
      </svg>
      <p class="att-flow-narration">
        <span class="att-flow-tag mono">TOKEN {{ flowStep + 1 }}/{{ FLOW_TOTAL }}</span>
        {{ flowCaption }}
        <span class="att-flow-targets mono">
          查询「{{ ATTENTION_TOKENS[flowStep] }}」→
          <template v-for="(t, i) in topTargets" :key="t.c">{{ i ? ' · ' : '' }}{{ ATTENTION_TOKENS[t.c] }} {{ (t.w * 100).toFixed(0) }}%</template>
        </span>
      </p>
      <p class="att-tip-text">切换上方机制 tab，同一句话的注意力流会改变形状。</p>
    </div>
  </div>
</template>

<style scoped>
.att-wrap {
  display: grid;
  gap: 1rem;
}

/* 时间线 tabs */
.att-timeline {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.6rem;
}

.att-tab {
  border: 1px solid var(--card-border);
  background: var(--card-bg);
  padding: 0.55rem 0.7rem;
  cursor: pointer;
  text-align: left;
  color: var(--text-primary);
  transition:
    border-color var(--dur-1) var(--ease-out-cubic),
    background var(--dur-1) var(--ease-out-cubic),
    transform var(--dur-1) var(--ease-out-cubic);
}

.att-tab:hover:not(.active) {
  border-color: var(--accent);
  transform: translateY(-2px);
}

.att-tab.active {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.att-tab-year {
  display: block;
  font-size: 0.72rem;
  color: var(--accent);
  letter-spacing: 0.08em;
}

.att-tab-name {
  display: block;
  font-weight: 700;
  font-size: 0.98rem;
  margin-top: 0.1rem;
}

/* 机制一句话看点 */
.att-insight {
  margin: 0;
  padding: 0.5rem 0.7rem;
  border-left: 2px solid var(--accent);
  background: var(--accent-soft);
  color: var(--text-primary);
  font-size: 0.86rem;
  line-height: 1.6;
}

.att-insight-tag {
  display: inline-block;
  margin-right: 0.5em;
  font-size: 0.68rem;
  letter-spacing: 0.12em;
  color: var(--accent);
  font-weight: 700;
}

.att-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  align-items: start;
}

/* 结构图 */
.att-diagram {
  border: 1px solid var(--card-border);
  background: var(--card-bg);
  padding: 0.6rem;
}

.att-svg {
  display: block;
  width: 100%;
  height: auto;
}

.att-link {
  stroke: var(--accent);
  stroke-width: 1.4;
  opacity: 0.75;
  transition: opacity var(--dur-1) var(--ease-out-cubic);
}

.att-link.dim {
  opacity: 0.12;
}

.att-head {
  cursor: pointer;
  transition: r var(--dur-1) var(--ease-out-cubic);
}

.att-head-q {
  fill: var(--accent);
}

.att-head-kv {
  fill: var(--signal);
  stroke: var(--signal-ink);
  stroke-width: 1;
}

.att-latent {
  fill: var(--signal);
  stroke: var(--signal-ink);
  stroke-width: 1;
  cursor: pointer;
}

.att-latent-label {
  fill: var(--signal-ink);
  font-size: 12px;
  font-weight: 700;
  pointer-events: none;
}

.att-note {
  fill: var(--ink-soft);
  font-size: 11px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
}

/* 图例 hover 联动：点亮一类头，压暗另一类 */
.att-diagram-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.9rem;
  margin-top: 0.5rem;
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.att-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  cursor: default;
}

.att-legend-item:not(.att-legend-static):hover {
  color: var(--accent);
}

.att-legend-swatch {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}

.swatch-q {
  background: var(--accent);
}

.swatch-kv {
  background: var(--signal);
  outline: 1px solid var(--signal-ink);
}

.att-legend-line {
  width: 14px;
  height: 0;
  border-top: 1.4px solid var(--accent);
  display: inline-block;
}

.att-svg .att-head,
.att-svg .att-latent {
  transition:
    opacity var(--dur-1) var(--ease-out-cubic),
    r var(--dur-1) var(--ease-out-cubic);
}

.att-svg.hl-q .att-head-kv,
.att-svg.hl-q .att-latent,
.att-svg.hl-q .att-latent-label {
  opacity: 0.2;
}

.att-svg.hl-kv .att-head-q {
  opacity: 0.2;
}

.att-diagram-caption {
  margin: 0.4rem 0 0;
  font-size: 0.78rem;
  color: var(--text-secondary);
}

/* 切换过渡 */
.att-fade-enter-active,
.att-fade-leave-active {
  transition: opacity var(--dur-2) var(--ease-out-cubic);
}

.att-fade-enter-from,
.att-fade-leave-to {
  opacity: 0;
}

/* 右侧 */
.att-side {
  display: grid;
  gap: 1rem;
}

.att-block h3 {
  margin: 0 0 0.5rem;
  font-size: 0.96rem;
  font-family: var(--font-display);
}

.att-model-tag {
  font-size: 0.74rem;
  color: var(--accent);
  font-family: var(--font-mono);
  margin-left: 0.4rem;
}

.att-blurb {
  margin: 0 0 0.6rem;
  color: var(--text-secondary);
  font-size: 0.88rem;
}

.att-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.9rem;
  font-size: 0.8rem;
  color: var(--text-primary);
}

.att-bars {
  display: grid;
  gap: 0.4rem;
}

.att-bar-row {
  display: grid;
  grid-template-columns: 44px 1fr 52px;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  opacity: 0.55;
  transition: opacity var(--dur-1) var(--ease-out-cubic);
}

.att-bar-row.active {
  opacity: 1;
}

.att-bar-track {
  height: 10px;
  background: var(--accent-soft);
  overflow: hidden;
}

.att-bar-fill {
  display: block;
  height: 100%;
  background: var(--accent);
  transition: width var(--dur-3) var(--ease-out-cubic);
}

.att-bar-row.active .att-bar-fill {
  background: var(--signal);
}

.att-bar-val {
  text-align: right;
  color: var(--text-secondary);
}

/* 热力图 */
.att-heat {
  display: grid;
  gap: 2px;
  max-width: 320px;
}

.att-heat-label {
  font-size: 0.74rem;
  color: var(--text-secondary);
  text-align: center;
  align-self: center;
  transition: color var(--dur-1);
}

.att-heat-label.hot {
  color: var(--accent);
  font-weight: 700;
}

.att-heat-cell {
  aspect-ratio: 1;
  cursor: crosshair;
  outline: 1px solid var(--rule-soft);
}

.att-heat-cell.row-cur {
  outline-color: var(--accent);
}

/* 注意力流弧线面板 */
.att-flow {
  border: 1px solid var(--card-border);
  background: var(--card-bg);
  padding: 0.8rem 1rem 0.9rem;
}

.att-flow-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.8rem;
  flex-wrap: wrap;
  margin-bottom: 0.3rem;
}

.att-flow-head h3 {
  margin: 0;
  font-size: 0.96rem;
  font-family: var(--font-display);
}

.att-flow-svg {
  display: block;
  width: 100%;
  height: auto;
}

.att-arc {
  stroke: var(--accent);
  fill: none;
  stroke-linecap: round;
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation: att-arc-draw 0.5s var(--ease-out-cubic) forwards;
}

.att-arc-self {
  fill: var(--accent);
  opacity: 0.85;
}

.att-flow-token {
  fill: var(--ink-soft);
  font-size: 13px;
}

.att-flow-token.query {
  fill: var(--accent);
  font-weight: 700;
}

.att-flow-tick {
  stroke: var(--accent);
  stroke-width: 2;
}

@keyframes att-arc-draw {
  to {
    stroke-dashoffset: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .att-arc {
    animation: none;
    stroke-dashoffset: 0;
  }
}

.att-tip-text {
  margin: 0.6rem 0 0;
  color: var(--text-secondary);
  font-size: 0.82rem;
}

/* 逐 token 解说条 */
.att-flow-narration {
  margin: 0.55rem 0 0;
  padding: 0.5rem 0.7rem;
  border-left: 2px solid var(--accent);
  background: var(--accent-soft);
  color: var(--text-primary);
  font-size: 0.84rem;
  line-height: 1.6;
}

.att-flow-tag {
  display: inline-block;
  margin-right: 0.5em;
  font-size: 0.68rem;
  letter-spacing: 0.12em;
  color: var(--accent);
  font-weight: 700;
}

.att-flow-targets {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.76rem;
  color: var(--text-secondary);
}

@media (max-width: 760px) {
  .att-grid {
    grid-template-columns: 1fr;
  }

  .att-timeline {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
