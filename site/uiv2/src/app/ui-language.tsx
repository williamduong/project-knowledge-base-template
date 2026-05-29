import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAiSettings, useSaveAiSettings } from './hooks/svfactory/useAiSettings'

export type UiLanguage = 'en' | 'vi'

type TranslationKey =
  | 'shell.search'
  | 'shell.sync'
  | 'shell.syncing'
  | 'shell.language'
  | 'shell.languageShort'
  | 'shell.updatedSignals'
  | 'shell.noSignalChange'
  | 'shell.signalsUnavailable'
  | 'shell.projectEditHint'
  | 'tab.dashboard'
  | 'tab.code'
  | 'tab.intent'
  | 'tab.rules'
  | 'tab.flow'
  | 'tab.tools'
  | 'tab.dna'
  | 'tab.system'
  | 'system.menu'
  | 'system.operatorPanels'
  | 'system.services'
  | 'system.cron'
  | 'system.pipeline'
  | 'system.gates'
  | 'system.aiSettings'
  | 'system.aiStatus.keyConfigured'
  | 'system.aiStatus.keyMissing'
  | 'system.language.label'
  | 'system.language.help'
  | 'system.language.english'
  | 'system.language.vietnamese'
  | 'system.aiCard.copy'
  | 'system.ai.provider'
  | 'system.ai.key'
  | 'system.ai.keyPlaceholder'
  | 'system.ai.keyReplacePlaceholder'
  | 'system.ai.model'
  | 'system.ai.endpoint'
  | 'system.ai.systemPrompt'
  | 'system.ai.systemPromptPlaceholder'
  | 'system.ai.planningHarness'
  | 'system.ai.planningHarnessPlaceholder'
  | 'system.ai.primaryGoals'
  | 'system.ai.primaryGoalsPlaceholder'
  | 'system.ai.appDescription'
  | 'system.ai.appDescriptionPlaceholder'
  | 'system.ai.save'
  | 'system.ai.saving'
  | 'system.ai.test'
  | 'system.ai.testing'
  | 'system.ai.clearKey'
  | 'system.ai.saved'

const uiLanguageStorageKey = 'kbx-ui-language'

