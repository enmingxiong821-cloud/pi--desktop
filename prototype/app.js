// 仅浏览器内存状态，不写本机 Pi 配置，不发送网络请求。
'use strict';
const $ = (id) => document.getElementById(id);
const profiles = [];
let selection = null;
let toastTimer;
let terminalSize = 15;
let editingId = null;
let removingId = null;

function notify(message) {
  $('toast').textContent = message;
  $('toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 4500);
}

function activateTab(id) {
  document.querySelectorAll('[role=tab]').forEach((tab) => {
    const selected = tab.id === id;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    $(tab.getAttribute('aria-controls')).hidden = !selected;
  });
}

document.querySelectorAll('[role=tab]').forEach((tab, index, tabs) => {
  tab.addEventListener('click', () => activateTab(tab.id));
  tab.addEventListener('keydown', (event) => {
    let next;
    if (event.key === 'ArrowRight') next = tabs[(index + 1) % tabs.length];
    if (event.key === 'ArrowLeft') next = tabs[(index + tabs.length - 1) % tabs.length];
    if (event.key === 'Home') next = tabs[0];
    if (event.key === 'End') next = tabs[tabs.length - 1];
    if (next) { event.preventDefault(); activateTab(next.id); next.focus(); }
  });
});

function renderModels() {
  if (selection && !profiles.some((profile) => profile.id === selection.provider && profile.models.includes(selection.id))) selection = null;
  $('selected-model').textContent = selection?.id ?? '尚未选择';
  $('selected-provider').textContent = selection ? `${selection.provider} · 等待 Pi 应用` : '添加中转站后选择模型';
  const list = $('model-list');
  list.replaceChildren();
  const query = $('model-search').value.trim().toLowerCase();
  for (const profile of profiles) {
    for (const id of profile.models) {
      if (!`${id} ${profile.id}`.toLowerCase().includes(query)) continue;
      const button = document.createElement('button');
      button.className = 'model-item';
      button.setAttribute('aria-pressed', String(selection?.id === id && selection?.provider === profile.id));
      const name = document.createElement('strong');
      name.textContent = id;
      const meta = document.createElement('small');
      meta.textContent = `${profile.id} · ${profile.api} · 未验证`;
      button.append(name, meta);
      button.addEventListener('click', () => {
        selection = { id, provider: profile.id };
        $('selected-model').textContent = id;
        $('selected-provider').textContent = `${profile.id} · 等待 Pi 应用`;
        renderModels();
        notify('已选择待应用模型；未连接 Pi，不会改变真实会话。');
      });
      list.append(button);
    }
  }
  if (!list.children.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-list';
    empty.textContent = profiles.length ? '没有匹配的模型。' : '还没有配置模型。使用中转站提供的准确模型 ID。';
    list.append(empty);
  }
  $('export-config').disabled = !profiles.length;
  renderProviders();
}

function openProvider(profile = null) {
  editingId = profile?.id ?? null;
  $('provider-form').reset();
  if (profile) {
    for (const [key, value] of Object.entries(profile)) {
      $('provider-form').elements.namedItem(key).value = Array.isArray(value) ? value.join('\n') : value;
    }
  }
  $('provider-id').readOnly = Boolean(profile);
  $('provider-title').textContent = profile ? '编辑中转站' : '接入自己的模型';
  $('save-provider').textContent = profile ? '保存修改' : '添加到本次原型';
  $('form-error').textContent = '';
  $('provider-dialog').showModal();
}

function renderProviders() {
  $('provider-list').replaceChildren();
  if (!profiles.length) $('provider-list').textContent = '尚未添加中转站。';
  for (const profile of profiles) {
    const row = document.createElement('article');
    row.className = 'info-card';
    const title = document.createElement('h3');
    title.textContent = profile.id;
    const edit = document.createElement('button');
    edit.textContent = '编辑';
    edit.setAttribute('aria-label', `编辑 ${profile.id}`);
    edit.addEventListener('click', () => openProvider(profile));
    const remove = document.createElement('button');
    remove.textContent = '移除';
    remove.setAttribute('aria-label', `移除 ${profile.id}`);
    remove.addEventListener('click', () => {
      removingId = profile.id;
      $('remove-description').textContent = `将移除 ${profile.id} 及其 ${profile.models.length} 个模型；关联的待应用选择会清空。`;
      $('remove-dialog').showModal();
    });
    row.append(title, edit, remove);
    $('provider-list').append(row);
  }
}

$('add-provider').addEventListener('click', () => openProvider());
$('cancel-remove').addEventListener('click', () => $('remove-dialog').close());
$('remove-dialog').addEventListener('close', () => { removingId = null; });
$('confirm-remove').addEventListener('click', () => {
  const index = profiles.findIndex((profile) => profile.id === removingId);
  if (index >= 0) profiles.splice(index, 1);
  $('remove-dialog').close();
  renderModels();
  $('add-provider').focus();
  notify('已移除本次原型中的中转站；未改动 Pi 配置。');
});
$('close-provider').addEventListener('click', () => $('provider-dialog').close());
$('provider-form').addEventListener('submit', (event) => {
  event.preventDefault();
  try {
    const profile = PiModelConfig.validateProfile(Object.fromEntries(new FormData(event.currentTarget)));
    if (profiles.some((item) => item.id === profile.id && item.id !== editingId)) throw new Error('供应商标识已存在，请使用不同标识。');
    if (editingId) {
      const index = profiles.findIndex((item) => item.id === editingId);
      if (index < 0 || profile.id !== editingId) throw new Error('编辑目标不匹配，请重新打开配置。');
      profiles[index] = profile;
    } else {
      if (profiles.length >= 20) throw new Error('本次原型最多配置 20 个中转站。');
      profiles.push(profile);
    }
    renderModels();
    $('provider-dialog').close();
    event.currentTarget.reset();
    $('add-provider').focus();
    notify('连接元数据已保存到本次原型；未认证、未联网，刷新后清除。');
  } catch (error) {
    $('form-error').textContent = error.message;
  }
});
$('import-config').addEventListener('click', () => {
  $('import-error').textContent = '';
  $('import-dialog').showModal();
});
$('cancel-import').addEventListener('click', () => $('import-dialog').close());
$('import-dialog').addEventListener('close', () => $('import-form').reset());
$('import-form').addEventListener('submit', (event) => {
  event.preventDefault();
  try {
    const imported = PiModelConfig.parseConfig($('import-json').value);
    if (profiles.length + imported.length > 20) throw new Error('本次原型最多配置 20 个中转站。');
    if (imported.some((profile) => profiles.some((existing) => existing.id === profile.id))) throw new Error('供应商标识与现有配置重复；整批未导入。');
    profiles.push(...imported);
    renderModels();
    $('import-dialog').close();
    notify(`已导入 ${imported.length} 个中转站的草稿；没有连接或修改 Pi。`);
  } catch (error) {
    $('import-error').textContent = error.message;
    $('import-json').value = '';
  }
});
$('model-search').addEventListener('input', renderModels);
$('export-config').addEventListener('click', () => {
  try {
    const config = PiModelConfig.buildConfig(profiles);
    const url = URL.createObjectURL(new Blob([JSON.stringify(config, null, 2) + '\n'], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'pi-models-draft.json';
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify('已导出配置草稿；需核对 Pi 版本并合并，不能直接覆盖已有配置。');
  } catch (error) { notify(error.message); }
});

document.querySelectorAll('[data-command]').forEach((button) => {
  button.addEventListener('click', () => {
    $('command-preview').textContent = button.dataset.command;
    $('copy-command').disabled = false;
    notify('命令已暂存，没有写入终端或执行。');
  });
});
$('copy-command').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText($('command-preview').textContent);
    notify('已复制命令；请在合适时机手动使用。');
  } catch { notify('浏览器未允许复制；可直接选中暂存命令复制。'); }
});
for (const id of ['help-button', 'connection-button']) $(id).addEventListener('click', () => $('info-dialog').showModal());
$('close-info').addEventListener('click', () => $('info-dialog').close());
$('focus-mode').addEventListener('click', () => {
  const focused = document.body.classList.toggle('focus-mode');
  $('focus-mode').setAttribute('aria-pressed', String(focused));
  $('focus-mode').textContent = focused ? '显示辅助面板' : '专注终端';
});
for (const [id, change] of [['font-minus', -1], ['font-plus', 1]]) {
  $(id).addEventListener('click', () => {
    terminalSize = Math.max(12, Math.min(22, terminalSize + change));
    document.documentElement.style.setProperty('--terminal-size', `${terminalSize}px`);
    $('font-minus').disabled = terminalSize === 12;
    $('font-plus').disabled = terminalSize === 22;
  });
}
$('project-button').addEventListener('click', () => { activateTab('project-tab'); $('workspace-label').focus(); });
$('project-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const name = $('workspace-label').value.trim();
  if (!name) { notify('工作区名称不能只有空格。'); return; }
  $('project-name').textContent = name;
  notify('已更新显示名称；没有绑定本地文件夹。');
});
