# MCP邮件日历服务器

一个基于Model Context Protocol (MCP)的服务器，提供邮件、日历和教务系统集成功能。

## 功能特性

- 📅 **日历管理**: 添加日程到Exchange日历，查询现有日程
- 📧 **邮件管理**: 获取未读邮件，查看单个邮件详情
- 🎓 **教务系统**: 获取西交利物浦大学课程表

## 技术栈

- **运行时**: Node.js + TypeScript
- **MCP框架**: @modelcontextprotocol/sdk
- **邮件/日历**: Microsoft Graph API
- **HTTP服务器**: Express.js
- **认证**: OAuth 2.0 (Microsoft Identity Platform)

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 到 `.env` 并填写配置：

```bash
cp .env.example .env
```

### 3. Microsoft Graph API 配置

#### 步骤1: 在Azure Portal注册应用

1. 访问 [Azure Portal](https://portal.azure.com)
2. 导航到 "Azure Active Directory" > "应用注册"
3. 点击 "新注册"
4. 填写应用信息：
   - 名称: `MCP Email Calendar Server`
   - 支持的账户类型: `仅此组织目录中的账户`
   - 重定向URI: `http://localhost:3000/auth/callback`

#### 步骤2: 配置API权限

1. 在应用注册页面，选择 "API权限"
2. 点击 "添加权限" > "Microsoft Graph"
3. 选择 "应用程序权限"，添加以下权限：
   - `Calendars.ReadWrite`
   - `Mail.Read`
   - `Mail.ReadWrite`
4. 点击 "授予管理员同意"

#### 步骤3: 获取凭据

1. 在应用注册页面，选择 "证书和密码"
2. 点击 "新客户端密码"，创建密码
3. 复制客户端ID、客户端密码和租户ID
4. 在 `.env` 文件中填写：

```env
MICROSOFT_CLIENT_ID=your_client_id_here
MICROSOFT_CLIENT_SECRET=your_client_secret_here
MICROSOFT_TENANT_ID=your_tenant_id_here
```

### 4. 教务系统配置

在 `.env` 文件中配置教务系统信息：

```env
ACADEMIC_SYSTEM_URL=https://your-academic-system-url.com
ACADEMIC_SYSTEM_USERNAME=your_student_id
ACADEMIC_SYSTEM_PASSWORD=your_password
```

### 5. 启动服务器

```bash
# 开发模式
npm run dev

# 生产模式
npm run build
npm start
```

## API 工具

### 日历工具

#### add_calendar_event
添加日程到Exchange日历

**参数:**
- `subject` (string): 事件标题
- `startDateTime` (string): 开始时间 (ISO 8601格式)
- `endDateTime` (string): 结束时间 (ISO 8601格式)
- `timeZone` (string, 可选): 时区 (默认: Asia/Shanghai)
- `location` (string, 可选): 地点
- `body` (string, 可选): 事件描述

#### get_calendar_events
获取日历中的日程

**参数:**
- `startDate` (string, 可选): 开始日期 (ISO 8601格式)
- `endDate` (string, 可选): 结束日期 (ISO 8601格式)

### 邮件工具

#### get_unread_emails
获取未读邮件列表

**参数:**
- `top` (number, 可选): 返回邮件数量限制 (默认: 10, 最大: 50)

#### get_email_by_id
获取单个邮件详情

**参数:**
- `emailId` (string): 邮件ID

### 教务系统工具

#### get_course_schedule
获取课程表

**参数:**
- `semester` (string, 可选): 学期 (如: 2024-1, 2024-2)

## 使用示例

### 添加日程

```json
{
  "method": "tools/call",
  "params": {
    "name": "add_calendar_event",
    "arguments": {
      "subject": "团队会议",
      "startDateTime": "2024-01-15T09:00:00",
      "endDateTime": "2024-01-15T10:00:00",
      "location": "会议室A",
      "body": "讨论项目进展"
    }
  }
}
```

### 获取未读邮件

```json
{
  "method": "tools/call",
  "params": {
    "name": "get_unread_emails",
    "arguments": {
      "top": 5
    }
  }
}
```

### 获取课程表

```json
{
  "method": "tools/call",
  "params": {
    "name": "get_course_schedule",
    "arguments": {
      "semester": "2024-1"
    }
  }
}
```

## 项目结构

```
src/
├── index.ts                 # MCP服务器入口
├── server.ts                # HTTP服务器配置
├── tools/
│   ├── calendar.ts          # 日历工具
│   ├── email.ts             # 邮件工具
│   └── academic.ts          # 教务系统工具
├── services/
│   ├── graphClient.ts       # Microsoft Graph客户端
│   └── academicSystem.ts    # 教务系统客户端
└── types/
    └── index.ts             # TypeScript类型定义
```

## 开发

### 构建项目

```bash
npm run build
```

### 监听模式

```bash
npm run watch
```

## 故障排除

### 常见问题

1. **认证失败**: 检查Microsoft Graph API凭据是否正确
2. **权限不足**: 确保已授予管理员同意
3. **教务系统登录失败**: 检查用户名密码是否正确

### 日志

服务器日志会显示详细的错误信息，帮助诊断问题。

## 许可证

MIT License
