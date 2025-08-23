import * as df from "durable-functions";

const fullAuditor_Orchestrator = df.orchestrator(function* (context) {
    const documents = yield context.df.callActivity("fullAuditor_GetDocuments");
    const tasks = [];
    for (const document of documents) {
        tasks.push(context.df.callActivity("fullAuditor_AuditDocument", document));
    }
    const results = yield context.df.Task.all(tasks);
    return results;
});

df.app.orchestration('fullAuditor_Orchestrator', fullAuditor_Orchestrator);
