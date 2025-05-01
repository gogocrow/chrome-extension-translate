// 初始化扩展
chrome.runtime.onInstalled.addListener(() => {
  console.log("网页翻译助手已安装");
});

const DEFAULT_SYSTEM_PROMPT =
  "你是一个专业的翻译器，请将以下HTML内容翻译成中文，保持原始的HTML标签和标签的属性、CSS不变，只翻译文本内容。如果有代码，只翻译注释，不翻译代码。";

// 监听来自内容脚本的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "translateText") {
    const modelConfig = request.modelConfig;
    const text = request.text;

    // 调用翻译API
    translateWithAPI(modelConfig, text)
      .then((translatedText) => {
        sendResponse({ success: true, translatedText });
      })
      .catch((error) => {
        console.error("Translation error:", error);
        sendResponse({ success: false, error: error.message });
      });

    return true; // 异步响应需要返回true
  }
});

// 调用大语言模型API进行翻译
async function translateWithAPI(modelConfig, text) {
  try {
    let response;

    switch (modelConfig.type) {
      case "openai":
        response = await translateWithOpenAI(modelConfig, text);
        break;
      case "azure":
        response = await translateWithAzure(modelConfig, text);
        break;
      case "anthropic":
        response = await translateWithAnthropic(modelConfig, text);
        break;
      case "gemini":
        response = await translateWithGemini(modelConfig, text);
        break;
      case "custom":
        response = await translateWithCustomAPI(modelConfig, text);
        break;
      default:
        throw new Error("不支持的模型类型");
    }

    return response;
  } catch (error) {
    console.error("Translation API error:", error);
    throw error;
  }
}

// OpenAI API调用
async function translateWithOpenAI(modelConfig, text) {
  const response = await fetch(modelConfig.apiUrl || "https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${modelConfig.apiKey}`,
    },
    body: JSON.stringify({
      model: modelConfig.model || "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: modelConfig.systemPrompt || DEFAULT_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: text,
        },
      ],
      max_tokens: 12000,
      temperature: parseFloat(modelConfig.temperature) || 0.3,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "OpenAI API请求失败");
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Azure OpenAI API调用
async function translateWithAzure(modelConfig, text) {
  const deploymentId = modelConfig.model || "gpt-35-turbo";
  const apiVersion = "2023-05-15"; // 可根据需要在模型配置中添加此参数

  const response = await fetch(
    `${modelConfig.apiUrl}/openai/deployments/${deploymentId}/chat/completions?api-version=${apiVersion}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": modelConfig.apiKey,
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: modelConfig.systemPrompt || DEFAULT_SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: text,
          },
        ],
        max_tokens: 12000,
        temperature: parseFloat(modelConfig.temperature) || 0.3,
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "Azure OpenAI API请求失败");
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Anthropic Claude API调用
async function translateWithAnthropic(modelConfig, text) {
  const response = await fetch(modelConfig.apiUrl || "https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": modelConfig.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: modelConfig.model || "claude-3-sonnet-20240229",
      messages: [
        {
          role: "user",
          content: `${modelConfig.systemPrompt || DEFAULT_SYSTEM_PROMPT}\n\n${text}`,
        },
      ],
      temperature: parseFloat(modelConfig.temperature) || 0.3,
      max_tokens: 12000,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "Anthropic API请求失败");
  }

  const data = await response.json();
  return data.content[0].text;
}

// Google Gemini API调用
async function translateWithGemini(modelConfig, text) {
  const response = await fetch(
    modelConfig.apiUrl ||
      `https://generativelanguage.googleapis.com/v1beta/models/${
        modelConfig.model || "gemini-pro"
      }:generateContent?key=${modelConfig.apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${modelConfig.systemPrompt || DEFAULT_SYSTEM_PROMPT}\n\n${text}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: parseFloat(modelConfig.temperature) || 0.3,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "Google Gemini API请求失败");
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

// 自定义API调用
async function translateWithCustomAPI(modelConfig, text) {
  const response = await fetch(modelConfig.apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(modelConfig.apiKey ? { Authorization: `Bearer ${modelConfig.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: modelConfig.model,
      prompt: `${modelConfig.systemPrompt || DEFAULT_SYSTEM_PROMPT}\n\n${text}`,
      temperature: parseFloat(modelConfig.temperature) || 0.3,
      max_tokens: 12000,
    }),
  });

  if (!response.ok) {
    throw new Error("自定义API请求失败");
  }

  const data = await response.json();
  // 用户需要在模型配置中指定响应路径
  return data.response || data.output || data.text || data.content || JSON.stringify(data);
}
