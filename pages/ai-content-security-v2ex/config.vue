<script lang="ts" setup>
import { useLocalStorage } from '@vueuse/core'
import { useMessage } from 'naive-ui'

const message = useMessage()

const baseURL = useLocalStorage('ai-content-security-v2ex-baseURL', '')
const apiKey = useLocalStorage('ai-content-security-v2ex-apiKey', '')
const modelId = useLocalStorage('ai-content-security-v2ex-modelId', '')
const token = useLocalStorage('ai-content-security-v2ex-token', '')

function handleSubmit() {
  try {
    if (!token.value) {
      throw new Error('token 不能为空')
    }
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
      <NFormItem label="V2EX Token" path="token">
        <NInput v-model:value="token" placeholder="请输入V2EX Token" type="text" autocomplete="off" />
      </NFormItem>
      <NFlex justify="right">
        <NButton type="primary" @click="handleSubmit">
          保存设置
        </NButton>
        <NButton @click="$router.push('/ai-content-security-v2ex')">
          返回
        </NButton>
      </NFlex>
    </NForm>
    <NAlert title="V2EX Token 获取" type="info" class="mt-4">
      <NP>
        有了 Token 才能调用 V2EX 的 API。
      </NP>
      <NP>
        获取 Token：
        <NButton tag="a" href="https://v2ex.com/help/personal-access-token" target="_blank" secondary size="small">
          点我
        </NButton>
      </NP>
    </NAlert>
    <NAlert title="推荐使用 DeepSeek，因为我炼的时候就是" type="info" class="mt-4">
      <NP>baseURL: https://api.deepseek.com</NP>
      <NP>model: deepseek-chat</NP>
      <NP>
        apikey:
        <NButton tag="a" href="https://platform.deepseek.com/api_keys" target="_blank" secondary size="small">
          点我
        </NButton>
      </NP>
    </NAlert>
  </div>
</template>
