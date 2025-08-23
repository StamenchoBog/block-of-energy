import { app, HttpRequest, HttpResponse, http } from "@azure/functions";
import * as df from 'durable-functions';

app.http('fullAuditor_HttpStart', {
    methods: ['POST', 'GET'],
    authLevel: 'function',
    extraInputs: [df.input.durableClient()],
    handler: async (request: HttpRequest, context: InvocationContext, client: df.DurableClient): Promise<HttpResponse> => {
        const instanceId = await client.startNew('fullAuditor_Orchestrator', undefined);
        context.log(`Started orchestration with ID = '${instanceId}'.`);
        return client.createCheckStatusResponse(request, instanceId);
    },
});
