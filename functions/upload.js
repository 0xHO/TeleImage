// 处理 POST 请求的主函数
export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        // 克隆请求以便多次读取
        const clonedRequest = request.clone();
        // 解析表单数据
        const formData = await clonedRequest.formData();
 
        // 获取上传的文件
        const uploadFile = formData.get('file');
        if (!uploadFile) {
            throw new Error('No file uploaded'); // 未上传文件时报错
        }

        // 获取文件名和扩展名
        const fileName = uploadFile.name;
        const fileExtension = fileName.split('.').pop().toLowerCase();

        // 构造 Telegram 所需的表单数据
        const telegramFormData = new FormData();
        telegramFormData.append("chat_id", env.TG_Chat_ID);

        // 根据文件类型选择合适的上传方式
        let apiEndpoint;
        if (uploadFile.type.startsWith('image/')) {
            telegramFormData.append("photo", uploadFile); // 图片类型
            apiEndpoint = 'sendPhoto';
        } else if (uploadFile.type.startsWith('audio/')) {
            telegramFormData.append("audio", uploadFile); // 音频类型
            apiEndpoint = 'sendAudio';
        } else if (uploadFile.type.startsWith('video/')) {
            telegramFormData.append("video", uploadFile); // 视频类型
            apiEndpoint = 'sendVideo';
        } else {
            telegramFormData.append("document", uploadFile); // 其他类型作为文档上传
            apiEndpoint = 'sendDocument';
        }

        // 调用 sendToTelegram 发送文件到 Telegram
        const result = await sendToTelegram(telegramFormData, apiEndpoint, env);

        if (!result.success) {
            throw new Error(result.error); // 上传失败抛出错误
        }

        // 获取 Telegram 返回的文件 ID
        const fileId = getFileId(result.data);

        if (!fileId) {
            throw new Error('Failed to get file ID'); // 获取文件 ID 失败
        }

        // 将文件信息保存到 KV 存储（如有配置）
        if (env.img_url) {
            await env.img_url.put(`${fileId}.${fileExtension}`, "", {
                metadata: {
                    TimeStamp: Date.now(), // 时间戳
                    ListType: "None",
                    Label: "None",
                    liked: false,
                    fileName: fileName,
                    fileSize: uploadFile.size,
                }
            });
        }

        // 返回文件访问路径
        return new Response(
            JSON.stringify([{ 'src': `/file/${fileId}.${fileExtension}` }]),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    } catch (error) {
        // 错误处理
        console.error('Upload error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

// 从 Telegram 响应中提取文件 ID
function getFileId(response) {
    if (!response.ok || !response.result) return null;

    const result = response.result;
    // 图片类型，取最大尺寸的 file_id
    if (result.photo) {
        return result.photo.reduce((prev, current) =>
            (prev.file_size > current.file_size) ? prev : current
        ).file_id;
    }
    // 其他类型直接取 file_id
    if (result.document) return result.document.file_id;
    if (result.video) return result.video.file_id;
    if (result.audio) return result.audio.file_id;

    return null;
}

// 发送文件到 Telegram 的辅助函数，支持重试和图片失败转文档
async function sendToTelegram(formData, apiEndpoint, env, retryCount = 0) {
    const MAX_RETRIES = 2; // 最大重试次数
    const apiUrl = `https://api.telegram.org/bot${env.TG_Bot_Token}/${apiEndpoint}`;

    try {
        // 发送请求到 Telegram
        const response = await fetch(apiUrl, { method: "POST", body: formData });
        const responseData = await response.json();

        if (response.ok) {
            return { success: true, data: responseData }; // 上传成功
        }

        // 图片上传失败时转为文档方式重试
        if (retryCount < MAX_RETRIES && apiEndpoint === 'sendPhoto') {
            console.log('Retrying image as document...');
            const newFormData = new FormData();
            newFormData.append('chat_id', formData.get('chat_id'));
            newFormData.append('document', formData.get('photo'));
            return await sendToTelegram(newFormData, 'sendDocument', env, retryCount + 1);
        }

        // 其他失败情况
        return {
            success: false,
            error: responseData.description || 'Upload to Telegram failed'
        };
    } catch (error) {
        // 网络错误处理，支持重试
        console.error('Network error:', error);
        if (retryCount < MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
            return await sendToTelegram(formData, apiEndpoint, env, retryCount + 1);
        }
        return { success: false, error: 'Network error occurred' };
    }
}