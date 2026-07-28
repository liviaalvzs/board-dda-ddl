migrate(
  (app) => {
    const collection = new Collection({
      name: 'document_types',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: null,
      fields: [
        { name: 'key', type: 'text', required: true },
        { name: 'name', type: 'text', required: true },
        { name: 'category', type: 'text', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_document_types_key ON document_types (key)'],
    })
    app.save(collection)

    var docTypes = [
      {
        key: 'certidao_matricula',
        name: 'Certidão de Matrícula',
        category: 'Documentos do imóvel',
      },
      { key: 'iptu', name: 'IPTU', category: 'Documentos do imóvel' },
      { key: 'car', name: 'CAR', category: 'Documentos do imóvel' },
      { key: 'licenca_ambiental', name: 'Licença Ambiental', category: 'Documentos do imóvel' },
      {
        key: 'escritura_compra_venda',
        name: 'Escritura de Compra e Venda',
        category: 'Documentos do imóvel',
      },
      {
        key: 'certidao_onus_reais',
        name: 'Certidão de Ônus Reais',
        category: 'Documentos do imóvel',
      },
      { key: 'cnd_federal', name: 'CND Federal', category: 'Documentos do imóvel' },
      { key: 'cnd_estadual', name: 'CND Estadual', category: 'Documentos do imóvel' },
      { key: 'cnd_municipal', name: 'CND Municipal', category: 'Documentos do imóvel' },
      {
        key: 'certidao_fracao_ideal',
        name: 'Certidão de Fração Ideal',
        category: 'Documentos do imóvel',
      },
      { key: 'rg_cpf', name: 'RG/CPF', category: 'Documentos pessoais' },
      {
        key: 'comprovante_residencia',
        name: 'Comprovante de Residência',
        category: 'Documentos pessoais',
      },
      { key: 'certidao_casamento', name: 'Certidão de Casamento', category: 'Documentos pessoais' },
      { key: 'rg_cpf_conjuge', name: 'RG/CPF do Cônjuge', category: 'Documentos pessoais' },
      { key: 'documento_divorcio', name: 'Documento de Divórcio', category: 'Documentos pessoais' },
    ]

    for (var i = 0; i < docTypes.length; i++) {
      var dt = docTypes[i]
      try {
        app.findFirstRecordByData('document_types', 'key', dt.key)
      } catch (_) {
        var record = new Record(collection)
        record.set('key', dt.key)
        record.set('name', dt.name)
        record.set('category', dt.category)
        app.save(record)
      }
    }
  },
  (app) => {
    try {
      var col = app.findCollectionByNameOrId('document_types')
      app.delete(col)
    } catch (_) {}
  },
)
