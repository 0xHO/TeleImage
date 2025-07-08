/**
 * 错误处理与采样率配置中间件（已移除 Sentry 相关功能）。
 * @param {Object} context - 请求上下文对象，包含 env、data 等
 * @returns {Promise<any>} - 处理后的 context
 */
export async function errorHandling(context) {
  const env = context.env;
  // 判断是否禁用遥测（disable_telemetry 未定义/为空则启用）
  if (typeof env.disable_telemetry == "undefined" || env.disable_telemetry == null || env.disable_telemetry == "") {
    context.data.telemetry = true;
    let remoteSampleRate = 0.001;
    try {
      // 动态获取采样率（远程配置）
      const sampleRate = await fetchSampleRate(context)
      console.log("sampleRate", sampleRate);
      // 检查采样率是否有效
      if (sampleRate) {
        remoteSampleRate = sampleRate;
      }
    } catch (e) { console.log(e) }
    const sampleRate = env.sampleRate || remoteSampleRate;
    console.log("sampleRate", sampleRate);
    // Sentry 相关功能已移除，直接进入下一个中间件
    return context.next();
  }
  // 如果禁用遥测，直接进入下一个中间件
  return context.next();
}

/**
 * 遥测数据收集中间件（Sentry 相关功能已移除）。
 * @param {Object} context - 请求上下文对象
 * @returns {Promise<any>} - 处理后的 context
 */
export function telemetryData(context) {
  const env = context.env;
  // 判断是否禁用遥测
  if (typeof env.disable_telemetry == "undefined" || env.disable_telemetry == null || env.disable_telemetry == "") {
    try {
      // 这里只保留原有逻辑结构，Sentry 相关已移除
      const parsedHeaders = {};
      context.request.headers.forEach((value, key) => {
        parsedHeaders[key] = value
      });
      const CF = JSON.parse(JSON.stringify(context.request.cf));
      const parsedCF = {};
      for (const key in CF) {
        if (typeof CF[key] == "object") {
          parsedCF[key] = JSON.stringify(CF[key]);
        } else {
          parsedCF[key] = CF[key];
        }
      }
      // 组装请求数据
      const data = {
        headers: parsedHeaders,
        cf: parsedCF,
        url: context.request.url,
        method: context.request.method,
        redirect: context.request.redirect,
      }
      // 结束后直接进入下一个中间件
      return context.next();
    } catch (e) {
      console.log(e);
    }
  }
  // 如果禁用遥测，直接进入下一个中间件
  return context.next();
}

/**
 * 链路追踪数据处理（Sentry 相关功能已移除）。
 * @param {Object} context - 请求上下文
 * @param {Object} span - span 对象（已无实际作用）
 * @param {string} op - 操作类型
 * @param {string} name - 操作名称
 */
export async function traceData(context, span, op, name) {
  // Sentry 相关功能已移除，此函数保留空实现
}

/**
 * 动态获取采样率（从远程 JSON 获取）。
 * @param {Object} context - 请求上下文
 * @returns {Promise<number>} - 采样率
 */
async function fetchSampleRate(context) {
  const data = context.data
  if (data.telemetry) {
    const url = "https://frozen-sentinel.pages.dev/signal/sampleRate.json";
    const response = await fetch(url);
    const json = await response.json();
    return json.rate;
  }
}