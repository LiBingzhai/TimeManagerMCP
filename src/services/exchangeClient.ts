import {
    ExchangeService,
    ExchangeVersion,
    WebCredentials,
    Uri,
    WellKnownFolderName,
    SearchFilter,
    ItemView,
    PropertySet,
    BasePropertySet,
    EmailMessage,
    Appointment,
    CalendarView,
    DateTime,
    SendInvitationsMode,
    Mailbox,
    ItemSchema,
    EmailMessageSchema,
    AppointmentSchema,
    ItemId,
    TraceFlags
} from 'ews-javascript-api';
import { ExchangeConfig, IEmail, IEvent } from '../types';
import { logger } from '../utils/logger';
import * as moment from 'moment-timezone';

// 以下代码将禁用 SSL/TLS 证书验证。
// 如果您的 Exchange 服务器使用自签名证书，则需要此设置。
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// 为 ews-javascript-api 设置时区
moment.tz.setDefault("Asia/Shanghai");

export class ExchangeClient {
    private config: ExchangeConfig;
    private service: ExchangeService;

    constructor(config: ExchangeConfig) {
        this.config = config;
        logger.exchange('使用 ews-javascript-api 初始化 Exchange 客户端...');

        // 创建 ExchangeService 实例
        this.service = new ExchangeService(ExchangeVersion.Exchange2013_SP1);

        // 根据是否存在 domain 来决定用户名的格式
        const username = this.config.domain 
            ? `${this.config.domain}\\${this.config.username}` 
            : this.config.username;
        
        this.service.Credentials = new WebCredentials(username, this.config.password);
        
        // 启用跟踪以进行调试
        this.service.TraceEnabled = true;
        this.service.TraceFlags = TraceFlags.All;
        this.service.TraceListener = {
            Trace: (traceType: string, traceMessage: string) => {
                logger.data(`[EWS-TRACE] ${traceType}: ${traceMessage}`);
            }
        };

        logger.data(`使用的用户名 (格式化后): ${username}`);
        logger.data(`域名: ${this.config.domain || '未设置'}`);
        logger.exchange('客户端初始化完成。将在首次请求时使用 Autodiscover。');

        // 初始化后立即测试日历连接
        (async () => {
            try {
                logger.exchange('初始化时测试日历连接...');
                const start = new Date();
                const end = new Date();
                end.setDate(start.getDate() + 1); // 获取到明天为止的事件
                
                const events = await this.getEvents(start.toISOString(), end.toISOString());
                logger.success(`日历连接测试成功，获取到未来24小时内的 ${events.length} 个事件。`);
            } catch (error) {
                // 错误已在 getEvents 中记录，这里只记录测试失败的上下文
                logger.error('初始化日历连接测试失败。');
            }
        })();
    }

    /**
     * 确保已执行 Autodiscover 并设置了 EWS URL
     */
    private async ensureAutodiscover(): Promise<void> {
        if (!this.service.Url) {
            logger.exchange('执行 Autodiscover 或修正配置的 URL 以查找 EWS 端点...');
            try {
                // 如果提供了 exchangeUrl，则直接使用，否则执行 Autodiscover
                if (this.config.exchangeUrl) {
                    let ewsUrl = this.config.exchangeUrl;
                    // 确保 URL 指向 EWS 端点
                    if (!ewsUrl.toLowerCase().endsWith('/ews/exchange.asmx')) {
                        if (!ewsUrl.endsWith('/')) {
                            ewsUrl += '/';
                        }
                        ewsUrl += 'EWS/Exchange.asmx';
                    }
                    this.service.Url = new Uri(ewsUrl);
                    logger.success(`已使用修正后的 EWS URL: ${this.service.Url.AbsoluteUri}`);
                } else {
                    await this.service.AutodiscoverUrl(this.config.username, (url) => this.redirectionUrlValidationCallback(url));
                    logger.success(`Autodiscover 成功。EWS URL 设置为: ${(this.service.Url && (this.service.Url as Uri).AbsoluteUri) || '未知'}`);
                }
            } catch (err) {
                logger.error('Autodiscover 或 URL 设置失败: ' + (err instanceof Error ? err.message : err));
                throw err;
            }
        }
    }

    /**
     * Autodiscover 重定向验证回调
     */
    private redirectionUrlValidationCallback(redirectionUrl: string): boolean {
        logger.data(`[EWS-REDIRECT] Autodiscover 尝试重定向到: ${redirectionUrl}`);
        // 简单的验证：允许所有 https 重定向。在生产环境中应更严格。
        const isValid = new Uri(redirectionUrl).Scheme.toLowerCase() === 'https';
        logger.data(`[EWS-REDIRECT] 重定向URL验证结果: ${isValid ? '有效' : '无效'}`);
        return isValid;
    }

