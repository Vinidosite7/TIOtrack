from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether
)
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from pathlib import Path

OUT = Path('/Users/vinicius/tiotrack/output/pdf/plano_alimentar_perda_de_peso.pdf')
OUT.parent.mkdir(parents=True, exist_ok=True)

NAVY = colors.HexColor('#16324F')
GREEN = colors.HexColor('#4C956C')
MINT = colors.HexColor('#EAF5EF')
CREAM = colors.HexColor('#FBFAF6')
GOLD = colors.HexColor('#E4A853')
RED = colors.HexColor('#A6413A')
INK = colors.HexColor('#263238')
MUTED = colors.HexColor('#65747C')
LINE = colors.HexColor('#D9E1E4')

font_regular = '/System/Library/Fonts/Supplemental/Arial.ttf'
font_bold = '/System/Library/Fonts/Supplemental/Arial Bold.ttf'
if Path(font_regular).exists():
    pdfmetrics.registerFont(TTFont('App', font_regular))
    pdfmetrics.registerFont(TTFont('AppBold', font_bold))
else:
    font_regular, font_bold = 'Helvetica', 'Helvetica-Bold'

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='TitleX', fontName='AppBold', fontSize=25, leading=28, textColor=colors.white, alignment=TA_LEFT, spaceAfter=4))
styles.add(ParagraphStyle(name='Kicker', fontName='AppBold', fontSize=9, leading=11, textColor=GOLD, tracking=1.5, spaceAfter=5))
styles.add(ParagraphStyle(name='H1X', fontName='AppBold', fontSize=17, leading=21, textColor=NAVY, spaceBefore=2, spaceAfter=9))
styles.add(ParagraphStyle(name='H2X', fontName='AppBold', fontSize=12, leading=15, textColor=NAVY, spaceBefore=2, spaceAfter=5))
styles.add(ParagraphStyle(name='BodyX', fontName='App', fontSize=9.4, leading=13.2, textColor=INK, spaceAfter=5))
styles.add(ParagraphStyle(name='SmallX', fontName='App', fontSize=7.4, leading=10, textColor=MUTED))
styles.add(ParagraphStyle(name='CardTitle', fontName='AppBold', fontSize=10.5, leading=13, textColor=NAVY, spaceAfter=3))
styles.add(ParagraphStyle(name='WhiteSmall', fontName='App', fontSize=8.5, leading=11, textColor=colors.white))
styles.add(ParagraphStyle(name='Metric', fontName='AppBold', fontSize=15, leading=17, textColor=NAVY, alignment=TA_CENTER))
styles.add(ParagraphStyle(name='MetricLabel', fontName='App', fontSize=7.6, leading=9.5, textColor=MUTED, alignment=TA_CENTER))

def P(text, style='BodyX'):
    return Paragraph(text, styles[style])

def bullets(items):
    return [P('• ' + item, 'BodyX') for item in items]

def meal_card(title, items, note=None, tint=colors.white):
    content = [P(title, 'CardTitle')] + bullets(items)
    if note:
        content += [Spacer(1, 2), P(note, 'SmallX')]
    t = Table([[content]], colWidths=[174*mm], hAlign='LEFT')
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), tint), ('BOX', (0,0), (-1,-1), 0.7, LINE),
        ('LEFTPADDING', (0,0), (-1,-1), 9), ('RIGHTPADDING', (0,0), (-1,-1), 9),
        ('TOPPADDING', (0,0), (-1,-1), 8), ('BOTTOMPADDING', (0,0), (-1,-1), 7),
    ]))
    return t

def header_footer(canvas, doc):
    canvas.saveState()
    w, h = A4
    if doc.page > 1:
        canvas.setFillColor(NAVY)
        canvas.rect(0, h-13*mm, w, 13*mm, fill=1, stroke=0)
        canvas.setFont('AppBold', 8.5)
        canvas.setFillColor(colors.white)
        canvas.drawString(18*mm, h-8.2*mm, 'PLANO ALIMENTAR • PERDA DE PESO + MANUTENÇÃO DE MASSA')
    canvas.setStrokeColor(LINE)
    canvas.line(18*mm, 13*mm, w-18*mm, 13*mm)
    canvas.setFont('App', 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawString(18*mm, 8.5*mm, 'Plano inicial • Julho de 2026')
    canvas.drawRightString(w-18*mm, 8.5*mm, f'{doc.page}')
    canvas.restoreState()

doc = BaseDocTemplate(str(OUT), pagesize=A4, leftMargin=18*mm, rightMargin=18*mm,
                      topMargin=18*mm, bottomMargin=18*mm, title='Plano alimentar para perda de peso')
frame1 = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id='normal')
doc.addPageTemplates(PageTemplate(id='all', frames=frame1, onPage=header_footer))

