<script lang="ts" setup>
import type { FormInst, FormRules } from 'naive-ui'
import { computed, ref } from 'vue'

const calculatorForm = ref({
  calculationType: 'volume', // 'volume' | 'coordinates'
  volume: null as number | null,
  coordinates: {
    x1: null as number | null,
    y1: null as number | null,
    z1: null as number | null,
    x2: null as number | null,
    y2: null as number | null,
    z2: null as number | null,
  },
  serviceType: 'relocate', // 'remove' | 'relocate'
})

const formRef = ref<FormInst | null>(null)

const rules: FormRules = {
  'volume': [
    { required: true, message: '请输入建筑体积', trigger: 'blur', type: 'number' },
    { type: 'number', min: 1, message: '体积必须大于0', trigger: 'blur' },
  ],
  'coordinates.x1': [{ required: true, message: '请输入X1坐标', trigger: 'blur', type: 'number' }],
  'coordinates.y1': [{ required: true, message: '请输入Y1坐标', trigger: 'blur', type: 'number' }],
  'coordinates.z1': [{ required: true, message: '请输入Z1坐标', trigger: 'blur', type: 'number' }],
  'coordinates.x2': [{ required: true, message: '请输入X2坐标', trigger: 'blur', type: 'number' }],
  'coordinates.y2': [{ required: true, message: '请输入Y2坐标', trigger: 'blur', type: 'number' }],
  'coordinates.z2': [{ required: true, message: '请输入Z2坐标', trigger: 'blur', type: 'number' }],
}

const calculatedVolume = computed(() => {
  if (calculatorForm.value.calculationType === 'volume') { return calculatorForm.value.volume || 0 }

  const { x1, y1, z1, x2, y2, z2 } = calculatorForm.value.coordinates
  if (x1 === null || y1 === null || z1 === null || x2 === null || y2 === null || z2 === null) { return 0 }

  // 计算每个维度的长度，使用 Math.min 和 Math.max 来处理坐标的顺序
  const length = Math.abs(Math.max(x1, x2) - Math.min(x1, x2)) + 1
  const height = Math.abs(Math.max(y1, y2) - Math.min(y1, y2)) + 1
  const width = Math.abs(Math.max(z1, z2) - Math.min(z1, z2)) + 1

  return length * height * width
})

const priceBreakdown = computed(() => {
  const volume = calculatedVolume.value
  const isRemove = calculatorForm.value.serviceType === 'remove'
  const baseRate = isRemove ? 1000 : 500
  const largeRate = isRemove ? 10000 : 5000

  if (volume <= 20000) {
    return {
      base: {
        volume,
        rate: baseRate,
        cost: volume / baseRate
      },
      additional: null
    }
  }
  else {
    const baseCost = 20000 / baseRate
    const additionalVolume = volume - 20000
    const additionalCost = additionalVolume / largeRate
    return {
      base: {
        volume: 20000,
        rate: baseRate,
        cost: baseCost
      },
      additional: {
        volume: additionalVolume,
        rate: largeRate,
        cost: additionalCost
      }
    }
  }
})

const totalCost = computed(() => {
  const { base, additional } = priceBreakdown.value
  return Number((base.cost + (additional?.cost || 0)).toFixed(2))
})
</script>

