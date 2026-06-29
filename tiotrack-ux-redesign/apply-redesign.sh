#!/bin/bash
# ─────────────────────────────────────────────────────────────────
# TioTrack UX Redesign — Script de aplicação automática
# 
# USO:
#   1. Coloque este script na RAIZ do projeto TioTrack
#   2. Coloque a pasta tiotrack-ux-redesign/ na RAIZ também
#   3. Execute: chmod +x apply-redesign.sh && ./apply-redesign.sh
# ─────────────────────────────────────────────────────────────────

set -e

REDESIGN_DIR="./tiotrack-ux-redesign"
SRC="./src"

echo "🎨 TioTrack UX Redesign — iniciando..."
echo ""

# ── 1. Substituições de arquivo completo ─────────────────────────

echo "📁 Substituindo arquivos base..."

cp "$REDESIGN_DIR/globals.css"  "$SRC/app/globals.css"
echo "  ✓ globals.css"

cp "$REDESIGN_DIR/tokens.ts"    "$SRC/lib/tokens.ts"
echo "  ✓ tokens.ts"

cp "$REDESIGN_DIR/Sidebar.tsx"  "$SRC/components/layout/Sidebar.tsx"
echo "  ✓ Sidebar.tsx"

cp "$REDESIGN_DIR/BottomNav.tsx" "$SRC/components/layout/BottomNav.tsx"
echo "  ✓ BottomNav.tsx"

cp "$REDESIGN_DIR/layout.tsx"   "$SRC/app/(dashboard)/layout.tsx"
echo "  ✓ layout.tsx"

cp "$REDESIGN_DIR/shared.tsx"   "$SRC/components/ui/shared.tsx"
echo "  ✓ shared.tsx"

cp "$REDESIGN_DIR/login-page.tsx" "$SRC/app/(auth)/login/page.tsx"
echo "  ✓ login/page.tsx"

echo ""

# ── 2. Find & replace nas páginas do dashboard ───────────────────

PAGES=(
  "$SRC/app/(dashboard)/overview/page.tsx"
  "$SRC/app/(dashboard)/campanhas/page.tsx"
  "$SRC/app/(dashboard)/vendas/page.tsx"
  "$SRC/app/(dashboard)/utms/page.tsx"
  "$SRC/app/(dashboard)/relatorios/page.tsx"
  "$SRC/app/(dashboard)/integracoes/page.tsx"
  "$SRC/app/(dashboard)/configuracoes/page.tsx"
)

echo "🔧 Aplicando patches nas páginas..."

for FILE in "${PAGES[@]}"; do
  if [ -f "$FILE" ]; then
    # Background principal
    sed -i "s/background: '#05080F'/background: '#070812'/g" "$FILE"
    sed -i "s/background: '\\\\#05080F'/background: '\\\\#070812'/g" "$FILE"

    # Topbar backgrounds
    sed -i "s/background:'rgba(5,8,16,0\.9)'/background:'rgba(7,8,18,0.92)'/g" "$FILE"
    sed -i "s/background: 'rgba(5,8,16,0\.9)'/background: 'rgba(7,8,18,0.92)'/g" "$FILE"
    sed -i "s/background:'rgba(5,8,16,0\.92)'/background:'rgba(7,8,18,0.92)'/g" "$FILE"
    sed -i "s/background: 'rgba(5,8,16,0\.92)'/background: 'rgba(7,8,18,0.92)'/g" "$FILE"
    sed -i "s/background:'rgba(5,8,16,0\.6)'/background:'rgba(7,8,18,0.7)'/g" "$FILE"
    sed -i "s/background: 'rgba(5,8,16,0\.6)'/background: 'rgba(7,8,18,0.7)'/g" "$FILE"

    # Autofill color
    sed -i "s/-webkit-box-shadow:0 0 0 1000px #05080F inset/-webkit-box-shadow:0 0 0 1000px #070812 inset/g" "$FILE"

    echo "  ✓ $(basename $FILE)"
  else
    echo "  ⚠ Não encontrado: $FILE"
  fi
done

echo ""

# ── 3. Patch manual nos títulos de topbar ────────────────────────
# (sed com multiline é complexo, então fazer via Python inline)

echo "🖋  Atualizando tipografia dos títulos..."

python3 << 'PYEOF'
import os, re

pages = [
    "src/app/(dashboard)/overview/page.tsx",
    "src/app/(dashboard)/campanhas/page.tsx",
    "src/app/(dashboard)/vendas/page.tsx",
    "src/app/(dashboard)/utms/page.tsx",
    "src/app/(dashboard)/relatorios/page.tsx",
    "src/app/(dashboard)/integracoes/page.tsx",
    "src/app/(dashboard)/configuracoes/page.tsx",
]

# Padrão: título no topbar com Inter → Syne
title_old = r"fontSize: 14, fontWeight: 700, color: (?:T\.text1|'#F1F5F9'), letterSpacing: '-0\.02em'"
title_new = "fontSize: 15, fontWeight: 800, color: '#f0f0ff', letterSpacing: '-0.03em', fontFamily: \"'Syne', sans-serif\""

# fontFamily: T.sans → DM Sans
sans_old = r"fontFamily: T\.sans"
sans_new = "fontFamily: \"'DM Sans', sans-serif\""

# fontFamily: T.mono → JetBrains Mono
mono_old = r"fontFamily: T\.mono"
mono_new = "fontFamily: \"'JetBrains Mono', monospace\""

for path in pages:
    if not os.path.exists(path):
        continue
    with open(path, 'r') as f:
        content = f.read()
    
    content = re.sub(title_old, title_new, content)
    content = re.sub(sans_old, sans_new, content)
    content = re.sub(mono_old, mono_new, content)
    
    with open(path, 'w') as f:
        f.write(content)
    print(f"  ✓ {os.path.basename(path)}")

print("  Tipografia atualizada.")
PYEOF

echo ""
echo "✅ Redesign aplicado com sucesso!"
echo ""
echo "📋 Próximos passos:"
echo "   1. npm run dev (checar se compila)"
echo "   2. Testar Sidebar collapse no desktop"
echo "   3. Testar BottomNav no mobile/DevTools"
echo "   4. Verificar autofill do login no browser"
echo ""
