// src/integrations.ts
function makeIntegrations(client, opts) {
  const Core = {
    async UploadFile({
      file,
      bucket,
      path,
      contentType
    }) {
      const b = bucket ?? opts.defaultBucket;
      const p = path ?? `uploads/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file?.name ?? "file"}`;
      const { error } = await client.storage.from(b).upload(p, file, {
        contentType: contentType ?? file?.type,
        upsert: false
      });
      if (error) throw error;
      const { data } = client.storage.from(b).getPublicUrl(p);
      return { url: data.publicUrl, path: p };
    },
    async SendEmail(payload) {
      if (!opts.sendEmailFunction) {
        throw new Error(
          "SendEmail not configured. Set integrations.sendEmailFunction in createClient() and deploy a corresponding Supabase Edge Function (e.g. send-email)."
        );
      }
      const { error } = await client.functions.invoke(opts.sendEmailFunction, { body: payload });
      if (error) throw error;
      return { ok: true };
    },
    async InvokeLLM(payload) {
      if (!opts.invokeLlmFunction) {
        throw new Error(
          "InvokeLLM not configured. AI features are disabled in this self-host build. Set integrations.invokeLlmFunction in createClient() and deploy an edge function that proxies to your LLM endpoint (Ollama / internal gateway)."
        );
      }
      const { data, error } = await client.functions.invoke(opts.invokeLlmFunction, {
        body: payload
      });
      if (error) throw error;
      return data;
    },
    async GenerateImage(payload) {
      if (!opts.generateImageFunction) {
        throw new Error(
          "GenerateImage not configured. Image-gen features are disabled in this self-host build. Set integrations.generateImageFunction in createClient() and deploy an edge function that proxies to your image endpoint (SDXL / DALL\xB7E gateway)."
        );
      }
      const { data, error } = await client.functions.invoke(opts.generateImageFunction, {
        body: payload
      });
      if (error) throw error;
      return data;
    }
  };
  return { Core };
}

export {
  makeIntegrations
};
//# sourceMappingURL=chunk-E2KG6ZL4.js.map