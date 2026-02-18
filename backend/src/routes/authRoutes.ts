import express from 'express';
import type { Router } from 'express';
import { db, systemConfigs } from '@/db';
import bcrypt from 'bcryptjs';
import logger from '@/utils/logger';

const router: Router = express.Router();

// 管理员密码（环境变量）- 使用 bcrypt 比较
const adminPasswordHash = process.env.QMX_ADMIN_PASSWORD_HASH || '';

/**
 * @openapi
 * /auth/status:
 *   get:
 *     tags:
 *       - Auth
 *     summary: 获取认证状态
 *     description: 检查站点是否已设置密码，是否为首次访问
 *     responses:
 *       200:
 *         description: 认证状态
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/AuthStatus'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
/**
 * 获取当前站点密码状态
 */
router.get('/status', async (_req, res) => {
  try {
    // 检查是否已设置密码
    const result = await db.query.systemConfigs.findFirst({
      where: (configs, { eq }) => eq(configs.key, 'site_password_hash'),
    });

    res.json({
      success: true,
      data: {
        hasPassword: !!result,
        isFirstVisit: !result,
        adminConfigured: !!adminPasswordHash,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取密码状态失败',
    });
  }
});

/**
 * @openapi
 * /auth/setup:
 *   post:
 *     tags:
 *       - Auth
 *     summary: 设置站点密码
 *     description: 首次访问时设置站点访问密码（密码使用 bcrypt 哈希存储）
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *                 minLength: 4
 *                 description: 站点访问密码（至少 4 位）
 *                 example: "your_password"
 *     responses:
 *       200:
 *         description: 密码设置成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 密码设置成功
 *       400:
 *         description: 参数无效或密码已设置
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: 密码长度至少4位
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
/**
 * 设置站点密码（第一次访问时）- 哈希存储
 */
router.post('/setup', async (req, res) => {
  const { password } = req.body;

  if (!password || password.length < 4) {
    return res.status(400).json({
      success: false,
      error: '密码长度至少4位',
    });
  }

  try {
    // 检查是否已存在密码
    const existing = await db.query.systemConfigs.findFirst({
      where: (configs, { eq }) => eq(configs.key, 'site_password_hash'),
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: '密码已设置，请使用登录接口',
      });
    }

    // 使用 bcrypt 哈希密码
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 保存哈希到数据库
    await db.insert(systemConfigs)
      .values({
        key: 'site_password_hash',
        value: passwordHash, // 存储 bcrypt 哈希
        description: '站点访问密码（bcrypt哈希）',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoNothing()
      .execute();

    res.json({
      success: true,
      message: '密码设置成功',
    });
  } catch (error) {
    logger.error('设置密码错误:', error);
    res.status(500).json({
      success: false,
      error: '设置密码失败',
    });
  }
});

/**
 * @openapi
 * /auth/verify:
 *   post:
 *     tags:
 *       - Auth
 *     summary: 验证密码
 *     description: 验证用户输入的密码是否正确（优先验证管理员密码）
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *                 description: 用户输入的密码
 *                 example: "your_password"
 *     responses:
 *       200:
 *         description: 密码验证成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     isAdmin:
 *                       type: boolean
 *                       description: 是否为管理员
 *                       example: false
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
/**
 * 验证密码
 */
router.post('/verify', async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({
      success: false,
      error: '请提供密码',
    });
  }

  try {
    // 优先验证环境变量中的管理员密码
    if (adminPasswordHash) {
      const adminMatch = await bcrypt.compare(password, adminPasswordHash);
      if (adminMatch) {
        return res.json({
          success: true,
          data: { isAdmin: true },
        });
      }
    }

    // 验证数据库中存储的密码哈希
    const result = await db.query.systemConfigs.findFirst({
      where: (configs, { eq }) => eq(configs.key, 'site_password_hash'),
    });

    if (result) {
      const storedHash = result.value as string;
      const match = await bcrypt.compare(password, storedHash);

      if (match) {
        return res.json({
          success: true,
          data: { isAdmin: false },
        });
      }
    }

    res.status(401).json({
      success: false,
      error: '密码错误',
    });
  } catch (error) {
    logger.error('验证密码错误:', error);
    res.status(500).json({
      success: false,
      error: '验证失败',
    });
  }
});

/**
 * @openapi
 * /auth/change:
 *   post:
 *     tags:
 *       - Auth
 *     summary: 更改密码
 *     description: 更改站点访问密码（需要先验证旧密码）
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - oldPassword
 *               - newPassword
 *             properties:
 *               oldPassword:
 *                 type: string
 *                 description: 当前密码
 *                 example: "old_password"
 *               newPassword:
 *                 type: string
 *                 minLength: 4
 *                 description: 新密码（至少 4 位）
 *                 example: "new_password"
 *     responses:
 *       200:
 *         description: 密码更改成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 密码更改成功
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
/**
 * 更改密码（需要先验证旧密码）
 */
router.post('/change', async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword || newPassword.length < 4) {
    return res.status(400).json({
      success: false,
      error: '参数无效，新密码长度至少4位',
    });
  }

  try {
    let isAdminUser = false;

    // 验证管理员密码
    if (adminPasswordHash) {
      const adminMatch = await bcrypt.compare(oldPassword, adminPasswordHash);
      if (adminMatch) {
        isAdminUser = true;
      }
    }

    // 验证旧密码（如果是普通用户）
    if (!isAdminUser) {
      const result = await db.query.systemConfigs.findFirst({
        where: (configs, { eq }) => eq(configs.key, 'site_password_hash'),
      });

      if (!result) {
        return res.status(401).json({
          success: false,
          error: '未设置密码',
        });
      }

      const storedHash = result.value as string;
      const match = await bcrypt.compare(oldPassword, storedHash);

      if (!match) {
        return res.status(401).json({
          success: false,
          error: '原密码错误',
        });
      }
    }

    // 使用 bcrypt 哈希新密码
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // 更新密码
    await db.insert(systemConfigs)
      .values({
        key: 'site_password_hash',
        value: newPasswordHash,
        description: '站点访问密码（bcrypt哈希）',
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: systemConfigs.key,
        set: {
          value: newPasswordHash,
          updatedAt: new Date(),
        },
      })
      .execute();

    res.json({
      success: true,
      message: '密码更改成功',
    });
  } catch (error) {
    logger.error('更改密码错误:', error);
    res.status(500).json({
      success: false,
      error: '更改密码失败',
    });
  }
});

export default router;
