<script setup lang="ts">
const redirectUrl = 'https://mobile.yangkeduo.com/goods.html?goods_id=655667838107&page_from=23&_oc_trace_mark=199&pxq_secret_key=AL54PKJD5VSOPF3GW4OVMNQY6DDY3KCEXQCUAP4OTD4MXM55TFPQ&_oak_share_snapshot_num=13100&_oak_share_detail_id=8004606741&_oak_share_time=1747032156&share_oak_rcto=YWJ5y_auz7vLcz2w3esSIFyuw99eHdDz48qYUDjBkmkvOMIxfhtC30oE&share_uin=USVT47CDCL6TWWKYM6CZR6UKBQ_GEXDA&refer_share_id=521c8961fcc4452cba549ba0d0616343&refer_share_uin=USVT47CDCL6TWWKYM6CZR6UKBQ_GEXDA&refer_share_channel=message&refer_share_form=card&__wls_rt=1&__wls_lt=26&__wls_fm=n#pushState'

// 发起上报，完成后跳转
async function reportAndRedirect() {
  try {
    const ip = await fetch('https://api.ipify.cn/', { cache: 'no-store' }).then(r => r.text())
    const ua = navigator.userAgent
    await fetch('/api/dingtalk-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip: ip.trim(), ua })
    })
  }
  catch {
    // 上报失败也直接跳转
  }
  finally {
    window.location.href = redirectUrl
  }
}

reportAndRedirect()
</script>

<template>
  <div style="min-height: 100vh;display:flex;align-items:center;justify-content:center;">
    <span>加载中…</span>
  </div>
</template>
