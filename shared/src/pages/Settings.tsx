import { useState, useEffect, useCallback } from 'react'
import { llmApi } from '../api'
import type { LLMConfig } from '../types'
import Layout from '../components/Layout'
import { Save, TestTube, Loader2, CheckCircle, XCircle, Info } from 'lucide-react'

const PRESET_MODELS = [
  { label: 'OpenAI GPT-4o', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o' },
  { label: 'OpenAI GPT-4o Mini', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  { label: 'DeepSeek Chat', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  { label: 'GLM-4-Flash', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-flash' },
  { label: 'GLM-4-Plus', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-plus' },
  { label: 'Claude Sonnet (via OpenAI兼容)', baseUrl: 'https://api.anthropic.com/v1', model: 'claude-sonnet-4-20250514' },
  { label: '自定义', baseUrl: '', model: '' },
]

export default function Settings() {
  const [config, setConfig] = useState<LLMConfig>({
    provider: 'openai',
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 4096,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [saved, setSaved] = useState(false)

  const fetchConfig = useCallback(async (signal?: AbortSignal) => {
    try {
      const data = await llmApi.getConfig()
      if (signal?.aborted) return
      setConfig(data)
    } catch (err) {
      if (signal?.aborted) return
      console.error(err)
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const ac = new AbortController()
    fetchConfig(ac.signal)
    return () => ac.abort()
  }, [fetchConfig])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      await llmApi.updateConfig(config)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const result = await llmApi.test()
      setTestResult(result)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setTestResult({ success: false, message: msg })
    } finally {
      setTesting(false)
    }
  }

  const handlePresetChange = (label: string) => {
    const preset = PRESET_MODELS.find(p => p.label === label)
    if (preset && preset.baseUrl) {
      setConfig(prev => ({ ...prev, baseUrl: preset.baseUrl, model: preset.model }))
    }
  }

  const currentPreset = PRESET_MODELS.find(p => p.baseUrl === config.baseUrl && p.model === config.model)?.label || '自定义'

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-20 text-[#94a3b8]">加载中...</div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">模型配置</h1>
          <p className="text-sm text-[#64748b] mt-1">配置云端大模型，用于AI辅助生成报告</p>
        </div>

        <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-[#475569] mb-2">预设模型</label>
            <select
              value={currentPreset}
              onChange={e => handlePresetChange(e.target.value)}
              className="w-full px-4 py-2.5 border border-[#e2e8f0] rounded-xl focus:ring-2 focus:ring-[#3b82f6] focus:border-[#3b82f6] outline-none text-sm bg-[#f8fafc]"
            >
              {PRESET_MODELS.map(p => (
                <option key={p.label} value={p.label}>{p.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#475569] mb-2">API Base URL</label>
            <input
              type="text"
              value={config.baseUrl}
              onChange={e => setConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
              className="w-full px-4 py-2.5 border border-[#e2e8f0] rounded-xl focus:ring-2 focus:ring-[#3b82f6] focus:border-[#3b82f6] outline-none text-sm bg-[#f8fafc]"
              placeholder="https://api.openai.com/v1"
            />
            <p className="text-xs text-[#94a3b8] mt-1.5">支持所有OpenAI兼容API（DeepSeek、GLM、Ollama等）</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#475569] mb-2">模型名称</label>
            <input
              type="text"
              value={config.model}
              onChange={e => setConfig(prev => ({ ...prev, model: e.target.value }))}
              className="w-full px-4 py-2.5 border border-[#e2e8f0] rounded-xl focus:ring-2 focus:ring-[#3b82f6] focus:border-[#3b82f6] outline-none text-sm bg-[#f8fafc]"
              placeholder="gpt-4o-mini"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#475569] mb-2">API Key</label>
            <input
              type="password"
              value={config.apiKey}
              onChange={e => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
              className="w-full px-4 py-2.5 border border-[#e2e8f0] rounded-xl focus:ring-2 focus:ring-[#3b82f6] focus:border-[#3b82f6] outline-none text-sm bg-[#f8fafc]"
              placeholder="sk-..."
            />
            <p className="text-xs text-[#94a3b8] mt-1.5">API Key仅存储在本地服务器，不会上传</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-[#475569] mb-2">Temperature</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.1}
                  value={config.temperature}
                  onChange={e => setConfig(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                  className="flex-1 accent-[#3b82f6]"
                />
                <span className="text-sm text-[#64748b] w-8 text-right font-medium">{config.temperature}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#475569] mb-2">Max Tokens</label>
              <input
                type="number"
                value={config.maxTokens}
                onChange={e => setConfig(prev => ({ ...prev, maxTokens: parseInt(e.target.value) || 4096 }))}
                className="w-full px-4 py-2.5 border border-[#e2e8f0] rounded-xl focus:ring-2 focus:ring-[#3b82f6] focus:border-[#3b82f6] outline-none text-sm bg-[#f8fafc]"
                min={256}
                max={32768}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2.5 bg-[#1e3a5f] text-white rounded-xl hover:bg-[#1e4976] transition text-sm font-semibold disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saved ? '已保存 ✓' : '保存配置'}
            </button>
            <button
              onClick={handleTest}
              disabled={testing || !config.apiKey}
              className="px-5 py-2.5 bg-[#f1f5f9] text-[#475569] rounded-xl hover:bg-[#e2e8f0] transition text-sm font-semibold disabled:opacity-50 flex items-center gap-1.5"
            >
              {testing ? <Loader2 size={14} className="animate-spin" /> : <TestTube size={14} />}
              测试连接
            </button>
          </div>

          {testResult && (
            <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${
              testResult.success
                ? 'bg-[#ecfdf5] text-[#047857] border border-[#a7f3d0]'
                : 'bg-[#fee2e2] text-[#991b1b] border border-[#fecaca]'
            }`}>
              {testResult.success ? <CheckCircle size={16} /> : <XCircle size={16} />}
              {testResult.message}
            </div>
          )}
        </div>

        <div className="bg-[#eff6ff] rounded-xl border border-[#bfdbfe] p-5">
          <div className="flex items-start gap-3">
            <Info size={20} className="text-[#3b82f6] shrink-0 mt-0.5" />
            <div className="text-sm text-[#1e40af] space-y-2">
              <p className="font-semibold">支持的模型提供商</p>
              <ul className="list-disc ml-4 space-y-1 text-[#3b82f6]">
                <li><strong>OpenAI</strong>：GPT-4o、GPT-4o Mini 等</li>
                <li><strong>DeepSeek</strong>：DeepSeek Chat / Coder</li>
                <li><strong>智谱GLM</strong>：GLM-4-Plus、GLM-4-Flash 等</li>
                <li><strong>本地模型</strong>：Ollama、LM Studio 等OpenAI兼容服务</li>
                <li><strong>其他</strong>：任何兼容OpenAI Chat Completions API的服务</li>
              </ul>
              <p className="text-xs text-[#60a5fa] mt-2">模型用于AI辅助生成晨间规划、日报、周报、月报内容，所有API Key仅保存在本地。</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}