from openai import OpenAI

client = OpenAI(
    base_url="https://integrate.api.nvidia.com/v1",
    api_key="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"
)

response = client.chat.completions.create(
    model="nvidia/nemotron-3.5-lightning-30b-a3b",
    messages=[
        {
            "role": "user",
            "content": "Explain what an API is in simple words."
        }
    ],
    max_tokens=500,
    extra_body={
        "chat_template_kwargs": {
            "enable_thinking": False
        }
    }
)

print(response.choices[0].message.content)