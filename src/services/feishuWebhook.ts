/**
 * 飞书 Webhook 事件订阅说明
 *
 * 由于本系统是纯前端 SPA，Webhook 接收需要后端中转。
 * 推荐部署以下任一后端（也可在飞书开放平台用「事件订阅」配置）：
 *
 * 1. Next.js / Express / NestJS 等服务器收到飞书 POST 后，
 *    解析 challenge / event 字段，转发到本系统前端的 sync 通道。
 *
 * 2. 飞书侧「事件订阅」需订阅：
 *      - minutes.minutes_created   (妙记创建完成)
 *      - minutes.minutes_updated   (妙记更新)
 *    URL:    {your-domain}/api/feishu/webhook
 *    Token:  与本系统 config.webhookUrl 配套
 *
 * 3. 也可以用飞书「消息机器人」+ 本系统 Bot 来推送会议摘要链接。
 *
 * 4. 本系统会监听 storage 事件：'feishu:pushed:meeting'
 *    业务侧在收到 webhook 后可：
 *      window.dispatchEvent(new CustomEvent('feishu:pushed:meeting', { detail: meetingItem }))
 *    MeetingLibrary 组件会自动合并新会议。
 *
 * 完整事件结构示例：
 * {
 *   "event": {
 *     "type": "minutes.minutes_created",
 *     "minutes_id": "om_x100y...",
 *     "title": "客户技术交流",
 *     "owner_id": "ou_x100y...",
 *     "create_time": 1752600000
 *   }
 * }
 */
export {};
