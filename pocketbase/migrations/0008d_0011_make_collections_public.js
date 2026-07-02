migrate((app) => {
  const collections = ["land_metadata", "comments", "document_checks", "external_offices"];
  
  for (const name of collections) {
    try {
      const col = app.findCollectionByNameOrId(name);
      col.listRule = "";
      col.viewRule = "";
      col.createRule = "";
      col.updateRule = "";
      col.deleteRule = "";
      
      if (name === "comments") {
        const userField = col.fields.getByName("user");
        if (userField) {
          userField.required = false;
        }
      }
      
      app.save(col);
    } catch (e) {
      console.log("Could not update collection:", name, e);
    }
  }
}, (app) => {
  const collections = ["land_metadata", "comments", "document_checks", "external_offices"];
  for (const name of collections) {
    try {
      const col = app.findCollectionByNameOrId(name);
      const defaultRule = "@request.auth.id != ''";
      col.listRule = defaultRule;
      col.viewRule = defaultRule;
      col.createRule = name === "comments" ? "@request.auth.id != '' && @request.auth.id = @request.body.user" : defaultRule;
      col.updateRule = name === "comments" ? "@request.auth.id != '' && @request.auth.id = user" : defaultRule;
      col.deleteRule = name === "land_metadata" ? null : (name === "comments" ? "@request.auth.id != '' && @request.auth.id = user" : defaultRule);
      
      if (name === "comments") {
        const userField = col.fields.getByName("user");
        if (userField) {
          userField.required = true;
        }
      }
      
      app.save(col);
    } catch (e) {}
  }
})
