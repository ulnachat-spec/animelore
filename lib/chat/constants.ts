/** 每次送给模型的最近消息数（user + assistant 合计）。 */
export const CHAT_MAX_HISTORY_MESSAGES = 10;

/** 单条用户消息最大字符数。 */
export const CHAT_MAX_USER_MESSAGE_CHARS = 800;

/** 单条助手消息保留上限，防止异常输出拖大后续请求。 */
export const CHAT_MAX_ASSISTANT_MESSAGE_CHARS = 4000;

/** 前端等待聊天接口的最长时间。 */
export const CHAT_CLIENT_TIMEOUT_MS = 45_000;
