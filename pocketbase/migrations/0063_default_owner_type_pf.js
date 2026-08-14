/**
 * Pessoa Física passa a ser o padrão de todo proprietário.
 *
 * A marcação saiu da aba Informações e passou a viver só no chip do
 * proprietário, na tela de documentos. Quem estava sem marcação nenhuma
 * herdava o campo da terra — que agora ninguém mais edita —, então fica
 * explicitamente PF em vez de depender de um valor órfão.
 *
 * Quem já está marcado como PJ não é tocado.
 */
migrate(
  (app) => {
    let updated = 0
    try {
      const owners = app.findRecordsByFilter('land_subjects', 'kind = "owner"', '', 0, 0)
      for (const owner of owners) {
        if (owner.getString('owner_type')) continue
        owner.set('owner_type', 'pf')
        app.save(owner)
        updated++
      }
    } catch (err) {
      app.logger().warn('0063: falha ao aplicar padrão PF', 'erro', String(err))
    }
    app.logger().info('0063_default_owner_type_pf: concluído', 'proprietarios_atualizados', updated)
  },
  (app) => {
    // Irreversível por natureza: não há registro de quem estava em branco antes.
    // Deixar como está é mais seguro do que apagar marcação legítima.
  },
)
