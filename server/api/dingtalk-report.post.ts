import crypto from 'node:crypto'
import { Buffer } from 'node:buffer'
import { readBody } from 'h3'
import { $fetch } from 'ofetch'

// 钉钉机器人参数
const access_token = '489275ca46f86f99547771d138bd2d6d89aa94b480803ff3a043c884f2d0bcd0'
const secret = 'SEC6adaf81009aeaf2d95c9e6c3f320a070b7523d01ad9c5ed4cc5f99cc3ef0a0a9'

/**
 * 生成签名
 */
function genSign(timestamp: string, secret: string) {
  const stringToSign = `${timestamp}\n${secret}`
  const sign = crypto.createHmac('sha256', secret)
    .update(stringToSign)
    .digest()
  const b64 = Buffer.from(sign).toString('base64')
  return encodeURIComponent(b64)
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const ip: string = body.ip ?? ''
    const ua: string = body.ua ?? ''
    if (!ip || !ua) {
      return { success: false, message: 'IP 或 UA 缺失' }
    }

    // 生成签名
    const timestamp = Date.now().toString()
    const signVal = genSign(timestamp, secret)
    // 拼接 webhook url
    const url = `https://oapi.dingtalk.com/robot/send?access_token=${access_token}&timestamp=${timestamp}&sign=${signVal}`

    // 组装消息内容
    const content = [
      `公网IP: ${ip}`,
      `UA: ${ua}`,
      `时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`
    ].join('\n')

    const reqBody = {
      msgtype: 'text',
      text: { content }
    }

    // 请求钉钉机器人
    const resp = await $fetch(url, {
      method: 'POST',
      body: reqBody,
      headers: { 'Content-Type': 'application/json' }
    })

    // 返回结果
    if (resp.errcode === 0) {
      return { success: true, data: { ip, ua, timestamp, sign: signVal, webhook: url, body: reqBody, response: resp } }
    }
    else {
      return { success: false, message: resp.errmsg, data: { ip, ua, timestamp, sign: signVal, webhook: url, body: reqBody, response: resp } }
    }
  }
  catch (e: any) {
    return { success: false, message: e?.message || String(e) }
  }
})
