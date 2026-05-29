"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import EntitySidebar from "@/components/EntitySidebar";
import api from "@/lib/api";

interface I18nItem {
  id: string;
  name: string;
  label: string;
  type: "entity" | "field";
  translations: Record<string, string>;
}

export default function EntityI18nPage() {
  const { entity } = useParams<{ entity: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<I18nItem[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [selectedLangs, setSelectedLangs] = useState<string[]>([]);
  const [showLangDropdown, setShowLangDropdown] = useState(false);

  const AVAILABLE_LANGS = [
    { code: "zh_CN", label: "简体中文" },
    { code: "zh_TW", label: "繁体中文" },
    { code: "en", label: "English" },
    { code: "ja", label: "日本語" },
    { code: "ko", label: "한국어" },
    { code: "fr", label: "Français" },
    { code: "de", label: "Deutsch" },
    { code: "es", label: "Español" },
    { code: "pt", label: "Português" },
    { code: "ru", label: "Русский" },
  ];

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getEntityI18n(entity);
      const d = data as Record<string, unknown>;
      setItems((d.items || d.data || data || []) as I18nItem[]);
      setLanguages((d.languages || []) as string[]);
      setSelectedLangs((d.languages || ["en"]) as string[]);
    } catch {
      setItems([]);
    }
    setLoading(false);
  }, [entity]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.saveEntityI18n(entity, { items, languages: selectedLangs });
      alert("保存成功");
    } catch {
      alert("保存失败");
    }
    setSaving(false);
  };

  const handleTranslationChange = (itemId: string, lang: string, value: string) => {
    setItems(
      items.map((item) =>
        item.id === itemId ? { ...item, translations: { ...item.translations, [lang]: value } } : item
      )
    );
  };

  const toggleLang = (code: string) => {
    setSelectedLangs((prev) => (prev.includes(code) ? prev.filter((l) => l !== code) : [...prev, code]));
  };

  return (
    <div className="flex h-full">
      <EntitySidebar active="i18n" />
      <div className="flex-1 overflow-auto bg-gray-50">
        <div className="px-6 pt-4 pb-2 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-800">多语言管理</h1>
          <div className="flex items-center gap-3">
            {/* Language selector dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowLangDropdown(!showLangDropdown)}
                className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <span className="mdi mdi-translate"></span>
                语言 ({selectedLangs.length})
                <span className="mdi mdi-chevron-down"></span>
              </button>
              {showLangDropdown && (
                <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg z-10 w-48">
                  <div className="p-3 space-y-2">
                    {AVAILABLE_LANGS.map((lang) => (
                      <label key={lang.code} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedLangs.includes(lang.code)}
                          onChange={() => toggleLang(lang.code)}
                          className="rounded"
                        />
                        {lang.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </div>

        <div className="px-6 pb-6">
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500" style={{ width: "120px" }}>
                    类型
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500" style={{ width: "200px" }}>
                    名称
                  </th>
                  {selectedLangs.map((lang) => {
                    const langInfo = AVAILABLE_LANGS.find((l) => l.code === lang);
                    return (
                      <th key={lang} className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                        {langInfo?.label || lang}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={2 + selectedLangs.length} className="px-4 py-8 text-center text-gray-400">
                      <span className="mdi mdi-loading mdi-spin text-2xl"></span>
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={2 + selectedLangs.length} className="px-4 py-8 text-center text-gray-400">
                      <span className="mdi mdi-translate text-2xl"></span>
                      <p className="mt-1 text-sm">暂无翻译项</p>
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm">
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            item.type === "entity" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {item.type === "entity" ? "实体" : "字段"}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm font-medium text-gray-700">{item.label}</td>
                      {selectedLangs.map((lang) => (
                        <td key={lang} className="px-4 py-2">
                          <input
                            type="text"
                            value={item.translations[lang] || ""}
                            onChange={(e) => handleTranslationChange(item.id, lang, e.target.value)}
                            placeholder={item.label}
                            className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
