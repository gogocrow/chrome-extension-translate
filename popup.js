document.addEventListener('DOMContentLoaded', function() {
  const translateButton = document.getElementById('translateButton');
  const modelSelector = document.getElementById('modelSelector');
  const statusDiv = document.getElementById('status');

  let models = [];
  let selectedModelId = '';
  let defaultModelId = '';

  // 加载已保存的模型配置
  function loadModels() {
    chrome.storage.sync.get(['models', 'defaultModelId', 'selectedModelId'], function(data) {
      models = data.models || [];
      defaultModelId = data.defaultModelId || '';
      
      // 如果没有模型配置，重定向到模型配置页面
      if (models.length === 0) {
        window.location.href = 'model-config.html';
        return;
      }
      
      // 更新选择器
      updateModelSelector();
      
      // 设置选中的模型
      if (data.selectedModelId && models.some(m => m.id === data.selectedModelId)) {
        selectedModelId = data.selectedModelId;
      } else {
        selectedModelId = defaultModelId || models[0].id;
      }
      
      modelSelector.value = selectedModelId;
    });
  }

  // 更新模型选择器
  function updateModelSelector() {
    // 清空当前选项
    modelSelector.innerHTML = '';
    
    // 添加所有模型选项
    models.forEach(model => {
      const option = document.createElement('option');
      option.value = model.id;
      option.textContent = model.name;
      if (model.id === defaultModelId) {
        option.textContent += ' (默认)';
      }
      modelSelector.appendChild(option);
    });
  }

  // 当选择器值改变时
  modelSelector.addEventListener('change', function() {
    selectedModelId = this.value;
    chrome.storage.sync.set({ selectedModelId });
  });

  // 翻译当前页面
  translateButton.addEventListener('click', function() {
    if (!selectedModelId || models.length === 0) {
      showStatus('请先配置并选择一个翻译模型', 'error');
      return;
    }

    const selectedModel = models.find(m => m.id === selectedModelId);
    if (!selectedModel) {
      showStatus('所选模型配置无效', 'error');
      return;
    }

    if (!selectedModel.apiKey) {
      showStatus('请先在模型配置页面设置API密钥', 'error');
      return;
    }

    statusDiv.textContent = '正在翻译页面...';
    statusDiv.style.backgroundColor = '#fff3cd';

    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      // 先发送显示翻译中提示的消息
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: 'showTranslating' },
        function() {
          // 然后发送翻译请求
          chrome.tabs.sendMessage(
            tabs[0].id, 
            {
              action: 'translate', 
              modelConfig: selectedModel
            }, 
            function(response) {
              if (response && response.success) {
                showStatus('翻译成功！', 'success');
              } else {
                // 如果翻译失败，隐藏翻译中提示
                chrome.tabs.sendMessage(tabs[0].id, { action: 'hideTranslating' });
                showStatus('翻译失败：' + (response ? response.error : '未知错误'), 'error');
              }
            }
          );
        }
      );
    });
  });

  // 显示状态消息
  function showStatus(message, type = 'info') {
    statusDiv.textContent = message;
    
    if (type === 'success') {
      statusDiv.style.backgroundColor = '#d4edda';
      statusDiv.style.color = '#155724';
    } else if (type === 'error') {
      statusDiv.style.backgroundColor = '#f8d7da';
      statusDiv.style.color = '#721c24';
    } else {
      statusDiv.style.backgroundColor = '#fff3cd';
      statusDiv.style.color = '#856404';
    }
  }

  // 初始加载
  loadModels();
}); 