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

  const fetchConfig = useCallback(async () => {
    try {
      const data = await llmApi.getConfig()
      setConfig(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConfig()
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
        <div className="text-center py-20 text-slate-400">加载中...</div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">模型配置</h1>
          <p className="text-sm text-slate-500 mt-1">配置云端大模型，用于AI辅助生成报告</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">预设模型</label>
            <select
              value={currentPreset}
              onChange={e => handlePresetChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-sm"
            >
              {PRESET_MODELS.map(p => (
                <option key={p.label} value={p.label}>{p.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">API Base URL</label>
            <input
              type="text"
              value={config.baseUrl}
              onChange={e => setConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-sm"
              placeholder="https://api.openai.com/v1"
            />
            <p className="text-xs text-slate-400 mt-1">支持所有OpenAI兼容API（DeepSeek、GLM、Ollama等）</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">模型名称</label>
            <input
              type="text"
              value={config.model}
              onChange={e => setConfig(prev => ({ ...prev, model: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-sm"
              placeholder="gpt-4o-mini"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">API Key</label>
            <input
              type="password"
              value={config.apiKey}
              onChange={e => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-sm"
              placeholder="sk-..."
            />
            <p className="text-xs text-slate-400 mt-1">API Key仅存储在本地服务器，不会上传</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Temperature</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.1}
                  value={config.temperature}
                  onChange={e => setConfig(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                  className="flex-1 accent-purple-500"
                />
                <span className="text-sm text-slate-600 w-8 text-right">{config.temperature}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Max Tokens</label>
              <input
                type="number"
                value={config.maxTokens}
                onChange={e => setConfig(prev => ({ ...prev, maxTokens: parseInt(e.target.value) || 4096 }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-sm"
                min={256}
                max={32768}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-medium disabled:opacity-50 flex items-center gap-1.5"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saved ? '已保存' : '保存配置'}
            </button>
            <button
              onClick={handleTest}
              disabled={testing || !config.apiKey}
              className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition text-sm font-medium disabled:opacity-50 flex items-center gap-1.5"
            >
              {testing ? <Loader2 size={14} className="animate-spin" /> : <TestTube size={14} />}
              测试连接
            </button>
          </div>

          {testResult && (
            <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
              testResult.success
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {testResult.success ? <CheckCircle size={16} /> : <XCircle size={16} />}
              {testResult.message}
            </div>
          )}
        </div>

        <div className="bg-blue-50 rounded-xl border border-blue-200 p-5">
          <div className="flex items-start gap-3">
            <Info size={20} className="text-blue-500 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700 space-y-2">
              <p className="font-medium">支持的模型提供商</p>
              <ul className="list-disc ml-4 space-y-1 text-blue-600">
                <li><strong>OpenAI</strong>：GPT-4o、GPT-4o Mini 等</li>
                <li><strong>DeepSeek</strong>：DeepSeek Chat / Coder</li>
                <li><strong>智谱GLM</strong>：GLM-4-Plus、GLM-4-Flash 等</li>
                <li><strong>本地模型</strong>：Ollama、LM Studio 等OpenAI兼容服务</li>
                <li><strong>其他</strong>：任何兼容OpenAI Chat Completions API的服务</li>
              </ul>
              <p className="text-xs text-blue-500 mt-2">模型用于AI辅助生成晨间规划、日报、周报、月报内容，所有API Key仅保存在本地。</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
