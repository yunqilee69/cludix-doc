#!/usr/bin/env node

/**
 * 文档 tags 验证脚本
 * 
 * 功能：
 * 1. 检查 docs/ 目录下的 Markdown 文件是否有 tags 字段
 * 2. 验证 tags 是否在白名单中
 * 3. 排除 docs/nebula/ 目录（后续独立文档站）
 * 
 * 使用：npm run check-doc-tags
 */

const fs = require('fs');
const path = require('path');

// ========== 配置 ==========

/**
 * 从项目根目录读取白名单配置文件
 */
function loadAllowedTags() {
  const whitelistPath = path.join(process.cwd(), 'allowed-tags.json');
  
  if (!fs.existsSync(whitelistPath)) {
    console.error('❌ 白名单配置文件不存在: allowed-tags.json');
    console.error('请在项目根目录创建 allowed-tags.json 文件');
    process.exit(1);
  }
  
  try {
    const content = fs.readFileSync(whitelistPath, 'utf-8');
    const config = JSON.parse(content);
    return config.tags || [];
  } catch (error) {
    console.error('❌ 白名单配置文件解析失败:', error.message);
    process.exit(1);
  }
}

const ALLOWED_TAGS = loadAllowedTags();

/**
 * 排除的目录（不进行验证）
 */
const EXCLUDE_DIRS = [
  'nebula'  // 后续独立文档站
];

/**
 * 允许没有 tags 的文件（索引页等）
 */
const ALLOW_NO_TAGS_FILES = [
  'index.md',
  '_category_.json',
  'sidebar.js',
  'sidebar.ts'
];

// ========== 工具函数 ==========

/**
 * 递归遍历目录，收集所有 .md 文件
 */
function collectMarkdownFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // 检查是否在排除列表中
      if (EXCLUDE_DIRS.includes(file)) {
        continue;
      }
      collectMarkdownFiles(filePath, fileList);
    } else if (file.endsWith('.md')) {
      fileList.push(filePath);
    }
  }
  
  return fileList;
}

/**
 * 解析 YAML front matter，提取 tags
 * 支持格式：
 * - tags: [tag1, tag2]
 * - tags: tag1
 * - tags:
 *     - tag1
 *     - tag2
 */
