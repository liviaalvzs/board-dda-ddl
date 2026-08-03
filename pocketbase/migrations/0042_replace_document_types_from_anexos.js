migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('document_types')

    if (!collection.fields.getByName('description')) {
      collection.fields.add(new TextField({ name: 'description', required: false }))
    }
    if (!collection.fields.getByName('sort_order')) {
      collection.fields.add(new NumberField({ name: 'sort_order', onlyInt: true }))
    }
    app.save(collection)

    // Substitui a lista de teste pelos documentos oficiais dos Anexos I e II da
    // Carta Proposta. Os itens 7 e 8 do Anexo II (certidões da justiça estadual)
    // ficam de fora: são emitidos internamente, não pelo proprietário.
    var existing = app.findRecordsByFilter('document_types', "id != ''", '', 0, 0)
    for (var i = 0; i < existing.length; i++) {
      app.delete(existing[i])
    }

    var PF = 'Pessoa Física (proprietário e cônjuge)'
    var PJ = 'Pessoa Jurídica'
    var IMOVEL = 'Imóvel'
    var AMBIENTAIS = 'Certidões Ambientais'
    var FISCAIS = 'Certidões Fiscais'

    var docTypes = [
      {
        key: 'pf_documentos_pessoais',
        name: 'Documentos Pessoais',
        category: PF,
        sort_order: 10,
        description: 'CNH ou RG E CPF',
      },
      {
        key: 'pf_certidao_estado_civil',
        name: 'Certidão de Estado Civil',
        category: PF,
        sort_order: 20,
        description: 'Certidão de Nascimento (solteiro) ou Certidão de Casamento (casado)',
      },
      {
        key: 'pf_documentos_pessoais_conjuge',
        name: 'Documentos pessoais do cônjuge (se casado)',
        category: PF,
        sort_order: 30,
        description: 'CNH ou RG E CPF',
      },
      {
        key: 'pf_comprovante_residencia',
        name: 'Comprovante de residência',
        category: PF,
        sort_order: 40,
        description: 'Comprovante com no máximo 30 dias de emissão',
      },

      {
        key: 'pj_contrato_social',
        name: 'Contrato Social',
        category: PJ,
        sort_order: 110,
        description:
          'Documento constitutivo da empresa que estabelece objeto social, quadro societário, capital social, regras de administração e representação',
      },
      {
        key: 'pj_cartao_cnpj',
        name: 'Cartão CNPJ',
        category: PJ,
        sort_order: 120,
        description: 'Comprovante de inscrição da empresa na Receita Federal',
      },
      {
        key: 'pj_inscricao_estadual_municipal',
        name: 'Inscrição Estadual e Municipal',
        category: PJ,
        sort_order: 130,
        description: 'Registros da empresa junto aos fiscos estadual e municipal',
      },
      {
        key: 'pj_comprovante_endereco',
        name: 'Comprovante de endereço da PJ',
        category: PJ,
        sort_order: 140,
        description: 'Documento recente que comprove o endereço da sede da empresa',
      },
      {
        key: 'pj_documentos_representante_socios',
        name: 'Documentos Pessoais do representante legal e sócios da empresa',
        category: PJ,
        sort_order: 150,
        description: 'CNH ou RG E CPF e Comprovante de Estado Civil e endereço',
      },

      {
        key: 'imovel_certidao_matricula',
        name: 'Certidão da Matrícula',
        category: IMOVEL,
        sort_order: 210,
        description:
          'Documento emitido pelo Cartório de Registro de Imóvel da localização do bem, certidão que contém o histórico completo de um imóvel. Serve para comprovar a titularidade e situação jurídica do imóvel',
      },
      {
        key: 'imovel_ccir',
        name: 'CCIR',
        category: IMOVEL,
        sort_order: 220,
        description: 'Certificado de Cadastro de Imóvel Rural - cadastrado no Incra',
      },
      {
        key: 'imovel_ditr',
        name: 'DITR',
        category: IMOVEL,
        sort_order: 230,
        description:
          'Declaração do Imposto sobre a Propriedade Territorial Rural do exercício do corrente ano e dos últimos 5 anos.',
      },
      {
        key: 'imovel_car',
        name: 'CAR',
        category: IMOVEL,
        sort_order: 240,
        description: 'Recibo do Cadastro Ambiental Rural',
      },
      {
        key: 'imovel_shapefile_kml_kmz',
        name: 'Shapefile/KML ou KMZ',
        category: IMOVEL,
        sort_order: 250,
        description:
          'Arquivos em formato vetorial GIS para armazenar pontos, linhas e polígonos. KMZ é um arquivo compactado baseado em KML usado para visualização geográfica em Google Earth e outros softwares.',
      },

      {
        key: 'cnd_ambiental_estadual',
        name: 'Certidão Ambiental Estadual de Débitos (CND Ambiental Estadual)',
        category: AMBIENTAIS,
        sort_order: 310,
        description:
          'Certidão Ambiental de inexistência ou existência, nos últimos cinco anos, de dívidas financeiras referentes a infrações ambientais praticadas, no âmbito Estadual. Emitida pelo órgão ambiental competente de cada Estado.',
      },
      {
        key: 'cni_ambiental_estadual',
        name: 'Certidão Ambiental Estadual de Infrações (CNI Ambiental Estadual)',
        category: AMBIENTAIS,
        sort_order: 320,
        description:
          'Certidão Ambiental de inexistência ou existência, nos últimos cinco anos, de penalidades referentes à prática de infração ambiental, no âmbito Estadual. Emitida pelo órgão ambiental competente de cada Estado.',
      },
      {
        key: 'certidao_ambiental_municipal',
        name: 'Certidão Ambiental Municipal',
        category: AMBIENTAIS,
        sort_order: 330,
        description:
          'Certidão Ambiental Positiva/Negativa de Débitos e Autuações, no âmbito Municipal, expedida pela Secretaria de Meio Ambiente do município em que o imóvel estiver localizado.',
      },

      {
        key: 'cnd_federal',
        name: 'Certidão Negativa Federal (CND Federal)',
        category: FISCAIS,
        sort_order: 410,
        description:
          'Certidão Negativa de Débitos Relativos a Créditos Tributários Federais e à Dívida Ativa da União. Emitida no site da Receita Federal. OBS: Caso a certidão seja positiva com efeitos de negativa ou não seja possível de ser emitida, deverá ser apresentado o Extrato E-Cac atualizado.',
      },
      {
        key: 'cnd_estadual',
        name: 'Certidão Negativa Fiscal Estadual (CND Estadual)',
        category: FISCAIS,
        sort_order: 420,
        description:
          'Certidão Negativa de Débitos emitida pela Secretaria da Fazenda Estadual, do Estado onde se situa o Imóvel. OBS: Caso a certidão seja positiva com efeitos de negativa ou não seja possível de ser emitida, deverá ser apresentado o extrato detalhado dos débitos obtido junto à secretaria da fazenda estadual.',
      },
      {
        key: 'cnd_municipal',
        name: 'Certidão Negativa Fiscal Municipal (CND Municipal)',
        category: FISCAIS,
        sort_order: 430,
        description:
          'Negativa de Débitos emitida pela Fazenda Municipal, expedida pela secretaria da fazenda do município onde se situa o Imóvel. OBS: Caso a certidão seja positiva com efeitos de negativa ou não seja possível de ser emitida, deverá ser apresentado o extrato detalhado dos débitos obtido junto à secretaria da fazenda municipal.',
      },
    ]

    for (var j = 0; j < docTypes.length; j++) {
      var dt = docTypes[j]
      var record = new Record(collection)
      record.set('key', dt.key)
      record.set('name', dt.name)
      record.set('category', dt.category)
      record.set('description', dt.description)
      record.set('sort_order', dt.sort_order)
      app.save(record)
    }
  },
  (app) => {
    try {
      var collection = app.findCollectionByNameOrId('document_types')

      var records = app.findRecordsByFilter('document_types', "id != ''", '', 0, 0)
      for (var i = 0; i < records.length; i++) {
        app.delete(records[i])
      }

      if (collection.fields.getByName('description')) {
        collection.fields.removeByName('description')
      }
      if (collection.fields.getByName('sort_order')) {
        collection.fields.removeByName('sort_order')
      }
      app.save(collection)
    } catch (_) {}
  },
)
