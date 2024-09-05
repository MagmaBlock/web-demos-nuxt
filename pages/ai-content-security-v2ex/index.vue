<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useLocalStorage } from '@vueuse/core'
import { useMessage } from 'naive-ui'

const { $client } = useNuxtApp()

const router = useRouter()
const message = useMessage()

const topicId = ref('')
const topicContent = ref('')
const replies = ref<Array<{ content: string, reviewing?: boolean, score?: number }>>([])
const loading = ref(false)

const baseURL = useLocalStorage('ai-content-security-v2ex-baseURL', '')
const apiKey = useLocalStorage('ai-content-security-v2ex-apiKey', '')
const modelId = useLocalStorage('ai-content-security-v2ex-modelId', '')
const token = useLocalStorage('ai-content-security-v2ex-token', '')

async function fetchTopic(): Promise<void> {
  if (!token.value) {
    message.error('请先前往设置页面配置 V2EX Token')
    return
  }

  loading.value = true
  try {
    topicContent.value = await $client.aiContentSecurity.v2ex.getTopicContent.query({
      topicId: Number(topicId.value),
      token: token.value
    })
    replies.value = (await $client.aiContentSecurity.v2ex.getTopicReplyContents.query({
      topicId: Number(topicId.value),
      token: token.value
    })).map(content => ({ content }))
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

async function reviewReply(reply: { content: string, reviewing?: boolean, score?: number }, index: number): Promise<void> {
  if (!baseURL.value || !apiKey.value || !modelId.value) {
    message.error('请先前往设置页面配置 OpenAI API')
    return
  }

  replies.value[index].reviewing = true
  try {
    const score = await $client.aiContentSecurity.openai.aiContentReview.mutate({
      baseURL: baseURL.value,
      apiKey: apiKey.value,
      modelId: modelId.value,
      content: reply.content
    })
    replies.value[index].score = score
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
    replies.value[index].reviewing = false
  }
}

function observeReplies(): void {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const target = entry.target as HTMLElement
        const index = Number(target.dataset.index)
        if (!Number.isNaN(index) && !replies.value[index].score && !replies.value[index].reviewing) {
          reviewReply(replies.value[index], index)
        }
      }
    })
  }, { threshold: 0.5 })

  document.querySelectorAll('.reply-item').forEach(el => observer.observe(el))
}

onMounted(() => {
  if (!token.value) {
    message.warning('请先前往设置页面配置 V2EX Token')
  }
  observeReplies()
})
</script>

<template>
  <NFlex vertical class="container mx-auto my-8" :wrap="false">
    <h1 class="text-2xl font-bold">
      V2EX 主题内容审核
    </h1>
    <NButton @click="router.push('/ai-content-security-v2ex/config')">
      前往设置
    </NButton>
    <NFlex align="center" :wrap="false">
      <NInput v-model:value="topicId" placeholder="请输入 V2EX 主题 ID" />
      <NButton type="primary" :loading="loading" @click="fetchTopic">
        获取主题内容
      </NButton>
    </NFlex>
    <div v-if="topicContent" class="bg-gray-100 rounded">
      <h2 class="text-xl font-bold">
        主题内容：
      </h2>
      <p>{{ topicContent }}</p>
    </div>
    <div v-if="replies.length">
      <h2 class="text-xl font-bold">
        评论：
      </h2>
      <NFlex vertical :wrap="false">
        <div v-for="(reply, index) in replies" :key="index" class="reply-item bg-gray-100 rounded" :data-index="index">
          <NFlex justify="space-between" align="start" :wrap="false">
            <p>{{ reply.content }}</p>
            <div>
              <NSpin v-if="reply.reviewing" size="small" />
              <NTag v-else-if="reply.score !== undefined" :type="reply.score >= 75 ? 'error' : reply.score >= 50 ? 'warning' : 'success'">
                {{ reply.score >= 75 ? '封禁' : reply.score >= 50 ? '风险' : '正常' }} ({{ reply.score }})
              </NTag>
            </div>
          </NFlex>
        </div>
      </NFlex>
    </div>
  </NFlex>
</template>

<style scoped>
.container {
  max-width: 800px;
}
</style>
