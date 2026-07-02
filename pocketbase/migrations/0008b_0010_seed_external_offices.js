migrate((app) => {
  const officesCol = app.findCollectionByNameOrId("external_offices");
  
  const seedData = [
    "Escritório Rural Alpha",
    "Consultoria Verde Norte",
    "Advocacia Agro-Pro"
  ];

  for (const name of seedData) {
    try {
      app.findFirstRecordByData("external_offices", "name", name);
    } catch (_) {
      const record = new Record(officesCol);
      record.set("name", name);
      app.save(record);
    }
  }
}, (app) => {
  const seedData = [
    "Escritório Rural Alpha",
    "Consultoria Verde Norte",
    "Advocacia Agro-Pro"
  ];
  
  for (const name of seedData) {
    try {
      const record = app.findFirstRecordByData("external_offices", "name", name);
      app.delete(record);
    } catch (_) {}
  }
});
