import {
  publicProcedure,
  router,
} from "../lib/trpc";
import { leadsRouter } from './leads';

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  leads: leadsRouter,
});
export type AppRouter = typeof appRouter;
