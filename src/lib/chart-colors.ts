/**
 * Paleta dos gráficos do dashboard.
 *
 * Valores verificados com as mesmas fórmulas do validador de paletas da skill
 * de dataviz (banda de luminosidade OKLCH, piso de croma, contraste WCAG) —
 * rodadas à mão em PowerShell nesta máquina por falta de runtime Node/Python
 * para executar o script oficial. Não troque um valor sem revalidar.
 *
 * MAGNITUDE é série única (não há par adjacente), então a checagem de
 * separação para daltonismo não se aplica; ainda assim os gráficos que a usam
 * trazem rótulos numéricos visíveis nas barras — a identidade nunca depende só
 * da cor.
 */

/**
 * Série única de magnitude (tempo, contagem). Verde da marca (matiz OKLab
 * 140.6°, a 0.7° do brand-secondary #68C153 — lê como o mesmo verde, um passo
 * mais escuro). L=0.565 (banda clara 0.43–0.77), C=0.115 (piso 0.10), contraste
 * 4.31:1 contra branco (mínimo 3:1) — passa sem depender do alívio de rótulos.
 * O próprio #68C153 falha o contraste (2.25:1) e ficaria preso ao WARN.
 */
export const CHART_MAGNITUDE = '#3D8A2E'

/**
 * Par divergente para polaridade (desvio de prazo).
 * Frio = dentro do esperado, quente = fora.
 */
export const CHART_POSITIVE = '#0d9488'
export const CHART_NEGATIVE = '#ea580c'

/** Ponto neutro do divergente — cinza, nunca uma terceira matiz. */
export const CHART_NEUTRAL = '#94a3b8'

/** Cor de um desvio em dias: <= 0 está dentro do esperado. */
export function deviationColor(days: number): string {
  if (days > 0) return CHART_NEGATIVE
  return CHART_POSITIVE
}
