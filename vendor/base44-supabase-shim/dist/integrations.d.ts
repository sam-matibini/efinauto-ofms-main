import { SupabaseClient } from '@supabase/supabase-js';

interface IntegrationsOptions {
    /** Default storage bucket for UploadFile. Falls back to schemaPrefix from createClient. */
    defaultBucket: string;
    /**
     * Edge function name to invoke for SendEmail. If unset, calls fail loudly.
     * Implement this function in supabase/volumes/functions/send-email/.
     */
    sendEmailFunction?: string;
    /**
     * Edge function name to invoke for InvokeLLM. If unset, calls fail loudly
     * (AI features are out of scope for the air-gapped self-host stack).
     */
    invokeLlmFunction?: string;
    /**
     * Edge function name to invoke for GenerateImage. If unset, calls fail loudly.
     * Base44's default backing was DALL·E — for self-host, proxy your own image
     * endpoint through an edge function.
     */
    generateImageFunction?: string;
}
/**
 * Stub of `base44.integrations.Core.*`. Four methods are implemented:
 *
 *   UploadFile     → delegates to Supabase Storage upload + returns {url, path}.
 *   SendEmail      → invokes a configured edge function (or throws if none).
 *   InvokeLLM      → invokes a configured edge function (or throws if none).
 *   GenerateImage  → invokes a configured edge function (or throws if none).
 *
 * Air-gapped LAN cannot call OpenAI directly; wire your own LLM/image endpoint
 * (Ollama, internal API gateway, etc.) inside an edge function and pass the
 * function name via createClient({ integrations: { invokeLlmFunction: 'llm-relay',
 * generateImageFunction: 'image-relay' } }).
 */
declare function makeIntegrations(client: SupabaseClient, opts: IntegrationsOptions): {
    Core: {
        UploadFile({ file, bucket, path, contentType, }: {
            file: Blob | File | ArrayBuffer | Uint8Array;
            bucket?: string;
            path?: string;
            contentType?: string;
        }): Promise<{
            url: string;
            path: string;
        }>;
        SendEmail(payload: {
            to: string | string[];
            subject: string;
            body?: string;
            html?: string;
            from?: string;
        }): Promise<{
            ok: boolean;
        }>;
        InvokeLLM(payload: {
            prompt: string;
            model?: string;
            [key: string]: unknown;
        }): Promise<unknown>;
        GenerateImage(payload: {
            prompt: string;
            [key: string]: unknown;
        }): Promise<unknown>;
    };
};

export { type IntegrationsOptions, makeIntegrations };
