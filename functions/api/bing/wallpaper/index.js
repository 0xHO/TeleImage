/**
 * 处理获取 Bing 壁纸的 API 请求
 * @param {Object} context - 请求上下文，包含 request、env、params 等
 * @returns {Promise<Response>} - 返回包含壁纸数据的响应
 */
export async function onRequest(context) {
    // context 对象解构，包含 Worker API 相关属性
    const {
      request, // 请求对象
      env, // 环境变量
      params, // 路径参数
      waitUntil, // Worker API 的 waitUntil
      next, // 用于中间件或资源获取
      data, // 用于中间件间传递数据
    } = context;
    // 请求 Bing 壁纸 API，获取最新 5 张图片
    const res = await fetch(`https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=5`);
    const bing_data = await res.json();
    // 组装返回数据结构
    const return_data={
        "status":true,
        "message":"操作成功",
        "data": bing_data.images
    }
    const info = JSON.stringify(return_data);
    // 返回 JSON 响应
    return new Response(info);
}