story = []

# Cover / summary
hero = Table([[
    [P('PLANO PESSOAL', 'Kicker'), P('Perder gordura.<br/>Preservar massa.', 'TitleX'),
     Spacer(1, 5), P('Estrutura simples, flexível e compatível com musculação, cardio e beach tennis.', 'WhiteSmall')]
]], colWidths=[174*mm])
hero.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),NAVY),('LEFTPADDING',(0,0),(-1,-1),12),
                          ('RIGHTPADDING',(0,0),(-1,-1),12),('TOPPADDING',(0,0),(-1,-1),15),
                          ('BOTTOMPADDING',(0,0),(-1,-1),15)]))
story += [hero, Spacer(1, 10)]

metrics = Table([
    [P('21 anos','Metric'), P('86 kg','Metric'), P('1,72 m','Metric'), P('5x/sem','Metric')],
    [P('idade','MetricLabel'), P('peso inicial','MetricLabel'), P('altura','MetricLabel'), P('musculação','MetricLabel')]
], colWidths=[43.5*mm]*4)
metrics.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),CREAM),('BOX',(0,0),(-1,-1),0.7,LINE),
                             ('INNERGRID',(0,0),(-1,-1),0.4,LINE),('TOPPADDING',(0,0),(-1,-1),8),
                             ('BOTTOMPADDING',(0,0),(-1,-1),7)]))
story += [metrics, Spacer(1, 12), P('Ponto de partida', 'H1X')]

targets = Table([
    [P('2.400-2.500 kcal', 'Metric'), P('160-180 g', 'Metric'), P('0,3-0,7 kg', 'Metric')],
    [P('meta diária inicial', 'MetricLabel'), P('proteína por dia', 'MetricLabel'), P('perda semanal esperada', 'MetricLabel')]
], colWidths=[58*mm]*3)
targets.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),MINT),('BOX',(0,0),(-1,-1),0.8,GREEN),
                             ('INNERGRID',(0,0),(-1,-1),0.4,colors.HexColor('#B7D7C3')),
                             ('TOPPADDING',(0,0),(-1,-1),9),('BOTTOMPADDING',(0,0),(-1,-1),8)]))
story += [targets, Spacer(1, 10), P('<b>Importante:</b> este é um ponto inicial. Calorias e porções devem ser ajustadas pela média do peso, fome, recuperação e desempenho após duas semanas. Pesos de arroz, feijão, macarrão, batata e carnes indicam o alimento <b>já cozido/pronto</b>.', 'BodyX')]