    /**
     * 获取未读邮件
     * @param top - 要获取的邮件数量
     * @returns 邮件数组
     */
    async getUnreadEmails(top: number = 10): Promise<IEmail[]> {
        await this.ensureAutodiscover();
        logger.exchange(`开始获取 ${top} 封未读邮件...`);

        // 创建过滤器，仅获取未读邮件
        const searchFilter = new SearchFilter.IsEqualTo(EmailMessageSchema.IsRead, false);
        
        // 创建视图，限制结果数量
        const view = new ItemView(top);

        // 定义要加载的属性
        view.PropertySet = new PropertySet(BasePropertySet.IdOnly, [
            ItemSchema.Subject,
            ItemSchema.DateTimeReceived,
            EmailMessageSchema.From,
            EmailMessageSchema.IsRead
        ]);

        try {
            const findResults = await this.service.FindItems(WellKnownFolderName.Inbox, searchFilter, view);
            logger.success(`成功获取到 ${findResults.TotalCount} 封未读邮件。`);
            
            if (findResults.Items.length === 0) {
                return [];
            }

            // 将 EWS item 转换为我们的 IEmail 格式
            return findResults.Items.map(item => this.parseEmailFromEWS(item as EmailMessage));
        } catch (err) {
            logger.error('获取未读邮件失败: ' + (err instanceof Error ? err.message : err));
            // 打印更详细的错误信息
            if (err && typeof err === 'object') {
                logger.data('详细错误: ' + JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
            }
            throw err;
        }
    }

    /**
     * 根据 ID 获取单个邮件详情
     * @param itemId - 邮件 ID
     * @returns 邮件详情
     */
    async getEmailById(itemId: string): Promise<IEmail> {
        await this.ensureAutodiscover();
        logger.exchange(`正在获取 ID 为 ${itemId} 的邮件...`);
        
        const propSet = new PropertySet(BasePropertySet.FirstClassProperties, [ItemSchema.Body]);
        const email = await EmailMessage.Bind(this.service, new ItemId(itemId), propSet);
        
        logger.success(`成功获取邮件: ${email.Subject}`);
        return this.parseEmailFromEWS(email, true);
    }

    /**
     * 创建日历事件
     * @param eventData - 事件数据
     * @returns 创建的事件
     */
    async createEvent(eventData: IEvent): Promise<Appointment> {
        await this.ensureAutodiscover();
        logger.exchange(`正在创建日历事件: ${eventData.subject}`);

        const appointment = new Appointment(this.service);
        appointment.Subject = eventData.subject;
        appointment.Body.Text = eventData.body || '';
        appointment.Start = new DateTime(eventData.start);
        appointment.End = new DateTime(eventData.end);
        appointment.Location = eventData.location || '';

        if (eventData.attendees && eventData.attendees.length > 0) {
            eventData.attendees.forEach(email => {
                appointment.RequiredAttendees.Add(email);
            });
        }

        await appointment.Save(SendInvitationsMode.SendToAllAndSaveCopy);
        logger.success(`日历事件 "${eventData.subject}" 创建成功。`);
        return appointment;
    }

    /**
     * 获取指定时间范围内的日历事件
     * @param startDate - 开始日期
     * @param endDate - 结束日期
     * @returns 事件数组
     */
    async getEvents(startDate: string, endDate: string): Promise<IEvent[]> {
        await this.ensureAutodiscover();
        logger.exchange(`正在获取从 ${startDate} 到 ${endDate} 的日历事件...`);

        const start = new DateTime(startDate);
        const end = new DateTime(endDate);
        const calendarView = new CalendarView(start, end, 100); // 最多获取100个事件

        calendarView.PropertySet = new PropertySet(BasePropertySet.IdOnly, [
            AppointmentSchema.Subject,
            AppointmentSchema.Start,
            AppointmentSchema.End,
            AppointmentSchema.Location
        ]);

        try {
            const findResults = await this.service.FindAppointments(WellKnownFolderName.Calendar, calendarView);
            logger.success(`成功获取到 ${findResults.TotalCount} 个日历事件。`);
            
            return findResults.Items.map(item => this.parseEventFromEWS(item));
        } catch (err) {
            logger.error('获取日历事件失败: ' + (err instanceof Error ? err.message : err));
            // 打印更详细的错误信息
            if (err && typeof err === 'object') {
                logger.data('详细错误: ' + JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
            }
            throw err;
        }
    }

    /**
     * 将 EWS EmailMessage 对象解析为 IEmail 格式
     */
    private parseEmailFromEWS(email: EmailMessage, includeBody: boolean = false): IEmail {
        const from = email.From;
        return {
            id: email.Id.UniqueId,
            subject: email.Subject,
            from: from ? { name: from.Name, address: from.Address } : undefined,
            received: email.DateTimeReceived.MomentDate.toISOString(),
            isRead: email.IsRead,
            body: includeBody ? email.Body.Text : undefined
        };
    }

    /**
     * 将 EWS Appointment 对象解析为 IEvent 格式
     */
    private parseEventFromEWS(appointment: Appointment): IEvent {
        return {
            id: appointment.Id.UniqueId,
            subject: appointment.Subject,
            start: appointment.Start.MomentDate.toISOString(),
            end: appointment.End.MomentDate.toISOString(),
            location: appointment.Location,
        };
    }
}
