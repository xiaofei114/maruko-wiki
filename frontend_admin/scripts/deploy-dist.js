#!/usr/bin/env node
/**
 * 管理端构建产物部署脚本
 *
 * 作用：把 frontend_admin/dist 同步到站点根目录下的 admin/，
 *       同步前先删掉旧的管理端产物，避免旧 hash 文件堆积。
 *
 * 默认目标：<仓库根>/frontend/dist/admin
 *   例：在 C:\data\web\maruko-wiki\frontend_admin 下执行
 *       → 同步到 C:\data\web\maruko-wiki\frontend\dist\admin
 *
 * 用法（Windows / Linux 通用）：
 *   node scripts/deploy-dist.js
 *   node scripts/deploy-dist.js --target=D:\sites\xxx\frontend\dist\admin
 *   node scripts/deploy-dist.js --target=/var/www/oiwiki/frontend/dist/admin
 *   node scripts/deploy-dist.js --target=~/sites/xxx/frontend/dist/admin
 *   ADMIN_DEPLOY_TARGET=/var/www/oiwiki/frontend/dist/admin node scripts/deploy-dist.js
 *   node scripts/deploy-dist.js --force        # 目标目录看起来不是管理端产物时强制覆盖
 *
 * 兼容性：只用了 Node 内置模块（fs.rmSync / fs.cpSync 需要 Node >= 16.7），
 *         Windows 的 junction 和 Linux 的 symlink 都会被识别为链接，只删链接本身。
 */

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const adminRoot = path.resolve(scriptDir, '..') // frontend_admin
const repoRoot = path.resolve(adminRoot, '..') // 仓库根
const sourceDir = path.join(adminRoot, 'dist')

const argv = process.argv.slice(2)
const force = argv.includes('--force')
const targetArg = argv.find((arg) => arg.startsWith('--target='))

const stripQuotes = (value) => value.replace(/^["']|["']$/g, '')

// 支持 ~ 和 ~/xxx（shell 里写 --target=~/xxx 时引号会阻止展开，这里兜住）
const expandHome = (value) => {
  if (value !== '~' && !value.startsWith('~/') && !value.startsWith('~\\')) {
    return value
  }
  const rest = value.slice(1).replace(/^[\\/]/, '')
  return rest ? path.join(os.homedir(), rest) : os.homedir()
}

const rawTarget = targetArg
  ? expandHome(stripQuotes(targetArg.slice('--target='.length)))
  : process.env.ADMIN_DEPLOY_TARGET
    ? expandHome(process.env.ADMIN_DEPLOY_TARGET)
    : ''

const targetDir = rawTarget
  ? path.resolve(rawTarget)
  : path.join(repoRoot, 'frontend', 'dist', 'admin')

const fail = (message) => {
  console.error(`\n✗ ${message}\n`)
  process.exit(1)
}

const countFiles = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).reduce((total, entry) => {
    if (entry.isDirectory()) {
      return total + countFiles(path.join(dir, entry.name))
    }
    return total + 1
  }, 0)

// ---------------- 源目录校验 ----------------
if (!fs.existsSync(sourceDir) || !fs.statSync(sourceDir).isDirectory()) {
  fail(`找不到构建产物：${sourceDir}\n  请先执行 pnpm run build:only`)
}

const sourceIndex = path.join(sourceDir, 'index.html')
if (!fs.existsSync(sourceIndex)) {
  fail(`构建产物里没有 index.html：${sourceIndex}\n  构建可能没有真正完成，先检查 vite build 的输出`)
}

const sourceHtml = fs.readFileSync(sourceIndex, 'utf8')
if (!sourceHtml.includes('/admin/')) {
  console.warn('⚠ 警告：dist/index.html 里没有 /admin/ 前缀，检查 vite.config.js 的 base 是否为 "/admin/"')
}

// ---------------- 目标目录安全校验 ----------------
const normalize = (value) => (process.platform === 'win32' ? value.toLowerCase() : value)

const isInside = (child, parent) => {
  const rel = path.relative(parent, child)
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))
}

const driveRoot = path.parse(targetDir).root
const protectedDirs = [
  repoRoot,
  adminRoot,
  path.join(repoRoot, 'frontend'),
  path.join(repoRoot, 'frontend', 'dist')
].map(normalize)

if (normalize(targetDir) === normalize(driveRoot) || protectedDirs.includes(normalize(targetDir))) {
  fail(`拒绝把产物同步到受保护目录：${targetDir}`)
}

if (isInside(targetDir, sourceDir) || isInside(sourceDir, targetDir)) {
  fail(`目标目录和构建产物目录重叠，会误删源文件：${targetDir}\n  构建产物在 ${sourceDir}`)
}

if (path.basename(targetDir).toLowerCase() !== 'admin') {
  console.warn(`⚠ 警告：目标目录不叫 admin（${path.basename(targetDir)}），确认 nginx 的 location /admin/ 指向这里`)
}

// ---------------- 删除旧产物 + 复制新产物 ----------------
const lstatSafe = (target) => {
  try {
    return fs.lstatSync(target)
  } catch {
    return null
  }
}

try {
  const stat = lstatSafe(targetDir)

  if (stat) {
    if (stat.isSymbolicLink()) {
      // junction / 软链接（含失效链接）：只删链接本身，不动真实产物目录
      fs.unlinkSync(targetDir)
      console.log(`· 已移除目录链接：${targetDir}`)
    } else if (stat.isDirectory()) {
      const entries = fs.readdirSync(targetDir)
      if (entries.length > 0 && !entries.includes('index.html') && !force) {
        fail(
          `目标目录非空且没有 index.html，看起来不是管理端产物，已中止：${targetDir}\n  确认要覆盖请加 --force`
        )
      }
      fs.rmSync(targetDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 300 })
      console.log(`· 已删除旧的 admin 产物：${targetDir}`)
    } else {
      fail(`目标路径已存在但不是目录：${targetDir}`)
    }
  }

  fs.mkdirSync(targetDir, { recursive: true })
  fs.cpSync(sourceDir, targetDir, { recursive: true })
} catch (error) {
  const permissionHint =
    process.platform === 'win32'
      ? '权限不足：检查目标目录是否被其他进程占用，必要时用管理员权限执行'
      : '权限不足：确认当前用户对目标目录有写权限（sudo chown -R $(id -un) <目标目录>）'

  const hints = {
    EBUSY: '文件被占用：先执行 nginx -s reload 释放 open_file_cache 里的句柄再重试',
    EPERM: permissionHint,
    EACCES: permissionHint,
    ENOENT: '路径不存在或父目录不可写，检查 --target / ADMIN_DEPLOY_TARGET 是否写错',
    ENOSPC: '磁盘空间不足，清理后重试'
  }

  fail(
    `同步失败（${error.code ?? 'unknown'}）：${error.message}\n  ${
      hints[error.code] ?? '检查目标目录是否存在、是否只读'
    }`
  )
}

if (!fs.existsSync(path.join(targetDir, 'index.html'))) {
  fail('复制完成但目标目录缺少 index.html，请检查磁盘权限')
}

console.log(`✓ 管理端产物已同步 → ${targetDir}（${countFiles(targetDir)} 个文件）`)
