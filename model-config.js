document.addEventListener('DOMContentLoaded', function() {
  const modelList = document.getElementById('modelList');
  const addModelBtn = document.getElementById('addModelBtn');
  const saveBtn = document.getElementById('saveBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const statusDiv = document.getElementById('status');
  
  // 模型类型选项
  const MODEL_TYPES = [
    { id: 'openai', name: 'OpenAI' },
    { id: 'azure', name: 'Azure OpenAI' },
    { id: 'anthropic', name: 'Anthropic Claude' },
    { id: 'gemini', name: 'Google Gemini' },
    { id: 'custom', name: '自定义模型' }
  ];
  
  let models = [];
  let defaultModelId = '';
  
  // 加载保存的模型配置
  function loadModels() {
    chrome.storage.sync.get(['models', 'defaultModelId'], function(data) {
      models = data.models || [];
      defaultModelId = data.defaultModelId || '';
      
      // 如果没有模型配置，添加一个默认的OpenAI配置
      if (models.length === 0) {
        const defaultModel = {
          id: generateId(),
          name: 'OpenAI模型',
          type: 'openai',
          apiKey: '',
          apiUrl: 'https://api.openai.com/v1/chat/completions',
          model: 'gpt-3.5-turbo',
          temperature: 0.3,
          systemPrompt: '你是一个专业的翻译器，请将以下HTML内容翻译成中文，保持原始的HTML标签不变，只翻译文本内容。'
        };
        models.push(defaultModel);
        defaultModelId = defaultModel.id;
      }
      
      renderModelList();
    });
  }
  
  // 渲染模型列表
  function renderModelList() {
    modelList.innerHTML = '';
    
    models.forEach((model, index) => {
      const modelElem = createModelElement(model, index);
      modelList.appendChild(modelElem);
    });
  }
  
  // 创建单个模型配置元素
  function createModelElement(model, index) {
    const container = document.createElement('div');
    container.className = 'model-container';
    container.dataset.id = model.id;
    
    const isDefault = model.id === defaultModelId;
    
    // 模型头部（标题和删除按钮）
    const header = document.createElement('div');
    header.className = 'model-header';
    
    const title = document.createElement('h3');
    title.textContent = `模型 ${index + 1}: ${model.name}`;
    if (isDefault) {
      const badge = document.createElement('span');
      badge.className = 'default-badge';
      badge.textContent = '默认';
      title.appendChild(badge);
    }
    
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '删除';
    deleteBtn.addEventListener('click', () => removeModel(model.id));
    
    header.appendChild(title);
    header.appendChild(deleteBtn);
    container.appendChild(header);
    
    // 基本配置表单
    const form = document.createElement('div');
    
    // 名称
    const nameLabel = document.createElement('label');
    nameLabel.textContent = '名称:';
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.value = model.name;
    nameInput.dataset.field = 'name';
    
    // 默认模型选择
    const defaultLabel = document.createElement('label');
    defaultLabel.textContent = '设为默认模型:';
    const defaultCheck = document.createElement('input');
    defaultCheck.type = 'checkbox';
    defaultCheck.checked = isDefault;
    defaultCheck.style.width = 'auto';
    defaultCheck.dataset.field = 'default';
    
    // 模型类型
    const typeLabel = document.createElement('label');
    typeLabel.textContent = '模型类型:';
    const typeSelect = document.createElement('select');
    typeSelect.dataset.field = 'type';
    
    MODEL_TYPES.forEach(type => {
      const option = document.createElement('option');
      option.value = type.id;
      option.textContent = type.name;
      if (model.type === type.id) {
        option.selected = true;
      }
      typeSelect.appendChild(option);
    });
    
    // API密钥
    const apiKeyLabel = document.createElement('label');
    apiKeyLabel.textContent = 'API密钥:';
    const apiKeyInput = document.createElement('input');
    apiKeyInput.type = 'password';
    apiKeyInput.value = model.apiKey || '';
    apiKeyInput.dataset.field = 'apiKey';
    
    // API URL
    const apiUrlLabel = document.createElement('label');
    apiUrlLabel.textContent = 'API端点:';
    const apiUrlInput = document.createElement('input');
    apiUrlInput.type = 'text';
    apiUrlInput.value = model.apiUrl || '';
    apiUrlInput.dataset.field = 'apiUrl';
    
    // 模型名称
    const modelNameLabel = document.createElement('label');
    modelNameLabel.textContent = '模型名称:';
    const modelNameInput = document.createElement('input');
    modelNameInput.type = 'text';
    modelNameInput.value = model.model || '';
    modelNameInput.dataset.field = 'model';
    
    // 高级设置区域
    const advancedSettings = document.createElement('div');
    advancedSettings.className = 'advanced-settings';
    
    // 温度设置
    const tempLabel = document.createElement('label');
    tempLabel.textContent = '温度 (0-1):';
    const tempInput = document.createElement('input');
    tempInput.type = 'number';
    tempInput.min = '0';
    tempInput.max = '1';
    tempInput.step = '0.1';
    tempInput.value = model.temperature || 0.3;
    tempInput.dataset.field = 'temperature';
    
    // 系统提示词
    const promptLabel = document.createElement('label');
    promptLabel.textContent = '系统提示词:';
    const promptTextarea = document.createElement('textarea');
    promptTextarea.rows = 4;
    promptTextarea.value = model.systemPrompt || '';
    promptTextarea.dataset.field = 'systemPrompt';
    
    // 添加所有元素到表单
    form.appendChild(nameLabel);
    form.appendChild(nameInput);
    form.appendChild(defaultLabel);
    form.appendChild(defaultCheck);
    form.appendChild(typeLabel);
    form.appendChild(typeSelect);
    form.appendChild(apiKeyLabel);
    form.appendChild(apiKeyInput);
    form.appendChild(apiUrlLabel);
    form.appendChild(apiUrlInput);
    form.appendChild(modelNameLabel);
    form.appendChild(modelNameInput);
    
    advancedSettings.appendChild(tempLabel);
    advancedSettings.appendChild(tempInput);
    advancedSettings.appendChild(promptLabel);
    advancedSettings.appendChild(promptTextarea);
    
    form.appendChild(advancedSettings);
    container.appendChild(form);
    
    return container;
  }
  
  // 添加新模型
  function addNewModel() {
    const newModel = {
      id: generateId(),
      name: '新模型',
      type: 'openai',
      apiKey: '',
      apiUrl: 'https://api.openai.com/v1/chat/completions',
      model: 'gpt-3.5-turbo',
      temperature: 0.3,
      systemPrompt: '你是一个专业的翻译器，请将以下HTML内容翻译成中文，保持原始的HTML标签不变，只翻译文本内容。'
    };
    
    models.push(newModel);
    renderModelList();
    
    // 滚动到新添加的模型
    setTimeout(() => {
      const lastModel = modelList.lastElementChild;
      lastModel.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }
  
  // 删除模型
  function removeModel(id) {
    if (models.length <= 1) {
      showStatus('至少需要保留一个模型配置', 'error');
      return;
    }
    
    const confirmed = confirm('确定要删除这个模型配置吗？');
    if (!confirmed) return;
    
    const index = models.findIndex(m => m.id === id);
    if (index !== -1) {
      // 如果删除的是默认模型，则设置第一个为默认
      if (id === defaultModelId) {
        const newDefaultId = models[index === 0 ? 1 : 0].id;
        defaultModelId = newDefaultId;
      }
      
      models.splice(index, 1);
      renderModelList();
    }
  }
  
  // 生成唯一ID
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
  
  // 保存所有模型配置
  function saveModels() {
    // 收集表单数据
    const modelContainers = modelList.querySelectorAll('.model-container');
    const updatedModels = [];
    let newDefaultId = defaultModelId;
    
    modelContainers.forEach(container => {
      const id = container.dataset.id;
      const existingModel = models.find(m => m.id === id);
      const updatedModel = { ...existingModel, id };
      
      // 收集所有表单字段
      container.querySelectorAll('[data-field]').forEach(field => {
        const fieldName = field.dataset.field;
        
        if (fieldName === 'default') {
          if (field.checked) {
            newDefaultId = id;
          }
        } else if (fieldName === 'temperature') {
          updatedModel[fieldName] = parseFloat(field.value) || 0.3;
        } else {
          updatedModel[fieldName] = field.value;
        }
      });
      
      updatedModels.push(updatedModel);
    });
    
    // 保存到存储
    chrome.storage.sync.set(
      { 
        models: updatedModels, 
        defaultModelId: newDefaultId 
      }, 
      () => {
        models = updatedModels;
        defaultModelId = newDefaultId;
        showStatus('所有模型配置已保存！', 'success');
      }
    );
  }
  
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
    
    setTimeout(() => {
      statusDiv.textContent = '';
      statusDiv.style.backgroundColor = 'transparent';
    }, 3000);
  }
  
  // 绑定事件
  addModelBtn.addEventListener('click', addNewModel);
  
  saveBtn.addEventListener('click', saveModels);
  
  cancelBtn.addEventListener('click', () => {
    if (confirm('确定要取消所有更改吗？')) {
      loadModels();
    }
  });
  
  // 初始加载
  loadModels();
}); 