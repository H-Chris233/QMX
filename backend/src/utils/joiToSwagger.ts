import j2s from 'joi-to-swagger';
import type Joi from 'joi';

/**
 * Joi Schema 转 OpenAPI Schema 工具
 * 用于将 Joi 验证 Schema 转换为 OpenAPI 3.0 格式
 */

/**
 * 将 Joi Schema 转换为 OpenAPI Schema
 * @param joiSchema - Joi 验证 Schema
 * @returns OpenAPI Schema 对象
 */
export function joiToSwagger(joiSchema: Joi.Schema): {
  swagger: Record<string, unknown>;
  components?: Record<string, unknown>;
} {
  return j2s(joiSchema);
}

/**
 * 批量转换 Joi Schema
 * @param schemas - Joi Schema 对象映射
 * @returns OpenAPI Schema 对象映射
 */
export function convertSchemas(
  schemas: Record<string, Joi.Schema>
): Record<string, Record<string, unknown>> {
  const result: Record<string, Record<string, unknown>> = {};

  for (const [name, schema] of Object.entries(schemas)) {
    const { swagger } = joiToSwagger(schema);
    result[name] = swagger;
  }

  return result;
}

/**
 * 生成 OpenAPI 请求体定义
 * @param joiSchema - Joi 验证 Schema
 * @param description - 请求体描述
 * @returns OpenAPI requestBody 对象
 */
export function generateRequestBody(
  joiSchema: Joi.Schema,
  description: string = '请求体'
): {
  description: string;
  required: boolean;
  content: {
    'application/json': {
      schema: Record<string, unknown>;
    };
  };
} {
  const { swagger } = joiToSwagger(joiSchema);

  return {
    description,
    required: true,
    content: {
      'application/json': {
        schema: swagger,
      },
    },
  };
}

/**
 * 生成 OpenAPI 响应定义
 * @param joiSchema - Joi 验证 Schema
 * @param description - 响应描述
 * @returns OpenAPI response 对象
 */
export function generateResponse(
  joiSchema: Joi.Schema,
  description: string = '成功响应'
): {
  description: string;
  content: {
    'application/json': {
      schema: Record<string, unknown>;
    };
  };
} {
  const { swagger } = joiToSwagger(joiSchema);

  return {
    description,
    content: {
      'application/json': {
        schema: swagger,
      },
    },
  };
}

export default {
  joiToSwagger,
  convertSchemas,
  generateRequestBody,
  generateResponse,
};
