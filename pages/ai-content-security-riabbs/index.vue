<script lang="ts" setup>
import { useLocalStorage } from '@vueuse/core'

const { $client } = useNuxtApp()

const router = useRouter()
const route = useRoute()
const message = useMessage()

const topicId = ref(0)
const topicContent = ref<{ content: string, reviewing?: boolean, score?: number }>({ content: '' })
const replies = ref<Array<{ content: string, reviewing?: boolean, score?: number }>>([])
const loading = ref(false)
const loadingMoreReplies = ref(false)
const reviewingAll = ref(false)
const systemMessage = ref('')
const currentPage = ref(1)
const totalPages = ref(1)
const hasMoreReplies = ref(true)
const sortOrder = ref<'default' | 'score'>('default')
const showSystemMessageModel = ref(false)
const concurrentRequests = ref(8)

const baseURL = useLocalStorage('ai-content-security-riabbs-baseURL', '')
const apiKey = useLocalStorage('ai-content-security-riabbs-apiKey', '')
const modelId = useLocalStorage('ai-content-security-riabbs-modelId', '')
const temperature = useLocalStorage('ai-content-security-riabbs-temperature', 0.7)

const totalPromptTokens = useLocalStorage('ai-content-security-riabbs-totalPromptTokens', 0)
const totalPromptCacheHitTokens = useLocalStorage('ai-content-security-riabbs-totalPromptCacheHitTokens', 0)
const totalPromptCacheMissTokens = useLocalStorage('ai-content-security-riabbs-totalPromptCacheMissTokens', 0)

const isDeepseekAPI = computed(() => totalPromptCacheHitTokens.value > 0)

const sortedReplies = computed(() => {
  if (sortOrder.value === 'score') {
    return [...replies.value].sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
  }
  return replies.value
})

function clearStats() {
  totalPromptTokens.value = 0
  totalPromptCacheHitTokens.value = 0
  totalPromptCacheMissTokens.value = 0
}

onMounted(async () => {
  systemMessage.value = await $client.aiContentSecurity.openai.getSystemMessage.query()
  const urlTopicId = route.query.topic as string
  if (urlTopicId) {
    topicId.value = Number(urlTopicId)
    await fetchTopic()
  }
})

watch(topicId, (newValue) => {
  currentPage.value = 1
  replies.value = []
  hasMoreReplies.value = true
  router.push({ query: { ...route.query, topic: newValue.toString() } })
})

const riabbsToken = useLocalStorage('ai-content-security-riabbs-token', '')

async function fetchTopic(): Promise<void> {
  loading.value = true
  try {
    const result = await $client.aiContentSecurity.riabbs.getTopic.query({
      topicId: topicId.value,
      page: currentPage.value,
      token: riabbsToken.value || undefined
    })
    topicContent.value = { content: result.contents[0] }
    replies.value = result.contents.slice(1).map(content => ({ content }))
    totalPages.value = result.totalPages
    hasMoreReplies.value = currentPage.value < totalPages.value
  }
  catch (error: unknown) {
    if (error instanceof Error) {
      message.error(`获取主题内容失败：${error.message}`)
    }
    else {
      message.error('获取主题内容失败')
    }
  }
  finally {
    loading.value = false
  }
}

async function fetchReplies(): Promise<void> {
  if (!hasMoreReplies.value) { return }

  try {
    const result = await $client.aiContentSecurity.riabbs.getTopic.query({
      topicId: topicId.value,
      page: currentPage.value + 1,
      token: riabbsToken.value || undefined
    })
    const newReplies = result.contents.map(content => ({ content }))
    replies.value.push(...newReplies)
    currentPage.value++
    hasMoreReplies.value = currentPage.value < totalPages.value
  }
  catch (error: unknown) {
    if (error instanceof Error) {
      message.error(`获取回复内容失败：${error.message}`)
    }
    else {
      message.error('获取回复内容失败')
    }
    hasMoreReplies.value = false
  }
}

async function loadMoreReplies(): Promise<void> {
  loadingMoreReplies.value = true
  try {
    await fetchReplies()
  }
  finally {
    loadingMoreReplies.value = false
  }
}

async function loadTenPages(): Promise<void> {
  loadingMoreReplies.value = true
  try {
    for (let i = 0; i < 10 && hasMoreReplies.value; i++) {
      await fetchReplies()
    }
  }
  finally {
    loadingMoreReplies.value = false
  }
}

async function reviewContent(content: { content: string, reviewing?: boolean, score?: number }): Promise<void> {
  if (!baseURL.value || !apiKey.value || !modelId.value) {
    message.error('请先前往设置页面配置 OpenAI API')
    return
  }

  content.reviewing = true
  try {
    const result = await $client.aiContentSecurity.openai.aiContentReview.mutate({
      baseURL: baseURL.value,
      apiKey: apiKey.value,
      modelId: modelId.value,
      temperature: temperature.value,
      content: content.content
    })
    content.score = result.score
    totalPromptTokens.value += result.usage.prompt_tokens
    if (result.usage.prompt_cache_hit_tokens !== undefined) {
      totalPromptCacheHitTokens.value += result.usage.prompt_cache_hit_tokens
      totalPromptCacheMissTokens.value += result.usage.prompt_tokens - result.usage.prompt_cache_hit_tokens
    }
  }
  catch (error: unknown) {
    if (error instanceof Error) {
      message.error(`AI 审核失败：${error.message}`)
    }
    else {
      message.error('AI 审核失败')
    }
  }
  finally {
    content.reviewing = false
  }
}

