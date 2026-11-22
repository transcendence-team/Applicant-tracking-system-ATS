import { z } from 'zod';
import { ApiError } from './errors.js';

const parsedResume = z.object({
  rawText: z.string().min(1).max(1000000),
  parserVersion: z.string().max(100).optional(),
});

export function createParser({ url, timeoutMs = 60000, fetchImpl = fetch }) {
  const endpoint = new URL(url);
  if (!['http:', 'https:'].includes(endpoint.protocol)) throw new Error('Invalid AI_PARSE_URL.');
  return async (file, authorization) => {
    const form = new FormData();
    form.append('file', new Blob([file.buffer], { type: 'application/pdf' }), 'resume.pdf');
    try {
      const response = await fetchImpl(endpoint, {
        method: 'POST', body: form, redirect: 'error',
        headers: { Authorization: authorization },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) throw new ApiError(502, 'AI_WORKER_ERROR', 'The resume parser rejected the request.');
      // Bound the response before parsing, including chunked responses.
      let size = 0;
      const chunks = [];
      for await (const chunk of response.body) {
        size += chunk.length;
        if (size > 2 * 1024 * 1024) throw new ApiError(502, 'AI_RESPONSE_INVALID', 'Parser response is too large.');
        chunks.push(Buffer.from(chunk));
      }
      const result = parsedResume.safeParse(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      if (!result.success) throw new ApiError(502, 'AI_RESPONSE_INVALID', 'Parser returned an invalid response.');
      return result.data;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        throw new ApiError(504, 'AI_WORKER_TIMEOUT', 'The resume parser timed out.');
      }
      if (error instanceof SyntaxError) throw new ApiError(502, 'AI_RESPONSE_INVALID', 'Parser returned invalid JSON.');
      throw new ApiError(502, 'AI_WORKER_UNAVAILABLE', 'The resume parser is unavailable.');
    }
  };
}
