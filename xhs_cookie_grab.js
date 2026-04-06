/**
 * 小红书 Cookie 抓取脚本
 * 配合 xhs_cookie_grab.sgmodule 使用
 *
 * 触发条件：访问 xiaohongshu.com 任意页面（登录后会下发 Set-Cookie）
 * 保存位置：$persistentStore，key = "xhs_cookies"
 * 读取方式：JSON.parse($persistentStore.read("xhs_cookies"))
 *           → { a1: "...", web_session: "...", webId: "..." }
 */

(function () {

  // 从 Set-Cookie 字符串中提取指定 Cookie 的值
  // Surge 将多个 Set-Cookie 合并为一个字符串，用换行或 ", " 分隔
  function extractCookie(raw, name) {
    if (!raw) return null;
    // 按换行或 ", 非空格" 拆分各条 Set-Cookie
    var lines = raw.split(/\n|,(?=\s*\w+=)/);
    for (var i = 0; i < lines.length; i++) {
      var kv = lines[i].trim().split(";")[0].trim();
      var eq = kv.indexOf("=");
      if (eq === -1) continue;
      if (kv.substring(0, eq).trim() === name) {
        var val = kv.substring(eq + 1).trim();
        if (val) return val;
      }
    }
    return null;
  }

  var headers = $response.headers || {};
  var setCookie = headers["Set-Cookie"] || headers["set-cookie"] || "";

  var a1         = extractCookie(setCookie, "a1");
  var webSession = extractCookie(setCookie, "web_session");
  var webId      = extractCookie(setCookie, "webId");

  // 没有任何新 Cookie，直接放行
  if (!a1 && !webSession && !webId) {
    $done({});
    return;
  }

  // 合并到已保存的值（三个值可能来自不同请求）
  var saved = {};
  try { saved = JSON.parse($persistentStore.read("xhs_cookies") || "{}"); } catch (e) {}

  if (a1)         saved.a1          = a1;
  if (webSession) saved.web_session = webSession;
  if (webId)      saved.webId       = webId;

  $persistentStore.write(JSON.stringify(saved), "xhs_cookies");
  console.log("[XHS] 已保存: " + JSON.stringify(saved));

  var got     = Object.keys(saved);
  var missing = ["a1", "web_session", "webId"].filter(function (k) { return !saved[k]; });
  var done    = missing.length === 0;

  $notification.post(
    "小红书 Cookie",
    done ? "✅ 三个值全部获取完毕" : "⏳ 已获取 " + got.length + "/3",
    "已有: " + (got.join(", ") || "无") + (missing.length ? "\n待获取: " + missing.join(", ") : ""),
    done ? { sound: true } : {}
  );

  $done({});

})();
