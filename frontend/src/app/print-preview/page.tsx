"use client";

import {Suspense, useEffect, useState} from "react";
import {useSearchParams} from "next/navigation";
import api from "@/lib/api";

interface EntityField {
    field?: string;
    name?: string;
    fieldLabel?: string;
    label?: string;
    type?: string;
    displayType?: string;
}

export default function PrintPreviewPage() {
    return (
        <Suspense>
            <PrintPreviewContent/>
        </Suspense>
    );
}

function PrintPreviewContent() {
    const searchParams = useSearchParams();
    const [record, setRecord] = useState<Record<string, unknown>>({});
    const [fields, setFields] = useState<EntityField[]>([]);
    const [loading, setLoading] = useState(true);
    const [entityLabel, setEntityLabel] = useState("");
    const [fontFamily, setFontFamily] = useState("SimSun, serif");
    const [fontSize, setFontSize] = useState("14");
    const [fontBold, setFontBold] = useState(false);
    const [showDetails, setShowDetails] = useState("true");

    const entity = searchParams.get("entity") || "";
    const recordId = searchParams.get("id") || "";

    useEffect(() => {
        if (entity && recordId) {
            loadData();
        } else {
            setLoading(false);
        }
    }, [entity, recordId]);

    const loadData = async () => {
        try {
            const [fieldsData, recordData, metaData] = await Promise.all([
                api.getFields(entity),
                api.getRecord(entity, recordId),
                api.getEntityMeta(entity).catch(() => ({})),
            ]);
            setFields(Array.isArray(fieldsData) ? fieldsData : ((fieldsData as Record<string, unknown>).fields || []) as EntityField[]);
            setRecord(recordData as Record<string, unknown>);
            setEntityLabel(((metaData as Record<string, unknown>).entityLabel || (metaData as Record<string, unknown>).label || entity) as string);
        } catch {
            // ignore
        } finally {
            setLoading(false);
        }
    };

    const getFieldValue = (name: string, type: string) => {
        const val = record[name];
        if (val === null || val === undefined) return "-";
        if (typeof val === "object") {
            if ((val as Record<string, unknown>).name) return String((val as Record<string, unknown>).name);
            return JSON.stringify(val);
        }
        if (type === "BOOL") return val ? "是" : "否";
        if (type === "DATE") {
            try {
                return new Date(String(val)).toLocaleDateString("zh-CN");
            } catch {
                return String(val);
            }
        }
        if (type === "DATETIME") {
            try {
                return new Date(String(val)).toLocaleString("zh-CN");
            } catch {
                return String(val);
            }
        }
        return String(val);
    };

    const handlePrint = () => {
        window.print();
    };

    const basicFields = fields.filter((f) => {
        const type = f.displayType || f.type || "";
        return !["NTEXT", "ATTACHMENT", "IMAGE"].includes(type);
    });

    const detailFields = fields.filter((f) => {
        const type = f.displayType || f.type || "";
        return ["NTEXT"].includes(type);
    });

    return (
        <div className="min-h-screen bg-white">
            {/* Print tools - hidden in print */}
            <div className="print:hidden fixed top-0 left-0 right-0 z-50 bg-gray-100 border-b shadow-sm">
                <div className="max-w-4xl mx-auto px-4 h-12 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => window.history.back()} className="text-gray-500 hover:text-gray-700">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
                            </svg>
                        </button>

                        {/* Detail show/hide */}
                        <select
                            value={showDetails}
                            onChange={(e) => setShowDetails(e.target.value)}
                            className="text-sm border rounded px-2 py-1"
                        >
                            <option value="true">显示明细</option>
                            <option value="false">隐藏明细</option>
                        </select>

                        {/* Font bold */}
                        <select
                            value={fontBold ? "true" : "false"}
                            onChange={(e) => setFontBold(e.target.value === "true")}
                            className="text-sm border rounded px-2 py-1"
                        >
                            <option value="false">正常字体</option>
                            <option value="true">加粗字体</option>
                        </select>

                        {/* Font family */}
                        <select
                            value={fontFamily}
                            onChange={(e) => setFontFamily(e.target.value)}
                            className="text-sm border rounded px-2 py-1"
                        >
                            <option value="SimSun, serif">宋体</option>
                            <option value="SimHei, sans-serif">黑体</option>
                            <option value="KaiTi, serif">楷体</option>
                            <option value="Microsoft YaHei, sans-serif">微软雅黑</option>
                            <option value="Arial, sans-serif">Arial</option>
                        </select>

                        {/* Font size */}
                        <select
                            value={fontSize}
                            onChange={(e) => setFontSize(e.target.value)}
                            className="text-sm border rounded px-2 py-1"
                        >
                            <option value="12">12px</option>
                            <option value="14">14px</option>
                            <option value="16">16px</option>
                            <option value="18">18px</option>
                            <option value="20">20px</option>
                        </select>
                    </div>

                    <button
                        onClick={handlePrint}
                        className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition flex items-center gap-1"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
                        </svg>
                        打印
                    </button>
                </div>
            </div>

            {/* Print content */}
            <div className="mt-14 print:mt-0">
                <div
                    className="max-w-4xl mx-auto px-4 py-8"
                    style={{fontFamily, fontSize: `${fontSize}px`, fontWeight: fontBold ? "bold" : "normal"}}
                >
                    {/* Header */}
                    <h1 className="text-center text-2xl font-bold mb-6 pb-3 border-b">
                        {entityLabel}
                    </h1>

                    {loading ? (
                        <div className="text-center py-20 text-gray-400">加载中...</div>
                    ) : (
                        <>
                            {/* Basic fields table */}
                            <table className="w-full border-collapse mb-6">
                                <tbody>
                                {basicFields.map((field, idx) => {
                                    const name = field.field || field.name || "";
                                    const label = field.fieldLabel || field.label || name;
                                    const type = field.displayType || field.type || "TEXT";
                                    const value = getFieldValue(name, type);
                                    const isEven = idx % 2 === 0;

                                    return (
                                        <tr key={idx} className={isEven ? "bg-gray-50" : ""}>
                                            <td className="border px-4 py-2 w-1/4 text-gray-600 font-medium"
                                                style={{width: "25%"}}>
                                                {label}
                                            </td>
                                            <td className="border px-4 py-2">{value}</td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>

                            {/* Detail fields (NTEXT) */}
                            {showDetails === "true" && detailFields.length > 0 && (
                                <div>
                                    {detailFields.map((field, idx) => {
                                        const name = field.field || field.name || "";
                                        const label = field.fieldLabel || field.label || name;
                                        const value = getFieldValue(name, "NTEXT");

                                        return (
                                            <div key={idx} className="mb-4">
                                                <h3 className="text-sm font-semibold text-gray-600 mb-1">{label}</h3>
                                                <div className="border rounded p-3 whitespace-pre-wrap text-sm">
                                                    {value}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}

                    {/* Footer */}
                    <div className="mt-8 pt-3 border-t text-right text-xs text-gray-400">
                        打印时间：{new Date().toLocaleString("zh-CN")}
                    </div>
                </div>
            </div>
        </div>
    );
}

