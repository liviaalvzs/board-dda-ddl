/**
 * Peças visuais compartilhadas do dashboard.
 *
 * Existem para os cards e os títulos de seção não divergirem entre os quatro
 * arquivos que os usam — o dash inteiro lê como uma coisa só.
 */

/** Card branco da marca, sobre o fundo creme da página. */
export const DASH_CARD_CLASS = 'rounded-2xl border-brand-primary/10 bg-white shadow-rg-card'

/** Bloco interno de detalhe (os mini-cards dentro dos gráficos). */
export const DASH_TILE_CLASS =
  'rounded-xl border border-brand-primary/10 bg-brand-background/40 p-3'

export function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-8 w-1 shrink-0 rounded-full bg-brand-secondary" />
      <div className="min-w-0">
        <h2 className="font-display text-lg font-light leading-tight text-brand-primary">
          {title}
        </h2>
        {description && <p className="text-xs text-brand-primary/50">{description}</p>}
      </div>
    </div>
  )
}
