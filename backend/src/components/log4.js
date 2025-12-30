// 导入日志库和颜色库
import log4js from 'log4js'
import { Chalk } from 'chalk'
import { read_json } from '../method/read.js'

export default async function () {
    const config = read_json("configs", "config")
    const log = config.log

    // 配置日志系统
    log4js.configure({
        appenders: {
            // 控制台输出 - 带颜色
            console: {
                type: 'console',
                layout: {
                    type: 'pattern',
                    // 控制台使用颜色包裹，文件日志会过滤这些颜色代码
                    pattern: '%[%d{hh:mm:ss.SSS}%] %[[%4.4p]%] %[%m%]',
                }
            },
            // 常规日志 - 按日期滚动
            command: {
                type: 'dateFile',
                filename: 'logs/log', // 生成文件名格式: log-2023-10-01.log
                pattern: 'yyyy-MM-dd.log',
                alwaysIncludePattern: true,
                layout: {
                    type: 'pattern',
                    pattern: '[%d{hh:mm:ss.SSS}][%4.4p]%m',
                }
            },
            // 错误日志 - 按日期滚动（原需求优化点）
            error: {
                type: 'dateFile', // 原为普通文件，现改为滚动日志
                filename: 'logs/error',
                pattern: 'yyyy-MM-dd.log',
                alwaysIncludePattern: true,
                layout: {
                    type: 'pattern',
                    pattern: '[%d{hh:mm:ss.SSS}][%4.4p]%m',
                }
            }
        },
        categories: {
            default: { appenders: ['console'], level: log.cmd },
            command: { appenders: ['console', 'command'], level: log.file },
            error: { appenders: ['console', 'command', 'error'], level: 'error' }
        }
    })

    // 初始化颜色处理器（Truecolor模式）
    const chalk = new Chalk({ level: 3 })

    // 定义不同日志等级的颜色映射
    const LEVEL_COLORS = {
        trace: chalk.gray,      // 灰色 - 最细粒度的跟踪信息
        debug: chalk.blue,      // 蓝色 - 调试信息
        info: chalk.green,      // 绿色 - 常规信息
        warn: chalk.yellow,     // 黄色 - 警告信息
        error: chalk.red,       // 红色 - 错误信息
        fatal: chalk.red.bold,  // 红色加粗 - 致命错误
        mark: chalk.magenta     // 品红 - 业务标记
    }

    // 创建日志记录器对象
    chalk.logger = {
        defaultLogger: log4js.getLogger("message"),
        commandLogger: log4js.getLogger('command'),
        errorLogger: log4js.getLogger('error'),

        /**
         * 日志级别使用指南：
         * 
         * trace: 最细粒度的跟踪信息
         * - 函数进入/退出
         * - 循环迭代
         * - 详细的执行流程
         * 
         * debug: 调试信息
         * - 变量状态
         * - 流程分支判断
         * - 开发阶段的临时信息
         * 
         * info: 常规运行信息
         * - 服务启动/停止
         * - 配置加载
         * - 数据库连接
         * - 重要的业务操作
         * 
         * warn: 警告信息
         * - 非关键路径的异常
         * - 可恢复的错误
         * - 业务逻辑警告
         * 
         * error: 错误信息
         * - 影响功能的错误
         * - 数据库操作失败
         * - API调用失败
         * - 业务逻辑错误
         * 
         * fatal: 致命错误
         * - 应用崩溃
         - 启动依赖缺失
         * - 未捕获的异常
         * 
         * mark: 业务标记
         * - 审计日志
         * - 重要业务操作
         * - 定时任务触发
         */

        // 格式化错误对象
        formatError(error) {
            if (error instanceof Error) return `${error.message}\n${error.stack}`
            return error
        },

        // 日志方法实现
        trace(...args) {
            return this.defaultLogger.trace(...args)
        },

        debug(...args) {
            return this.defaultLogger.debug(...args)
        },

        info(...args) {
            return this.commandLogger.info(...args)
        },

        warn(...args) {
            const formattedArgs = args.map(arg => this.formatError(arg))
            return this.commandLogger.warn(...formattedArgs)
        },

        error(...args) {
            const formattedArgs = args.map(arg => this.formatError(arg))
            return this.errorLogger.error(...formattedArgs)
        },

        fatal(...args) {
            const formattedArgs = args.map(arg => this.formatError(arg))
            return this.errorLogger.fatal(...formattedArgs)
        },

        mark(...args) {
            return this.commandLogger.mark(...args)
        }
    }

    // 蓝色前缀（保留原始设计）
    const prefix = chalk.blue('[maruko-node]')

    // 动态绑定日志方法并添加颜色
    for (const level of Object.keys(LEVEL_COLORS)) {
        if (typeof chalk.logger[level] === 'function') {
            // 获取对应等级的颜色处理函数
            const colorFn = LEVEL_COLORS[level]

            // 重写方法：添加前缀并应用颜色
            chalk[level] = (...args) => {
                // 对每个参数应用颜色处理（保留原始数据类型）
                const coloredArgs = args.map(arg => {
                    if (typeof arg === 'string') return colorFn(arg)
                    return arg
                })
                return chalk.logger[level](prefix, ...coloredArgs)
            }
        }
    }

    // 挂载到全局对象（保留原始设计）
    global.logger = chalk
}