<template>
  <div class="max-w-2xl mx-auto py-8">
    <NCard title="RIA 搬迁费用计算器">
      <NFlex vertical>
        <NAlert v-if="calculatorForm.calculationType === 'coordinates'" :show-icon="false">
          提示：实际搬迁业务可能并不是简单地计算总区域的体积，而是排去了空气方块的最终格数。<br>
          使用 <NText code>
            //size
          </NText> 命令可以统计选区的非空气方块格数。
        </NAlert>

        <NForm ref="formRef" :model="calculatorForm" :rules="rules" label-placement="top" label-width="100">
          <!-- 计算方式选择 -->
          <NFormItem label="计算方式">
            <NRadioGroup v-model:value="calculatorForm.calculationType">
              <NRadioButton value="volume">
                直接输入体积
              </NRadioButton>
              <NRadioButton value="coordinates">
                输入坐标计算
              </NRadioButton>
            </NRadioGroup>
          </NFormItem>

          <!-- 体积输入 -->
          <template v-if="calculatorForm.calculationType === 'volume'">
            <NFormItem label="建筑体积" path="volume">
              <NInputNumber
                v-model:value="calculatorForm.volume"
                :min="1"
                placeholder="请输入建筑体积（格）"
                class="w-full"
              />
            </NFormItem>
          </template>

          <!-- 坐标输入 -->
          <template v-else>
            <NGrid :cols="3" :x-gap="32">
              <NGridItem>
                <NFormItem label="X1" path="coordinates.x1">
                  <NInputNumber v-model:value="calculatorForm.coordinates.x1" placeholder="X1" />
                </NFormItem>
              </NGridItem>
              <NGridItem>
                <NFormItem label="Y1" path="coordinates.y1">
                  <NInputNumber v-model:value="calculatorForm.coordinates.y1" placeholder="Y1" />
                </NFormItem>
              </NGridItem>
              <NGridItem>
                <NFormItem label="Z1" path="coordinates.z1">
                  <NInputNumber v-model:value="calculatorForm.coordinates.z1" placeholder="Z1" />
                </NFormItem>
              </NGridItem>
              <NGridItem>
                <NFormItem label="X2" path="coordinates.x2">
                  <NInputNumber v-model:value="calculatorForm.coordinates.x2" placeholder="X2" />
                </NFormItem>
              </NGridItem>
              <NGridItem>
                <NFormItem label="Y2" path="coordinates.y2">
                  <NInputNumber v-model:value="calculatorForm.coordinates.y2" placeholder="Y2" />
                </NFormItem>
              </NGridItem>
              <NGridItem>
                <NFormItem label="Z2" path="coordinates.z2">
                  <NInputNumber v-model:value="calculatorForm.coordinates.z2" placeholder="Z2" />
                </NFormItem>
              </NGridItem>
            </NGrid>
          </template>

          <!-- 服务类型选择 -->
          <NFormItem label="服务类型">
            <NRadioGroup v-model:value="calculatorForm.serviceType">
              <NRadioButton value="relocate">
                搬迁
              </NRadioButton>
              <NRadioButton value="remove">
                拆除
              </NRadioButton>
            </NRadioGroup>
          </NFormItem>
        </NForm>

        <NDivider />

        <!-- 计算结果展示 -->
        <NFlex vertical>
          <NStatistic label="建筑体积">
            <NNumberAnimation
              :from="0"
              :to="calculatedVolume"
              :duration="300"
              show-separator
            />
            格
          </NStatistic>
          <!-- 总费用 -->
          <NStatistic label="总费用" tabular-nums>
            <NNumberAnimation
              :from="0"
              :to="totalCost"
              :duration="300"
              :precision="2"
              show-separator
            />
            <template #suffix>
              零币 / 钻石
            </template>
          </NStatistic>

          <NDivider />

          <NCard title="费用计算明细">
            <!-- 基础费用计算 -->
            <NDescriptions :column="1" label-placement="left">
              <NDescriptionsItem :label="`基础费用 (${priceBreakdown.base.volume}格)`">
                <NText>{{ priceBreakdown.base.volume }} 格 ÷ {{ priceBreakdown.base.rate }} = </NText>
                <NText type="primary">
                  {{ priceBreakdown.base.cost.toFixed(2) }} 〇
                </NText>
              </NDescriptionsItem>

              <!-- 额外费用计算（如果有） -->
              <template v-if="priceBreakdown.additional">
                <NDescriptionsItem :label="`超出费用 (${priceBreakdown.additional.volume}格)`">
                  <NText>{{ priceBreakdown.additional.volume }} 格 ÷ {{ priceBreakdown.additional.rate }} = </NText>
                  <NText type="primary">
                    {{ priceBreakdown.additional.cost.toFixed(2) }} 〇
                  </NText>
                </NDescriptionsItem>
              </template>
            </NDescriptions>
          </NCard>
        </NFlex>
      </NFlex>
    </NCard>
  </div>
</template>

<style scoped>
:deep(.n-input-number) {
  width: 100%;
}
</style>
