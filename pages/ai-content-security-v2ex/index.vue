<script lang="ts" setup>
import { ref } from 'vue'
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
  <NCard class="container">
    <NSpace vertical size="large">
      <NH1>V2EX 主题内容审核</NH1>
      <NButton @click="router.push('/ai-content-security-v2ex/config')">
        前往设置
      </NButton>
      <NSpace>
        <NInput v-model:value="topicId" placeholder="请输入 V2EX 主题 ID" />
        <NButton type="primary" :loading="loading" @click="fetchTopic">
          获取主题内容
        </NButton>
      </NSpace>
      <NCard v-if="topicContent" title="主题内容" embedded>
        <NText>{{ topicContent }}</NText>
      </NCard>
      <NCard v-if="replies.length" title="评论" embedded>
        <NList>
          <NListItem v-for="(reply, index) in replies" :key="index">
            <NSpace justify="space-between" align="start">
              <NText style="white-space: pre-wrap;">
                {{ reply.content }}
              </NText>
              <NSpace>
                <NButton v-if="!reply.reviewing && reply.score === undefined" @click="reviewReply(reply, index)">
                  审核
                </NButton>
                <NSpin v-if="reply.reviewing" size="small" />
                <NTag v-else-if="reply.score !== undefined" :type="getScoreType(reply.score)">
                  {{ getScoreText(reply.score) }} ({{ reply.score }})
                </NTag>
              </NSpace>
            </NSpace>
          </NListItem>
        </NList>
      </NCard>
    </NSpace>
  </NCard>
</template>

<style scoped>
.container {
  max-width: 800px;
  margin: 20px auto;
}
</style>
