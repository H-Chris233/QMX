import express from 'express';
import type { Router } from 'express';
import { db } from '@/db';
import { systemConfigs } from '@/db/schema/config';
import { eq } from 'drizzle-orm';

const router: Router = express.Router();

// 简单的密码验证中间件
const adminPassword = process.env.QMX_ADMIN_PASSWORD || '';

/**
 * 获取当前站点密码状态
 */
router.get('/status', async (_req, res) => {
  try {
    // 检查是否已设置密码
    const [result] = await db
      .select()
      .from(systemConfigs)
      .where(eq(systemConfigs.key, 'site_password'))
      .limit(1);

    res.json({
      success: true,
      data: {
        hasPassword: !!result?.value,
        isFirstVisit: !result?.value,
        adminConfigured: !!adminPassword,
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取密码状态失败'
    });
  }
});

/**
 * 设置站点密码（第一次访问时）
 */
router.post('/setup', async (req, res) => {
  const { password } = req.body;

  if (!password || password.length < 4) {
    return res.status(400).json({
      success: false,
      error: '密码长度至少4位'
    });
  }

  try {
    // 检查是否已存在密码
    const [existing] = await db
      .select()
      .from(systemConfigs)
      .where(eq(systemConfigs.key, 'site_password'))
      .limit(1);

    if (existing) {
      return res.status(400).json({
        success: false,
        error: '密码已设置，请使用登录接口'
      });
    }

    // 保存密码
    await db.insert(systemConfigs).values({
      key: 'site_password',
      value: password,
      description: '站点访问密码',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    res.json({
      success: true,
      message: '密码设置成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '设置密码失败'
    });
  }
});

/**
 * 验证密码
 */
router.post('/verify', async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({
      success: false,
      error: '请提供密码'
    });
  }

  // 优先验证环境变量中的管理员密码
  if (adminPassword && password === adminPassword) {
    return res.json({
      success: true,
      data: { isAdmin: true }
    });
  }

  try {
    // 验证数据库中存储的密码
    const [result] = await db
      .select()
      .from(systemConfigs)
      .where(eq(systemConfigs.key, 'site_password'))
      .limit(1);

    if (result && result.value === password) {
      return res.json({
        success: true,
        data: { isAdmin: false }
      });
    }

    res.status(401).json({
      success: false,
      error: '密码错误'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '验证失败'
    });
  }
});

/**
 * 更改密码（需要先验证旧密码）
 */
router.post('/change', async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword || newPassword.length < 4) {
    return res.status(400).json({
      success: false,
      error: '参数无效，新密码长度至少4位'
    });
  }

  // 验证管理员环境变量
  if (adminPassword && oldPassword === adminPassword) {
    // 管理员可以更改密码（仅影响数据库中的密码）
    try {
      // 使用 upsert 逻辑
      const [existing] = await db
        .select()
        .from(systemConfigs)
        .where(eq(systemConfigs.key, 'site_password'))
        .limit(1);

      if (existing) {
        await db
          .update(systemConfigs)
          .set({ value: newPassword, updatedAt: new Date() })
          .where(eq(systemConfigs.key, 'site_password'));
      } else {
        await db.insert(systemConfigs).values({
          key: 'site_password',
          value: newPassword,
          description: '站点访问密码',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      return res.json({
        success: true,
        message: '密码更改成功'
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: '更改密码失败'
      });
    }
  }

  try {
    // 验证旧密码
    const [result] = await db
      .select()
      .from(systemConfigs)
      .where(eq(systemConfigs.key, 'site_password'))
      .limit(1);

    if (!result || result.value !== oldPassword) {
      return res.status(401).json({
        success: false,
        error: '原密码错误'
      });
    }

    // 更新密码
    await db
      .update(systemConfigs)
      .set({ value: newPassword, updatedAt: new Date() })
      .where(eq(systemConfigs.key, 'site_password'));

    res.json({
      success: true,
      message: '密码更改成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '更改密码失败'
    });
  }
});

export default router;