function parseFrontMatterTags(content) {
  // 提取 front matter (---之间的内容)
  // 支持 Windows (\r\n) 和 Unix (\n) 换行符
  const frontMatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  
  if (!frontMatterMatch) {
    return null; // 没有 front matter
  }
  
  const frontMatter = frontMatterMatch[1];
  
  // 查找 tags 字段
  const tagsMatch = frontMatter.match(/tags:\s*(.+)/);
  
  if (!tagsMatch) {
    return []; // 有 front matter 但没有 tags
  }
  
  const tagsValue = tagsMatch[1].trim();
  
  // 解析不同格式
  
  // 格式1: tags: [tag1, tag2]
  if (tagsValue.startsWith('[') && tagsValue.endsWith(']')) {
    const inner = tagsValue.slice(1, -1);
    return inner.split(',').map(t => t.trim().replace(/['"]/g, '')).filter(t => t);
  }
  
  // 格式2: tags: tag1 (单值)
  if (!tagsValue.startsWith('-') && !tagsValue.includes('\n')) {
    return [tagsValue.replace(/['"]/g, '')];
  }
  
  // 格式3: tags: 后跟多行列表 (需要查看完整 front matter)
  const lines = frontMatter.split('\n');
  const tags = [];
  let inTagsSection = false;
  
  for (const line of lines) {
    if (line.startsWith('tags:')) {
      inTagsSection = true;
      // 处理 inline 格式 tags: [xxx]
      const inlineMatch = line.match(/tags:\s*\[([^\]]+)\]/);
      if (inlineMatch) {
        return inlineMatch[1].split(',').map(t => t.trim().replace(/['"]/g, '')).filter(t => t);
      }
      continue;
    }
    
    if (inTagsSection) {
      if (line.startsWith('  - ') || line.startsWith('- ')) {
        tags.push(line.replace(/^[\s-]+/, '').trim().replace(/['"]/g, ''));
      } else if (line.trim() && !line.startsWith(' ') && !line.startsWith('-')) {
        // 遇到下一个字段，结束 tags 解析
        break;
      }
    }
  }
  
  return tags.filter(t => t);
}

/**
 * 验证单个文件的 tags
 */
function validateFile(filePath) {
  const errors = [];
  const fileName = path.basename(filePath);
  const relativePath = path.relative(process.cwd(), filePath);
  
  // 允许索引页没有 tags
  if (ALLOW_NO_TAGS_FILES.includes(fileName)) {
    return { passed: true, errors: [], tags: [], file: relativePath };
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const tags = parseFrontMatterTags(content);
  
  // 没有 front matter
  if (tags === null) {
    return {
      passed: true, // 允许没有 front matter（很多文档只有标题行 #）
      errors: [],
      tags: [],
      file: relativePath,
      hasNoFrontMatter: true
    };
  }
  
  // 有 front matter 但没有 tags
  if (tags.length === 0) {
    errors.push({
      type: 'missing_tags',
      message: `缺少 tags 字段`,
      file: relativePath
    });
    return { passed: false, errors, tags: [], file: relativePath };
  }
  
  // 验证每个 tag 是否在白名单中
  const invalidTags = [];
  for (const tag of tags) {
    // 转换为小写进行比较（大小写不敏感）
    const normalizedTag = tag.toLowerCase().replace(/\s+/g, '-');
    if (!ALLOWED_TAGS.includes(normalizedTag)) {
      invalidTags.push(tag);
    }
  }
  
  if (invalidTags.length > 0) {
    errors.push({
      type: 'invalid_tags',
      message: `使用了不在白名单中的 tag: ${invalidTags.join(', ')}`,
      file: relativePath,
      invalidTags
    });
  }
  
  return {
    passed: errors.length === 0,
    errors,
    tags,
    file: relativePath
  };
}

// ========== 主流程 ==========

function main() {
  const docsDir = path.join(process.cwd(), 'docs');
  
  console.log('========================================');
  console.log('文档 tags 验证');
  console.log('========================================\n');
  
  // 检查 docs 目录是否存在
  if (!fs.existsSync(docsDir)) {
    console.error('❌ docs 目录不存在');
    process.exit(1);
  }
  
  // 收集所有 Markdown 文件
  const mdFiles = collectMarkdownFiles(docsDir);
  
  console.log(`📁 扫描目录: docs/`);
  console.log(`📄 发现文件: ${mdFiles.length} 个`);
  console.log(`🚫 排除目录: ${EXCLUDE_DIRS.join(', ')}`);
  console.log('');
  
  const report = {
    total: mdFiles.length,
    passed: 0,
    failed: 0,
    noFrontMatter: 0,
    skipped: 0,
    errors: [],
    taggedFiles: []
  };
  
  // 验证每个文件
  for (const filePath of mdFiles) {
    const result = validateFile(filePath);
    
    if (result.hasNoFrontMatter) {
      report.noFrontMatter++;
      console.log(`⚪ ${result.file} (无 front matter)`);
    } else if (result.passed) {
      report.passed++;
      report.taggedFiles.push({ file: result.file, tags: result.tags });
      console.log(`✅ ${result.file}`);
      console.log(`   tags: ${result.tags.join(', ')}`);
    } else {
      report.failed++;
      console.log(`❌ ${result.file}`);
      result.errors.forEach(err => {
        console.log(`   错误: ${err.message}`);
        report.errors.push(err);
      });
    }
  }
  
  // 输出汇总报告
  console.log('\n========================================');
  console.log('验证结果汇总');
  console.log('========================================');
  console.log(`总文件数:    ${report.total}`);
  console.log(`验证通过:    ${report.passed}`);
  console.log(`验证失败:    ${report.failed}`);
  console.log(`无 front matter: ${report.noFrontMatter}`);
  console.log('');
  
  // 显示已验证的 tags 示例
  if (report.taggedFiles.length > 0) {
    console.log('已验证的文档 tags:');
    report.taggedFiles.slice(0, 5).forEach(item => {
      console.log(`  - ${item.file}: [${item.tags.join(', ')}]`);
    });
    if (report.taggedFiles.length > 5) {
      console.log(`  ... 还有 ${report.taggedFiles.length - 5} 个文档`);
    }
    console.log('');
  }
  
  // 显示白名单
  console.log('允许的 tag 白名单:');
  console.log(`  配置文件: allowed-tags.json`);
  console.log(`  (共 ${ALLOWED_TAGS.length} 个有效 tag)`);
  console.log('');
  
  // 最终判断
  if (report.failed > 0) {
    console.log('========================================');
    console.log('❌ 验证失败');
    console.log('========================================');
    console.log('请修复以上问题后重新运行验证。');
    console.log('');
    console.log('提示:');
    console.log('1. 为缺少 tags 的文档添加 tags 字段');
    console.log('2. 确保使用的 tag 在白名单中');
    console.log('3. tags 格式示例:');
    console.log('   ---');
    console.log('   title: 文档标题');
    console.log('   tags: [docker, deployment]');
    console.log('   ---');
    process.exit(1);
  } else {
    console.log('========================================');
    console.log('✅ 验证通过');
    console.log('========================================');
    console.log('所有文档 tags 符合规范！');
    process.exit(0);
  }
}

// 运行
main();