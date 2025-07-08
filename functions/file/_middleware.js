// 文件访问相关中间件入口，统一处理错误和遥测
import { errorHandling, telemetryData } from '../utils/middleware';

// 导出中间件数组，供框架自动调用
export const onRequest = [errorHandling, telemetryData];