principles = Table([
    [P('1', 'Metric'), P('<b>Comida simples</b><br/>Arroz, feijão, ovos, carnes, frutas e salada como base.', 'BodyX')],
    [P('2', 'Metric'), P('<b>Proteína distribuída</b><br/>Uma boa fonte proteica em cada refeição principal.', 'BodyX')],
    [P('3', 'Metric'), P('<b>Carboidrato estratégico</b><br/>Especialmente antes e depois dos treinos.', 'BodyX')],
], colWidths=[16*mm,158*mm])
principles.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'MIDDLE'),('LINEBELOW',(0,0),(-1,-2),0.5,LINE),
                                ('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6)]))
story += [Spacer(1, 5), principles, PageBreak()]

# Meals
story += [P('Plano diário', 'H1X'), P('Escolha uma opção em cada bloco. Água, café sem açúcar ou com adoçante podem acompanhar.', 'BodyX')]
story += [meal_card('Café da manhã • escolha 1 opção', [
    '<b>Ovos e pão:</b> 3 ovos + 2 fatias de pão integral + 1 banana ou mamão.',
    '<b>Crepioca:</b> 2 ovos + 2 claras + 50 g de tapioca + 30 g de queijo branco ou 60-80 g de frango + 1 fruta.',
    '<b>Vitamina rápida:</b> 250 ml de leite desnatado + 30 g de whey + 40 g de aveia + 150-200 g de mamão.'
], 'Não usar clara crua comum em vitaminas. Se for usar, somente clara pasteurizada.', MINT), Spacer(1, 7)]

story += [meal_card('Almoço • prato-base', [
    '150 g de arroz + 100 g de feijão.',
    '170-200 g de frango ou 150-180 g de carne moída magra.',
    'Alface e tomate à vontade + até 1 colher de chá de azeite.'
], 'Trocas: arroz + feijão por 250-300 g de batata assada; ou 180-200 g de macarrão com molho de tomate.', colors.white), Spacer(1, 7)]

story += [meal_card('Lanche da tarde / pré-treino • escolha 1 opção', [
    '<b>Iogurte:</b> 1 iogurte natural ou proteico + 30 g de whey + 1 banana + 20-30 g de aveia.',
    '<b>Cereal:</b> 250 ml de leite desnatado + 30 g de whey + 30 g de cereal integral + 1 fruta.',
    '<b>Mais reforçado:</b> 30 g de whey com água + 1 banana + 2 fatias de pão integral com 60-80 g de frango.'
], 'Idealmente 60-120 minutos antes da musculação.', CREAM), Spacer(1, 7)]

story += [meal_card('Jantar / pós-treino', [
    '150 g de arroz.',
    '170-200 g de frango, carne moída magra ou peixe.',
    'Salada à vontade; acrescentar 100 g de feijão se houver fome.'
], 'O arroz à noite pode ajudar na recuperação. Não é necessário jantar somente proteína e salada.', colors.white), PageBreak()]

# Training, tracking, safety
story += [P('Treino, ajustes e segurança', 'H1X')]
story += [meal_card('Frutas durante o dia', [
    'Meta: 2-3 porções por dia.',
    'Exemplos: banana, maçã, laranja, mamão, melão ou morango.',
    'Distribuir entre café da manhã, lanche e intervalo entre refeições.'
], tint=MINT), Spacer(1, 8)]

story += [meal_card('Dia de beach tennis', [
    'Não jogar em jejum. Fazer refeição normal 2-3 horas antes.',
    '30-60 minutos antes: banana + 2 fatias de pão integral.',
    'Levar água, isotônico e uma fonte rápida de açúcar.',
    'Se o dia tiver muito gasto, acrescentar 150-250 kcal: 100-150 g extras de arroz, ou banana + pão, ou 40 g de aveia com leite/iogurte.'
], tint=CREAM), Spacer(1, 8)]

warning = Table([[
    [P('ATENÇÃO: FRAQUEZA E VISÃO TURVA', 'CardTitle'),
     P('Esses sintomas durante o exercício não devem ser considerados normais nem atribuídos automaticamente à dieta. Podem ter várias causas e precisam de avaliação em uma UBS ou com médico antes de repetir esforço intenso.', 'BodyX'),
     P('<b>Se acontecer:</b> pare imediatamente, sente-se em local fresco e avise alguém. Se estiver consciente e conseguir engolir, consuma 15-20 g de carboidrato rápido, como 150-200 ml de suco comum ou 1 colher de sopa de mel. Não volte ao jogo naquele momento.', 'BodyX'),
     P('<b>Procure urgência / SAMU 192</b> se a visão não normalizar rapidamente ou houver desmaio, confusão, dor no peito, falta de ar, palpitação intensa, dor de cabeça muito forte ou fraqueza de um lado do corpo.', 'BodyX')]
]], colWidths=[174*mm])
warning.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),colors.HexColor('#FFF0ED')),('BOX',(0,0),(-1,-1),1,RED),
                             ('LEFTPADDING',(0,0),(-1,-1),10),('RIGHTPADDING',(0,0),(-1,-1),10),
                             ('TOPPADDING',(0,0),(-1,-1),9),('BOTTOMPADDING',(0,0),(-1,-1),8)]))
story += [warning, Spacer(1, 10), P('Como acompanhar', 'H2X')]

tracking = Table([
    [P('<b>Todos os dias</b><br/>Pesar ao acordar, após ir ao banheiro e antes de comer.', 'BodyX'),
     P('<b>Toda semana</b><br/>Comparar a média de 7 dias, não um peso isolado.', 'BodyX')],
    [P('<b>Sem queda após 2 semanas</b><br/>Reduzir 150-200 kcal.', 'BodyX'),
     P('<b>Perda muito rápida / força caindo</b><br/>Adicionar 150-250 kcal.', 'BodyX')]
], colWidths=[87*mm,87*mm])
tracking.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),colors.white),('BOX',(0,0),(-1,-1),0.7,LINE),
                              ('INNERGRID',(0,0),(-1,-1),0.5,LINE),('VALIGN',(0,0),(-1,-1),'TOP'),
                              ('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),
                              ('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7)]))
story += [tracking, Spacer(1, 10), P('<b>Referências:</b> Guia Alimentar para a População Brasileira, Ministério da Saúde; orientações do Ministério da Saúde sobre hipoglicemia e SAMU 192; CDC - perda gradual de peso.', 'SmallX'),
          P('Este material é educativo e não substitui consulta com nutricionista ou avaliação médica. As estimativas podem variar conforme preparo, marcas, intensidade real dos treinos e composição corporal.', 'SmallX')]

doc.build(story)
print(OUT)
