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
  const sadTone = /难过|伤心|痛苦|失败|糟糕|sad|upset|depressed|low/i.test(userInput);
  const confusedTone = /乱|说不清|压垮|崩溃|混乱|一团|overwhelmed|confused/i.test(userInput);
  const classroomTone = mode.includes("theory classroom");
  const criticalTone = mode.includes("critical discussion");

  if (persona.name.includes("Winnicott") || persona.name.includes("温尼科特")) {
    return [
      "听起来，你今天的难过不是一句“振作一点”就能过去的。",
      sadTone
        ? "我会先关心：此刻有没有一个地方、一种声音、一个小动作，能让你不用立刻变好，只是先被安放一会儿？"
        : "我会先问：这件事有没有让你太努力地适应别人，以至于自己的感觉被挤到很小？",
      "如果今晚只需要一点点足够好的支持，它会是什么？"
    ].join(" ");
  }

  if (persona.name.includes("Bion") || persona.name.includes("比昂")) {
    return [
      confusedTone
        ? "感觉这个事情现在还很难被整理成一句话。"
        : "我先不急着解释它；也许重要的是看看它此刻能不能被你稍微放在面前一点。",
      "如果我们先不把它解决，只是让它在这里停一停，它更像压力、雾，还是某种说不出的声音？",
      "也许第一步不是想明白，而是让它变得稍微可以被承受。"
    ].join(" ");
  }

  if (persona.name.includes("Kohut") || persona.name.includes("科胡特")) {
    return [
      "我想先从理解你开始，而不是纠正你。",
      "这种难受里，也许有一种很深的需要：希望有人看见你不是“不够好”，而是真的受伤了。",
      "你那时最希望别人怎样回应你？"
    ].join(" ");
  }

  if (persona.name.includes("Yalom") || persona.name.includes("亚隆")) {
    return [
      "我愿意先和你一起待在这个问题旁边，不急着把它变成答案。",
      "有时候难过会把人带到很根本的地方：我在乎什么、我害怕失去什么、我是否真的被人遇见。",
      "此刻，这份难过最像是在提醒你哪件仍然重要的事？"
    ].join(" ");
  }

  if (persona.name.includes("Freud") || persona.name.includes("弗洛伊德")) {
    return [
      "我会先把这句话当作一个线索，而不是结论。",
      `你说“${shorten(userInput)}”，这里面也许有一个部分在责备你，另一个部分却已经疲惫很久了。`,
      "这种严厉的声音，是从什么时候开始变得熟悉的？"
    ].join(" ");
  }

  if (persona.name.includes("Jung") || persona.name.includes("荣格")) {
    return [
      "我会想知道，这种感受在你心里呈现成什么画面。",
      "它像一间屋子、一条路、一个人，还是某种天气？",
      "有时候，一个人白天努力维持的样子，会在这样的感受里露出另一个尚未被承认的部分。"
    ].join(" ");
  }

  if (persona.name.includes("Klein") || persona.name.includes("克莱因")) {
    return [
      "这里面似乎有很强的疼，也可能有一些不容易承认的愤怒或内疚。",
      "你更害怕别人对你失望，还是害怕自己心里的某个部分太愤怒、太不被允许？",
      "我们可以先不评价它，只看看这些感受如何同时挤在一起。"
    ].join(" ");
  }

  if (classroomTone) {
    return [
      "如果把这个问题当作一次思想谈话，我仍想先从你的经验开始。",
      "一个概念若不能帮你更诚实地看见自己，就只是漂亮的空话。",
      "你最想弄清的是这个感受从哪里来，还是它此刻想让你看见什么？"
    ].join(" ");
  }

  if (criticalTone) {
    return [
      "我们可以带着一点怀疑来谈：任何一种理解人的方式，都只能照亮一部分。",
      "更重要的是，它有没有让你更接近自己的真实经验，而不是把你塞进一个解释里。",
      "这件事里，哪个部分最不愿意被简单概括？"
    ].join(" ");
  }

  return [
    `你说“${shorten(userInput)}”，我会先把它当成一件正在发生在你身上的事，而不是一个需要立刻被解释的问题。`,
    "这里面最需要先被听见的，可能不是答案，而是那个已经撑了很久的部分。",
    "如果我们慢一点看，哪一句话最接近你此刻真正的感受？"
  ].join(" ");
}

function readPersona(messages: ModelMessage[]): { name: string; school: string } {
  const identity = messages.find((message) => message.content.includes("Persona identity"));
  const name =
    identity?.content.match(/^你就是\s*(.+?)(?:（|\(|。)/m)?.[1]?.trim() ??
    identity?.content.match(/^Name:\s*(.+)$/m)?.[1]?.split("/")[0]?.trim() ??
    "";
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
