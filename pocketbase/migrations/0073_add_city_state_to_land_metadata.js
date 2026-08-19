/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('land_metadata')

    collection.fields.addAt(
      collection.fields.length,
      new Field({
        type: 'text',
        name: 'city',
        required: false,
      }),
    )

    collection.fields.addAt(
      collection.fields.length,
      new Field({
        type: 'text',
        name: 'state',
        required: false,
      }),
    )

    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('land_metadata')
    collection.fields.removeByName('city')
    collection.fields.removeByName('state')
    app.save(collection)
  },
)
