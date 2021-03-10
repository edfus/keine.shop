const { join } = require("path");
const { updateFileContent } = require("update-file-content");
const local = filename => join(__dirname, filename);

updateFileContent({
  file: local("Caddyfile"),
  replace: [
    {
      search: /{UPDATE-([-_A-z]+?)}/,
      replacement: 
        (whole, variable) => process.env[variable.toUpperCase().replace(/-/g, "_")]
    }
  ]
});