// 处理文件请求的主函数
export async function onRequest(context) {
    // 解构 context 获取请求、环境变量、参数等
    const {
        request,
        env,
        params,
    } = context;

    // 构造目标文件的 URL
    const url = new URL(request.url);
    let fileUrl = 'https://telegra.ph/' + url.pathname + url.search
    // 判断路径长度，区分是否为通过 Telegram Bot API 上传的文件
    if (url.pathname.length > 39) { // 路径长度大于 39 说明是通过 Telegram Bot API 上传
        const formdata = new FormData();
        formdata.append("file_id", url.pathname);

        const requestOptions = {
            method: "POST",
            body: formdata,
            redirect: "follow"
        };
        // 解析文件 ID
        console.log(url.pathname.split(".")[0].split("/")[2])
        // 获取 Telegram 文件的真实路径
        const filePath = await getFilePath(env, url.pathname.split(".")[0].split("/")[2]);
        if (!filePath) {
            return new Response("文件路径获取失败", { status: 500 });
        }
        fileUrl = `https://api.telegram.org/file/bot${env.TG_Bot_Token}/${filePath}`;
    }

    // 代理请求文件内容
    const response = await fetch(fileUrl, {
        method: request.method,
        headers: request.headers,
        body: request.body,
    });

    // 如果响应异常，直接返回
    if (!response.ok) return response;

    // 日志记录响应状态
    console.log(response.ok, response.status);

    // 返回文件内容
    return response;
}

/**
 * 获取 Telegram 文件的真实路径
 * @param {Object} env - 环境变量对象，包含 TG_Bot_Token
 * @param {string} file_id - Telegram 文件 ID
 * @returns {Promise<string|null>} 文件路径或 null
 */
async function getFilePath(env, file_id) {
    try {
        const url = `https://api.telegram.org/bot${env.TG_Bot_Token}/getFile?file_id=${file_id}`;
        const res = await fetch(url, {
            method: 'GET',
        });

        if (!res.ok) {
            console.error(`HTTP 错误! 状态码: ${res.status}`);
            return null;
        }

        const responseData = await res.json();
        const { ok, result } = responseData;

        if (ok && result) {
            return result.file_path;
        } else {
            console.error('响应数据错误:', responseData);
            return null;
        }
    } catch (error) {
        console.error('获取文件路径异常:', error.message);
        return null;
    }
}