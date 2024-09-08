<script lang="ts" setup>
import { useLocalStorage } from '@vueuse/core'
import { useMessage } from 'naive-ui'

const message = useMessage()

const baseURL = useLocalStorage('ai-content-security-riabbs-baseURL', '')
const apiKey = useLocalStorage('ai-content-security-riabbs-apiKey', '')
const modelId = useLocalStorage('ai-content-security-riabbs-modelId', '')
const temperature = useLocalStorage('ai-content-security-riabbs-temperature', 0.7)
const riabbsToken = useLocalStorage('ai-content-security-riabbs-token', '')

function handleSubmit() {
  try {
    message.success('设置保存成功')
  }
  catch (error) {
    message.error(`保存设置失败：${(error as Error).message}`)
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto mt-5">
    <div class="my-8 text-zinc-700">
      本界面的所有配置都只在浏览器端存储，不会上传到服务器。
    </div>
    <NForm label-placement="left" label-width="auto" require-mark-placement="right-hanging" size="medium">
      <NFormItem label="OpenAI API baseURL" path="baseURL">
        <NInput v-model:value="baseURL" placeholder="请输入API基础URL" type="text" autocomplete="off" />
      </NFormItem>
      <NFormItem label="OpenAI API Key" path="apiKey">
        <NInput v-model:value="apiKey" placeholder="请输入API密钥" type="text" autocomplete="off" />
      </NFormItem>
      <NFormItem label="OpenAI API Model" path="modelId">
        <NInput v-model:value="modelId" placeholder="请输入语言模型ID" type="text" autocomplete="off" />
      </NFormItem>
      <NFormItem label="Temperature" path="temperature">
        <NInputNumber v-model:value="temperature" :min="0" :max="2" :step="0.1" placeholder="请输入 temperature 值" />
      </NFormItem>
      <NFormItem label="RIABBS Token（可选）" path="riabbsToken">
        <NInput v-model:value="riabbsToken" placeholder="请输入RIABBS Token" type="password" autocomplete="off" />
      </NFormItem>
      <NFlex justify="right">
        <NButton type="primary" @click="handleSubmit">
          保存设置
        </NButton>
        <NButton @click="$router.push('/ai-content-security-riabbs')">
          返回
        </NButton>
      </NFlex>
    </NForm>
    <NAlert title="推荐使用 DeepSeek，因为我炼的时候就是" type="info" class="mt-4">
      <NP>baseURL: https://api.deepseek.com</NP>
      <NP>model: deepseek-chat</NP>
      <NP>
        apikey:
        <NButton tag="a" href="https://platform.deepseek.com/api_keys" target="_blank" secondary size="small">
          点我
        </NButton>
      </NP>
      <NP>temperature: 推荐 0.7</NP>
    </NAlert>
  </div>
</template>
