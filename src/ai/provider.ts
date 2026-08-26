import { createHash } from 'crypto';
import { z } from 'zod';

export interface AIProviderOptions {
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
}

export interface GenerateStructuredParams<T> {
  promptId: string;
  promptVersion: string;
  systemInstruction: string;
  userPrompt: string;
  schema: z.ZodType<T>;
  temperature?: number;
  maxTokens?: number;
}

export interface AIStructuredResponse<T> {
  data: T;
  rawText: string;
  provider: string;
  model: string;
  modelVersion: string;
  promptId: string;
  promptVersion: string;
  inputHash: string;
  outputHash: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  status: 'success' | 'fallback' | 'failed';
  error?: string;
}

export interface AIProvider {
  readonly name: string;
  readonly model: string;
  generateStructured<T>(params: GenerateStructuredParams<T>): Promise<AIStructuredResponse<T>>;
}

/**
 * Deterministic Fallback & Mock Provider
 * Used when external AI APIs are unconfigured, rate-limited, or testing deterministic behavior.
 */
export class DeterministicFallbackProvider implements AIProvider {
  readonly name = 'deterministic_fallback';
  readonly model = 'revive-rule-synthesizer-v1';

  async generateStructured<T>(params: GenerateStructuredParams<T>): Promise<AIStructuredResponse<T>> {
    const startTime = performance.now();
    const inputStr = `${params.systemInstruction}\n${params.userPrompt}`;
    const inputHash = createHash('sha256').update(inputStr).digest('hex');

    // Parse userPrompt to extract structured inputs
    let parsedInput: Record<string, unknown> = {};
    try {
      parsedInput = JSON.parse(params.userPrompt);
    } catch {
      parsedInput = { raw: params.userPrompt };
    }

    const latencyMs = Math.round(performance.now() - startTime);

    // If a custom fallback generator was provided in parsedInput, use it; otherwise fallback synthesis
    let mockResult: unknown;
    if (parsedInput.mockResult) {
      mockResult = parsedInput.mockResult;
    } else {
      mockResult = this.synthesizeFallback(parsedInput);
    }

    const validated = params.schema.parse(mockResult);
    const outputStr = JSON.stringify(validated);
    const outputHash = createHash('sha256').update(outputStr).digest('hex');

    return {
      data: validated,
      rawText: outputStr,
      provider: this.name,
      model: this.model,
      modelVersion: '1.0.0',
      promptId: params.promptId,
      promptVersion: params.promptVersion,
      inputHash,
      outputHash,
      promptTokens: Math.ceil(inputStr.length / 4),
      completionTokens: Math.ceil(outputStr.length / 4),
      latencyMs: Math.max(1, latencyMs),
      status: 'fallback',
    };
  }

  private synthesizeFallback(input: Record<string, unknown>): Record<string, unknown> {
    const hypotheses = (input.hypotheses as Array<{ hypothesis: string; finalScore: number; supportingEvidenceIds: string[] }>) || [];
    const topHypothesis = hypotheses.length > 0
      ? [...hypotheses].sort((a, b) => b.finalScore - a.finalScore)[0]
      : { hypothesis: 'UNKNOWN', finalScore: 0.5, supportingEvidenceIds: [] };

    return {
      primaryDiagnosis: topHypothesis.hypothesis,
      confidence: topHypothesis.finalScore,
      severity: (input.severity as string) || 'medium',
      supportingEvidenceIds: topHypothesis.supportingEvidenceIds || [],
      contradictingEvidenceIds: (input.contradictions as string[]) || [],
      missingEvidence: (input.missingEvidence as string[]) || [],
      rootCauseExplanation: `Deterministic diagnosis identified ${topHypothesis.hypothesis} based on statistical evidence scores.`,
      uncertaintyNotes: hypotheses.length > 1 ? 'Alternative hypotheses exhibited lower evidence scores.' : 'No major conflicting signals detected.',
      recommendations: [
        {
          action: 'ALTERNATIVE_PAYMENT_METHOD',
          reason: `High failure concentration in ${topHypothesis.hypothesis}.`,
          expectedBenefit: 'Estimated 65-80% recovery yield across rerouted transactions.',
          confidence: 0.88,
          risk: 'LOW',
          customerFriction: 'LOW',
          stoppingCondition: 'Halt rerouting once upstream baseline normalizes.',
        },
      ],
    };
  }
}

/**
 * Google Gemini Provider using REST endpoint with native JSON Schema support
 */
export class GeminiProvider implements AIProvider {
  readonly name = 'google_gemini';
  readonly model: string;
  private apiKey: string;
  private timeoutMs: number;

  constructor(options: AIProviderOptions = {}) {
    this.apiKey = options.apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || '';
    this.model = options.model || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    this.timeoutMs = options.timeoutMs || 10_000;
  }

  async generateStructured<T>(params: GenerateStructuredParams<T>): Promise<AIStructuredResponse<T>> {
    if (!this.apiKey) {
      // Gracefully fall back to deterministic provider if no key configured
      const fallback = new DeterministicFallbackProvider();
      return fallback.generateStructured(params);
    }

    const startTime = performance.now();
    const inputStr = `${params.systemInstruction}\n${params.userPrompt}`;
    const inputHash = createHash('sha256').update(inputStr).digest('hex');

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [{ text: `${params.systemInstruction}\n\nINPUT DATA:\n${params.userPrompt}` }],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: params.temperature ?? 0.1,
        maxOutputTokens: params.maxTokens ?? 2048,
      },
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        throw new Error(`Gemini API error (${response.status}): ${await response.text()}`);
      }

      const jsonResponse = await response.json();
      const rawText = jsonResponse.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error('Gemini response returned empty candidates');
      }

      const parsedData = JSON.parse(rawText);
      const validated = params.schema.parse(parsedData);
      const outputHash = createHash('sha256').update(rawText).digest('hex');
      const latencyMs = Math.round(performance.now() - startTime);

      return {
        data: validated,
        rawText,
        provider: this.name,
        model: this.model,
        modelVersion: '2.5',
        promptId: params.promptId,
        promptVersion: params.promptVersion,
        inputHash,
        outputHash,
        promptTokens: jsonResponse.usageMetadata?.promptTokenCount || Math.ceil(inputStr.length / 4),
        completionTokens: jsonResponse.usageMetadata?.candidatesTokenCount || Math.ceil(rawText.length / 4),
        latencyMs,
        status: 'success',
      };
    } catch (err: unknown) {
      clearTimeout(timer);
      const latencyMs = Math.round(performance.now() - startTime);
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.warn(`[GEMINI_PROVIDER_FALLBACK] ${errorMsg}. Using deterministic fallback.`);

      // Execute fallback gracefully
      const fallback = new DeterministicFallbackProvider();
      const fallbackResult = await fallback.generateStructured(params);
      return {
        ...fallbackResult,
        latencyMs,
        error: errorMsg,
      };
    }
  }
}

/**
 * Provider Factory
 */
export function getAIProvider(): AIProvider {
  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY) {
    return new GeminiProvider();
  }
  return new DeterministicFallbackProvider();
}
