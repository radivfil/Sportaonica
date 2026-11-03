"use client";

import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { useRef, useState } from "react";

function ToolbarButton({ onClick, active, label, children }: { onClick: () => void; active?: boolean; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`inline-flex h-11 min-w-11 items-center justify-center rounded-xl px-2.5 font-bold ${active ? "bg-navy text-white" : "bg-white text-ink hover:bg-sky-50"}`}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor, onImage }: { editor: Editor; onImage: () => void }) {
  const link = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Adresa poveznice (prazno = ukloni):", prev ?? "https://");
    if (url === null) return;
    if (!url) editor.chain().focus().unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };
  return (
    <div className="flex flex-wrap gap-1.5 border-b border-ink/10 bg-cream p-2" role="toolbar" aria-label="Oblikovanje teksta">
      <ToolbarButton label="Podebljano" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>B</ToolbarButton>
      <ToolbarButton label="Kurziv" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><em>I</em></ToolbarButton>
      <ToolbarButton label="Podnaslov" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</ToolbarButton>
      <ToolbarButton label="Manji podnaslov" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</ToolbarButton>
      <ToolbarButton label="Popis" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>• Popis</ToolbarButton>
      <ToolbarButton label="Numerirani popis" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1. Popis</ToolbarButton>
      <ToolbarButton label="Citat" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>❝</ToolbarButton>
      <ToolbarButton label="Poveznica" active={editor.isActive("link")} onClick={link}>🔗</ToolbarButton>
      <ToolbarButton label="Umetni sliku" onClick={onImage}>🖼️</ToolbarButton>
      <ToolbarButton label="Poništi" onClick={() => editor.chain().focus().undo().run()}>↶</ToolbarButton>
      <ToolbarButton label="Ponovi" onClick={() => editor.chain().focus().redo().run()}>↷</ToolbarButton>
    </div>
  );
}

/** Tiptap rich-text editor; serialises HTML into a hidden input for server actions. */
export function RichTextEditor({ name, initialHtml }: { name: string; initialHtml: string }) {
  const [html, setHtml] = useState(initialHtml);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit.configure({ heading: { levels: [2, 3] }, link: { openOnClick: false } }), Image],
    content: initialHtml,
    editorProps: {
      attributes: { class: "prose-sport min-h-[320px] px-4 py-4 focus:outline-none sm:px-6", "aria-label": "Sadržaj objave", role: "textbox", "aria-multiline": "true" },
    },
    onUpdate: ({ editor }) => setHtml(editor.getHTML()),
  });

  async function upload(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const json = await res.json().catch(() => null);
    setUploading(false);
    if (!res.ok || !json?.url) return window.alert(json?.error ?? "Učitavanje slike nije uspjelo.");
    const alt = window.prompt("Kratki opis slike (za slabovidne):", "") ?? "";
    editor?.chain().focus().setImage({ src: json.url, alt }).run();
  }

  return (
    <div className="overflow-hidden rounded-2xl border-2 border-ink/15 bg-white focus-within:border-navy">
      {editor && <Toolbar editor={editor} onImage={() => fileRef.current?.click()} />}
      {uploading && <p className="bg-butter-100 px-4 py-2 text-sm font-bold">Učitavam sliku…</p>}
      <EditorContent editor={editor} />
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      <input type="hidden" name={name} value={html} />
    </div>
  );
}
