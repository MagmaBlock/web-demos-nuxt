<script lang="ts" setup>
import { useLocalStorage } from '@vueuse/core'

const { $client } = useNuxtApp()

const router = useRouter()
const route = useRoute()
const message = useMessage()

const topicId = ref('')
const topicContent = ref<{ content: string, reviewing?: boolean, score?: number }>({ content: '' })
const replies = ref<Array<{ content: string, reviewing?: boolean, score?: number }>>([])
const loading = ref(false)
const loadingMoreReplies = ref(false)
const reviewingAll = ref(false)
const systemMessage = ref('')
const currentPage = ref(1)
const hasMoreReplies = ref(true)
const lastPageContent = ref('')

const baseURL = useLocalStorage('ai-content-security-v2ex-baseURL', '')
const apiKey = useLocalStorage('ai-content-security-v2ex-apiKey', '')
const modelId = useLocalStorage('ai-content-security-v2ex-modelId', '')
const token = useLocalStorage('ai-content-security-v2ex-token', '')

const totalPromptTokens = useLocalStorage('ai-content-security-v2ex-totalPromptTokens', 0)
const totalPromptCacheHitTokens = useLocalStorage('ai-content-security-v2ex-totalPromptCacheHitTokens', 0)
const totalPromptCacheMissTokens = useLocalStorage('ai-content-security-v2ex-totalPromptCacheMissTokens', 0)

const isDeepseekAPI = computed(() => totalPromptCacheHitTokens.value > 0)

function clearStats() {
  totalPromptTokens.value = 0
  totalPromptCacheHitTokens.value = 0
  totalPromptCacheMissTokens.value = 0
}

onMounted(async () => {
  systemMessage.value = await $client.aiContentSecurity.openai.getSystemMessage.query()
  const urlTopicId = route.query.topic as string
  if (urlTopicId) {
    topicId.value = urlTopicId
    await fetchTopic()
  }
})

watch(topicId, (newValue) => {
  currentPage.value = 1
  replies.value = []
  hasMoreReplies.value = true
  lastPageContent.value = ''
  router.push({ query: { ...route.query, topic: newValue } })
})

async function fetchTopic(): Promise<void> {
  if (!token.value) {
    message.error('请先前往设置页面配置 V2EX Token')
    return
  }

  loading.value = true
  try {
    topicContent.value = { content: await $client.aiContentSecurity.v2ex.getTopicContent.query({
      topicId: Number(topicId.value),
      token: token.value
    }) }
    currentPage.value = 1
    replies.value = []
    hasMoreReplies.value = true
    lastPageContent.value = ''
    for (let i = 0; i < 5; i++) {
      if (!hasMoreReplies.value) { break }
      await fetchReplies()
    }
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
    const newReplies = (await $client.aiContentSecurity.v2ex.getTopicReplyContents.query({
      topicId: Number(topicId.value),
      token: token.value,
      page: currentPage.value
    })).map(content => ({ content }))

    const currentPageContent = newReplies.map(reply => reply.content).join('')

    if (currentPageContent === lastPageContent.value) {
      hasMoreReplies.value = false
      return
    }

    if (newReplies.length === 0) {
      hasMoreReplies.value = false
    }
    else {
      replies.value.push(...newReplies)
      currentPage.value++
      lastPageContent.value = currentPageContent
    }
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
      content: content.content,
      temperature: 1
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
    for (let i = 0; i < unreviewed.length; i += 5) {
      const batch = unreviewed.slice(i, i + 5)
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
</script>

<template>
  <NSpace vertical size="large" class="container">
    <NH1>V2EX 主题内容审核</NH1>
    <NSpace>
      <NStatistic label="总 Token 数" :value="totalPromptTokens" />
      <NStatistic label="总 Token 金额" :value="`${(totalPromptTokens / 1000000).toFixed(6)} 元`" />
      <NStatistic v-if="isDeepseekAPI" label="总缓存 Token 数" :value="totalPromptCacheHitTokens" />
      <NStatistic v-if="isDeepseekAPI" label="总缓存 Token 金额" :value="`${(totalPromptCacheHitTokens / 10000000).toFixed(6)} 元`" />
      <NStatistic v-if="isDeepseekAPI" label="总无缓存 Token 数" :value="totalPromptCacheMissTokens" />
      <NStatistic v-if="isDeepseekAPI" label="总无缓存 Token 金额" :value="`${(totalPromptCacheMissTokens / 1000000).toFixed(6)} 元`" />
      <NButton @click="clearStats">
        清除统计
      </NButton>
    </NSpace>
    <NButton @click="router.push('/ai-content-security-v2ex/config')">
      前往设置
    </NButton>
    <NSpace>
      <NInput v-model:value="topicId" placeholder="请输入 V2EX 主题 ID" />
      <NButton type="primary" :loading="loading" @click="fetchTopic">
        获取主题内容
      </NButton>
    </NSpace>
    <NSpace v-if="topicContent.content" vertical>
      <NH3>主题内容</NH3>
      <NText style="white-space: pre-wrap;">
        {{ topicContent.content }}
      </NText>
      <NSpace>
        <NButton v-if="!topicContent.reviewing && topicContent.score === undefined" @click="reviewContent(topicContent)">
          审核主题内容
        </NButton>
        <NSpin v-if="topicContent.reviewing" size="small" />
        <NTag v-else-if="topicContent.score !== undefined" :type="getScoreType(topicContent.score)">
          {{ getScoreText(topicContent.score) }} ({{ topicContent.score }})
        </NTag>
      </NSpace>
    </NSpace>
    <NSpace v-if="replies.length" vertical>
      <NH3>评论</NH3>
      <NButton :loading="reviewingAll" @click="reviewAll">
        全部审核
      </NButton>
      <NList>
        <NListItem v-for="(reply, index) in replies" :key="index">
          <template #suffix>
            <NSpace>
              <NButton v-if="!reply.reviewing && reply.score === undefined" @click="reviewContent(reply)">
                审核
              </NButton>
              <NSpin v-if="reply.reviewing" size="small" />
              <NTag v-else-if="reply.score !== undefined" :type="getScoreType(reply.score)">
                {{ getScoreText(reply.score) }} ({{ reply.score }})
              </NTag>
            </NSpace>
          </template>
          <NText style="white-space: pre-wrap;">
            {{ reply.content }}
          </NText>
        </NListItem>
      </NList>
      <NButton v-if="hasMoreReplies" :loading="loadingMoreReplies" @click="loadMoreReplies">
        加载更多
      </NButton>
    </NSpace>
    <NCard title="当前系统提示词">
      <NText style="white-space: pre-wrap;">
        {{ systemMessage }}
      </NText>
    </NCard>
  </NSpace>
</template>

<style scoped>
.container {
  max-width: 800px;
  margin: 20px auto;
}
</style>
