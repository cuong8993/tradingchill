import { checkAlerts } from './alerts';
import { handleApi } from './routes';
import { error, type Env } from './types';
export default {
  async fetch(request:Request,env:Env){try{if(new URL(request.url).pathname.startsWith('/api/'))return await handleApi(request,env);return new Response('Not found',{status:404})}catch(e){return error(e instanceof Error?e.message:'Unexpected server error.',500)}},
  async scheduled(_controller:ScheduledController,env:Env,ctx:ExecutionContext){ctx.waitUntil(checkAlerts(env))},
};
