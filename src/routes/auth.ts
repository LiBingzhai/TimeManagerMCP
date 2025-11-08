import express from 'express';
import { OAuthFlow } from '../auth/oauthFlow';
import { GraphConfig } from '../types';

const router = express.Router();

// 初始化OAuth流程
const oauthFlow = new OAuthFlow({
  clientId: process.env.MICROSOFT_CLIENT_ID!,
  clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
  tenantId: process.env.MICROSOFT_TENANT_ID!,
});

// 登录路由 - 重定向到Microsoft登录
router.get('/login', (req, res) => {
  try {
    const authUrl = oauthFlow.generateAuthUrl();
    res.redirect(authUrl);
  } catch (error) {
    console.error('生成认证URL失败:', error);
    res.status(500).json({
      success: false,
      error: '认证URL生成失败'
    });
  }
});

// 回调路由 - 处理Microsoft重定向
router.get('/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        error: '缺少授权码'
      });
    }

    if (state !== 'delegated_auth') {
      return res.status(400).json({
        success: false,
        error: '无效的状态参数'
      });
    }

    // 处理授权码，获取访问令牌
    const accessToken = await oauthFlow.handleCallback(code as string);
    
    // 获取用户信息
    const userInfo = await oauthFlow.getUserInfo(accessToken);
    
    res.json({
      success: true,
      message: '认证成功',
      user: userInfo,
      accessToken: accessToken
    });
  } catch (error) {
    console.error('处理认证回调失败:', error);
    res.status(500).json({
      success: false,
      error: '认证回调处理失败'
    });
  }
});

// 登出路由
router.get('/logout', (req, res) => {
  res.json({
    success: true,
    message: '已登出'
  });
});

export default router;
