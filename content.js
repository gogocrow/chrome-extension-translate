// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'translate') {
    const modelConfig = request.modelConfig;
    
    try {
      // 显示翻译中提示
      showTranslatingIndicator();
      
      // 提取页面核心内容
      const mainContent = extractMainContent();
      
      if (!mainContent) {
        hideTranslatingIndicator();
        sendResponse({ success: false, error: '无法识别页面主要内容' });
        return;
      }
      
      // 发送内容到背景脚本，调用API翻译
      chrome.runtime.sendMessage({
        action: 'translateText',
        modelConfig: modelConfig,
        text: mainContent.outerHTML
      }, response => {
        // 隐藏翻译中提示
        hideTranslatingIndicator();
        
        if (response && response.success) {
          // 替换原内容为翻译后的内容
          replaceContent(mainContent, response.translatedText);
          sendResponse({ success: true });
        } else {
          sendResponse({ 
            success: false, 
            error: response ? response.error : '翻译服务异常' 
          });
        }
      });
      
      return true; // 异步响应
    } catch (error) {
      hideTranslatingIndicator();
      console.error('Content script error:', error);
      sendResponse({ success: false, error: error.message });
    }
  } else if (request.action === 'showTranslating') {
    showTranslatingIndicator();
    sendResponse({ success: true });
    return false;
  } else if (request.action === 'hideTranslating') {
    hideTranslatingIndicator();
    sendResponse({ success: true });
    return false;
  }
});

// 显示翻译中提示
function showTranslatingIndicator() {
  // 如果已经存在提示，则不重复创建
  if (document.getElementById('translating-indicator')) {
    return;
  }
  
  // 创建提示元素
  const indicator = document.createElement('div');
  indicator.id = 'translating-indicator';
  indicator.textContent = '翻译中...';
  
  // 设置样式
  indicator.style.position = 'fixed';
  indicator.style.bottom = '20px';
  indicator.style.right = '20px';
  indicator.style.backgroundColor = 'rgba(66, 133, 244, 0.9)';
  indicator.style.color = 'white';
  indicator.style.padding = '8px 15px';
  indicator.style.borderRadius = '4px';
  indicator.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.2)';
  indicator.style.zIndex = '10000';
  indicator.style.fontFamily = 'Arial, sans-serif';
  indicator.style.fontSize = '14px';
  
  // 添加到页面
  document.body.appendChild(indicator);
}

// 隐藏翻译中提示
function hideTranslatingIndicator() {
  const indicator = document.getElementById('translating-indicator');
  if (indicator) {
    indicator.remove();
  }
}

// 提取页面的主要内容区域
function extractMainContent() {
  // 尝试识别常见的内容容器
  const contentSelectors = [
    'article',
    'main',
    '.content', 
    '#content',
    '.post-content',
    '.article-content',
    '.main-content'
  ];
  
  // 按优先级尝试找到主要内容
  for (const selector of contentSelectors) {
    const element = document.querySelector(selector);
    if (element && element.innerText.length > 100) {
      return element;
    }
  }
  
  // 如果没有找到明确的内容容器，尝试启发式方法
  return findContentHeuristically();
}

// 使用启发式方法查找页面主要内容
function findContentHeuristically() {
  // 获取所有可能是内容的容器元素
  const possibleContent = [];
  const containers = document.querySelectorAll('div, section, article');
  
  containers.forEach(container => {
    // 忽略导航、侧边栏等明显非内容的区域
    if (
      container.id && (container.id.toLowerCase().includes('nav') || 
                        container.id.toLowerCase().includes('sidebar') ||
                        container.id.toLowerCase().includes('footer') ||
                        container.id.toLowerCase().includes('header'))
    ) {
      return;
    }
    
    if (
      container.className && (container.className.toLowerCase().includes('nav') ||
                               container.className.toLowerCase().includes('sidebar') ||
                               container.className.toLowerCase().includes('footer') ||
                               container.className.toLowerCase().includes('header'))
    ) {
      return;
    }
    
    // 计算文本密度（文本长度/元素总数）
    const textLength = container.innerText.length;
    const childElements = container.querySelectorAll('*').length;
    
    if (textLength > 200 && childElements > 0) {
      const textDensity = textLength / childElements;
      possibleContent.push({
        element: container,
        textLength: textLength,
        textDensity: textDensity
      });
    }
  });
  
  // 按文本密度排序并选择最高的
  possibleContent.sort((a, b) => b.textDensity - a.textDensity);
  
  return possibleContent.length > 0 ? possibleContent[0].element : null;
}

// 替换内容
function replaceContent(element, translatedHTML) {
  // 创建一个临时容器解析翻译后的HTML
  const tempContainer = document.createElement('div');
  tempContainer.innerHTML = translatedHTML;
  
  // 如果解析后的内容是有效元素，替换整个元素
  if (tempContainer.firstElementChild && 
      tempContainer.firstElementChild.tagName === element.tagName) {
    // 保留原始元素的属性
    const attributes = element.attributes;
    const newElement = tempContainer.firstElementChild;
    
    for (let i = 0; i < attributes.length; i++) {
      const attr = attributes[i];
      newElement.setAttribute(attr.name, attr.value);
    }
    
    element.parentNode.replaceChild(newElement, element);
  } else {
    // 否则只替换内部HTML
    element.innerHTML = tempContainer.innerHTML;
  }
}
