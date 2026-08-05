/**
 * Paleta dos gráficos do dashboard.
 *
 * Valores verificados com o validador de paletas (faixa de luminosidade, piso de
 * croma, separação para daltonismo e contraste contra a superfície) nos modos
 * claro e escuro. Não troque um valor sem revalidar.
 *
 * MAGNITUDE tem um aviso de contraste no modo escuro (2.77:1, alvo 3:1), então
 * os gráficos que o usam trazem rótulos numéricos visíveis nas barras — a
 * identidade nunca depende só da cor.
 */

/** Série única de magnitude (tempo, contagem). */
export const CHART_MAGNITUDE = '#4f46e5'

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
