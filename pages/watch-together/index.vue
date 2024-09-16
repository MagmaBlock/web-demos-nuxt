<script lang="ts" setup>
import Artplayer from 'artplayer'
import artplayerPluginLibass from 'artplayer-plugin-libass'

const videoSrc = ref('')
const subtitleSrc = ref('')
const playerRef = ref<HTMLDivElement | null>(null)
let art: Artplayer | null = null

function handleVideoFileChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) {
    videoSrc.value = URL.createObjectURL(file)
    initializePlayer()
  }
}

function handleSubtitleFileChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) {
    subtitleSrc.value = URL.createObjectURL(file)
    if (art) {
      art.subtitle.switch(subtitleSrc.value)
    }
  }
}

function initializePlayer() {
  if (playerRef.value && videoSrc.value) {
    art?.destroy()
    art = new Artplayer({
      container: playerRef.value,
      url: videoSrc.value,
      setting: true,
      loop: true,
      flip: true,
      playbackRate: true,
      aspectRatio: true,
      fullscreen: true,
      fullscreenWeb: true,
      subtitle: {
        url: subtitleSrc.value,
      },
      plugins: [
        artplayerPluginLibass({
          fallbackFont: '/watch-together/SourceHanSansCN-Bold.woff2'
        }),
      ],
    })
  }
}

onMounted(() => {
  initializePlayer()
})

useHead({
  script: [
    {
      src: 'https://fastly.jsdelivr.net/gh/VideoTogether/VideoTogether@latest/release/extension.website.user.js',
      defer: true
    }
  ]
})
</script>

<template>
  <div class="container py-8 mx-auto max-w-2xl">
    <div class="flex">
      <input
        type="file"
        accept="video/*"
        @change="handleVideoFileChange"
      >
      <input
        type="file"
        accept=".srt,.ass,.ssa"
        @change="handleSubtitleFileChange"
      >
    </div>
    <div ref="playerRef" style="width: 100%; height: 500px; max-width: 100%; margin-top: 20px;" />
  </div>
</template>

<style scoped>
</style>
