#!/usr/bin/env python3
import os, re

BASE = os.path.dirname(os.path.abspath(__file__))
SRC  = os.path.join(BASE, '..', 'src')

PAGES = [
    "app/(dashboard)/overview/page.tsx",
    "app/(dashboard)/campanhas/page.tsx",
    "app/(dashboard)/vendas/page.tsx",
    "app/(dashboard)/utms/page.tsx",
    "app/(dashboard)/relatorios/page.tsx",
    "app/(dashboard)/integracoes/page.tsx",
    "app/(dashboard)/configuracoes/page.tsx",
]

REPLACEMENTS = [
    # Background principal
    ("background: '#05080F'",          "background: '#070812'"),
    ("background:'#05080F'",           "background:'#070812'"),
    # Topbar backgrounds
    ("rgba(5,8,16,0.9)",               "rgba(7,8,18,0.92)"),
    ("rgba(5,8,16,0.92)",              "rgba(7,8,18,0.92)"),
    ("rgba(5,8,16,0.6)",               "rgba(7,8,18,0.7)"),
    # Autofill
    ("1000px #05080F inset",           "1000px #070812 inset"),
    # Títulos de topbar — Inter → Syne
    (
        "fontSize: 14, fontWeight: 700, color: T.text1, letterSpacing: '-0.02em'",
        "fontSize: 15, fontWeight: 800, color: '#f0f0ff', letterSpacing: '-0.03em', fontFamily: \"'Syne', sans-serif\""
    ),
    (
        "fontSize: 14, fontWeight: 700, color: '#F1F5F9', letterSpacing: '-0.02em'",
        "fontSize: 15, fontWeight: 800, color: '#f0f0ff', letterSpacing: '-0.03em', fontFamily: \"'Syne', sans-serif\""
    ),
    # Sans e Mono
    ("fontFamily: T.sans",             "fontFamily: \"'DM Sans', sans-serif\""),
    ("fontFamily: T.mono",             "fontFamily: \"'JetBrains Mono', monospace\""),
    ("fontFamily: 'inherit'",          "fontFamily: \"'DM Sans', sans-serif\""),
]

print("🔧 Aplicando patches nas páginas...")

for rel in PAGES:
    path = os.path.join(SRC, rel)
    if not os.path.exists(path):
        print(f"  ⚠  Não encontrado: {rel}")
        continue

    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    for old, new in REPLACEMENTS:
        content = content.replace(old, new)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"  ✓  {os.path.basename(path)}")

print("")
print("✅ Patches aplicados!")
print("")
print("Próximos passos:")
print("  npm run dev")
