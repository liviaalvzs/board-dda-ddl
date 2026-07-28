migrate(
  (app) => {
    const oppCol = app.findCollectionByNameOrId('opportunities')
    const olCol = app.findCollectionByNameOrId('opportunity_lands')

    var opp1Id
    try {
      const existing = app.findFirstRecordByData('opportunities', 'external_id', 'OPP-001')
      opp1Id = existing.id
    } catch (_) {
      const rec = new Record(oppCol)
      rec.set('external_id', 'OPP-001')
      rec.set('company_id', 'COMP-A')
      rec.set('primary_owner', 'João Silva')
      app.save(rec)
      opp1Id = rec.id
    }

    var opp2Id
    try {
      const existing = app.findFirstRecordByData('opportunities', 'external_id', 'OPP-002')
      opp2Id = existing.id
    } catch (_) {
      const rec = new Record(oppCol)
      rec.set('external_id', 'OPP-002')
      rec.set('company_id', 'COMP-B')
      rec.set('primary_owner', 'Maria Souza')
      app.save(rec)
      opp2Id = rec.id
    }

    var seeds = [
      { opportunity_id: opp1Id, external_land_id: 'land-001' },
      { opportunity_id: opp1Id, external_land_id: 'land-002' },
      { opportunity_id: opp2Id, external_land_id: 'land-003' },
    ]

    for (var i = 0; i < seeds.length; i++) {
      var s = seeds[i]
      try {
        app.findFirstRecordByData('opportunity_lands', 'external_land_id', s.external_land_id)
      } catch (_) {
        var rec = new Record(olCol)
        rec.set('opportunity_id', s.opportunity_id)
        rec.set('external_land_id', s.external_land_id)
        app.save(rec)
      }
    }
  },
  (app) => {
    try {
      var records = app.findRecordsByFilter('opportunity_lands', '1=1', '', 100, 0)
      for (var i = 0; i < records.length; i++) {
        app.delete(records[i])
      }
    } catch (_) {}

    try {
      var oppRecords = app.findRecordsByFilter('opportunities', '1=1', '', 100, 0)
      for (var j = 0; j < oppRecords.length; j++) {
        app.delete(oppRecords[j])
      }
    } catch (_) {}
  },
)
