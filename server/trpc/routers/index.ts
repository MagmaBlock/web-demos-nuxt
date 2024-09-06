import { z } from 'zod'
import { publicProcedure, router } from '../trpc'
import { aiContentSecurityRouter } from './ai-content-security'

export const appRouter = router({
  hello: publicProcedure
    .input(
      z.object({
        text: z.string().nullish()
      })
    )
    .query(({ input }) => {
      return {
        greeting: `hello ${input?.text ?? 'world'}`,
        time: new Date()
      }
    }),
  aiContentSecurity: aiContentSecurityRouter
})

// export type definition of API
export type AppRouter = typeof appRouter
