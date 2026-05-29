"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import EntitySidebar from "@/components/EntitySidebar";
import api from "@/lib/api";

export default function FieldEditPage() {
  const { entity, field } = useParams<{ entity: string; field: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"edit" | "auto-fillin">("edit");
  const [form, setForm] = useState({
    fieldLabel: "",
    fieldName: "",
    displayType: "",
    comments: "",
    nullable: true,
    creatable: true,
    updatable: true,
    repeatable: false,
    buildin: false,
    defaultValue: "",
    // Type-specific
    dateFormat: "",
    datetimeFormat: "",
    timeFormat: "",
    picklistItems: [] as { text: string; id?: string }[],
    picklistStyle: "LIST",
    decimalFormat: "###,###.##",
    numberCalcMode: "NONE",
    seriesPrefix: "",
    seriesZero: 5,
    refEntity: "",
    refEntityLabel: "",
    cascadeField: "",
    fileUploadNumber: 9,
    fileSuffix: "",
    barcodeType: "QRCODE",
    classificationData: "",
    classificationLevel: 3,
  });

  const fetchField = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getFieldDetail(entity, field);
      const d = data as Record<string, unknown>;
      setForm({
        fieldLabel: (d.fieldLabel as string) || "",
        fieldName: (d.fieldName as string) || field,
        displayType: (d.displayType as string) || "",
        comments: (d.comments as string) || "",
        nullable: (d.nullable as boolean) ?? true,
        creatable: (d.creatable as boolean) ?? true,
        updatable: (d.updatable as boolean) ?? true,
        repeatable: (d.repeatable as boolean) ?? false,
        buildin: (d.buildin as boolean) ?? false,
        defaultValue: (d.defaultValue as string) || "",
        dateFormat: (d.dateFormat as string) || "",
        datetimeFormat: (d.datetimeFormat as string) || "",
        timeFormat: (d.timeFormat as string) || "",
        picklistItems: (d.picklistItems as { text: string; id?: string }[]) || [],
        picklistStyle: (d.picklistStyle as string) || "LIST",
        decimalFormat: (d.decimalFormat as string) || "###,###.##",
        numberCalcMode: (d.numberCalcMode as string) || "NONE",
        seriesPrefix: (d.seriesPrefix as string) || "",
        seriesZero: (d.seriesZero as number) ?? 5,
        refEntity: (d.refEntity as string) || "",
        refEntityLabel: (d.refEntityLabel as string) || "",
        cascadeField: (d.cascadeField as string) || "",
        fileUploadNumber: (d.fileUploadNumber as number) ?? 9,
        fileSuffix: (d.fileSuffix as string) || "",
        barcodeType: (d.barcodeType as string) || "QRCODE",
        classificationData: (d.classificationData as string) || "",
        classificationLevel: (d.classificationLevel as number) ?? 3,
      });
    } catch {
      setForm((prev) => ({ ...prev, fieldName: field }));
    }
    setLoading(false);
  }, [entity, field]);

  useEffect(() => {
    fetchField();
  }, [fetchField]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.saveField(entity, { ...form, fieldName: field });
      alert("保存成功");
    } catch {
      alert("保存失败");
    }
    setSaving(false);
  };

  const isRef = form.displayType === "REFERENCE" || form.displayType === "N2NREFERENCE";
  const isDate = form.displayType === "DATE";
  const isDatetime = form.displayType === "DATETIME";
  const isTime = form.displayType === "TIME";
  const isImage = form.displayType === "IMAGE";
  const isFile = form.displayType === "FILE";
  const isPicklist = form.displayType === "PICKLIST";
  const isMultiselect = form.displayType === "MULTISELECT";
  const isNumber = form.displayType === "NUMBER" || form.displayType === "DECIMAL";
  const isSeries = form.displayType === "SERIES";
  const isClassification = form.displayType === "CLASSIFICATION";
  const isBarcode = form.displayType === "BARCODE";
  const isLocation = form.displayType === "LOCATION";
  const isText = form.displayType === "TEXT" || form.displayType === "NTEXT";

  return (
    <div className="flex h-full">
      <EntitySidebar active="fields" />
      <div className="flex-1 overflow-auto bg-gray-50">
        <div className="px-6 pt-4 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href={`/admin/metadata/${entity}/fields`} className="text-gray-400 hover:text-gray-600">
              <span className="mdi mdi-arrow-left text-lg"></span>
            </Link>
            <h1 className="text-lg font-bold text-gray-800">字段编辑</h1>
            {isRef && (
              <div className="flex bg-white rounded-lg border overflow-hidden ml-4">
                <button
                  onClick={() => setActiveTab("edit")}
                  className={`px-3 py-1 text-xs ${activeTab === "edit" ? "bg-blue-600 text-white" : "text-gray-600"}`}
                >
                  基本信息
                </button>
                <button
                  onClick={() => setActiveTab("auto-fillin")}
                  className={`px-3 py-1 text-xs border-l ${activeTab === "auto-fillin" ? "bg-blue-600 text-white" : "text-gray-600"}`}
                >
                  表单回填
                </button>
              </div>
            )}
          </div>
          {!form.buildin && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="px-6 py-12 text-center text-gray-400">
            <span className="mdi mdi-loading mdi-spin text-2xl"></span>
          </div>
        ) : activeTab === "auto-fillin" ? (
          <AutoFillinTab entity={entity} field={field} />
        ) : (
          <div className="px-6 pb-6">
            <div className="bg-white rounded-xl shadow-sm border">
              <div className="p-6 space-y-6">
                {/* Basic fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">字段名称</label>
                    <input
                      type="text"
                      value={form.fieldLabel}
                      onChange={(e) => setForm({ ...form, fieldLabel: e.target.value })}
                      disabled={form.buildin}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">内部标识</label>
                    <input
                      type="text"
                      value={form.fieldName}
                      disabled
                      className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
                    <input
                      type="text"
                      value={form.displayType}
                      disabled
                      className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                    <input
                      type="text"
                      value={form.comments}
                      onChange={(e) => setForm({ ...form, comments: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* REFERENCE specific */}
                {isRef && (
                  <div className="border-t pt-4 space-y-4">
                    <h3 className="text-sm font-medium text-gray-700">引用设置</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">引用实体</label>
                        <input
                          type="text"
                          value={form.refEntityLabel || form.refEntity}
                          disabled
                          className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">级联字段</label>
                        <input
                          type="text"
                          value={form.cascadeField}
                          onChange={(e) => setForm({ ...form, cascadeField: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="无"
                        />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" className="rounded" />
                      <span>允许快速新建</span>
                    </label>
                  </div>
                )}

                {/* DATE/DATETIME/TIME format */}
                {(isDate || isDatetime || isTime) && (
                  <div className="border-t pt-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">日期格式</h3>
                    <select
                      value={isDate ? form.dateFormat : isDatetime ? form.datetimeFormat : form.timeFormat}
                      onChange={(e) => {
                        if (isDate) setForm({ ...form, dateFormat: e.target.value });
                        else if (isDatetime) setForm({ ...form, datetimeFormat: e.target.value });
                        else setForm({ ...form, timeFormat: e.target.value });
                      }}
                      className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {isDate && (
                        <>
                          <option value="yyyy-MM-dd">yyyy-MM-dd</option>
                          <option value="yyyy/MM/dd">yyyy/MM/dd</option>
                          <option value="dd/MM/yyyy">dd/MM/yyyy</option>
                          <option value="MM/dd/yyyy">MM/dd/yyyy</option>
                        </>
                      )}
                      {isDatetime && (
                        <>
                          <option value="yyyy-MM-dd HH:mm:ss">yyyy-MM-dd HH:mm:ss</option>
                          <option value="yyyy-MM-dd HH:mm">yyyy-MM-dd HH:mm</option>
                          <option value="yyyy/MM/dd HH:mm:ss">yyyy/MM/dd HH:mm:ss</option>
                        </>
                      )}
                      {isTime && (
                        <>
                          <option value="HH:mm:ss">HH:mm:ss</option>
                          <option value="HH:mm">HH:mm</option>
                        </>
                      )}
                    </select>
                  </div>
                )}

                {/* IMAGE/FILE settings */}
                {(isImage || isFile) && (
                  <div className="border-t pt-4 space-y-4">
                    <h3 className="text-sm font-medium text-gray-700">上传设置</h3>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">最大上传数量</label>
                      <input
                        type="range"
                        min={1}
                        max={9}
                        value={form.fileUploadNumber}
                        onChange={(e) => setForm({ ...form, fileUploadNumber: parseInt(e.target.value) })}
                        className="w-64"
                      />
                      <span className="ml-2 text-sm text-gray-600">{form.fileUploadNumber}</span>
                    </div>
                    {isFile && (
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">允许的文件后缀</label>
                        <input
                          type="text"
                          value={form.fileSuffix}
                          onChange={(e) => setForm({ ...form, fileSuffix: e.target.value })}
                          placeholder=".pdf,.doc,.xls,.xlsx"
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* PICKLIST/MULTISELECT */}
                {(isPicklist || isMultiselect) && (
                  <div className="border-t pt-4 space-y-4">
                    <h3 className="text-sm font-medium text-gray-700">选项列表</h3>
                    <div className="space-y-2">
                      {form.picklistItems.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="mdi mdi-drag-vertical text-gray-300 cursor-move"></span>
                          <input
                            type="text"
                            value={item.text}
                            onChange={(e) => {
                              const newItems = [...form.picklistItems];
                              newItems[idx].text = e.target.value;
                              setForm({ ...form, picklistItems: newItems });
                            }}
                            className="flex-1 px-3 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <button
                            onClick={() => {
                              setForm({ ...form, picklistItems: form.picklistItems.filter((_, i) => i !== idx) });
                            }}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <span className="mdi mdi-close"></span>
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => {
                          setForm({ ...form, picklistItems: [...form.picklistItems, { text: "" }] });
                        }}
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        <span className="mdi mdi-plus"></span>
                        添加选项
                      </button>
                    </div>
                    {isPicklist && (
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 text-sm">
                          <input type="radio" name="picklistStyle" checked={form.picklistStyle === "LIST"} onChange={() => setForm({ ...form, picklistStyle: "LIST" })} />
                          列表样式
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input type="radio" name="picklistStyle" checked={form.picklistStyle === "DROPDOWN"} onChange={() => setForm({ ...form, picklistStyle: "DROPDOWN" })} />
                          下拉样式
                        </label>
                      </div>
                    )}
                  </div>
                )}

                {/* NUMBER/DECIMAL */}
                {isNumber && (
                  <div className="border-t pt-4 space-y-4">
                    <h3 className="text-sm font-medium text-gray-700">数值设置</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">数字格式</label>
                        <select
                          value={form.decimalFormat}
                          onChange={(e) => setForm({ ...form, decimalFormat: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="###,###.##">###,###.##</option>
                          <option value="###,###.00">###,###.00</option>
                          <option value="###.##">###.##</option>
                          <option value="###%">###%</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">计算模式</label>
                        <select
                          value={form.numberCalcMode}
                          onChange={(e) => setForm({ ...form, numberCalcMode: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="NONE">无</option>
                          <option value="SUM">求和</option>
                          <option value="AVG">平均值</option>
                          <option value="MAX">最大值</option>
                          <option value="MIN">最小值</option>
                          <option value="COUNT">计数</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* SERIES */}
                {isSeries && (
                  <div className="border-t pt-4 space-y-4">
                    <h3 className="text-sm font-medium text-gray-700">自动编号设置</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">编号前缀</label>
                        <input
                          type="text"
                          value={form.seriesPrefix}
                          onChange={(e) => setForm({ ...form, seriesPrefix: e.target.value })}
                          placeholder="如: ORD-"
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">序号位数</label>
                        <select
                          value={form.seriesZero}
                          onChange={(e) => setForm({ ...form, seriesZero: parseInt(e.target.value) })}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                            <option key={n} value={n}>
                              {n} 位
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* BARCODE */}
                {isBarcode && (
                  <div className="border-t pt-4 space-y-4">
                    <h3 className="text-sm font-medium text-gray-700">条码设置</h3>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-sm">
                        <input type="radio" name="barcodeType" checked={form.barcodeType === "QRCODE"} onChange={() => setForm({ ...form, barcodeType: "QRCODE" })} />
                        二维码
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="radio" name="barcodeType" checked={form.barcodeType === "BARCODE"} onChange={() => setForm({ ...form, barcodeType: "BARCODE" })} />
                        条形码
                      </label>
                    </div>
                  </div>
                )}

                {/* CLASSIFICATION */}
                {isClassification && (
                  <div className="border-t pt-4 space-y-4">
                    <h3 className="text-sm font-medium text-gray-700">分类数据设置</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">分类数据</label>
                        <input
                          type="text"
                          value={form.classificationData}
                          disabled
                          className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">层级深度</label>
                        <select
                          value={form.classificationLevel}
                          onChange={(e) => setForm({ ...form, classificationLevel: parseInt(e.target.value) })}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {[1, 2, 3, 4, 5].map((n) => (
                            <option key={n} value={n}>
                              {n} 级
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" className="rounded" />
                      <span>多选</span>
                    </label>
                  </div>
                )}

                {/* Default value */}
                {!form.buildin && (
                  <div className="border-t pt-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">默认值</h3>
                    <input
                      type="text"
                      value={form.defaultValue}
                      onChange={(e) => setForm({ ...form, defaultValue: e.target.value })}
                      placeholder="留空表示无默认值"
                      className="w-full max-w-md px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                {/* Field attributes */}
                {!form.buildin && (
                  <div className="border-t pt-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">字段属性</h3>
                    <div className="flex flex-wrap gap-6">
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={form.nullable} onChange={(e) => setForm({ ...form, nullable: e.target.checked })} className="rounded" />
                        允许为空
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={form.creatable} onChange={(e) => setForm({ ...form, creatable: e.target.checked })} className="rounded" />
                        新建时可填
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={form.updatable} onChange={(e) => setForm({ ...form, updatable: e.target.checked })} className="rounded" />
                        编辑时可修改
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={form.repeatable} onChange={(e) => setForm({ ...form, repeatable: e.target.checked })} className="rounded" />
                        允许重复
                      </label>
                    </div>
                  </div>
                )}

                {/* Save button */}
                <div className="border-t pt-4 flex items-center gap-4">
                  {!form.buildin ? (
                    <>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        {saving ? "保存中..." : "保存"}
                      </button>
                    </>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 text-sm text-yellow-700">
                      <span className="mdi mdi-alert-circle mr-1"></span>
                      此为内置字段，只能修改部分属性
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Auto-fillin tab component
function AutoFillinTab({ entity, field }: { entity: string; field: string }) {
  const [items, setItems] = useState<{ id: string; targetField: string; sourceField: string; fillRule: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .listAutoFillins(entity, field)
      .then((data) => {
        const d = data as Record<string, unknown>;
        setItems((d.data || d.items || data || []) as typeof items);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [entity, field]);

  return (
    <div className="px-6 pb-6">
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-800">
            表单回填规则
            <span className="ml-2 text-xs text-gray-400">目标实体 → 源实体</span>
          </h2>
          <button className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-1">
            <span className="mdi mdi-plus"></span>
            添加
          </button>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">目标字段</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">源字段</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">回填规则</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500" style={{ width: "80px" }}>
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  <span className="mdi mdi-loading mdi-spin text-2xl"></span>
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  <p className="text-sm">暂无回填规则</p>
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{item.targetField}</td>
                  <td className="px-4 py-3 text-sm">{item.sourceField}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{item.fillRule || "直接回填"}</td>
                  <td className="px-4 py-3 text-sm text-right">
                    <button className="p-1 text-gray-400 hover:text-red-500" title="删除">
                      <span className="mdi mdi-delete text-base"></span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
