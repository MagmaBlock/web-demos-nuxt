<script setup lang="ts">
import { ref } from 'vue'
import { NButton, NCard, NForm, NFormItem, NInput, NList, NListItem } from 'naive-ui'

interface ApiConfig {
  name: string
  host: string
  key: string
  model: string
}

const newApiConfig = ref<ApiConfig>({
  name: '',
  host: 'https://api.openai.com',
  key: '',
  model: 'gpt-3.5-turbo',
})

const apiConfigs = ref<ApiConfig[]>([])

function addApiConfig() {
  if (newApiConfig.value.name && newApiConfig.value.host && newApiConfig.value.key && newApiConfig.value.model) {
    apiConfigs.value.push({ ...newApiConfig.value })
    newApiConfig.value = {
      name: '',
      host: 'https://api.openai.com',
      key: '',
      model: 'gpt-3.5-turbo',
    }
  }
}

function removeApiConfig(index: number) {
  apiConfigs.value.splice(index, 1)
}

const prompt = ref('写一首关于宇宙的诗')
const testing = ref(false)
const testResults = ref<any[]>([])

async function startTest() {
  testing.value = true
  testResults.value = []

  const promises = apiConfigs.value.map(async (config, index) => {
    const startTime = Date.now()
    let firstTokenTime = 0
    let tokenCount = 0
    let content = ''

    testResults.value[index] = {
      name: config.name,
      model: config.model,
      status: 'loading',
      content: '',
      speed: 0,
      firstTokenTime: 0,
    }

    try {
      const response = await fetch(`${config.host}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.key}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: [{ role: 'user', content: prompt.value }],
          stream: true,
        }),
      })

      if (!response.body) {
        throw new Error('No response body')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) { break }

        if (firstTokenTime === 0) {
          firstTokenTime = Date.now() - startTime
          testResults.value[index].firstTokenTime = firstTokenTime
        }

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.substring(6)
            if (data === '[DONE]') {
              break
            }
            try {
              const json = JSON.parse(data)
              const delta = json.choices[0].delta.content
              if (delta) {
                tokenCount += 1 // A simple approximation
                content += delta
                testResults.value[index].content = content
              }
            }
            catch (e) {
              console.error('Error parsing stream data:', e)
            }
          }
        }
        const duration = (Date.now() - startTime) / 1000
        if (duration > 0) {
          testResults.value[index].speed = tokenCount / duration
        }
      }
    }
    catch (error: any) {
      testResults.value[index].status = 'error'
      testResults.value[index].content = error.message
    }
    finally {
      if (testResults.value[index].status !== 'error') {
        testResults.value[index].status = 'finished'
      }
    }
  })

  await Promise.all(promises)
  testing.value = false
}
</script>

<template>
  <div class="p-4">
    <NCard title="LLM API Speed Test">
      <NCard title="添加 API 配置">
        <NForm @submit.prevent="addApiConfig">
          <NFormItem label="名称">
            <NInput v-model:value="newApiConfig.name" placeholder="例如：My OpenAI API" />
          </NFormItem>
          <NFormItem label="API Host">
            <NInput v-model:value="newApiConfig.host" placeholder="例如：https://api.openai.com" />
          </NFormItem>
          <NFormItem label="API Key">
            <NInput v-model:value="newApiConfig.key" type="password" placeholder="请输入你的 API Key" />
          </NFormItem>
          <NFormItem label="模型名">
            <NInput v-model:value="newApiConfig.model" placeholder="例如：gpt-3.5-turbo" />
          </NFormItem>
          <NButton type="primary" attr-type="submit">
            添加
          </NButton>
        </NForm>
      </NCard>

      <NCard title="已添加的 API" class="mt-4">
        <NList>
          <NListItem v-for="(config, index) in apiConfigs" :key="index">
            <template #prefix>
              <NButton type="error" size="small" @click="removeApiConfig(index)">
                删除
              </NButton>
            </template>
            <div class="flex items-center space-x-4">
              <span><strong>名称:</strong> {{ config.name }}</span>
              <span><strong>Host:</strong> {{ config.host }}</span>
              <span><strong>模型:</strong> {{ config.model }}</span>
            </div>
          </NListItem>
        </NList>
      </NCard>

      <NCard title="开始测速" class="mt-4">
        <NFormItem label="输入你的问题">
          <NInput v-model:value="prompt" type="textarea" placeholder="输入一个问题来测试所有 API" />
        </NFormItem>
        <NButton type="primary" :loading="testing" @click="startTest">
          开始测试
        </NButton>
      </NCard>

      <NCard title="测试结果" class="mt-4">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <NCard v-for="(result, index) in testResults" :key="index" :title="result.name">
            <p><strong>模型:</strong> {{ result.model }}</p>
            <p><strong>状态:</strong> {{ result.status }}</p>
            <p v-if="result.firstTokenTime">
              <strong>首个 Token 延迟:</strong> {{ result.firstTokenTime }} ms
            </p>
            <p v-if="result.speed">
              <strong>速度:</strong> {{ result.speed.toFixed(2) }} tokens/s
            </p>
            <p class="mt-2 p-2 bg-gray-100 rounded whitespace-pre-wrap">
              {{ result.content }}
            </p>
          </NCard>
        </div>
      </NCard>
    </NCard>
  </div>
</template>
