/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('land_metadata')
    collection.fields.addAt(
      collection.fields.length,
      new Field({
        type: 'number',
        name: 'area_ha',
        min: 0,
        max: null,
        onlyInt: false,
        required: false,
      }),
    )
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('land_metadata')
    collection.fields.removeByName('area_ha')
    app.save(collection)
  },
)
