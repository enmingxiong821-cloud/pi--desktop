"""浏览器验证：仅本地原型与虚构配置，禁止对外网络访问。"""

from pathlib import Path
import json
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1440, "height": 1000})
    errors = []
    external = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on(
        "request",
        lambda request: (
            external.append(request.url)
            if request.url.startswith(("http:", "https:"))
            else None
        ),
    )
    page.route("http://**/*", lambda route: route.abort())
    page.route("https://**/*", lambda route: route.abort())
    page.goto((ROOT / "prototype/index.html").as_uri())
    expect(page.get_by_text("这里将运行真正的 Pi")).to_be_visible()
    expect(page.locator("#export-config")).to_be_disabled()
    page.locator("#connection-button").click()
    expect(page.locator("#info-dialog")).to_be_visible()
    page.keyboard.press("Escape")
    expect(page.locator("#info-dialog")).not_to_be_visible()
    page.locator("#add-provider").click()
    page.locator("#provider-id").fill("test-relay")
    page.locator("#base-url").fill("http://relay.example.com/v1")
    page.locator("#model-ids").fill("test-model-a\ntest-model-b")
    page.get_by_role("button", name="添加到本次原型").click()
    expect(page.locator("#form-error")).to_contain_text("HTTPS")
    page.locator("#base-url").fill("https://relay.example.com/v1")
    page.get_by_role("button", name="添加到本次原型").click()
    expect(page.locator(".model-item")).to_have_count(2)
    page.locator(".model-item").first.click()
    expect(page.locator("#selected-model")).to_have_text("test-model-a")
    page.locator(".model-item").last.click()
    expect(page.locator("#selected-model")).to_have_text("test-model-b")
    expect(page.locator("#selected-provider")).to_contain_text("等待 Pi 应用")
    page.locator("#model-search").fill("no-match")
    expect(page.locator("#model-list")).to_contain_text("没有匹配")
    page.locator("#model-search").fill("")
    with page.expect_download() as event:
        page.locator("#export-config").click()
    download = event.value
    assert download.suggested_filename == "pi-models-draft.json"
    exported = json.loads(Path(download.path()).read_text(encoding="utf-8"))
    assert exported["providers"]["test-relay"]["apiKey"] == "${PI_RELAY_API_KEY}"
    # 管理闭环：取消不变，编辑保留/清理选择，移除确认，导出往返。
    page.get_by_text("管理中转站", exact=True).click()
    page.get_by_role("button", name="编辑 test-relay", exact=True).click()
    page.locator("#model-ids").fill("cancelled-model")
    page.keyboard.press("Escape")
    expect(page.locator(".model-item")).to_have_count(2)
    expect(page.locator("#selected-model")).to_have_text("test-model-b")
    page.get_by_role("button", name="编辑 test-relay", exact=True).click()
    page.locator("#base-url").fill("https://relay.example.com/updated")
    page.get_by_role("button", name="保存修改", exact=True).click()
    expect(page.locator("#selected-model")).to_have_text("test-model-b")
    page.get_by_role("button", name="编辑 test-relay", exact=True).click()
    page.locator("#model-ids").fill("test-model-a")
    page.get_by_role("button", name="保存修改", exact=True).click()
    expect(page.locator("#selected-model")).to_have_text("尚未选择")
    expect(page.locator(".model-item")).to_have_count(1)
    page.locator(".model-item").click()
    page.get_by_role("button", name="移除 test-relay", exact=True).click()
    page.locator("#cancel-remove").click()
    expect(page.locator(".model-item")).to_have_count(1)
    page.get_by_role("button", name="移除 test-relay", exact=True).click()
    page.locator("#confirm-remove").click()
    expect(page.locator(".model-item")).to_have_count(0)
    expect(page.locator("#selected-model")).to_have_text("尚未选择")
    expect(page.locator("#export-config")).to_be_disabled()
    page.locator("#import-config").click()
    page.locator("#import-json").fill(json.dumps(exported))
    page.get_by_role("button", name="校验并导入", exact=True).click()
    expect(page.locator(".model-item")).to_have_count(2)
    page.locator("#import-config").click()
    page.locator("#import-json").fill(json.dumps(exported))
    page.get_by_role("button", name="校验并导入", exact=True).click()
    expect(page.locator("#import-error")).to_contain_text("重复")
    expect(page.locator(".model-item")).to_have_count(2)
    secret_draft = json.loads(json.dumps(exported))
    secret_draft["providers"]["test-relay"]["apiKey"] = "secret-test-key"
    page.locator("#import-json").fill(json.dumps(secret_draft))
    page.get_by_role("button", name="校验并导入", exact=True).click()
    expect(page.locator("#import-error")).to_contain_text("不接受真实 Key")
    expect(page.locator("#import-json")).to_have_value("")
    assert "secret-test-key" not in page.locator("body").inner_text()
    page.locator("#cancel-import").click()
    page.locator(".model-item").last.click()
    page.locator('[data-command="/model"]').click()
    expect(page.locator("#command-preview")).to_have_text("/model")
    # 复制权限可能因浏览器策略被拒绝，两种分支均须有可见反馈。
    page.locator("#copy-command").click()
    expect(page.locator("#toast")).to_contain_text("复制")

    def assert_toast_stays_above_workspace():
        toast_box = page.locator("#toast").bounding_box()
        workspace_box = page.locator(".workspace").bounding_box()
        assert toast_box and workspace_box
        assert toast_box["y"] + toast_box["height"] <= workspace_box["y"] + 1
        viewport_width = page.evaluate("() => window.innerWidth")
        assert toast_box["x"] >= 0
        assert toast_box["x"] + toast_box["width"] <= viewport_width

    assert_toast_stays_above_workspace()
    page.locator("#models-tab").focus()
    page.keyboard.press("ArrowRight")
    expect(page.locator("#capabilities-panel")).to_be_visible()
    page.keyboard.press("ArrowRight")
    expect(page.locator("#project-panel")).to_be_visible()
    page.locator("#workspace-label").fill("原生终端验证")
    page.get_by_role("button", name="更新显示名称").click()
    expect(page.locator("#project-name")).to_have_text("原生终端验证")
    page.locator("#models-tab").click()
    page.locator("#focus-mode").click()
    expect(page.locator(".assistant-panel")).not_to_be_visible()
    page.locator("#focus-mode").click()
    expect(page.locator(".assistant-panel")).to_be_visible()
    page.locator("#font-plus").click()
    assert (
        page.locator("#terminal-content").evaluate("e => getComputedStyle(e).fontSize")
        == "16px"
    )
    page.screenshot(path=str(ROOT / "prototype/desktop-preview.png"), full_page=True)
    for width in [375, 768, 1024, 1440]:
        page.set_viewport_size({"width": width, "height": 900})
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), (
            f"页面横向溢出: {width}"
        )
        page.locator('[data-command="/model"]').click()
        expect(page.locator("#toast")).to_contain_text("暂存")
        assert_toast_stays_above_workspace()
    page.set_viewport_size({"width": 375, "height": 900})
    page.screenshot(path=str(ROOT / "prototype/mobile-preview.png"), full_page=True)
    page.reload()
    expect(page.locator("#selected-model")).to_have_text("尚未选择")
    assert page.evaluate("localStorage.length") == 0
    assert not external, f"发生对外请求: {external}"
    assert not errors, f"浏览器脚本错误: {errors}"
    browser.close()
    print(
        "原型浏览器验证通过：配置校验、编辑取消、移除确认、选择清理、导入往返及拒绝敏感配置、模型选择、导出、命令暂存、面板键盘导航、专注模式、字号、四种宽度与刷新重置；未发起对外请求。"
    )
