"use client";
import { useState } from "react";
import { useT } from "@/lib/i18n";

export default function ApiDoc({ base }: { base: string }) {
  const t = useT();
  const [open, setOpen] = useState<string | null>("post-shares");

  const reqLabels: Record<string, string> = {
    yes: t("doc.api.req.yes"),
    "yes*": t("doc.api.req.yesConditional"),
    no: t("doc.api.req.no"),
  };

  const endpoints = [
    {
      id: "post-shares",
      method: "POST",
      path: "/api/shares",
      title: t("doc.api.postShares.title"),
      desc: t("doc.api.postShares.desc"),
      params: [
        ["type", "yes", '"text" | "markdown" | "code" | "file" | "image"'],
        ["content", "yes*", t("doc.api.postShares.param.content")],
        ["title", "no", t("doc.api.postShares.param.title")],
        ["language", "no", t("doc.api.postShares.param.language")],
        ["file", "yes*", t("doc.api.postShares.param.file")],
      ],
      examples: [
        [t("doc.api.example.text"), `curl -X POST ${base}/api/shares \\\n  -H 'Content-Type: application/json' \\\n  -d '{"type":"text","content":"Hello!"}'`],
        [t("doc.api.example.code"), `curl -X POST ${base}/api/shares \\\n  -H 'Content-Type: application/json' \\\n  -d '{"type":"code","content":"print(42)","language":"python"}'`],
        [t("doc.api.example.file"), `curl -X POST ${base}/api/shares \\\n  -F type=file -F file=@./doc.pdf`],
        [t("doc.api.example.image"), `curl -X POST ${base}/api/shares \\\n  -F type=image -F file=@./pic.png`],
      ],
      response: `{
  "id": "aBcDeFgHiJ",
  "type": "text",
  "createdAt": "2026-03-17T12:00:00Z",
  "url": "${base}/s/aBcDeFgHiJ",
  "raw": "${base}/api/shares/aBcDeFgHiJ/raw",
  "api": "${base}/api/shares/aBcDeFgHiJ"
}`,
    },
    {
      id: "get-shares",
      method: "GET",
      path: "/api/shares",
      title: t("doc.api.getShares.title"),
      desc: t("doc.api.getShares.desc"),
      params: [
        ["limit", "no", t("doc.api.getShares.param.limit")],
        ["offset", "no", t("doc.api.getShares.param.offset")],
      ],
      examples: [
        [t("doc.api.example.list"), `curl ${base}/api/shares`],
        [t("doc.api.example.page2"), `curl '${base}/api/shares?limit=10&offset=10'`],
      ],
      response: `{ "shares": [...], "count": 10, "limit": 20, "offset": 0 }`,
    },
    {
      id: "get-share",
      method: "GET",
      path: "/api/shares/:id",
      title: t("doc.api.getShare.title"),
      desc: t("doc.api.getShare.desc"),
      params: [],
      examples: [[t("doc.api.example.fetch"), `curl ${base}/api/shares/aBcDeFgHiJ`]],
      response: `{ "id": "...", "type": "text", "content": "Hello!", "url": "...", "raw": "..." }`,
    },
    {
      id: "get-raw",
      method: "GET",
      path: "/api/shares/:id/raw",
      title: t("doc.api.getRaw.title"),
      desc: t("doc.api.getRaw.desc"),
      params: [],
      examples: [
        [t("doc.api.example.view"), `curl ${base}/api/shares/aBcDeFgHiJ/raw`],
        [t("doc.api.example.download"), `curl -OJ ${base}/api/shares/aBcDeFgHiJ/raw`],
        [t("doc.api.example.clipboard"), `curl -s ${base}/api/shares/aBcDeFgHiJ/raw | pbcopy`],
      ],
      response: t("doc.api.getRaw.response"),
    },
  ];

  return (
    <div className="space-y-3">
      <p className="text-pixel-gray text-sm">
        {t("doc.api.baseLabel")} <code className="text-pixel-cyan">{base}</code>{" "}
        — {t("doc.api.baseNote")}
      </p>

      {endpoints.map((ep) => {
        const isOpen = open === ep.id;
        const isPost = ep.method === "POST";
        return (
          <div
            key={ep.id}
            className="pixel-border bg-pixel-dark/30 overflow-hidden"
          >
            <button
              onClick={() => setOpen(isOpen ? null : ep.id)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-pixel-green/5 transition-colors"
            >
              <span
                className={`font-[family-name:var(--font-pixel-stack)] text-[11px] px-1.5 py-0.5 border shrink-0 ${
                  isPost
                    ? "text-pixel-amber border-pixel-amber/40"
                    : "text-pixel-cyan border-pixel-cyan/40"
                }`}
              >
                {ep.method}
              </span>
              <code className="text-pixel-green text-sm">{ep.path}</code>
              <span className="text-pixel-gray text-sm ml-auto hidden sm:inline">
                {ep.title}
              </span>
              <span className="text-pixel-gray/40 text-sm ml-2">
                {isOpen ? "▲" : "▼"}
              </span>
            </button>

            {isOpen && (
              <div className="px-4 pb-4 space-y-3 border-t border-pixel-green/10 pt-3">
                <p className="text-pixel-gray text-sm">{ep.desc}</p>

                {ep.params.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-pixel-green/10 text-pixel-gray/50">
                          <th className="text-left py-1 pr-3">{t("doc.api.table.param")}</th>
                          <th className="text-left py-1 pr-3">{t("doc.api.table.req")}</th>
                          <th className="text-left py-1">{t("doc.api.table.description")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ep.params.map(([name, req, desc]) => (
                          <tr
                            key={name}
                            className="border-b border-pixel-green/5"
                          >
                            <td className="py-1 pr-3">
                              <code className="text-pixel-cyan">{name}</code>
                            </td>
                            <td
                              className={`py-1 pr-3 ${req === "yes" || req === "yes*" ? "text-pixel-amber" : "text-pixel-gray/40"}`}
                            >
                              {reqLabels[req] ?? req}
                            </td>
                            <td className="py-1 text-pixel-gray">{desc}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {ep.examples.map(([label, code]) => (
                  <div key={label}>
                    <p className="text-pixel-gray/50 text-xs mb-1">
                      # {label}
                    </p>
                    <pre className="bg-pixel-darker/80 border border-pixel-green/10 p-2.5 overflow-x-auto text-sm">
                      <code className="text-pixel-green/80">{code}</code>
                    </pre>
                  </div>
                ))}

                <div>
                  <p className="text-pixel-gray/50 text-xs mb-1">
                    {t("doc.api.response")}
                  </p>
                  <pre className="bg-pixel-darker/80 border border-pixel-green/10 p-2.5 overflow-x-auto text-sm">
                    <code className="text-pixel-cyan/70">{ep.response}</code>
                  </pre>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <div className="pixel-border p-3 bg-pixel-pink/5 border-pixel-pink/20 text-sm text-pixel-gray space-y-1">
        <p className="font-[family-name:var(--font-pixel-stack)] text-pixel-pink text-[11px] mb-1">
          {t("doc.api.errors.title")}
        </p>
        <p>
          <code className="text-pixel-pink">400</code> {t("doc.api.errors.badRequest")} &nbsp;{" "}
          <code className="text-pixel-pink">404</code> {t("doc.api.errors.notFound")} &nbsp;{" "}
          <code className="text-pixel-pink">500</code> {t("doc.api.errors.serverError")}
        </p>
        <p className="text-pixel-gray/50">
          {t("doc.api.errors.format")}{" "}
          <code className="text-pixel-pink/60">{`{"error":"message"}`}</code>
        </p>
      </div>
    </div>
  );
}
