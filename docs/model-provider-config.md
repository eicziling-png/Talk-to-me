# Model provider configuration

The chat backend supports a generic model configuration so the app can switch
between OpenAI and OpenAI-compatible providers without changing frontend code.

## Recommended generic variables

```env
MODEL_PROVIDER=openai-compatible
MODEL_API_KEY=your-provider-api-key
MODEL_NAME=deepseek-chat
MODEL_BASE_URL=https://api.deepseek.com/v1
```

Use `MODEL_PROVIDER=openai-compatible` for providers that expose an
OpenAI-compatible `/chat/completions` endpoint.

## DeepSeek example

```env
MODEL_PROVIDER=openai-compatible
MODEL_API_KEY=your-deepseek-api-key
MODEL_NAME=deepseek-chat
MODEL_BASE_URL=https://api.deepseek.com/v1
```

## OpenAI examples

For OpenAI with the generic configuration:

```env
MODEL_PROVIDER=openai
MODEL_API_KEY=your-openai-api-key
MODEL_NAME=gpt-4.1-mini
```

Legacy OpenAI variables are still supported:

```env
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4.1-mini
```

If both generic and legacy variables are present, the generic variables take
priority.
