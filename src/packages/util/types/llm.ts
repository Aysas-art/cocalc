import { LanguageModel } from "@cocalc/util/db-schema/openai";

export type History = {
  role: "assistant" | "user" | "system";
  content: string;
}[];

export interface ChatOutput {
  output: string;
  total_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
}

export interface ChatOptions {
  input: string; // new input that user types
  system?: string; // extra setup that we add for relevance and context
  account_id?: string;
  project_id?: string;
  path?: string;
  analytics_cookie?: string;
  history?: History;
  model?: LanguageModel; // default is gpt-3.5-turbo (i.e. $DEFAULT_MODEL)
  tag?: string;
  // If stream is set, then everything works as normal with two exceptions:
  // - The stream function is called with bits of the output as they are produced,
  //   until the output is done and then it is called with undefined.
  // - Maybe the total_tokens, which is stored in the database for analytics,
  //   might be off: https://community.openai.com/t/openai-api-get-usage-tokens-in-response-when-set-stream-true/141866
  stream?: (output?: string) => void;
  maxTokens?: number;
}
