# TioTrack — Guia de Redesign UX
> Baseado no design system do BossFlow. Substituição drop-in.

---

## O que muda e por quê

### 1. Tipografia (maior impacto visual)

| Antes | Depois |
|-------|--------|
| Inter (body + headings) | **Syne** para headings/títulos de página |
| JetBrains Mono (dados) | **DM Sans** para body/labels (igual BossFlow) |
| — | JetBrains Mono mantido só para números/dados |

**Como aplicar nos títulos de página:**
```tsx
// Antes
<h1 style={{ fontSize: 28, fontWeight: 700 }}>Overview</h1>

// Depois
<h1 style={{ fontSize: 28, fontWeight: 800, fontFamily: "'Syne', sans-serif", letterSpacing: '-0.03em' }}>Overview</h1>
```

---

### 2. Tokens (tokens.ts)

Substitua `src/lib/tokens.ts` pelo novo arquivo.

Principais mudanças:
- `bgBase` ficou levemente mais azul-escuro (`#070812` em vez de `#050810`)
- `text1` agora é `#dcdcf0` (mais suave, igual BossFlow)
- `text2` virou `#8a8aaa` (menos azulado)
- Adicionado `T.display` (Syne) e `T.sans` (DM Sans)
- Border agora usa `rgba` puro, sem hex

---

### 3. globals.css

Substitua `src/app/globals.css` pelo novo arquivo.

Mudanças:
- Google Fonts: adicionado **Syne** + **DM Sans**, mantido JetBrains Mono
- Body agora usa `DM Sans` em vez de `Inter`
- `h1-h6` automaticamente usa `Syne`
- Scrollbar com cor azul accent (em vez de cinza)
- Classe `.tt-glass` para glassmorphism
- Classe `.no-scrollbar` para nav sem scrollbar

---

### 4. Sidebar

Substitua `src/components/layout/Sidebar.tsx` pelo novo arquivo.

Novidades:
- **Collapsible**: clica no logo para colapsar (60px) / expandir (228px)
- Animação suave via framer-motion `animate={{ width }}`
- `layoutId="sidebar-active-bar"` para barra animada entre itens
- Logo usa **Syne** bold
- Workspace selector com initials
- Collapsed: apenas ícones com tooltip `title`
- Collapsed: botão logout vira ícone centralizado

**ATENÇÃO:** O novo Sidebar exporta também `SidebarProvider` e `useSidebar`.
Você precisa envolver o layout com `<SidebarProvider>` (já feito no `layout.tsx` novo).

---

### 5. BottomNav (mobile)

Substitua `src/components/layout/BottomNav.tsx` pelo novo arquivo.

Mudanças:
- `layoutId="bottom-active-line"` para linha animada suave
- Label usa `DM Sans`
- Blur aumentado para 24px
- Cores revistas para ficar consistentes com Sidebar

---

### 6. Layout

Substitua `src/app/(dashboard)/layout.tsx` pelo novo arquivo.

Mudança: envolve com `<SidebarProvider>`.

---

## Aplicar nas páginas (overview, campanhas, etc.)

### Título de página (padrão novo)
```tsx
<div style={{ padding: '28px 28px 0' }}>
  <h1 style={{
    fontSize: 26,
    fontWeight: 800,
    fontFamily: "'Syne', sans-serif",
    color: '#f0f0ff',
    letterSpacing: '-0.03em',
    marginBottom: 4,
  }}>
    Overview
  </h1>
  <p style={{ fontSize: 13, color: '#8a8aaa', fontFamily: "'DM Sans', sans-serif" }}>
    Junho de 2026 · atualizado agora
  </p>
</div>
```

### Card padrão (glassmorphism)
```tsx
<div style={{
  background: 'rgba(10,10,18,0.92)',
  border: '1px solid rgba(255,255,255,0.055)',
  borderRadius: 16,
  backdropFilter: 'blur(20px)',
}}>
```

### KPI value (números grandes)
```tsx
<span style={{
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 28,
  fontWeight: 700,
  letterSpacing: '-0.04em',
  color: '#dcdcf0',
}}>
  R$ 12.840
</span>
```

### Seção label / category label
```tsx
<span style={{
  fontSize: 9,
  fontFamily: "'DM Sans', sans-serif",
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: '#4a4a6a',
}}>
  RECEITA
</span>
```

---

## Checklist de substituição

- [ ] `src/app/globals.css` → novo globals.css
- [ ] `src/lib/tokens.ts` → novo tokens.ts
- [ ] `src/components/layout/Sidebar.tsx` → novo Sidebar.tsx
- [ ] `src/components/layout/BottomNav.tsx` → novo BottomNav.tsx
- [ ] `src/app/(dashboard)/layout.tsx` → novo layout.tsx
- [ ] Atualizar imports de `T.sans` → onde tinha `T.sans: 'Inter'` agora é `DM Sans`
- [ ] Títulos `<h1>` nas pages: adicionar `fontFamily: T.display` (Syne)
- [ ] Testar collapse da sidebar no desktop
- [ ] Testar bottom nav no mobile (iOS safe area)

---

## Paleta resumida

```
Background:   #070812  #0a0b16  #0e1020
Accent:       #3b82f6  #60a5fa
Text:         #dcdcf0  #8a8aaa  #4a4a6a
Green:        #34d399
Red:          #f87171
Amber:        #fbbf24
Violet:       #a78bfa
Border:       rgba(255,255,255,0.055)
```

---

## Fontes Google (no globals.css já está, mas se precisar manualmente)

```html
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
```