const messages: Record<UiLanguage, Record<TranslationKey, string>> = {
  en: {
    'shell.search': 'Open search',
    'shell.sync': 'Sync Signals',
    'shell.syncing': 'Syncing...',
    'shell.language': 'Interface language',
    'shell.languageShort': 'Language',
    'shell.updatedSignals': 'Updated signals',
    'shell.noSignalChange': 'No signal change',
    'shell.signalsUnavailable': 'Signals unavailable',
    'shell.projectEditHint': 'Double click to edit project name',
    'tab.dashboard': 'Dashboard',
    'tab.code': 'Code',
    'tab.intent': 'Intent',
    'tab.rules': 'Rules',
    'tab.flow': 'Flow',
    'tab.tools': 'Tools',
    'tab.dna': 'DNA',
    'tab.system': 'System',
    'system.menu': 'System Menu',
    'system.operatorPanels': 'Operator Panels',
    'system.services': 'Services',
    'system.cron': 'Cron Schedules',
    'system.pipeline': 'Pipeline',
    'system.gates': 'Gates',
    'system.aiSettings': 'AI Settings',
    'system.aiStatus.keyConfigured': 'key configured',
    'system.aiStatus.keyMissing': 'key missing',
    'system.language.label': 'Interface Language',
    'system.language.help': 'Applies to shell navigation and system configuration labels across this control plane.',
    'system.language.english': 'English',
    'system.language.vietnamese': 'Vietnamese',
    'system.aiCard.copy': 'Store one DeepSeek key locally, tune the base prompts, then keep the app goals and description close to the runtime so suggestions stay grounded.',
    'system.ai.provider': 'Provider deepseek',
    'system.ai.key': 'DeepSeek API Key',
    'system.ai.keyPlaceholder': 'Paste DeepSeek API key',
    'system.ai.keyReplacePlaceholder': 'Stored key is encrypted locally. Paste new key to replace.',
    'system.ai.model': 'Model',
    'system.ai.endpoint': 'Endpoint',
    'system.ai.systemPrompt': 'System Prompt',
    'system.ai.systemPromptPlaceholder': 'Base instruction for DeepSeek when acting inside this control plane.',
    'system.ai.planningHarness': 'Planning Harness',
    'system.ai.planningHarnessPlaceholder': 'Short harness prompt for planning / suggestion actions.',
    'system.ai.primaryGoals': 'Primary Goals',
    'system.ai.primaryGoalsPlaceholder': 'High-level goals that the AI should respect.',
    'system.ai.appDescription': 'App Description',
    'system.ai.appDescriptionPlaceholder': 'Describe the app and workspace in one grounded paragraph.',
    'system.ai.save': 'Save Settings',
    'system.ai.saving': 'Saving...',
    'system.ai.test': 'Test DeepSeek',
    'system.ai.testing': 'Testing...',
    'system.ai.clearKey': 'Clear Key',
    'system.ai.saved': 'Saved',
  },
  vi: {
    'shell.search': 'Mở tìm kiếm',
    'shell.sync': 'Đồng bộ tín hiệu',
    'shell.syncing': 'Đang đồng bộ...',
    'shell.language': 'Ngôn ngữ giao diện',
    'shell.languageShort': 'Ngôn ngữ',
    'shell.updatedSignals': 'Đã cập nhật tín hiệu',
    'shell.noSignalChange': 'Không có thay đổi tín hiệu',
    'shell.signalsUnavailable': 'Không có tín hiệu',
    'shell.projectEditHint': 'Nhấp đúp để sửa tên dự án',
    'tab.dashboard': 'Tổng quan',
    'tab.code': 'Code',
    'tab.intent': 'Intent',
    'tab.rules': 'Rules',
    'tab.flow': 'Flow',
    'tab.tools': 'Tools',
    'tab.dna': 'DNA',
    'tab.system': 'Hệ thống',
    'system.menu': 'Menu hệ thống',
    'system.operatorPanels': 'Bảng điều hành',
    'system.services': 'Dịch vụ',
    'system.cron': 'Lịch cron',
    'system.pipeline': 'Pipeline',
    'system.gates': 'Gates',
    'system.aiSettings': 'Cấu hình AI',
    'system.aiStatus.keyConfigured': 'đã cấu hình key',
    'system.aiStatus.keyMissing': 'thiếu key',
    'system.language.label': 'Ngôn ngữ giao diện',
    'system.language.help': 'Áp dụng cho điều hướng shell và các nhãn cấu hình hệ thống trong control plane này.',
    'system.language.english': 'Tiếng Anh',
    'system.language.vietnamese': 'Tiếng Việt',
    'system.aiCard.copy': 'Lưu một DeepSeek key cục bộ, tinh chỉnh prompt nền, rồi giữ mục tiêu và mô tả ứng dụng sát runtime để các gợi ý bám ngữ cảnh hơn.',
    'system.ai.provider': 'Nhà cung cấp deepseek',
    'system.ai.key': 'DeepSeek API Key',
    'system.ai.keyPlaceholder': 'Dán DeepSeek API key',
    'system.ai.keyReplacePlaceholder': 'Key đã được mã hóa cục bộ. Dán key mới để thay thế.',
    'system.ai.model': 'Model',
    'system.ai.endpoint': 'Endpoint',
    'system.ai.systemPrompt': 'System Prompt',
    'system.ai.systemPromptPlaceholder': 'Chỉ dẫn nền cho DeepSeek khi hoạt động trong control plane này.',
    'system.ai.planningHarness': 'Planning Harness',
    'system.ai.planningHarnessPlaceholder': 'Prompt harness ngắn cho các hành động lập kế hoạch / gợi ý.',
    'system.ai.primaryGoals': 'Mục tiêu chính',
    'system.ai.primaryGoalsPlaceholder': 'Các mục tiêu cấp cao mà AI phải tôn trọng.',
    'system.ai.appDescription': 'Mô tả ứng dụng',
    'system.ai.appDescriptionPlaceholder': 'Mô tả ứng dụng và workspace trong một đoạn ngắn bám ngữ cảnh.',
    'system.ai.save': 'Lưu cấu hình',
    'system.ai.saving': 'Đang lưu...',
    'system.ai.test': 'Kiểm tra DeepSeek',
    'system.ai.testing': 'Đang kiểm tra...',
    'system.ai.clearKey': 'Xóa key',
    'system.ai.saved': 'Đã lưu',
  },
}

type UiLanguageContextValue = {
  language: UiLanguage
  setLanguage: (language: UiLanguage) => void
  t: (key: TranslationKey) => string
  isSaving: boolean
}

const UiLanguageContext = createContext<UiLanguageContextValue | null>(null)

function readStoredLanguage(): UiLanguage {
  if (typeof window === 'undefined') return 'en'
  return window.localStorage.getItem(uiLanguageStorageKey) === 'vi' ? 'vi' : 'en'
}

export function UiLanguageProvider({ children }: { children: ReactNode }) {
  const aiSettingsQuery = useAiSettings()
  const saveAiSettings = useSaveAiSettings()
  const [language, setLanguageState] = useState<UiLanguage>(readStoredLanguage)

  useEffect(() => {
    const nextLanguage = aiSettingsQuery.data?.settings.ui_language
    if (!nextLanguage) return
    setLanguageState(nextLanguage)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(uiLanguageStorageKey, nextLanguage)
    }
  }, [aiSettingsQuery.data?.settings.ui_language])

  const value = useMemo<UiLanguageContextValue>(() => ({
    language,
    setLanguage: (nextLanguage) => {
      setLanguageState(nextLanguage)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(uiLanguageStorageKey, nextLanguage)
      }
      saveAiSettings.mutate({ ui_language: nextLanguage })
    },
    t: (key) => messages[language][key] || messages.en[key] || key,
    isSaving: saveAiSettings.isPending,
  }), [language, saveAiSettings])

  return <UiLanguageContext.Provider value={value}>{children}</UiLanguageContext.Provider>
}

export function useUiLanguage() {
  const context = useContext(UiLanguageContext)
  if (!context) {
    throw new Error('useUiLanguage must be used inside UiLanguageProvider')
  }
  return context
}
