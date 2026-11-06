import { useEffect, useRef, useState } from "react";
import { mergeMarks, paintRange, renderLyricHtml } from "@/coletanea/lib/voices.js";

function readEditor(root) {
  let text = "";
  const marks = [];

  const walk = (node, voice) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const value = (node.nodeValue ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
      const start = text.length;
      text += value;
      if (voice && value) marks.push({ start, end: text.length, voice });
      return;
    }
    if (node.nodeName === "BR") {
      text += "\n";
      return;
    }
    const nextVoice = node.dataset?.voice || voice || "";
    const block = node.nodeName === "DIV" || node.nodeName === "P";
    if (block && text && !text.endsWith("\n")) text += "\n";
    node.childNodes.forEach((child) => walk(child, nextVoice));
  };

  root.childNodes.forEach((child) => walk(child, ""));
  return { text, marks: mergeMarks(marks) };
}

function rangeOffsets(root, range) {
  const before = (container, offset) => {
    const probe = document.createRange();
    probe.selectNodeContents(root);
    probe.setEnd(container, offset);
    return probe.toString().length;
  };
  const start = before(range.startContainer, range.startOffset);
  const end = before(range.endContainer, range.endOffset);
  return { start: Math.min(start, end), end: Math.max(start, end) };
}

function setCaret(root, target) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let seen = 0;
  let node = walker.nextNode();
  while (node) {
    const next = seen + node.nodeValue.length;
    if (target <= next) {
      const caret = document.createRange();
      caret.setStart(node, Math.max(0, target - seen));
      caret.collapse(true);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(caret);
      return;
    }
    seen = next;
    node = walker.nextNode();
  }
}

function selectionInside(root) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return false;
  const range = selection.getRangeAt(0);
  return root.contains(range.startContainer) && root.contains(range.endContainer);
}

export default function LyricEditor({ text, marks, placeholder, italic, label, onChange, minClass = "min-h-32" }) {
  const editorRef = useRef(null);
  const [canPaint, setCanPaint] = useState(false);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.innerHTML = renderLyricHtml(text, marks);
    // O texto seguinte fica no DOM. Regravar a cada tecla jogaria o cursor para o início.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onSelection = () => {
      const editor = editorRef.current;
      setCanPaint(Boolean(editor && selectionInside(editor)));
    };
    document.addEventListener("selectionchange", onSelection);
    return () => document.removeEventListener("selectionchange", onSelection);
  }, []);

  const publish = () => {
    const editor = editorRef.current;
    if (!editor) return;
    onChange(readEditor(editor));
  };

  const apply = (voice) => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0 || !selectionInside(editor)) return;
    const current = readEditor(editor);
    const { start, end } = rangeOffsets(editor, selection.getRangeAt(0));
    if (end <= start) return;
    const nextMarks = paintRange(current.marks, start, end, voice);
    editor.innerHTML = renderLyricHtml(current.text, nextMarks);
    setCaret(editor, end);
    onChange({ text: current.text, marks: nextMarks });
    setCanPaint(false);
  };

  const onBeforeInput = (event) => {
    if (event.inputType !== "insertParagraph" && event.inputType !== "insertLineBreak") return;
    event.preventDefault();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const node = document.createTextNode("\n");
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    publish();
  };

  const onPaste = (event) => {
    event.preventDefault();
    const plain = event.clipboardData.getData("text/plain").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const node = document.createTextNode(plain);
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    publish();
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <PaintButton label="Homens" tone="bg-[#1d4e9e]" disabled={!canPaint} onPaint={() => apply("homens")} />
        <PaintButton label="Mulheres" tone="bg-[#b4236a]" disabled={!canPaint} onPaint={() => apply("mulheres")} />
        <button
          type="button"
          className={`h-8 rounded-full border border-cl-line px-3 text-xs text-cl-ink-soft hover:text-cl-ink ${
            canPaint ? "" : "opacity-40"
          }`}
          onPointerDown={(event) => {
            event.preventDefault();
            apply("");
          }}
        >
          Limpar
        </button>
      </div>
      <p className="text-center text-xs text-cl-ink-soft">Selecione uma palavra ou uma linha e aplique a cor.</p>
      <div
        ref={editorRef}
        className={`lyric-editor ${minClass} w-full whitespace-pre-wrap rounded-xl border border-cl-line bg-cl-paper px-3 py-3 text-center font-cl-lyric leading-relaxed outline-none focus:ring-2 focus:ring-cl-pine ${
          italic ? "italic" : ""
        }`}
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-label={label}
        data-placeholder={placeholder}
        suppressContentEditableWarning
        onInput={publish}
        onBeforeInput={onBeforeInput}
        onPaste={onPaste}
      />
    </div>
  );
}

function PaintButton({ label, tone, disabled, onPaint }) {
  return (
    <button
      type="button"
      className={`inline-flex h-8 items-center gap-1.5 rounded-full border border-cl-line px-3 text-xs font-medium ${
        disabled ? "opacity-40" : ""
      }`}
      onPointerDown={(event) => {
        event.preventDefault();
        onPaint();
      }}
    >
      <span className={`h-3 w-3 rounded-full ${tone}`} aria-hidden />
      {label}
    </button>
  );
}
