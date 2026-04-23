#!/usr/bin/env python3
"""
Java Senior Interviewer — resume analysis CLI.

Converts a Java engineer's resume (PDF/Word/Markdown) to Markdown using a
fallback chain of extractors, and (by default) emits a ready-to-paste
analysis prompt combining the resume with the skill's analysis framework.

Usage:
    python analyze_resume.py <file> --level {engineer|senior} [options]

Options:
    -o, --output FILE     Write output to FILE instead of stdout.
    --extract-only        Only emit the resume as Markdown (skip the prompt wrap).
    --no-framework        Skip the framework header in prompt mode (just label + resume).
    --force {markitdown,marker,pymupdf,docx2txt,plain}
                          Skip detection and force a specific extractor.

Extractor preference order (per spec):
    1. markitdown          pip install markitdown
    2. marker-pdf          pip install marker-pdf
    3. pymupdf             pip install pymupdf
    4. docx2txt            pip install docx2txt
    5. plain passthrough   for .md / .txt

Exit codes:
    0  success
    1  file-not-found / unsupported extension
    2  no extractor available for this file type
    3  extraction failed
"""
from __future__ import annotations

import argparse
import importlib.util
import sys
from pathlib import Path
from typing import Tuple

SUPPORTED_EXTS = {".pdf", ".docx", ".doc", ".md", ".markdown", ".txt"}


def has_module(name: str) -> bool:
    return importlib.util.find_spec(name) is not None


# ----- extractors ---------------------------------------------------------


def extract_markitdown(path: Path) -> str:
    from markitdown import MarkItDown  # type: ignore

    return MarkItDown().convert(str(path)).text_content


def extract_marker(path: Path) -> str:
    # marker-pdf >= 1.x API
    from marker.converters.pdf import PdfConverter  # type: ignore
    from marker.models import create_model_dict  # type: ignore
    from marker.output import text_from_rendered  # type: ignore

    converter = PdfConverter(artifact_dict=create_model_dict())
    rendered = converter(str(path))
    text, _meta, _images = text_from_rendered(rendered)
    return text


def extract_pymupdf(path: Path) -> str:
    import pymupdf  # type: ignore

    doc = pymupdf.open(str(path))
    try:
        return "\n\n".join(page.get_text("text") for page in doc)
    finally:
        doc.close()


def extract_docx2txt(path: Path) -> str:
    import docx2txt  # type: ignore

    return docx2txt.process(str(path)) or ""