async function reviewAll(): Promise<void> {
  if (!baseURL.value || !apiKey.value || !modelId.value) {
    message.error('请先前往设置页面配置 OpenAI API')
    return
  }

  reviewingAll.value = true
  const allContents = [topicContent.value, ...replies.value]
  const unreviewed = allContents.filter(content => content.score === undefined)

  try {
    for (let i = 0; i < unreviewed.length; i += concurrentRequests.value) {
      const batch = unreviewed.slice(i, i + concurrentRequests.value)
      await Promise.all(batch.map(content => reviewContent(content)))
    }
  }
  finally {
    reviewingAll.value = false
  }
}

function getScoreType(score: number): 'success' | 'warning' | 'error' {
  if (score >= 75) { return 'error' }
  if (score >= 50) { return 'warning' }
  return 'success'
}

function getScoreText(score: number): string {
  if (score >= 75) { return '封禁' }
  if (score >= 50) { return '风险' }
  return '正常'
}

function toggleSortOrder() {
  sortOrder.value = sortOrder.value === 'default' ? 'score' : 'default'
}
</script>

<template>
  <NFlex vertical size="large" class="container">
    <NH1>RIABBS 主题内容审核</NH1>
    <NFlex size="large" wrap>
      <NStatistic label="总 Token 数" :value="totalPromptTokens" />
      <NStatistic label="总 Token 金额" :value="`${(totalPromptTokens / 1000000).toFixed(6)} 元`" />
      <NStatistic v-if="isDeepseekAPI" label="总缓存 Token 数" :value="totalPromptCacheHitTokens" />
      <NStatistic v-if="isDeepseekAPI" label="总缓存 Token 金额" :value="`${(totalPromptCacheHitTokens / 10000000).toFixed(6)} 元`" />
      <NStatistic v-if="isDeepseekAPI" label="总无缓存 Token 数" :value="totalPromptCacheMissTokens" />
      <NStatistic v-if="isDeepseekAPI" label="总无缓存 Token 金额" :value="`${(totalPromptCacheMissTokens / 1000000).toFixed(6)} 元`" />
    </NFlex>
    <NFlex>
      <NButton @click="clearStats">
        清除统计
      </NButton>
      <NButton @click="router.push('/ai-content-security-riabbs/config')">
        前往设置
      </NButton>
      <NButton @click="showSystemMessageModel = true">
        查看当前 AI 提示词
      </NButton>
      <NModal v-model:show="showSystemMessageModel" title="当前 AI 提示词" preset="card">
        <NText style="white-space: pre-wrap;">
          {{ systemMessage }}
        </NText>
      </NModal>
    </NFlex>
    <NFlex>
      <NInputNumber v-model:value="topicId" placeholder="请输入 RIABBS 主题 ID" />
      <NButton type="primary" :loading="loading" @click="fetchTopic">
        获取主题内容
      </NButton>
      <NButton :loading="loading" @click="topicId++ && fetchTopic()">
        获取下一个 TopicID 主题内容
      </NButton>
    </NFlex>
    <NFlex>
      <NButton type="primary" :loading="reviewingAll" @click="reviewAll">
        全部审核
      </NButton>
      <NButton v-if="hasMoreReplies" :loading="loadingMoreReplies" @click="loadMoreReplies">
        加载更多
      </NButton>
      <NButton v-if="hasMoreReplies" :loading="loadingMoreReplies" @click="loadTenPages">
        获取10页
      </NButton>
      <NButton @click="toggleSortOrder">
        {{ sortOrder === 'default' ? '按分数排序' : '恢复默认排序' }}
      </NButton>
      <NInputNumber v-model:value="concurrentRequests" :min="1" :max="20" placeholder="并发请求数">
        <template #prefix>
          审核并发请求数
        </template>
      </NInputNumber>
    </NFlex>

    <NFlex v-if="topicContent.content" vertical>
      <NH3>主题内容</NH3>
      <NText style="white-space: pre-wrap;">
        {{ topicContent.content }}
      </NText>
      <NFlex>
        <NButton v-if="!topicContent.reviewing && topicContent.score === undefined" @click="reviewContent(topicContent)">
          审核主贴
        </NButton>
        <NSpin v-if="topicContent.reviewing" size="small" />
        <NTag v-else-if="topicContent.score !== undefined" :type="getScoreType(topicContent.score)">
          {{ getScoreText(topicContent.score) }} ({{ topicContent.score }})
        </NTag>
      </NFlex>
    </NFlex>
    <NFlex v-if="sortedReplies.length" vertical>
      <NH3>评论</NH3>

      <NList>
        <NListItem v-for="(reply, index) in sortedReplies" :key="index">
          <template #suffix>
            <NFlex>
              <NButton v-if="!reply.reviewing && reply.score === undefined" @click="reviewContent(reply)">
                审核
              </NButton>
              <NSpin v-if="reply.reviewing" size="small" />
              <NTag v-else-if="reply.score !== undefined" :type="getScoreType(reply.score)">
                {{ getScoreText(reply.score) }} ({{ reply.score }})
              </NTag>
            </NFlex>
          </template>
          <NText style="white-space: pre-wrap;">
            {{ reply.content }}
          </NText>
        </NListItem>
      </NList>
    </NFlex>
  </NFlex>
</template>

<style scoped>
.container {
  max-width: 800px;
  margin: 20px auto;
}
</style>
