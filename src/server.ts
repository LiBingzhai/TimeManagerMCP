import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件配置
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 路由配置
app.use('/auth', authRoutes);

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'MCP Email Calendar Server'
  });
});

// MCP端点
app.post('/mcp', async (req, res) => {
  try {
    const { method, params } = req.body;
    
    // 这里将处理MCP协议请求
    // 实际实现将在index.ts中处理
    res.json({
      success: true,
      method,
      params
    });
  } catch (error) {
    console.error('MCP请求处理失败:', error);
    res.status(500).json({
      success: false,
      error: '内部服务器错误'
    });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`MCP服务器运行在端口 ${PORT}`);
  console.log(`健康检查: http://localhost:${PORT}/health`);
  console.log(`MCP端点: http://localhost:${PORT}/mcp`);
});

export default app;