def extract_plain(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


# ----- dispatch -----------------------------------------------------------


def pick_extractor(ext: str, force: str | None) -> Tuple[str, callable]:
    """Return (tool_name, extractor_fn) or raise RuntimeError."""
    if force:
        registry = {
            "markitdown": ("markitdown", extract_markitdown, "markitdown"),
            "marker": ("marker-pdf", extract_marker, "marker"),
            "pymupdf": ("pymupdf", extract_pymupdf, "pymupdf"),
            "docx2txt": ("docx2txt", extract_docx2txt, "docx2txt"),
            "plain": ("plain", extract_plain, None),
        }
        if force not in registry:
            raise RuntimeError(f"unknown --force value: {force}")
        name, fn, mod = registry[force]
        if mod and not has_module(mod):
            raise RuntimeError(f"--force {force} but module '{mod}' is not installed")
        return name, fn

    if ext in (".md", ".markdown", ".txt"):
        return "plain", extract_plain

    # Universal: markitdown first.
    if has_module("markitdown"):
        return "markitdown", extract_markitdown

    if ext == ".pdf":
        if has_module("marker"):
            return "marker-pdf", extract_marker
        if has_module("pymupdf"):
            return "pymupdf", extract_pymupdf
        raise RuntimeError(
            "No PDF extractor installed. Install one of:\n"
            "    pip install markitdown       # recommended, universal\n"
            "    pip install marker-pdf       # highest quality PDFs\n"
            "    pip install pymupdf          # lightweight fallback"
        )

    if ext in (".docx", ".doc"):
        if has_module("docx2txt"):
            return "docx2txt", extract_docx2txt
        raise RuntimeError(
            "No Word extractor installed. Install one of:\n"
            "    pip install markitdown       # recommended, universal\n"
            "    pip install docx2txt         # .docx only"
        )

    raise RuntimeError(f"unsupported file extension: {ext}")


# ----- prompt assembly ----------------------------------------------------


FRAMEWORK_PROMPT = """\
You are a 15-year Java architecture interviewer. Analyze the candidate's resume
below and produce a 1-1 interview preparation document in Chinese. Follow the
`java-senior-interviewer` skill's output format exactly.

CORE AXIS: distinguish "Tutorial Knowledge" from "Production Experience."
- Tutorial signals: buzzword salad, textbook definitions phrased as
  accomplishments, no numbers, vague verbs ("负责", "参与", "优化").
- Production signals: specific numbers (QPS, 数据量, SLA), named trade-offs,
  failure stories, migration stories, "我们选 X 因为 Y，代价是 Z".

LEVEL CALIBRATION:
- `engineer` (1–5 yrs): focus on implementation details, Clean Code, core API
  proficiency. Accept correctness + clear expression as passing.
- `senior` (5+ yrs): focus on trade-offs, system design, performance tuning
  case studies. Require named trade-offs and failure-mode prediction.

OUTPUT (exactly this structure, in Chinese):

## 1. 候选人画像 (Candidate Persona)
### 核心竞争力 (Top 3 Strengths)
### 潜在疑点 (Red Flags / Gaps)
### 技术演进评估

## 2. 60 分钟面试脚本 (60-Min Interview Playbook)
### [00–10m] 自我介绍引导
### [10–20m] 项目深挖
  两个具体问题：一个关于一致性/幂等，一个关于高并发/性能。
  每个问题要引用简历中的具体项目细节，并给出「听什么」「追问方向」。
### [20–30m] 基础硬核 (3 题)
  每题带【标准答案要点】；若为 senior 层级，再加「加分回答」。
### [30–40m] 系统设计
  从以下场景中选一个与简历背景呼应的：
  支付对账系统 / 高并发秒杀 / 日志采集 / Feed 系统 / 分布式 ID 生成
### [40–50m] Coding
  题目从 LRU Cache / 限流算法 (令牌桶/滑动窗口) / 简易线程池 / 一致性哈希
  中选一道与简历经验呼应的。
### [50–60m] Q&A & 评估建议
  列出应观察的软素质 (沟通结构 / 元认知 / 工程品味 / 好奇心 / 责任感)。

## 3. 综合建议
  推荐/不推荐，以及下一轮需要重点评估的维度。

SELECTION RULE: questions must echo the candidate's claimed experience. If the
resume claims 秒杀, the system design is 秒杀 — forcing the candidate to either
deliver or contradict themselves.
"""


def build_prompt(resume_md: str, level: str, filename: str, tool: str, include_framework: bool) -> str:
    parts = []
    if include_framework:
        parts.append(FRAMEWORK_PROMPT)
        parts.append("")
    parts.append(f"TARGET LEVEL: {level}")
    parts.append(f"SOURCE FILE: {filename}  (extractor: {tool})")
    parts.append("")
    parts.append("--- BEGIN RESUME ---")
    parts.append(resume_md.strip())
    parts.append("--- END RESUME ---")
    return "\n".join(parts) + "\n"


# ----- main ---------------------------------------------------------------


def main() -> int:
    p = argparse.ArgumentParser(
        description="Extract a Java engineer's resume and build an interview-prep prompt.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__.split("Usage:", 1)[0].rstrip(),
    )
    p.add_argument("file", type=Path, help="Resume file (.pdf, .docx, .md, .txt)")
    p.add_argument(
        "--level",
        required=True,
        choices=["engineer", "senior"],
        help="Target job level",
    )
    p.add_argument("-o", "--output", type=Path, help="Write to FILE instead of stdout")
    p.add_argument(
        "--extract-only",
        action="store_true",
        help="Emit only the extracted Markdown, no prompt wrap",
    )
    p.add_argument(
        "--no-framework",
        action="store_true",
        help="In prompt mode, skip the framework header (just label + resume)",
    )
    p.add_argument(
        "--force",
        choices=["markitdown", "marker", "pymupdf", "docx2txt", "plain"],
        help="Skip detection and force a specific extractor",
    )
    args = p.parse_args()

    if not args.file.exists():
        print(f"error: file not found: {args.file}", file=sys.stderr)
        return 1

    ext = args.file.suffix.lower()
    if ext not in SUPPORTED_EXTS and not args.force:
        print(
            f"error: unsupported extension {ext!r}. "
            f"Supported: {sorted(SUPPORTED_EXTS)}",
            file=sys.stderr,
        )
        return 1

    try:
        tool, fn = pick_extractor(ext, args.force)
    except RuntimeError as e:
        print(f"error: {e}", file=sys.stderr)
        return 2

    try:
        text = fn(args.file)
    except Exception as e:
        print(f"error: extraction failed via {tool}: {e}", file=sys.stderr)
        return 3

    if not text.strip():
        print(f"warning: extractor {tool} returned empty text", file=sys.stderr)

    if args.extract_only:
        header = (
            f"<!-- extracted from: {args.file.name} -->\n"
            f"<!-- extractor: {tool} -->\n"
            f"<!-- level: {args.level} -->\n\n"
        )
        output = header + text.strip() + "\n"
    else:
        output = build_prompt(
            resume_md=text,
            level=args.level,
            filename=args.file.name,
            tool=tool,
            include_framework=not args.no_framework,
        )

    if args.output:
        args.output.write_text(output, encoding="utf-8")
        print(
            f"[ok] wrote {len(output):,} chars to {args.output} "
            f"(extractor: {tool}, level: {args.level})",
            file=sys.stderr,
        )
    else:
        sys.stdout.write(output)

    return 0


if __name__ == "__main__":
    sys.exit(main())
