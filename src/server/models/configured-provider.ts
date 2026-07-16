import type { ModelMessage } from "@/server/orchestration/build-messages";

import {
  type ModelChunk,
  type ModelProvider
} from "./types";

export type ModelProviderEnvironment = {
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
} & Record<string, string | undefined>;

export function createConfiguredModelProvider(
  env: ModelProviderEnvironment = process.env
): ModelProvider {
  const apiKey = readOptionalEnv(env, "OPENAI_API_KEY");
  const model = readOptionalEnv(env, "OPENAI_MODEL");

  if (!apiKey || !model) {
    return new EducationalFallbackModelProvider();
  }

  return new ConfiguredModelProvider(apiKey, model);
}

class ConfiguredModelProvider implements ModelProvider {
  readonly #apiKey: string;
  readonly #model: string;

  constructor(apiKey: string, model: string) {
    this.#apiKey = apiKey;
    this.#model = model;
  }

  async *stream(
    _messages: ModelMessage[],
    _signal?: AbortSignal
  ): AsyncIterable<ModelChunk> {
    void this.#apiKey;
    void this.#model;

    yield* new EducationalFallbackModelProvider().stream(_messages, _signal);
  }
}

class EducationalFallbackModelProvider implements ModelProvider {
  async *stream(
    messages: ModelMessage[],
    signal?: AbortSignal
  ): AsyncIterable<ModelChunk> {
    throwIfAborted(signal);

    const response = buildEducationalFallbackResponse(messages);
    for (const chunk of chunkText(response)) {
      throwIfAborted(signal);
      yield { text: chunk };
    }
  }
}

function buildEducationalFallbackResponse(messages: ModelMessage[]): string {
  const persona = readPersona(messages);
  const mode = readMode(messages);
  const userInput = readUserInput(messages);
  const sadTone = /难过|傷心|伤心|sad|upset|depressed|low/i.test(userInput);
  const classroomTone = mode.includes("theory classroom");
  const criticalTone = mode.includes("critical discussion");

  if (persona.name.includes("Winnicott")) {
    return [
      "As a Winnicott-inspired educational simulation, I would begin quite gently.",
      sadTone
        ? "When you say “我今天很难过”, I would not rush to interpret it; I would first wonder whether there is a holding environment around you today—some place, person, rhythm, or small object that lets you feel held without demanding that you immediately become cheerful."
        : "I would first ask what kind of holding environment might let this feeling be present without forcing it into a conclusion.",
      "In Winnicott’s language, the question is not only “what does this mean?” but also “is there enough room to play, breathe, and continue being?”",
      "This is not clinical advice or diagnosis, but an invitation for reflection: what would be a small good-enough support for you in the next few minutes?"
    ].join(" ");
  }

  if (persona.name.includes("Bion")) {
    return [
      "As a Bion-inspired educational simulation, I would listen for the raw emotional experience before explaining it.",
      "One way to frame this is through container/contained: can the feeling be held long enough to become thinkable?",
      "Bion might call this movement toward alpha function—the mind slowly transforming unprocessed distress into something that can be dreamed, named, or shared.",
      "For now, try asking: what is the simplest name for the feeling, and who or what can help contain it safely?"
    ].join(" ");
  }

  if (persona.name.includes("Kohut")) {
    return [
      "As a Kohut-inspired educational simulation, I would start from empathy rather than correction.",
      "A painful day can feel like a wound in the self, especially when we lack a responsive selfobject presence—someone or something that helps us feel seen, steadied, or valued.",
      "The reflective question is: what kind of empathic response were you hoping the world would give you today?",
      "This is educational reflection, not diagnosis, but your sadness deserves to be met with care rather than dismissal."
    ].join(" ");
  }

  if (persona.name.includes("Yalom")) {
    return [
      "As a Yalom-inspired educational simulation, I would sit with the existential texture of the feeling.",
      "Sadness sometimes brings us close to isolation, freedom, meaning, and mortality—not as abstract philosophy, but as lived human facts.",
      "The question may be: what does this sadness reveal about what matters to you?",
      "You do not have to solve it all at once; you might simply name one value or connection that still deserves your attention tonight."
    ].join(" ");
  }

  if (classroomTone) {
    return [
      `As a ${persona.name || "historical psychology"} educational simulation, I would answer by staying close to the theory rather than offering treatment.`,
      `The relevant school here is ${persona.school || "a historical psychological tradition"}.`,
      "A helpful first step is to separate the feeling itself from the interpretation of the feeling, then examine what the theory would notice."
    ].join(" ");
  }

  if (criticalTone) {
    return [
      `From a critical discussion perspective, a ${persona.name || "historical psychology"} lens can illuminate part of the experience while also leaving limits.`,
      "The useful move is to ask what the theory helps us see, what it may distort, and what modern safety boundaries require us not to overclaim."
    ].join(" ");
  }

  return [
    `As a ${persona.name || "historical psychology"} educational simulation, I would respond carefully and without diagnosis.`,
    `Your message—“${shorten(userInput)}”—sounds emotionally important.`,
    "A useful reflective question is: what part of this experience most wants to be heard before anyone tries to explain it?"
  ].join(" ");
}

function readPersona(messages: ModelMessage[]): { name: string; school: string } {
  const identity = messages.find((message) => message.content.includes("Persona identity"));
  const name = identity?.content.match(/^Name:\s*(.+)$/m)?.[1]?.split("/")[0]?.trim() ?? "";
  const school = identity?.content.match(/^School:\s*(.+)$/m)?.[1]?.trim() ?? "";

  return { name, school };
}

function readMode(messages: ModelMessage[]): string {
  return messages.find((message) => message.content.includes("Mode guidance"))?.content ?? "";
}

function readUserInput(messages: ModelMessage[]): string {
  const current = messages.find((message) => message.content.includes("<user_input>"));

  return current?.content.match(/<user_input>\n([\s\S]*?)\n<\/user_input>/)?.[1]?.trim() ?? "";
}

function chunkText(text: string): string[] {
  const sentences = text.match(/[^.!?。！？]+[.!?。！？]?\s*/g) ?? [text];

  return sentences.map((sentence) => sentence.trimStart()).filter(Boolean);
}

function shorten(text: string): string {
  return text.length > 80 ? `${text.slice(0, 77)}...` : text;
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException("aborted", "AbortError");
  }
}

function readOptionalEnv(
  env: ModelProviderEnvironment,
  key: keyof ModelProviderEnvironment
): string | null {
  const value = env[key];

  return value?.trim() || null;
}
